import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  IconButton,
  InputAdornment,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/toast';

const Profile = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      const userData = response.data.user;
      setUserData(userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      showError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Update profile
      const updateData = {
        name: formData.name,
        email: formData.email
      };

      // If password is being changed
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      await axios.put('/api/auth/profile', updateData);

      // If email or password changed, re-login
      if (formData.email !== userData?.email || formData.newPassword) {
        showSuccess('Profile updated. Please login again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        showSuccess('Profile updated successfully');
        setEditing(false);
        fetchUser();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to update profile';
      showError(errorMsg);
      if (error.response?.status === 401) {
        setErrors({ currentPassword: 'Current password is incorrect' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setErrors({});
    fetchUser();
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

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'U';
  };

  return (
    <Layout>
      <Container maxWidth="md">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
            Profile Settings
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Manage your account information and preferences
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '3rem',
                    fontWeight: 600
                  }}
                >
                  {getInitials(userData?.name || user?.name)}
                </Avatar>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {userData?.name || user?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {userData?.email || user?.email}
                </Typography>
                <Chip
                  label={userData?.role || user?.role || 'User'}
                  color="primary"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Account Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Member Since
                  </Typography>
                  <Typography variant="body2">
                    {userData?.created_at
                      ? new Date(userData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'N/A'}
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => window.location.href = '/settings'}
                  sx={{ mt: 2 }}
                >
                  Go to Settings
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Personal Information
                  </Typography>
                  {!editing ? (
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => setEditing(true)}
                      variant="outlined"
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        startIcon={<CancelIcon />}
                        onClick={handleCancel}
                        variant="outlined"
                        color="error"
                      >
                        Cancel
                      </Button>
                      <Button
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        variant="contained"
                        disabled={saving}
                      >
                        {saving ? <CircularProgress size={20} /> : 'Save Changes'}
                      </Button>
                    </Box>
                  )}
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={formData.name}
                      onChange={handleChange('name')}
                      disabled={!editing}
                      error={!!errors.name}
                      helperText={errors.name}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={handleChange('email')}
                      disabled={!editing}
                      error={!!errors.email}
                      helperText={errors.email}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>

                  {editing && (
                    <>
                      <Grid item xs={12}>
                        <Divider>
                          <Typography variant="body2" color="text.secondary">
                            Change Password (Optional)
                          </Typography>
                        </Divider>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Current Password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.currentPassword}
                          onChange={handleChange('currentPassword')}
                          error={!!errors.currentPassword}
                          helperText={errors.currentPassword}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockIcon color="action" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                >
                                  {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            )
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="New Password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.newPassword}
                          onChange={handleChange('newPassword')}
                          error={!!errors.newPassword}
                          helperText={errors.newPassword}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Confirm New Password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={handleChange('confirmPassword')}
                          error={!!errors.confirmPassword}
                          helperText={errors.confirmPassword}
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default Profile;

