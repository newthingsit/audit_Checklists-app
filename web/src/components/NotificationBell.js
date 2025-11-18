import React, { useEffect, useState } from 'react';
import { IconButton, Badge, Popover, Typography, Box, List, ListItem, ListItemText, ListItemButton, Button, Divider, Chip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showError } from '../utils/toast';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notifications/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/notifications?limit=10');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
    handleClose();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (!notifications.find(n => n.id === id)?.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

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

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-describedby={id}
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 600 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllAsRead}>
                Mark all read
              </Button>
            )}
          </Box>
          <Divider sx={{ mb: 1 }} />
          
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 500, overflow: 'auto', p: 0 }}>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  disablePadding
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    borderLeft: notification.read ? 'none' : '3px solid',
                    borderColor: 'primary.main',
                    mb: 0.5
                  }}
                >
                  <ListItemButton
                    onClick={() => handleNotificationClick(notification)}
                    sx={{ py: 1.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'start', width: '100%' }}>
                      <Typography sx={{ fontSize: 24, mr: 1.5, mt: 0.5 }}>
                        {getNotificationIcon(notification.type)}
                      </Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Chip label="New" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notification.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
          
          {notifications.length > 0 && (
            <>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  handleClose();
                  navigate('/notifications');
                }}
              >
                View All Notifications
              </Button>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;

