import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Chip,
  Button,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [tabValue]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/notifications');
      const allNotifications = response.data.notifications || [];
      
      if (tabValue === 0) {
        // All notifications
        setNotifications(allNotifications);
      } else if (tabValue === 1) {
        // Unread only
        setNotifications(allNotifications.filter(n => !n.read));
      } else {
        // Read only
        setNotifications(allNotifications.filter(n => n.read));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      showSuccess('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showError('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showSuccess('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showError('Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      showSuccess('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showError('Failed to delete notification');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) return;
    
    try {
      await axios.delete('/api/notifications');
      setNotifications([]);
      showSuccess('All notifications deleted');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      showError('Failed to delete notifications');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task':
        return '📋';
      case 'audit':
        return '✅';
      case 'action':
        return '⚡';
      case 'team':
        return '👥';
      case 'reminder':
        return '⏰';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'task':
        return 'primary';
      case 'audit':
        return 'success';
      case 'action':
        return 'warning';
      case 'team':
        return 'info';
      case 'reminder':
        return 'error';
      default:
        return 'default';
    }
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
      <Container maxWidth="lg">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {notifications.filter(n => !n.read).length > 0 && (
              <Button variant="outlined" onClick={handleMarkAllAsRead}>
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outlined" color="error" onClick={handleDeleteAll}>
                Delete All
              </Button>
            )}
          </Box>
        </Box>

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label={`All (${notifications.length})`} />
              <Tab label={`Unread (${notifications.filter(n => !n.read).length})`} />
              <Tab label={`Read (${notifications.filter(n => n.read).length})`} />
            </Tabs>
          </Box>

          <CardContent sx={{ p: 0 }}>
            {notifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <NotificationsNoneIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No notifications
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {tabValue === 0 
                    ? 'You have no notifications yet'
                    : tabValue === 1
                    ? 'You have no unread notifications'
                    : 'You have no read notifications'}
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {notifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      sx={{
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        borderLeft: notification.read ? 'none' : '4px solid',
                        borderColor: `${getNotificationColor(notification.type)}.main`,
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => handleDelete(notification.id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemButton onClick={() => handleNotificationClick(notification)}>
                        <Box sx={{ display: 'flex', alignItems: 'start', width: '100%', gap: 2 }}>
                          <Typography sx={{ fontSize: 32 }}>
                            {getNotificationIcon(notification.type)}
                          </Typography>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 0.5 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                                {notification.title}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                {!notification.read && (
                                  <Chip label="New" size="small" color="primary" />
                                )}
                                <Chip 
                                  label={notification.type} 
                                  size="small" 
                                  color={getNotificationColor(notification.type)}
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notification.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItemButton>
                    </ListItem>
                    {index < notifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default Notifications;

