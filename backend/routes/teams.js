const express = require('express');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');

const router = express.Router();

// Get all teams
router.get('/', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Users can see teams they're members of, admins see all
  let query;
  if (req.user.role === 'admin') {
    query = `SELECT t.*, 
      u.name as team_lead_name,
      u2.name as created_by_name,
      (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN users u ON t.team_lead_id = u.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      ORDER BY t.created_at DESC`;
  } else {
    query = `SELECT DISTINCT t.*, 
      u.name as team_lead_name,
      u2.name as created_by_name,
      (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
      FROM teams t
      LEFT JOIN users u ON t.team_lead_id = u.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ? OR t.created_by = ?
      ORDER BY t.created_at DESC`;
  }

  const params = req.user.role === 'admin' ? [] : [userId, userId];

  dbInstance.all(query, params, (err, teams) => {
    if (err) {
      console.error('Error fetching teams:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Get members for each team
    const teamIds = teams.map(t => t.id);
    if (teamIds.length === 0) {
      return res.json({ teams: [] });
    }

    const placeholders = teamIds.map(() => '?').join(',');
    dbInstance.all(
      `SELECT tm.*, u.name as user_name, u.email as user_email
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id IN (${placeholders})
       ORDER BY tm.joined_at ASC`,
      teamIds,
      (err, members) => {
        if (err) {
          console.error('Error fetching team members:', err);
          return res.json({ teams });
        }

        // Group members by team_id
        const membersByTeam = {};
        members.forEach(member => {
          if (!membersByTeam[member.team_id]) {
            membersByTeam[member.team_id] = [];
          }
          membersByTeam[member.team_id].push({
            id: member.user_id,
            name: member.user_name,
            email: member.user_email,
            role: member.role,
            joined_at: member.joined_at
          });
        });

        // Add members to teams
        teams.forEach(team => {
          team.members = membersByTeam[team.id] || [];
        });

        res.json({ teams });
      }
    );
  });
});

// Get single team
router.get('/:id', authenticate, (req, res) => {
  const dbInstance = db.getDb();
  const userId = req.user.id;

  dbInstance.get(
    `SELECT t.*, 
     u.name as team_lead_name,
     u2.name as created_by_name
     FROM teams t
     LEFT JOIN users u ON t.team_lead_id = u.id
     LEFT JOIN users u2 ON t.created_by = u2.id
     WHERE t.id = ?`,
    [req.params.id],
    (err, team) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user has access (admin, creator, or member)
      if (req.user.role !== 'admin' && team.created_by !== userId) {
        dbInstance.get(
          'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
          [team.id, userId],
          (err, membership) => {
            if (err || !membership) {
              return res.status(403).json({ error: 'Access denied' });
            }
            fetchTeamMembers();
          }
        );
      } else {
        fetchTeamMembers();
      }

      function fetchTeamMembers() {
        dbInstance.all(
          `SELECT tm.*, u.name as user_name, u.email as user_email
           FROM team_members tm
           JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = ?
           ORDER BY tm.joined_at ASC`,
          [team.id],
          (err, members) => {
            if (!err) {
              team.members = members || [];
            }
            res.json({ team });
          }
        );
      }
    }
  );
});

// Create team (admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, description, team_lead_id, member_ids } = req.body;
  const dbInstance = db.getDb();

  if (!name) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  dbInstance.run(
    'INSERT INTO teams (name, description, team_lead_id, created_by) VALUES (?, ?, ?, ?)',
    [name, description || '', team_lead_id || null, req.user.id],
    function(err) {
      if (err) {
        console.error('Error creating team:', err);
        return res.status(500).json({ error: 'Error creating team', details: err.message });
      }

      const teamId = this.lastID;

      // Add members if provided
      if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
        const memberInserts = member_ids.map(userId => {
          return new Promise((resolve, reject) => {
            dbInstance.run(
              'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
              [teamId, userId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        Promise.all(memberInserts)
          .then(() => {
            res.status(201).json({ id: teamId, message: 'Team created successfully' });
          })
          .catch((err) => {
            console.error('Error adding team members:', err);
            res.status(201).json({ id: teamId, message: 'Team created but members failed', warning: true });
          });
      } else {
        res.status(201).json({ id: teamId, message: 'Team created successfully' });
      }
    }
  );
});

// Update team (admin or team lead)
router.put('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { name, description, team_lead_id, member_ids } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Check if team exists and user has permission
  dbInstance.get(
    'SELECT * FROM teams WHERE id = ?',
    [id],
    (err, team) => {
      if (err || !team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check permission: admin or team lead
      if (req.user.role !== 'admin' && team.team_lead_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updates = [];
      const params = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (team_lead_id !== undefined) {
        updates.push('team_lead_id = ?');
        params.push(team_lead_id);
      }

      if (updates.length === 0 && !member_ids) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      if (updates.length > 0) {
        params.push(id);
        dbInstance.run(
          `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`,
          params,
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Error updating team' });
            }
            updateMembers();
          }
        );
      } else {
        updateMembers();
      }

      function updateMembers() {
        if (member_ids !== undefined) {
          // Delete existing members
          dbInstance.run('DELETE FROM team_members WHERE team_id = ?', [id], (err) => {
            if (err) {
              console.error('Error deleting team members:', err);
            }

            // Add new members
            if (Array.isArray(member_ids) && member_ids.length > 0) {
              const memberInserts = member_ids.map(userId => {
                return new Promise((resolve, reject) => {
                  dbInstance.run(
                    'INSERT INTO team_members (team_id, user_id) VALUES (?, ?)',
                    [id, userId],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });
              });

              Promise.all(memberInserts)
                .then(() => {
                  res.json({ message: 'Team updated successfully' });
                })
                .catch((err) => {
                  console.error('Error adding team members:', err);
                  res.json({ message: 'Team updated but members failed', warning: true });
                });
            } else {
              res.json({ message: 'Team updated successfully' });
            }
          });
        } else {
          res.json({ message: 'Team updated successfully' });
        }
      }
    }
  );
});

// Delete team (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();

  dbInstance.run('DELETE FROM teams WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting team' });
    }
    res.json({ message: 'Team deleted successfully' });
  });
});

// Add member to team (admin or team lead)
router.post('/:id/members', authenticate, (req, res) => {
  const { id } = req.params;
  const { user_id, role } = req.body;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Check if team exists and user has permission
  dbInstance.get(
    'SELECT * FROM teams WHERE id = ?',
    [id],
    (err, team) => {
      if (err || !team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      if (req.user.role !== 'admin' && team.team_lead_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      dbInstance.run(
        'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
        [id, user_id, role || 'member'],
        function(err) {
          if (err) {
            if (err.message && err.message.includes('UNIQUE')) {
              return res.status(400).json({ error: 'User is already a member of this team' });
            }
            return res.status(500).json({ error: 'Error adding team member' });
          }
          res.status(201).json({ id: this.lastID, message: 'Member added successfully' });
        }
      );
    }
  );
});

// Remove member from team (admin or team lead)
router.delete('/:id/members/:userId', authenticate, (req, res) => {
  const { id, userId } = req.params;
  const dbInstance = db.getDb();
  const currentUserId = req.user.id;

  // Check if team exists and user has permission
  dbInstance.get(
    'SELECT * FROM teams WHERE id = ?',
    [id],
    (err, team) => {
      if (err || !team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      if (req.user.role !== 'admin' && team.team_lead_id !== currentUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      dbInstance.run(
        'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
        [id, userId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error removing team member' });
          }
          res.json({ message: 'Member removed successfully' });
        }
      );
    }
  );
});

// Get team performance metrics
router.get('/:id/metrics', authenticate, (req, res) => {
  const { id } = req.params;
  const dbInstance = db.getDb();
  const userId = req.user.id;

  // Check if team exists and user has access
  dbInstance.get(
    'SELECT * FROM teams WHERE id = ?',
    [id],
    (err, team) => {
      if (err || !team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check access
      if (req.user.role !== 'admin' && team.created_by !== userId) {
        dbInstance.get(
          'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
          [id, userId],
          (err, membership) => {
            if (err || !membership) {
              return res.status(403).json({ error: 'Access denied' });
            }
            fetchMetrics();
          }
        );
      } else {
        fetchMetrics();
      }

      function fetchMetrics() {
        // Get team member IDs
        dbInstance.all(
          'SELECT user_id FROM team_members WHERE team_id = ?',
          [id],
          (err, members) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            const memberIds = members.map(m => m.user_id);
            if (memberIds.length === 0) {
              return res.json({
                team_id: id,
                total_audits: 0,
                completed_audits: 0,
                avg_score: 0,
                total_tasks: 0,
                completed_tasks: 0,
                total_actions: 0,
                pending_actions: 0
              });
            }

            const placeholders = memberIds.map(() => '?').join(',');

            // Get all metrics in parallel
            Promise.all([
              // Total audits
              new Promise((resolve, reject) => {
                dbInstance.get(
                  `SELECT COUNT(*) as total FROM audits WHERE user_id IN (${placeholders})`,
                  memberIds,
                  (err, row) => err ? reject(err) : resolve(row.total || 0)
                );
              }),
              // Completed audits
              new Promise((resolve, reject) => {
                dbInstance.get(
                  `SELECT COUNT(*) as total FROM audits WHERE user_id IN (${placeholders}) AND status = 'completed'`,
                  memberIds,
                  (err, row) => err ? reject(err) : resolve(row.total || 0)
                );
              }),
              // Average score
              new Promise((resolve, reject) => {
                dbInstance.get(
                  `SELECT AVG(score) as avg FROM audits WHERE user_id IN (${placeholders}) AND score IS NOT NULL`,
                  memberIds,
                  (err, row) => err ? reject(err) : resolve(row.avg || 0)
                );
              }),
              // Total tasks
              new Promise((resolve, reject) => {
                dbInstance.get(
                  `SELECT COUNT(*) as total FROM tasks WHERE assigned_to IN (${placeholders})`,
                  memberIds,
                  (err, row) => err ? reject(err) : resolve(row.total || 0)
                );
              }),
              // Completed tasks
              new Promise((resolve, reject) => {
                dbInstance.get(
                  `SELECT COUNT(*) as total FROM tasks WHERE assigned_to IN (${placeholders}) AND status = 'completed'`,
                  memberIds,
                  (err, row) => err ? reject(err) : resolve(row.total || 0)
                );
              }),
              // Total actions
              new Promise((resolve, reject) => {
                dbInstance.get(
                  `SELECT COUNT(*) as total FROM action_items WHERE assigned_to IN (${placeholders})`,
                  memberIds,
                  (err, row) => err ? reject(err) : resolve(row.total || 0)
                );
              }),
              // Pending actions
              new Promise((resolve, reject) => {
                dbInstance.get(
                  `SELECT COUNT(*) as total FROM action_items WHERE assigned_to IN (${placeholders}) AND status != 'completed'`,
                  memberIds,
                  (err, row) => err ? reject(err) : resolve(row.total || 0)
                );
              })
            ])
              .then(([totalAudits, completedAudits, avgScore, totalTasks, completedTasks, totalActions, pendingActions]) => {
                res.json({
                  team_id: id,
                  total_audits: totalAudits,
                  completed_audits: completedAudits,
                  avg_score: Math.round(avgScore * 100) / 100,
                  total_tasks: totalTasks,
                  completed_tasks: completedTasks,
                  total_actions: totalActions,
                  pending_actions: pendingActions
                });
              })
              .catch(err => {
                console.error('Error fetching team metrics:', err);
                res.status(500).json({ error: 'Error fetching team metrics' });
              });
          }
        );
      }
    }
  );
});

module.exports = router;

