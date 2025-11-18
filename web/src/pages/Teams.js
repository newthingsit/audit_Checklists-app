import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Avatar,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import BarChartIcon from '@mui/icons-material/BarChart';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [users, setUsers] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMetrics, setTeamMetrics] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    team_lead_id: '',
    member_ids: []
  });

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await axios.get('/api/teams');
      setTeams(response.data.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      showError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTeamMetrics = async (teamId) => {
    try {
      const response = await axios.get(`/api/teams/${teamId}/metrics`);
      setTeamMetrics(response.data);
    } catch (error) {
      console.error('Error fetching team metrics:', error);
      showError('Failed to load team metrics');
    }
  };

  const handleOpenDialog = (team = null) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        description: team.description || '',
        team_lead_id: team.team_lead_id || '',
        member_ids: team.members ? team.members.map(m => m.id) : []
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: '',
        description: '',
        team_lead_id: '',
        member_ids: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTeam(null);
  };

  const handleSubmit = async () => {
    try {
      const url = editingTeam ? `/api/teams/${editingTeam.id}` : '/api/teams';
      const method = editingTeam ? 'put' : 'post';

      await axios[method](url, formData);
      showSuccess(editingTeam ? 'Team updated successfully' : 'Team created successfully');
      handleCloseDialog();
      fetchTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      showError(error.response?.data?.error || 'Failed to save team');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team? All team members will be removed.')) return;

    try {
      await axios.delete(`/api/teams/${id}`);
      showSuccess('Team deleted successfully');
      fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      showError('Failed to delete team');
    }
  };

  const handleViewMetrics = (team) => {
    setSelectedTeam(team);
    setTabValue(1);
    fetchTeamMetrics(team.id);
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Teams & Collaboration
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ borderRadius: 2 }}
          >
            New Team
          </Button>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label={`All Teams (${teams.length})`} />
            {selectedTeam && <Tab label={`${selectedTeam.name} Metrics`} />}
          </Tabs>
        </Box>

        {/* Teams Grid */}
        {tabValue === 0 && (
          <>
            {teams.length === 0 ? (
              <Card>
                <CardContent>
                  <Box textAlign="center" py={4}>
                    <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No teams found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Create your first team to get started with collaboration
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={3}>
                {teams.map((team) => (
                  <Grid item xs={12} md={6} lg={4} key={team.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flex: 1 }}>
                            {team.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleViewMetrics(team)}
                              color="primary"
                            >
                              <BarChartIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(team)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(team.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>

                        {team.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {team.description}
                          </Typography>
                        )}

                        <Box sx={{ mb: 2 }}>
                          {team.team_lead_name && (
                            <Chip
                              icon={<PersonIcon />}
                              label={`Lead: ${team.team_lead_name}`}
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                          <Chip
                            icon={<PeopleIcon />}
                            label={`${team.member_count || team.members?.length || 0} members`}
                            size="small"
                            sx={{ mb: 1 }}
                          />
                        </Box>

                        {team.members && team.members.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              Members:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {team.members.slice(0, 5).map((member) => (
                                <Chip
                                  key={member.id}
                                  avatar={<Avatar sx={{ width: 24, height: 24 }}>{member.name.charAt(0)}</Avatar>}
                                  label={member.name}
                                  size="small"
                                />
                              ))}
                              {team.members.length > 5 && (
                                <Chip
                                  label={`+${team.members.length - 5} more`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* Team Metrics Tab */}
        {tabValue === 1 && selectedTeam && (
          <Card>
            <CardContent>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {selectedTeam.name} - Performance Metrics
                </Typography>
                <Button onClick={() => setTabValue(0)}>Back to Teams</Button>
              </Box>

              {teamMetrics ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6} lg={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                          {teamMetrics.total_audits}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Audits
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6} lg={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                          {teamMetrics.completed_audits}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Completed Audits
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6} lg={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                          {teamMetrics.avg_score.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Average Score
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6} lg={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                          {teamMetrics.pending_actions}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pending Actions
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6} lg={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>
                          {teamMetrics.total_tasks}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Tasks
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6} lg={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                          {teamMetrics.completed_tasks}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Completed Tasks
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingTeam ? 'Edit Team' : 'Create New Team'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                label="Team Name"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <FormControl fullWidth>
                <InputLabel>Team Lead</InputLabel>
                <Select
                  value={formData.team_lead_id}
                  label="Team Lead"
                  onChange={(e) => setFormData({ ...formData, team_lead_id: e.target.value })}
                >
                  <MenuItem value="">No Team Lead</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Autocomplete
                multiple
                options={users}
                getOptionLabel={(option) => `${option.name} (${option.email})`}
                value={users.filter(u => formData.member_ids.includes(u.id))}
                onChange={(e, newValue) => {
                  setFormData({ ...formData, member_ids: newValue.map(v => v.id) });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Team Members"
                    placeholder="Select team members"
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                      {option.name.charAt(0)}
                    </Avatar>
                    {option.name} ({option.email})
                  </Box>
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={!formData.name}>
              {editingTeam ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default Teams;

