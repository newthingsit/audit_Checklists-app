import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  Avatar,
  Divider,
  Menu,
  MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChecklistIcon from '@mui/icons-material/Checklist';
import HistoryIcon from '@mui/icons-material/History';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AssignmentIcon from '@mui/icons-material/Assignment';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LogoutIcon from '@mui/icons-material/Logout';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import TaskIcon from '@mui/icons-material/Task';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { themeConfig } from '../config/theme';
import { hasPermission, isAdmin } from '../utils/permissions';

const drawerWidth = 260;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const userPermissions = user?.permissions || [];
  
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    ...(hasPermission(userPermissions, 'display_templates') || hasPermission(userPermissions, 'view_templates') || isAdmin(user) ? [
      { text: 'Checklists', icon: <ChecklistIcon />, path: '/checklists' }
    ] : []),
    { text: 'Audit History', icon: <HistoryIcon />, path: '/audits' },
    ...(hasPermission(userPermissions, 'view_scheduled_audits') || isAdmin(user) ? [
      { text: 'Scheduled', icon: <ScheduleIcon />, path: '/scheduled' }
    ] : []),
    ...(hasPermission(userPermissions, 'view_tasks') || isAdmin(user) ? [
      { text: 'Tasks', icon: <TaskIcon />, path: '/tasks' }
    ] : []),
    ...(hasPermission(userPermissions, 'view_actions') || isAdmin(user) ? [
      { text: 'Action Plans', icon: <AssignmentIcon />, path: '/actions' }
    ] : []),
    ...(hasPermission(userPermissions, 'view_locations') || isAdmin(user) ? [
      { text: 'Stores', icon: <StorefrontIcon />, path: '/stores' }
    ] : []),
    ...(hasPermission(userPermissions, 'view_analytics') || isAdmin(user) ? [
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
      { text: 'Store Analytics', icon: <StorefrontIcon />, path: '/store-analytics' },
      { text: 'Monthly Scorecard', icon: <AssessmentIcon />, path: '/scorecard' }
    ] : []),
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    ...(isAdmin(user) || hasPermission(userPermissions, 'create_users') || hasPermission(userPermissions, 'manage_users') || hasPermission(userPermissions, 'view_users') ? [
      { text: 'Users', icon: <PeopleIcon />, path: '/users' }
    ] : []),
    ...(isAdmin(user) ? [
      { text: 'Roles', icon: <SecurityIcon />, path: '/roles' }
    ] : []),
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setAnchorEl(null);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: themeConfig.background.sidebar }}>
      {/* Logo/App Name */}
      <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: `1px solid ${themeConfig.border.default}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <RestaurantIcon sx={{ mr: 1.5, color: themeConfig.primary.main, fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: themeConfig.primary.main }}>
            Audit Pro
          </Typography>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ flex: 1, pt: 1, px: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
            sx={{
              mb: 0.5,
              borderRadius: 2,
              '&.Mui-selected': {
                bgcolor: themeConfig.primary.main,
                color: 'white',
                '&:hover': {
                  bgcolor: themeConfig.primary.dark,
                },
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
              },
              '&:hover': {
                bgcolor: location.pathname === item.path ? themeConfig.primary.dark : `${themeConfig.primary.main}15`,
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: location.pathname === item.path ? 'white' : themeConfig.text.secondary,
              minWidth: 40 
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{
                fontSize: '0.95rem',
                fontWeight: location.pathname === item.path ? 600 : 400
              }}
            />
          </ListItem>
        ))}
      </List>

      {/* User Info at Bottom */}
      <Box sx={{ p: 2, bgcolor: '#fff', borderTop: `1px solid ${themeConfig.border.default}` }}>
        <Typography variant="caption" sx={{ color: themeConfig.text.secondary, display: 'block', mb: 0.5 }}>
          {user?.role === 'admin' ? 'Administrator' : user?.role === 'manager' ? 'Manager' : 'User'}
        </Typography>
        <Typography variant="body2" sx={{ color: themeConfig.text.primary, fontWeight: 500 }}>
          {user?.email || 'user@example.com'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', bgcolor: themeConfig.background.default, minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: '#fff',
          color: themeConfig.text.primary,
          borderBottom: `1px solid ${themeConfig.border.default}`,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
          <Typography variant="h6" noWrap component="div" sx={{ 
            fontWeight: 600,
            color: themeConfig.primary.main,
            display: { xs: 'none', sm: 'block' }
          }}>
            {location.pathname === '/dashboard' ? 'Dashboard' : 
             location.pathname.includes('/audit') ? 'Audit Management' :
             location.pathname === '/checklists' ? 'Checklists' :
             location.pathname === '/audits' ? 'Audit History' :
             location.pathname === '/analytics' ? 'Analytics' :
             location.pathname === '/actions' ? 'Action Plans' :
             location.pathname === '/stores' ? 'Stores' :
             location.pathname === '/scheduled' ? 'Scheduled Audits' :
             location.pathname === '/tasks' ? 'Tasks & Workflows' :
             location.pathname === '/scorecard' ? 'Monthly Scorecard' :
             location.pathname === '/users' ? 'User Management' :
             location.pathname === '/roles' ? 'Role Management' :
             location.pathname === '/profile' ? 'Profile' : 'Audit Pro'}
          </Typography>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' }, color: '#666' }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationBell />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: themeConfig.primary.main,
                  fontSize: '0.875rem'
                }}
              >
                {getUserInitials(user?.name)}
              </Avatar>
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{ color: '#666' }}
              >
                <AccountCircleIcon />
              </IconButton>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
                <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                Profile
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          bgcolor: themeConfig.background.default,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;

