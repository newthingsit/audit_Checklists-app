import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import axios from 'axios';
import Layout from '../components/Layout';
import { showError } from '../utils/toast';

const normalizePhotoUrl = (raw) => {
  if (!raw) return '';
  const value = String(raw);
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || '';
  if (value.includes('://')) return value;
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const formatScore = (actual, perfect) => {
  const actualNum = Number(actual);
  const perfectNum = Number(perfect);
  if (!Number.isFinite(actualNum) || !Number.isFinite(perfectNum)) {
    return `${actual ?? '—'}/${perfect ?? '—'}`;
  }
  return `${Math.round(actualNum)}/${Math.round(perfectNum)}`;
};
const formatDisplayDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const AuditReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/reports/audit/${id}/report`);
        setReport(response.data);
      } catch (error) {
        showError(error.response?.data?.error || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const pdfUrl = useMemo(() => `/api/reports/audit/${id}/enhanced-pdf`, [id]);

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Typography color="error">Report data not available.</Typography>
        </Container>
      </Layout>
    );
  }

  const { audit, summary, scoreByCategory, detailedCategories, speedOfService, temperatureTracking, acknowledgement, actionPlan } = report;

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ pb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button variant="contained" startIcon={<PictureAsPdfIcon />} href={pdfUrl}>
            Download PDF
          </Button>
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            {audit.templateName} - Report
          </Typography>
          <Typography variant="h3" color="primary" sx={{ textAlign: 'center', my: 2 }}>
            {summary.overallPercentage}%
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            ({Math.round(summary.totalActual)}/{Math.round(summary.totalPerfect)})
          </Typography>

          <Divider sx={{ my: 3 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary">Outlet</Typography>
              <Typography>{audit.outletName}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary">Outlet Code</Typography>
              <Typography>{audit.outletCode || '—'}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary">City</Typography>
              <Typography>{audit.city || '—'}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary">Submitted By</Typography>
              <Typography>{audit.submittedBy}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary">Start</Typography>
              <Typography>{formatDisplayDate(audit.startDate)}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="caption" color="text.secondary">End</Typography>
              <Typography>{formatDisplayDate(audit.endDate)}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Score By Category</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="center">Perfect Score</TableCell>
                <TableCell align="center">Actual Score</TableCell>
                <TableCell align="center">Percentage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(scoreByCategory || []).map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="center">{Math.round(row.perfectScore)}</TableCell>
                  <TableCell align="center">{Math.round(row.actualScore)}</TableCell>
                  <TableCell align="center">{row.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {(detailedCategories || []).map((category) => (
          <Paper key={category.name} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {category.name} - {category.percentage}% ({formatScore(category.actualScore, category.perfectScore)})
            </Typography>
            {(category.subsections || []).map((section) => (
              <Box key={`${category.name}-${section.name}`} sx={{ mb: 3 }}>
                {section.name !== 'General' && (
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {section.name} ({formatScore(section.actualScore, section.perfectScore)})
                  </Typography>
                )}
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40 }}>#</TableCell>
                      <TableCell>Question</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Response</TableCell>
                      <TableCell>Remarks</TableCell>
                      <TableCell>Photo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(section.items || []).map((item, index) => (
                      <TableRow key={item.audit_item_id || `${item.item_id}-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.title}</TableCell>
                        <TableCell align="center">{formatScore(item.mark || 0, item.maxScore || 0)}</TableCell>
                        <TableCell align="center">
                          {item.selected_option_text ||
                            (String(item.mark || '').toUpperCase() === 'NA' ? 'NA' : (parseFloat(item.mark) > 0 ? 'Yes' : 'No'))}
                        </TableCell>
                        <TableCell>{item.comment || '—'}</TableCell>
                        <TableCell>
                          {item.photo_url ? (
                            <img
                              src={normalizePhotoUrl(item.photo_url)}
                              alt="Audit"
                              style={{ maxWidth: 80, maxHeight: 80 }}
                            />
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))}
          </Paper>
        ))}

        {speedOfService && speedOfService.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Speed of Service - Tracking</Typography>
            {speedOfService.map((group) => (
              <Box key={group.name} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>{group.name}</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Checkpoint</TableCell>
                      <TableCell align="center">Time</TableCell>
                      <TableCell align="center">Seconds</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(group.entries || []).map((entry, index) => (
                      <TableRow key={`${group.name}-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{entry.checkpoint}</TableCell>
                        <TableCell align="center">{entry.time_value || '—'}</TableCell>
                        <TableCell align="center">{entry.seconds ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                    {Number.isFinite(group.averageSeconds) && (
                      <TableRow>
                        <TableCell>AVG</TableCell>
                        <TableCell>Average</TableCell>
                        <TableCell align="center">—</TableCell>
                        <TableCell align="center">{group.averageSeconds}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            ))}
          </Paper>
        )}

        {temperatureTracking && temperatureTracking.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Temperature Tracking</Typography>
            {temperatureTracking.map((group) => (
              <Box key={group.name} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>{group.name}</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell align="center">Type</TableCell>
                      <TableCell align="center">Temperature</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(group.entries || []).map((entry, index) => (
                      <TableRow key={`${group.name}-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{entry.label}</TableCell>
                        <TableCell align="center">{entry.type || '—'}</TableCell>
                        <TableCell align="center">{entry.temperature ?? entry.raw ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                    {Number.isFinite(group.averageTemp) && (
                      <TableRow>
                        <TableCell>AVG</TableCell>
                        <TableCell>Average</TableCell>
                        <TableCell align="center">—</TableCell>
                        <TableCell align="center">{group.averageTemp}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            ))}
          </Paper>
        )}

        {(acknowledgement?.managerName || acknowledgement?.signatureData) && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Acknowledgement</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Manager on Duty</Typography>
                <Typography>{acknowledgement.managerName || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Signature</Typography>
                {acknowledgement.signatureData ? (
                  <img
                    src={acknowledgement.signatureData}
                    alt="Signature"
                    style={{ maxWidth: 180, maxHeight: 60 }}
                  />
                ) : (
                  <Typography>—</Typography>
                )}
              </Grid>
            </Grid>
          </Paper>
        )}

        {actionPlan && actionPlan.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Action Plan</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Question</TableCell>
                  <TableCell>Remarks</TableCell>
                  <TableCell>To-Do</TableCell>
                  <TableCell align="center">Assigned To</TableCell>
                  <TableCell align="center">Due Date</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {actionPlan.map((action, index) => (
                  <TableRow key={`${action.question}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{action.question}</TableCell>
                    <TableCell>{action.remarks || '—'}</TableCell>
                    <TableCell>{action.todo}</TableCell>
                    <TableCell align="center">{action.assignedTo}</TableCell>
                    <TableCell align="center">{formatDisplayDate(action.dueDate)}</TableCell>
                    <TableCell align="center">{action.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Container>
    </Layout>
  );
};

export default AuditReport;
