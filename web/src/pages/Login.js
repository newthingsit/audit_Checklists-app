import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';
import { showError } from '../utils/toast';
import { themeConfig } from '../config/theme';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: themeConfig.auth.gradient,
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(ellipse at 20% 80%, ${themeConfig.auth.accentGlow} 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 60%)
        `,
        animation: 'pulse 12s ease-in-out infinite',
      },
      '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.7 },
      },
    }}>
      {/* Floating shapes */}
      <Box sx={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${themeConfig.auth.accentGlow} 0%, transparent 70%)`,
        top: '-200px',
        right: '-150px',
        animation: 'float 10s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-30px) scale(1.05)' },
        },
      }} />
      <Box sx={{
        position: 'absolute',
        width: 350,
        height: 350,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, transparent 70%)',
        bottom: '-120px',
        left: '-120px',
        animation: 'float 12s ease-in-out infinite reverse',
      }} />

      <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Logo */}
          <Box sx={{ 
            width: 100, 
            height: 100, 
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${themeConfig.primary.main} 0%, ${themeConfig.primary.light} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            boxShadow: themeConfig.shadows.glow,
            border: '3px solid rgba(255,255,255,0.15)',
            transition: themeConfig.transitions.normal,
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 0 50px rgba(196, 30, 58, 0.35)',
            },
          }}>
            <RestaurantIcon sx={{ fontSize: 50, color: 'white' }} />
          </Box>

          {/* Title */}
          <Typography 
            component="h1" 
            sx={{ 
              color: 'white', 
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textAlign: 'center',
              fontSize: { xs: '1.75rem', sm: '2.25rem' },
              mb: 0.5,
            }}
          >
            Lite Bite Foods
          </Typography>
          <Typography 
            component="h2" 
            sx={{ 
              color: themeConfig.primary.main, 
              fontWeight: 600,
              letterSpacing: '0.2em',
              textAlign: 'center',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              mb: 1.5,
            }}
          >
            Audit Pro
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(255,255,255,0.5)', 
              mb: 4,
              fontWeight: 400,
            }}
          >
            Sign in to continue
          </Typography>

          {/* Login Card */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 5, 
              width: '100%', 
              borderRadius: themeConfig.borderRadius.xl,
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)',
              boxShadow: themeConfig.shadows.xl,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: themeConfig.borderRadius.medium,
                  animation: 'shake 0.5s ease-in-out',
                  '@keyframes shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-5px)' },
                    '75%': { transform: 'translateX(5px)' },
                  },
                }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email Address"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: themeConfig.text.secondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: themeConfig.borderRadius.medium,
                    transition: themeConfig.transitions.fast,
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: themeConfig.primary.light,
                      },
                    },
                    '&.Mui-focused': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: themeConfig.primary.main,
                        borderWidth: 2,
                      },
                    },
                  },
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: themeConfig.text.secondary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: themeConfig.text.secondary }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: themeConfig.borderRadius.medium,
                    transition: themeConfig.transitions.fast,
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: themeConfig.primary.light,
                      },
                    },
                    '&.Mui-focused': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: themeConfig.primary.main,
                        borderWidth: 2,
                      },
                    },
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ 
                  py: 1.75,
                  borderRadius: themeConfig.borderRadius.medium,
                  background: `linear-gradient(135deg, ${themeConfig.primary.main} 0%, ${themeConfig.primary.light} 100%)`,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(196, 30, 58, 0.3)',
                  transition: themeConfig.transitions.normal,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${themeConfig.primary.dark} 0%, ${themeConfig.primary.main} 100%)`,
                    boxShadow: '0 6px 20px rgba(196, 30, 58, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    background: themeConfig.border.default,
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  'Sign In'
                )}
              </Button>

{/* Sign Up link hidden - registration disabled */}
            </form>
          </Paper>

          {/* Footer */}
          <Typography 
            variant="caption" 
            sx={{ 
              mt: 4, 
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            © 2025 Lite Bite Foods Audit Pro. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
