import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Grow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ChecklistIcon from '@mui/icons-material/Checklist';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import StoreIcon from '@mui/icons-material/Store';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import Layout from '../components/Layout';
import { themeConfig } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isAdmin } from '../utils/permissions';
import { withTimeout } from '../utils/fetchUtils';

const Dashboard = () => {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [stats, setStats] = useState({ templates: 0, audits: 0, completed: 0, pendingActions: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaderboard, setLeaderboard] = useState({ stores: [], auditors: [] });
  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const [leaderboardTab, setLeaderboardTab] = useState(0);
  const [trendPeriod, setTrendPeriod] = useState('week');
  const navigate = useNavigate();

  // Permission checks
  const canCreateAudit = hasPermission(userPermissions, 'create_audits') || 
                         hasPermission(userPermissions, 'manage_audits') ||
                         isAdmin(user);
  const canViewActions = hasPermission(userPermissions, 'view_actions') ||
                         hasPermission(userPermissions, 'manage_actions') ||
                         isAdmin(user);
  const canManageScheduled = hasPermission(userPermissions, 'manage_scheduled_audits') ||
                             hasPermission(userPermissions, 'create_scheduled_audits') ||
                             isAdmin(user);
  const canManageTemplates = hasPermission(userPermissions, 'manage_templates') ||
                             hasPermission(userPermissions, 'edit_templates') ||
                             hasPermission(userPermissions, 'create_templates') ||
                             isAdmin(user);
  const canViewAudits = hasPermission(userPermissions, 'view_audits') ||
                        hasPermission(userPermissions, 'manage_audits') ||
                        hasPermission(userPermissions, 'view_own_audits') ||
                        isAdmin(user);
  const canViewAnalytics = hasPermission(userPermissions, 'view_analytics') || isAdmin(user);
  const canViewScheduleAdherence = hasPermission(userPermissions, 'view_schedule_adherence') || 
                                    hasPermission(userPermissions, 'view_analytics') || 
                                    isAdmin(user);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const requestConfig = {
        timeout: 30000 // 30 second timeout
      };
      
      const fetchPromises = [
        // Templates
        (hasPermission(userPermissions, 'display_templates') || 
         hasPermission(userPermissions, 'view_templates') || 
         hasPermission(userPermissions, 'manage_templates') || 
         isAdmin(user))
          ? withTimeout(axios.get('/api/templates', requestConfig), 30000).catch((err) => {
              if (process.env.NODE_ENV !== 'production') console.error('Templates fetch error:', err.message);
              return { data: { templates: [] } };
            })
          : Promise.resolve({ data: { templates: [] } }),
        // Audits
        canViewAudits
          ? withTimeout(axios.get('/api/audits', requestConfig), 30000).catch((err) => {
              if (process.env.NODE_ENV !== 'production') console.error('Audits fetch error:', err.message);
              return { data: { audits: [] } };
            })
          : Promise.resolve({ data: { audits: [] } }),
        // Actions
        canViewActions 
          ? withTimeout(axios.get('/api/actions', requestConfig), 30000).catch((err) => {
              if (process.env.NODE_ENV !== 'production') console.error('Actions fetch error:', err.message);
              return { data: { actions: [] } };
            })
          : Promise.resolve({ data: { actions: [] } }),
        // Analytics
        canViewAnalytics
          ? withTimeout(axios.get('/api/analytics/dashboard', requestConfig), 30000).catch((err) => {
              if (process.env.NODE_ENV !== 'production') console.error('Analytics fetch error:', err.message);
              setError('Dashboard data temporarily unavailable. Showing cached data if available.');
              return { data: analytics || {} }; // Use existing analytics if available
            })
          : Promise.resolve({ data: {} }),
        // Trends
        canViewAnalytics
          ? withTimeout(axios.get('/api/analytics/trends?period=month', requestConfig), 30000).catch((err) => {
              if (process.env.NODE_ENV !== 'production') console.error('Trends fetch error:', err.message);
              return { data: { trends: [] } };
            })
          : Promise.resolve({ data: { trends: [] } }),
        // Leaderboard - Stores
        canViewAnalytics
          ? withTimeout(axios.get('/api/analytics/leaderboard/stores?limit=5', requestConfig), 30000).catch((err) => {
              if (process.env.NODE_ENV !== 'production') console.error('Store leaderboard fetch error:', err.message);
              return { data: { stores: [] } };
            })
          : Promise.resolve({ data: { stores: [] } }),
        // Leaderboard - Auditors
        canViewAnalytics
          ? withTimeout(axios.get('/api/analytics/leaderboard/auditors?limit=5', requestConfig), 30000).catch((err) => {
              if (process.env.NODE_ENV !== 'production') console.error('Auditor leaderboard fetch error:', err.message);
              return { data: { auditors: [] } };
            })
          : Promise.resolve({ data: { auditors: [] } }),
        // Trend Analysis
        canViewAnalytics
          ? withTimeout(axios.get('/api/analytics/trends/analysis?period=week', requestConfig), 30000).catch((err) => {
              console.error('Trend analysis fetch error:', err.message);
              return { data: {} };
            })
          : Promise.resolve({ data: {} })
      ];

      const [templatesRes, auditsRes, actionsRes, analyticsRes, trendsRes, storesLeaderboardRes, auditorsLeaderboardRes, trendAnalysisRes] = await Promise.all(fetchPromises);

      const audits = auditsRes.data.audits || [];
      const completed = audits.filter(a => a.status === 'completed').length;
      const pendingActions = (actionsRes.data.actions || []).filter(a => a.status === 'pending').length;

      setStats({
        templates: templatesRes.data.templates?.length || 0,
        audits: audits.length,
        completed,
        pendingActions
      });

      setAnalytics(analyticsRes.data);
      setTrends(trendsRes.data.trends || []);
      setRecentAudits(analyticsRes.data?.recent || audits.slice(0, 5));
      setLeaderboard({
        stores: storesLeaderboardRes.data.stores || [],
        auditors: auditorsLeaderboardRes.data.auditors || []
      });
      setTrendAnalysis(trendAnalysisRes.data);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canViewAudits, canViewActions, canViewAnalytics]);

  const fetchTrendAnalysis = useCallback(async (period) => {
    try {
      const response = await axios.get(`/api/analytics/trends/analysis?period=${period}`);
      setTrendAnalysis(response.data);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Error fetching trend analysis:', error);
    }
  }, []);

  const handleTrendPeriodChange = (e) => {
    const period = e.target.value;
    setTrendPeriod(period);
    fetchTrendAnalysis(period);
  };

  const getMedalColor = (rank) => {
    switch(rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return '#9e9e9e';
    }
  };

  const getMedalEmoji = (rank) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
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

  const completionRate = useMemo(() => 
    stats.audits > 0 ? Math.round((stats.completed / stats.audits) * 100) : 0
  , [stats.audits, stats.completed]);
  const monthChange = analytics?.monthChange || {};
  const currentMonthStats = analytics?.currentMonthStats || {};
  const lastMonthStats = analytics?.lastMonthStats || {};

  // Prepare chart data (memoized to avoid recalculation on every render)
  const statusColors = {
    completed: '#4caf50',
    in_progress: '#ff9800',
    pending: '#9e9e9e'
  };

  const pieData = useMemo(() => 
    analytics?.byStatus?.map(status => ({
      name: status.status === 'completed' ? 'Completed' : status.status === 'in_progress' ? 'In Progress' : 'Pending',
      value: status.count,
      color: statusColors[status.status] || '#9e9e9e'
    })) || []
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [analytics?.byStatus]);

  const monthTrendData = useMemo(() => 
    analytics?.byMonth?.map(month => ({
      month: new Date(month.month + '-01').toLocaleDateString('default', { month: 'short', year: 'numeric' }),
      count: month.count
    })) || []
  , [analytics?.byMonth]);

  const trendChartData = useMemo(() => 
    (trends || []).map(trend => ({
      period: trend.period,
      total: trend.total,
      completed: trend.completed,
      avgScore: Math.round((trend.avg_score || 0) * 100) / 100
    }))
  , [trends]);

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ px: isMobile ? 2 : 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
            Dashboard
          </Typography>
          <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ color: '#666' }}>
            Welcome back! Here's an overview of your audit activities and performance trends.
          </Typography>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
          {(hasPermission(userPermissions, 'display_templates') || 
             hasPermission(userPermissions, 'view_templates') || 
             hasPermission(userPermissions, 'manage_templates') || 
             isAdmin(user)) && (
            <Grid item xs={12} sm={6} md={3}>
              <Fade in timeout={600}>
                <Card sx={{ 
                  background: themeConfig.dashboardCards.card1,
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: isMobile ? 3 : 2,
                  boxShadow: isMobile ? '0 6px 18px rgba(0,0,0,0.12)' : undefined
                }}>
                  <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                    <ChecklistIcon sx={{ fontSize: 120 }} />
                  </Box>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2, width: isMobile ? 44 : 40, height: isMobile ? 44 : 40 }}>
                        <ChecklistIcon />
                      </Avatar>
                      <Box>
                        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
                          {stats.templates}
                        </Typography>
                        <Typography variant={isMobile ? 'body2' : 'body2'} sx={{ opacity: 0.9 }}>
                          Templates
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          )}

          {canViewAudits && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Fade in timeout={800}>
                  <Card sx={{ 
                    background: themeConfig.dashboardCards.card2,
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: isMobile ? 3 : 2,
                    boxShadow: isMobile ? '0 6px 18px rgba(0,0,0,0.12)' : undefined
                  }}>
                    <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                      <HistoryIcon sx={{ fontSize: 120 }} />
                    </Box>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2, width: isMobile ? 44 : 40, height: isMobile ? 44 : 40 }}>
                          <HistoryIcon />
                        </Avatar>
                        <Box>
                          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
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
                    overflow: 'hidden',
                    borderRadius: isMobile ? 3 : 2,
                    boxShadow: isMobile ? '0 6px 18px rgba(0,0,0,0.12)' : undefined
                  }}>
                    <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                      <CheckCircleIcon sx={{ fontSize: 120 }} />
                    </Box>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2, width: isMobile ? 44 : 40, height: isMobile ? 44 : 40 }}>
                          <CheckCircleIcon />
                        </Avatar>
                        <Box>
                          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
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
                    overflow: 'hidden',
                    borderRadius: isMobile ? 3 : 2,
                    boxShadow: isMobile ? '0 6px 18px rgba(0,0,0,0.12)' : undefined
                  }}>
                    <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                      <TrendingUpIcon sx={{ fontSize: 120 }} />
                    </Box>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2, width: isMobile ? 44 : 40, height: isMobile ? 44 : 40 }}>
                          <TrendingUpIcon />
                        </Avatar>
                        <Box>
                          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
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

              {/* Schedule Adherence Card */}
              {canViewScheduleAdherence && analytics?.scheduleAdherence !== undefined && (
                <Grid item xs={12} sm={6} md={3}>
                  <Fade in timeout={1400}>
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: isMobile ? 3 : 2,
                      boxShadow: isMobile ? '0 6px 18px rgba(0,0,0,0.12)' : undefined
                    }}>
                      <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                        <ScheduleIcon sx={{ fontSize: 120 }} />
                      </Box>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2, width: isMobile ? 44 : 40, height: isMobile ? 44 : 40 }}>
                            <ScheduleIcon />
                          </Avatar>
                          <Box>
                            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
                              {analytics.scheduleAdherence.adherence || 0}%
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Schedule Adherence
                            </Typography>
                          </Box>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={analytics.scheduleAdherence.adherence || 0} 
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
                        <Typography variant="caption" sx={{ opacity: 0.8, mt: 1, display: 'block' }}>
                          {analytics.scheduleAdherence.onTime || 0} of {analytics.scheduleAdherence.total || 0} on time
                        </Typography>
                      </CardContent>
                    </Card>
                  </Fade>
                </Grid>
              )}
            </>
          )}
        </Grid>

        {/* Month-over-Month Comparison */}
        {canViewAnalytics && analytics && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    This Month vs Last Month
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Total Audits
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {currentMonthStats.total}
                          </Typography>
                          {monthChange.total !== 0 && (
                            <Chip
                              icon={monthChange.total > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                              label={Math.abs(monthChange.total)}
                              color={monthChange.total > 0 ? 'success' : 'error'}
                              size="small"
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Last month: {lastMonthStats.total}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Completed Audits
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {currentMonthStats.completed}
                          </Typography>
                          {monthChange.completed !== 0 && (
                            <Chip
                              icon={monthChange.completed > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                              label={Math.abs(monthChange.completed)}
                              color={monthChange.completed > 0 ? 'success' : 'error'}
                              size="small"
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Last month: {lastMonthStats.completed}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Average Score
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {currentMonthStats.avgScore}%
                          </Typography>
                          {monthChange.avgScore !== 0 && (
                            <Chip
                              icon={monthChange.avgScore > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                              label={`${monthChange.avgScore > 0 ? '+' : ''}${Math.round(monthChange.avgScore * 100) / 100}%`}
                              color={monthChange.avgScore > 0 ? 'success' : 'error'}
                              size="small"
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Last month: {lastMonthStats.avgScore}%
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Charts Section */}
        {canViewAnalytics && analytics && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Audit Status Pie Chart */}
            {pieData.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Audits by Status
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Monthly Trend Chart */}
            {monthTrendData.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Audit Trends (Last 6 Months)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#1976d2" name="Total Audits" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Performance Trend Line Chart */}
            {trendChartData.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      Performance Trends (Last 12 Months)
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#1976d2" name="Total Audits" />
                        <Line type="monotone" dataKey="completed" stroke="#4caf50" name="Completed" />
                        <Line type="monotone" dataKey="avgScore" stroke="#ff9800" name="Avg Score %" yAxisId="right" />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        {/* Leaderboard Section */}
        {canViewAnalytics && (leaderboard.stores.length > 0 || leaderboard.auditors.length > 0) && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <EmojiEventsIcon sx={{ mr: 1, fontSize: 28 }} />
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      🏆 Leaderboard
                    </Typography>
                  </Box>
                  <Tabs
                    value={leaderboardTab}
                    onChange={(e, newValue) => setLeaderboardTab(newValue)}
                    sx={{
                      mb: 2,
                      '& .MuiTab-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .Mui-selected': { color: 'white' },
                      '& .MuiTabs-indicator': { backgroundColor: 'white' }
                    }}
                  >
                    <Tab label="Top Stores" icon={<StoreIcon />} iconPosition="start" />
                    <Tab label="Top Auditors" icon={<PersonIcon />} iconPosition="start" />
                  </Tabs>
                  
                  {leaderboardTab === 0 && leaderboard.stores.length > 0 && (
                    <Grid container spacing={2}>
                      {leaderboard.stores.map((store, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={2.4} key={store.location_id || index}>
                          <Paper sx={{ 
                            p: 2, 
                            textAlign: 'center',
                            background: index < 3 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                            borderRadius: 2,
                            border: index === 0 ? '2px solid #FFD700' : index === 1 ? '2px solid #C0C0C0' : index === 2 ? '2px solid #CD7F32' : 'none',
                            transform: index === 0 ? 'scale(1.05)' : 'none',
                            transition: 'all 0.3s'
                          }}>
                            <Typography variant="h3" sx={{ mb: 1 }}>
                              {getMedalEmoji(index + 1)}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }} noWrap>
                              {store.store_name || 'Unknown'}
                            </Typography>
                            {store.store_number && (
                              <Typography variant="caption" sx={{ opacity: 0.8, color: 'white' }}>
                                #{store.store_number}
                              </Typography>
                            )}
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FFD700' }}>
                                {Math.round(store.avg_score || 0)}%
                              </Typography>
                              <Typography variant="caption" sx={{ opacity: 0.7, color: 'white' }}>
                                {store.audit_count} audits
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                  
                  {leaderboardTab === 1 && leaderboard.auditors.length > 0 && (
                    <Grid container spacing={2}>
                      {leaderboard.auditors.map((auditor, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={2.4} key={auditor.user_id || index}>
                          <Paper sx={{ 
                            p: 2, 
                            textAlign: 'center',
                            background: index < 3 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                            borderRadius: 2,
                            border: index === 0 ? '2px solid #FFD700' : index === 1 ? '2px solid #C0C0C0' : index === 2 ? '2px solid #CD7F32' : 'none',
                            transform: index === 0 ? 'scale(1.05)' : 'none',
                            transition: 'all 0.3s'
                          }}>
                            <Typography variant="h3" sx={{ mb: 1 }}>
                              {getMedalEmoji(index + 1)}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }} noWrap>
                              {auditor.user_name || 'Unknown'}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FFD700' }}>
                                {auditor.audit_count}
                              </Typography>
                              <Typography variant="caption" sx={{ opacity: 0.7, color: 'white' }}>
                                audits completed
                              </Typography>
                              {auditor.avg_score && (
                                <Typography variant="body2" sx={{ color: '#90EE90', mt: 0.5 }}>
                                  Avg: {Math.round(auditor.avg_score)}%
                                </Typography>
                              )}
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                  
                  {((leaderboardTab === 0 && leaderboard.stores.length === 0) || 
                    (leaderboardTab === 1 && leaderboard.auditors.length === 0)) && (
                    <Typography variant="body1" sx={{ textAlign: 'center', py: 3, opacity: 0.7 }}>
                      No data available yet
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Trend Analysis Section */}
        {canViewAnalytics && trendAnalysis && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        📊 Trend Analysis
                      </Typography>
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Period</InputLabel>
                      <Select value={trendPeriod} onChange={handleTrendPeriodChange} label="Period">
                        <MenuItem value="day">Daily</MenuItem>
                        <MenuItem value="week">Weekly</MenuItem>
                        <MenuItem value="month">Monthly</MenuItem>
                        <MenuItem value="quarter">Quarterly</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Grid container spacing={3}>
                    {/* Current Period Stats */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white', borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
                          Current Period
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                              {trendAnalysis.currentPeriod?.total || 0}
                            </Typography>
                            <Typography variant="caption">Total Audits</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                              {trendAnalysis.currentPeriod?.completed || 0}
                            </Typography>
                            <Typography variant="caption">Completed</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                              {Math.round(trendAnalysis.currentPeriod?.avgScore || 0)}%
                            </Typography>
                            <Typography variant="caption">Avg Score</Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                    
                    {/* Previous Period Stats */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Previous Period
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {trendAnalysis.previousPeriod?.total || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Total Audits</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {trendAnalysis.previousPeriod?.completed || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Completed</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {Math.round(trendAnalysis.previousPeriod?.avgScore || 0)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Avg Score</Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                    
                    {/* Change Indicators */}
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <CompareArrowsIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Period Comparison
                          </Typography>
                        </Box>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={4}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Chip
                                icon={(trendAnalysis.changes?.totalChange || 0) >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                label={`${(trendAnalysis.changes?.totalChange || 0) >= 0 ? '+' : ''}${trendAnalysis.changes?.totalChange || 0}`}
                                color={(trendAnalysis.changes?.totalChange || 0) >= 0 ? 'success' : 'error'}
                                sx={{ fontSize: '1rem', py: 2, px: 1 }}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Total Audits Change
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Chip
                                icon={(trendAnalysis.changes?.completedChange || 0) >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                label={`${(trendAnalysis.changes?.completedChange || 0) >= 0 ? '+' : ''}${trendAnalysis.changes?.completedChange || 0}`}
                                color={(trendAnalysis.changes?.completedChange || 0) >= 0 ? 'success' : 'error'}
                                sx={{ fontSize: '1rem', py: 2, px: 1 }}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Completed Change
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Chip
                                icon={(trendAnalysis.changes?.scoreChange || 0) >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                label={`${(trendAnalysis.changes?.scoreChange || 0) >= 0 ? '+' : ''}${Math.round(trendAnalysis.changes?.scoreChange || 0)}%`}
                                color={(trendAnalysis.changes?.scoreChange || 0) >= 0 ? 'success' : 'error'}
                                sx={{ fontSize: '1rem', py: 2, px: 1 }}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Score Change
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Top Performing Stores */}
        {canViewAnalytics && analytics?.topStores && analytics.topStores.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StoreIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Top Performing Stores
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Store</TableCell>
                          <TableCell align="right">Audits</TableCell>
                          <TableCell align="right">Avg Score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.topStores.map((store, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {store.store_name || 'Unknown'}
                              {store.store_number && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  #{store.store_number}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">{store.audit_count}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${Math.round((store.avg_score || 0) * 100) / 100}%`}
                                size="small"
                                color={store.avg_score >= 80 ? 'success' : store.avg_score >= 60 ? 'warning' : 'error'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Top Users */}
            {analytics?.topUsers && analytics.topUsers.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Top Users
                      </Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell align="right">Audits</TableCell>
                            <TableCell align="right">Avg Score</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analytics.topUsers.map((user, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {user.user_name || 'Unknown'}
                                {user.email && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {user.email}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">{user.audit_count}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={`${Math.round((user.avg_score || 0) * 100) / 100}%`}
                                  size="small"
                                  color={user.avg_score >= 80 ? 'success' : user.avg_score >= 60 ? 'warning' : 'error'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        {/* Recent Audits Section */}
        {canViewAudits && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
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
                {(hasPermission(userPermissions, 'view_scheduled_audits') || isAdmin(user)) && (
                  <Button
                    variant="outlined"
                    startIcon={<ScheduleIcon />}
                    onClick={() => navigate('/scheduled')}
                  >
                    Scheduled
                  </Button>
                )}
                {canCreateAudit && (
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
                )}
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
                {canCreateAudit && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/checklists')}
                    sx={{ mt: 2 }}
                  >
                    Create First Audit
                  </Button>
                )}
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
        )}

        {/* Quick Actions */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {canCreateAudit && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/checklists')}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    Start New Audit
                  </Button>
                )}
                {canManageScheduled && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ScheduleIcon />}
                    onClick={() => navigate('/scheduled')}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    Schedule Audit
                  </Button>
                )}
                {canManageTemplates && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ChecklistIcon />}
                    onClick={() => navigate('/checklists')}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    Manage Templates
                  </Button>
                )}
                {canViewAudits && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => navigate('/audits')}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    View All Audits
                  </Button>
                )}
                {!canCreateAudit && !canManageScheduled && !canManageTemplates && !canViewAudits && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No quick actions available
                  </Typography>
                )}
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
