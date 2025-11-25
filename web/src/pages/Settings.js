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
  Alert
} from '@mui/material';
import {
  Email as EmailIcon,
  Palette as PaletteIcon,
  ViewModule as ViewModuleIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';

const Settings = () => {
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

  useEffect(() => {
    fetchPreferences();
  }, []);

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
        localStorage.setItem('theme', prefsToSave.theme);
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

