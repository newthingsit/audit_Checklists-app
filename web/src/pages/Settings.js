import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  TextField,
  Chip
} from '@mui/material';
import {
  Email as EmailIcon,
  Palette as PaletteIcon,
  ViewModule as ViewModuleIcon,
  Save as SaveIcon,
  Assignment as AssignmentIcon,
  TrendingUp as EscalatorIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';
import { useAuth } from '../context/AuthContext';
import { isAdmin, hasPermission } from '../utils/permissions';

// Assignment Rules List Component
const AssignmentRulesList = ({ rules, categoryRules, onAddRule, onEditRule, onDeleteRule, showError, showSuccess, templates = [] }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [newRule, setNewRule] = useState({ category: '', assigned_role: 'supervisor', priority_level: 0, template_id: '' });
  const [filterType, setFilterType] = useState('all'); // 'all', 'general', 'template'

  const roles = ['supervisor', 'manager', 'admin', 'location_manager'];

  // Filter rules based on filterType
  const filteredRules = filterType === 'all' 
    ? rules 
    : filterType === 'general' 
      ? rules.filter(r => !r.template_id)
      : rules.filter(r => r.template_id);

  const handleAdd = () => {
    if (!newRule.category) {
      showError('Please enter a category');
      return;
    }
    onAddRule(newRule.category, newRule.assigned_role, newRule.priority_level, newRule.template_id || null);
    setNewRule({ category: '', assigned_role: 'supervisor', priority_level: 0, template_id: '' });
    setShowAddDialog(false);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setNewRule({
      category: rule.category,
      assigned_role: rule.assigned_role,
      priority_level: rule.priority_level || 0,
      template_id: rule.template_id || ''
    });
    setShowAddDialog(true);
  };

  const handleSaveEdit = () => {
    if (!newRule.category) {
      showError('Please enter a category');
      return;
    }
    onEditRule(editingRule.id, newRule.category, newRule.assigned_role, newRule.priority_level, editingRule.is_active, newRule.template_id || null);
    setEditingRule(null);
    setNewRule({ category: '', assigned_role: 'supervisor', priority_level: 0, template_id: '' });
    setShowAddDialog(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {filteredRules.length} rule(s) {filterType !== 'all' && `(${filterType === 'general' ? 'General' : 'Template-Specific'})`}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filterType}
              label="Filter"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">All Rules</MenuItem>
              <MenuItem value="general">General Rules</MenuItem>
              <MenuItem value="template">Template-Specific</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingRule(null);
            setNewRule({ category: '', assigned_role: 'supervisor', priority_level: 0, template_id: '' });
            setShowAddDialog(true);
          }}
        >
          Add Rule
        </Button>
      </Box>

      {filteredRules.length === 0 ? (
        <Alert severity="info">
          No assignment rules configured. Add rules to automatically assign action items based on category.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredRules.map((rule) => (
            <Box
              key={rule.id}
              sx={{
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: rule.is_active ? 'background.paper' : 'action.disabledBackground'
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {rule.category}
                  </Typography>
                  {rule.template_id && (
                    <Chip 
                      label={`Template: ${rule.template_name || 'Unknown'}`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  )}
                  {!rule.template_id && (
                    <Chip 
                      label="General" 
                      size="small" 
                      color="default" 
                      variant="outlined"
                    />
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  → {rule.assigned_role}
                  {rule.priority_level > 0 && ` • Priority: ${rule.priority_level}`}
                  {!rule.is_active && ' • Inactive'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleEdit(rule)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => onDeleteRule(rule.id)}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300
          }}
          onClick={() => setShowAddDialog(false)}
        >
          <Card
            sx={{ p: 3, minWidth: 400, maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              {editingRule ? 'Edit Assignment Rule' : 'Add Assignment Rule'}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Category"
                value={newRule.category}
                onChange={(e) => setNewRule({ ...newRule, category: e.target.value.toUpperCase() })}
                placeholder="e.g., FOOD SAFETY"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Assigned Role</InputLabel>
                <Select
                  value={newRule.assigned_role}
                  label="Assigned Role"
                  onChange={(e) => setNewRule({ ...newRule, assigned_role: e.target.value })}
                >
                  {roles.map(role => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Template (Optional)</InputLabel>
                <Select
                  value={newRule.template_id || ''}
                  label="Template (Optional)"
                  onChange={(e) => setNewRule({ ...newRule, template_id: e.target.value })}
                >
                  <MenuItem value="">All Templates (General Rule)</MenuItem>
                  {templates.map(template => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Priority Level"
                type="number"
                value={newRule.priority_level}
                onChange={(e) => setNewRule({ ...newRule, priority_level: parseInt(e.target.value, 10) || 0 })}
                helperText="Higher priority rules are evaluated first. Template-specific rules override general rules."
                fullWidth
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button
                  variant="contained"
                  onClick={editingRule ? handleSaveEdit : handleAdd}
                >
                  {editingRule ? 'Update' : 'Add'}
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  );
};

const Settings = () => {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const canManageRules = isAdmin(user) || hasPermission(userPermissions, 'manage_templates');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    email_notifications_enabled: true,
    email_audit_completed: true,
    email_action_assigned: true,
    email_task_reminder: true,
    email_overdue_items: true,
    email_scheduled_audit: true,
    date_format: 'DD-MM-YYYY',
    items_per_page: 25,
    theme: 'light',
    dashboard_default_view: 'cards'
  });
  
  // Assignment rules state
  const [assignmentRules, setAssignmentRules] = useState({
    categoryRules: {},
    escalationDays: 3
  });
  const [loadingRules, setLoadingRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetchPreferences();
    if (canManageRules) {
      fetchAssignmentRules();
      fetchTemplates();
    }
  }, [canManageRules]);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings/preferences');
      if (response.data && response.data.preferences) {
        // Ensure items_per_page is a number
        const prefs = {
          ...response.data.preferences,
          items_per_page: typeof response.data.preferences.items_per_page === 'string' 
            ? parseInt(response.data.preferences.items_per_page, 10) 
            : response.data.preferences.items_per_page || 25
        };
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Use defaults if error - preferences already set in initial state
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => (event) => {
    setPreferences({
      ...preferences,
      [key]: event.target.checked
    });
  };

  const handleChange = (key) => (event) => {
    setPreferences({
      ...preferences,
      [key]: event.target.value
    });
  };

  const fetchAssignmentRules = async () => {
    try {
      setLoadingRules(true);
      const response = await axios.get('/api/assignment-rules');
      if (response.data) {
        setAssignmentRules({
          rules: response.data.rules || [],
          categoryRules: response.data.categoryRules || {},
          escalationDays: response.data.escalationDays || 3
        });
      }
    } catch (error) {
      console.error('Error fetching assignment rules:', error);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Ensure items_per_page is a number
      const prefsToSave = {
        ...preferences,
        items_per_page: typeof preferences.items_per_page === 'string' 
          ? parseInt(preferences.items_per_page, 10) 
          : preferences.items_per_page
      };
      await axios.put('/api/settings/preferences', prefsToSave);
      showSuccess('Settings saved successfully');
      // Refresh preferences after save
      await fetchPreferences();
      // Trigger theme update immediately if theme was changed
      if (prefsToSave.theme) {
        sessionStorage.setItem('theme', prefsToSave.theme);
        window.dispatchEvent(new Event('themePreferenceChanged'));
        // Force a small delay to ensure the event is processed
        setTimeout(() => {
          window.dispatchEvent(new Event('themePreferenceChanged'));
        }, 100);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to save settings';
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRules = async () => {
    try {
      setSavingRules(true);
      // Save escalation days
      await axios.put('/api/assignment-rules/escalation/settings', {
        escalationDays: assignmentRules.escalationDays
      });
      showSuccess('Assignment rules saved successfully');
      await fetchAssignmentRules();
    } catch (error) {
      console.error('Error saving assignment rules:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save assignment rules';
      showError(errorMessage);
    } finally {
      setSavingRules(false);
    }
  };

  const handleAddRule = async (category, assigned_role, priority_level, template_id) => {
    try {
      await axios.post('/api/assignment-rules', {
        category,
        assigned_role,
        priority_level: priority_level || 0,
        template_id: template_id || null
      });
      showSuccess('Assignment rule added successfully');
      await fetchAssignmentRules();
    } catch (error) {
      console.error('Error adding assignment rule:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add assignment rule';
      showError(errorMessage);
    }
  };

  const handleEditRule = async (id, category, assigned_role, priority_level, is_active, template_id) => {
    try {
      await axios.put(`/api/assignment-rules/${id}`, {
        category,
        assigned_role,
        priority_level: priority_level || 0,
        is_active: is_active !== undefined ? is_active : true,
        template_id: template_id || null
      });
      showSuccess('Assignment rule updated successfully');
      await fetchAssignmentRules();
    } catch (error) {
      console.error('Error updating assignment rule:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update assignment rule';
      showError(errorMessage);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment rule?')) {
      return;
    }
    try {
      await axios.delete(`/api/assignment-rules/${id}`);
      showSuccess('Assignment rule deleted successfully');
      await fetchAssignmentRules();
    } catch (error) {
      console.error('Error deleting assignment rule:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete assignment rule';
      showError(errorMessage);
    }
  };

  const handleCategoryRuleChange = (category, role) => {
    setAssignmentRules(prev => ({
      ...prev,
      categoryRules: {
        ...prev.categoryRules,
        [category]: role || null
      }
    }));
  };

  const handleEscalationDaysChange = (days) => {
    setAssignmentRules(prev => ({
      ...prev,
      escalationDays: parseInt(days, 10) || 3
    }));
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
            Settings & Preferences
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Customize your application experience and notification preferences
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Email Notifications */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Email Notifications
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Alert severity="info" sx={{ mb: 3 }}>
                  Email notifications are sent to your registered email address. Make sure your email is up to date in your profile.
                </Alert>

                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.email_notifications_enabled}
                      onChange={handleToggle('email_notifications_enabled')}
                      color="primary"
                    />
                  }
                  label="Enable Email Notifications"
                  sx={{ mb: 2, display: 'block' }}
                />

                {preferences.email_notifications_enabled && (
                  <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.email_audit_completed}
                          onChange={handleToggle('email_audit_completed')}
                          color="primary"
                        />
                      }
                      label="Audit Completion Notifications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.email_action_assigned}
                          onChange={handleToggle('email_action_assigned')}
                          color="primary"
                        />
                      }
                      label="Action Item Assignment Notifications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.email_task_reminder}
                          onChange={handleToggle('email_task_reminder')}
                          color="primary"
                        />
                      }
                      label="Task Reminder Notifications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.email_overdue_items}
                          onChange={handleToggle('email_overdue_items')}
                          color="primary"
                        />
                      }
                      label="Overdue Item Notifications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.email_scheduled_audit}
                          onChange={handleToggle('email_scheduled_audit')}
                          color="primary"
                        />
                      }
                      label="Scheduled Audit Reminders"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Display Preferences */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <PaletteIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Display Preferences
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Date Format</InputLabel>
                      <Select
                        value={preferences.date_format}
                        label="Date Format"
                        onChange={handleChange('date_format')}
                      >
                        <MenuItem value="DD-MM-YYYY">DD-MM-YYYY</MenuItem>
                        <MenuItem value="MM-DD-YYYY">MM-DD-YYYY</MenuItem>
                        <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                        <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                        <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Items Per Page</InputLabel>
                      <Select
                        value={preferences.items_per_page}
                        label="Items Per Page"
                        onChange={(e) => {
                          setPreferences({
                            ...preferences,
                            items_per_page: typeof e.target.value === 'string' ? parseInt(e.target.value, 10) : e.target.value
                          });
                        }}
                      >
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={25}>25</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                        <MenuItem value={100}>100</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Theme</InputLabel>
                      <Select
                        value={preferences.theme}
                        label="Theme"
                        onChange={handleChange('theme')}
                      >
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                        <MenuItem value="auto">Auto (System)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Dashboard Preferences */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <ViewModuleIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Dashboard Preferences
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <FormControl fullWidth>
                  <InputLabel>Default View</InputLabel>
                  <Select
                    value={preferences.dashboard_default_view}
                    label="Default View"
                    onChange={handleChange('dashboard_default_view')}
                  >
                    <MenuItem value="cards">Cards View</MenuItem>
                    <MenuItem value="list">List View</MenuItem>
                    <MenuItem value="table">Table View</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* Assignment Rules - Admin/Manager Only */}
          {canManageRules && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <AssignmentIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Assignment Rules
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 3 }} />

                  {loadingRules ? (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      <Alert severity="info" sx={{ mb: 3 }}>
                        Configure which role should handle action items based on category. Rules are applied when action items are automatically created from failed audit items.
                      </Alert>

                      {/* Category Rules List */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          Category-Based Assignment Rules
                        </Typography>
                        <AssignmentRulesList
                          rules={assignmentRules.rules || []}
                          categoryRules={assignmentRules.categoryRules}
                          onAddRule={handleAddRule}
                          onEditRule={handleEditRule}
                          onDeleteRule={handleDeleteRule}
                          showError={showError}
                          showSuccess={showSuccess}
                          templates={templates}
                        />
                      </Box>

                      {/* Escalation Settings */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          Escalation Settings
                        </Typography>
                        <FormControl fullWidth>
                          <InputLabel>Days Before Escalation</InputLabel>
                          <Select
                            value={assignmentRules.escalationDays}
                            label="Days Before Escalation"
                            onChange={(e) => handleEscalationDaysChange(e.target.value)}
                          >
                            <MenuItem value={1}>1 Day</MenuItem>
                            <MenuItem value={2}>2 Days</MenuItem>
                            <MenuItem value={3}>3 Days</MenuItem>
                            <MenuItem value={5}>5 Days</MenuItem>
                            <MenuItem value={7}>7 Days</MenuItem>
                            <MenuItem value={14}>14 Days</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button
                          variant="outlined"
                          onClick={fetchAssignmentRules}
                          disabled={loadingRules}
                        >
                          Refresh
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={savingRules ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                          onClick={handleSaveRules}
                          disabled={savingRules}
                        >
                          {savingRules ? 'Saving...' : 'Save Rules'}
                        </Button>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                size="large"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default Settings;

