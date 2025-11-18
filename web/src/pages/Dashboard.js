import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Chip,
  LinearProgress,
  Avatar,
  Paper,
  Fade,
  Grow
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ChecklistIcon from '@mui/icons-material/Checklist';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import axios from 'axios';
import Layout from '../components/Layout';
import { themeConfig } from '../config/theme';

const Dashboard = () => {
  const [stats, setStats] = useState({ templates: 0, audits: 0, completed: 0, pendingActions: 0 });
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, auditsRes, actionsRes] = await Promise.all([
        axios.get('/api/templates'),
        axios.get('/api/audits'),
        axios.get('/api/actions').catch(() => ({ data: { actions: [] } }))
      ]);

      const audits = auditsRes.data.audits || [];
      const completed = audits.filter(a => a.status === 'completed').length;
      const pendingActions = (actionsRes.data.actions || []).filter(a => a.status === 'pending').length;

      setStats({
        templates: templatesRes.data.templates?.length || 0,
        audits: audits.length,
        completed,
        pendingActions
      });

      setRecentAudits(audits.slice(0, 5));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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

  const completionRate = stats.audits > 0 ? Math.round((stats.completed / stats.audits) * 100) : 0;

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
            Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: '#666' }}>
            Welcome back! Here's an overview of your audit activities.
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Fade in timeout={600}>
              <Card sx={{ 
                background: themeConfig.dashboardCards.card1,
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                  <ChecklistIcon sx={{ fontSize: 120 }} />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                      <ChecklistIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stats.templates}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Templates
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Fade in timeout={800}>
              <Card sx={{ 
                background: themeConfig.dashboardCards.card2,
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                  <HistoryIcon sx={{ fontSize: 120 }} />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                      <HistoryIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stats.audits}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Total Audits
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Fade in timeout={1000}>
              <Card sx={{ 
                background: themeConfig.dashboardCards.card3,
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                  <CheckCircleIcon sx={{ fontSize: 120 }} />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                      <CheckCircleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stats.completed}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Completed
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Fade in timeout={1200}>
              <Card sx={{ 
                background: themeConfig.dashboardCards.card4,
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                  <TrendingUpIcon sx={{ fontSize: 120 }} />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                      <TrendingUpIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {completionRate}%
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Completion Rate
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={completionRate} 
                    sx={{ 
                      mt: 1, 
                      height: 6, 
                      borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'white'
                      }
                    }} 
                  />
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        </Grid>

        <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                Recent Audits
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your latest audit activities
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<ScheduleIcon />}
                onClick={() => navigate('/scheduled')}
              >
                Scheduled
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/checklists')}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #653a8f 100%)',
                  }
                }}
              >
                New Audit
              </Button>
            </Box>
          </Box>

          {recentAudits.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <RestaurantIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No audits yet
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create your first audit to get started!
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/checklists')}
                sx={{ mt: 2 }}
              >
                Create First Audit
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {recentAudits.map((audit, index) => (
                <Grid item xs={12} sm={6} md={4} key={audit.id}>
                  <Grow in timeout={300 + index * 100}>
                    <Card
                      sx={{ 
                        cursor: 'pointer',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s ease',
                        '&:hover': { 
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => navigate(`/audit/${audit.id}`)}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                            <RestaurantIcon />
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                              {audit.restaurant_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {audit.template_name}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(audit.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Chip
                            label={audit.status}
                            color={audit.status === 'completed' ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                          {audit.score !== null && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <TrendingUpIcon sx={{ fontSize: 18, color: 'success.main', mr: 0.5 }} />
                              <Typography variant="body2" fontWeight="bold" color="success.main">
                                {audit.score}%
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grow>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/checklists')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Start New Audit
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => navigate('/scheduled')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Schedule Audit
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ChecklistIcon />}
                  onClick={() => navigate('/checklists')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  Manage Templates
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate('/audits')}
                  sx={{ justifyContent: 'flex-start', py: 1.5 }}
                >
                  View All Audits
                </Button>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Recent Activity
              </Typography>
              {recentAudits.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No recent activity
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recentAudits.slice(0, 5).map((audit) => (
                    <Box
                      key={audit.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'grey.50',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'grey.100' }
                      }}
                      onClick={() => navigate(`/audit/${audit.id}`)}
                    >
                      <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: audit.status === 'completed' ? 'success.light' : 'warning.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {audit.status === 'completed' ? (
                          <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
                        ) : (
                          <ScheduleIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                        )}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                          {audit.restaurant_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(audit.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      {audit.score !== null && (
                        <Chip
                          label={`${audit.score}%`}
                          size="small"
                          color={audit.score >= 80 ? 'success' : audit.score >= 60 ? 'warning' : 'error'}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default Dashboard;

