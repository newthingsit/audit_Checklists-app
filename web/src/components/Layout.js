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
  MenuItem,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChecklistIcon from '@mui/icons-material/Checklist';
import HistoryIcon from '@mui/icons-material/History';
import AnalyticsIcon from '@mui/icons-material/Analytics';
// AssignmentIcon removed - feature disabled
import StorefrontIcon from '@mui/icons-material/Storefront';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LogoutIcon from '@mui/icons-material/Logout';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
// TaskIcon removed - feature disabled
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TaskIcon from '@mui/icons-material/Task';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { themeConfig } from '../config/theme';
import { hasPermission, isAdmin } from '../utils/permissions';

const drawerWidth = themeConfig.sidebar.width;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { darkMode, toggleDarkMode } = useThemeMode();
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
    ...(hasPermission(userPermissions, 'view_locations') || isAdmin(user) ? [
      { text: 'Stores', icon: <StorefrontIcon />, path: '/stores' }
    ] : []),
    ...(hasPermission(userPermissions, 'view_tasks') || hasPermission(userPermissions, 'manage_tasks') || isAdmin(user) ? [
      { text: 'Tasks', icon: <TaskIcon />, path: '/tasks' }
    ] : []),
    ...(hasPermission(userPermissions, 'view_actions') || hasPermission(userPermissions, 'create_actions') || hasPermission(userPermissions, 'manage_actions') || isAdmin(user) ? [
      { text: 'Action Plans', icon: <AssignmentIcon />, path: '/actions' }
    ] : []),
    ...(hasPermission(userPermissions, 'view_analytics') || isAdmin(user) ? [
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
      { text: 'Dashboard Report', icon: <DashboardIcon />, path: '/dashboard-report' },
      { text: 'Store Analytics', icon: <StorefrontIcon />, path: '/store-analytics' },
      { text: 'Recurring Failures', icon: <WarningAmberIcon />, path: '/recurring-failures' },
      { text: 'Location Verification', icon: <GpsFixedIcon />, path: '/location-verification' },
      { text: 'Monthly Scorecard', icon: <AssessmentIcon />, path: '/scorecard' }
    ] : []),
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ...(isAdmin(user) || hasPermission(userPermissions, 'create_users') || hasPermission(userPermissions, 'manage_users') || hasPermission(userPermissions, 'view_users') ? [
      { text: 'Users', icon: <PeopleIcon />, path: '/users' }
    ] : []),
    ...(isAdmin(user) || hasPermission(userPermissions, 'manage_locations') ? [
      { text: 'Store Assignments', icon: <AssignmentIndIcon />, path: '/store-assignments' }
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

  const getPageTitle = () => {
    const titles = {
      '/dashboard': 'Dashboard',
      '/checklists': 'Checklists',
      '/audits': 'Audit History',
      '/analytics': 'Analytics',
      '/stores': 'Stores',
      '/store-groups': 'Store Groups',
      '/store-assignments': 'Store Assignments',
      '/scheduled': 'Scheduled Audits',
      '/scorecard': 'Monthly Scorecard',
      '/users': 'User Management',
      '/roles': 'Role Management',
      '/profile': 'Profile',
      '/settings': 'Settings',
      '/store-analytics': 'Store Analytics',
      '/recurring-failures': 'Recurring Failures',
      '/location-verification': 'Location Verification',
      '/tasks': 'Tasks & Workflows',
      '/actions': 'Action Plans',
    };
    return titles[location.pathname] || 'Dashboard';
  };

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: themeConfig.sidebar.background,
      color: themeConfig.text.inverse,
    }}>
      {/* Logo/App Name */}
      <Box sx={{ 
        p: 2.5, 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Box sx={{ 
          width: 42, 
          height: 42, 
          borderRadius: themeConfig.borderRadius.medium,
          background: themeConfig.dashboardCards.card1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 1.5,
          boxShadow: themeConfig.shadows.glow,
        }}>
          <RestaurantIcon sx={{ fontSize: 24, color: 'white' }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', letterSpacing: '-0.02em', fontSize: '0.95rem' }}>
          LBF Audit Pro
        </Typography>
      </Box>

      {/* Navigation Menu */}
      <List component="nav" aria-label="Main navigation" sx={{ flex: 1, py: 2, px: 1.5, overflowY: 'auto' }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip 
              key={item.text} 
              title={item.text} 
              placement="right"
              arrow
            >
              <ListItem
                button
                role="menuitem"
                aria-label={item.text}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mb: 0.5,
                  py: 1.25,
                  px: 1.5,
                  borderRadius: themeConfig.borderRadius.medium,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: themeConfig.transitions.fast,
                  bgcolor: isActive ? themeConfig.sidebar.activeBackground : 'transparent',
                  borderLeft: isActive ? `3px solid ${themeConfig.sidebar.activeBorder}` : '3px solid transparent',
                  '&:hover': {
                    bgcolor: isActive ? themeConfig.sidebar.activeBackground : themeConfig.sidebar.hoverBackground,
                  },
                  '&::before': isActive ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: '60%',
                    bgcolor: themeConfig.primary.main,
                    borderRadius: '0 4px 4px 0',
                  } : {},
                  animation: `fadeInLeft ${0.3 + index * 0.05}s ease-out`,
                  '@keyframes fadeInLeft': {
                    from: { opacity: 0, transform: 'translateX(-10px)' },
                    to: { opacity: 1, transform: 'translateX(0)' },
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  color: isActive ? themeConfig.primary.main : 'rgba(255,255,255,0.6)',
                  minWidth: 40,
                  transition: themeConfig.transitions.fast,
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                  }}
                />
              </ListItem>
            </Tooltip>
          );
        })}
      </List>

      {/* User Info at Bottom */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <Typography variant="caption" sx={{ 
          color: themeConfig.primary.light, 
          display: 'block', 
          mb: 0.5,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: '0.65rem',
        }}>
          {user?.role === 'admin' ? 'Administrator' : user?.role === 'manager' ? 'Manager' : 'User'}
        </Typography>
        <Typography variant="body2" sx={{ 
          color: 'rgba(255,255,255,0.8)', 
          fontWeight: 500,
          fontSize: '0.85rem',
        }}>
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
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          color: themeConfig.text.primary,
          borderBottom: `1px solid ${themeConfig.border.light}`,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 }, minHeight: { xs: 64, md: 70 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              aria-label="Open navigation menu"
              sx={{ mr: 2, display: { md: 'none' }, color: themeConfig.text.secondary }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ 
              fontWeight: 700,
              color: themeConfig.text.primary,
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              letterSpacing: '-0.01em',
            }}>
              {getPageTitle()}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <IconButton
                onClick={toggleDarkMode}
                sx={{ 
                  color: themeConfig.text.secondary,
                  '&:hover': {
                    bgcolor: themeConfig.border.light,
                  },
                }}
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            <NotificationBell />
            
            <Box 
              onClick={handleMenuOpen}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                cursor: 'pointer',
                py: 0.75,
                px: 1.5,
                borderRadius: themeConfig.borderRadius.large,
                transition: themeConfig.transitions.fast,
                '&:hover': {
                  bgcolor: themeConfig.border.light,
                },
              }}
            >
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  background: themeConfig.dashboardCards.card1,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {getUserInitials(user?.name)}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: themeConfig.text.primary, lineHeight: 1.2 }}>
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="caption" sx={{ color: themeConfig.text.secondary, fontSize: '0.7rem' }}>
                  {user?.role || 'user'}
                </Typography>
              </Box>
              <KeyboardArrowDownIcon sx={{ color: themeConfig.text.secondary, fontSize: 20 }} />
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 180,
                  borderRadius: themeConfig.borderRadius.medium,
                  boxShadow: themeConfig.shadows.large,
                  border: `1px solid ${themeConfig.border.light}`,
                },
              }}
            >
              <MenuItem 
                onClick={() => { navigate('/profile'); handleMenuClose(); }}
                sx={{ py: 1.25, '&:hover': { bgcolor: themeConfig.border.light } }}
              >
                <PersonIcon sx={{ mr: 1.5, fontSize: 20, color: themeConfig.text.secondary }} />
                <Typography variant="body2">Profile</Typography>
              </MenuItem>
              <MenuItem 
                onClick={() => { navigate('/settings'); handleMenuClose(); }}
                sx={{ py: 1.25, '&:hover': { bgcolor: themeConfig.border.light } }}
              >
                <SettingsIcon sx={{ mr: 1.5, fontSize: 20, color: themeConfig.text.secondary }} />
                <Typography variant="body2">Settings</Typography>
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem 
                onClick={handleLogout}
                sx={{ py: 1.25, color: themeConfig.error.main, '&:hover': { bgcolor: themeConfig.error.bg } }}
              >
                <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              border: 'none',
            },
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
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 8, md: 9 },
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
