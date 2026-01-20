import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import GridOnIcon from '@mui/icons-material/GridOn';
import EmailIcon from '@mui/icons-material/Email';
import ShareIcon from '@mui/icons-material/Share';
import AssessmentIcon from '@mui/icons-material/Assessment';
import axios from 'axios';
import { showSuccess, showError } from '../utils/toast';

const ExportMenu = ({ auditId, auditName, audits, onExport }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (format) => {
    try {
      let url = '';
      let filename = '';
      let response;

      if (auditId) {
        // Single audit export
        if (format === 'pdf') {
          url = `/api/reports/audit/${auditId}/pdf`;
          filename = `${auditName || 'audit'}.pdf`;
          // Use axios to fetch PDF with authentication
          response = await axios.get(url, {
            responseType: 'blob',
            headers: {
              'Accept': 'application/pdf'
            }
          });
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(downloadUrl);
        } else if (format === 'enhanced-pdf') {
          // Enhanced QA Report with Executive Summary, Deviations & Action Plan
          url = `/api/reports/audit/${auditId}/enhanced-pdf`;
          filename = `${auditName || 'QA Audit'} - Enhanced Report.pdf`;
          response = await axios.get(url, {
            responseType: 'blob',
            headers: {
              'Accept': 'application/pdf'
            }
          });
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(downloadUrl);
        } else if (format === 'csv') {
          url = `/api/reports/audit/${auditId}/csv`;
          filename = `${auditName || 'audit'}.csv`;
          response = await axios.get(url, {
            responseType: 'blob',
            headers: {
              'Accept': 'text/csv'
            }
          });
          const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
        } else if (format === 'excel') {
          url = `/api/reports/audits/excel?ids=${auditId}`;
          filename = `${auditName || 'audit'}.xlsx`;
          response = await axios.get(url, {
            responseType: 'blob',
            headers: {
              'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
          });
          const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
        }
      } else {
        // Multiple audits export - use filtered audits if provided
        if (audits && Array.isArray(audits) && audits.length > 0) {
          // Export filtered audits
          const auditIds = audits.map(a => a.id).join(',');
          if (format === 'pdf') {
            url = `/api/reports/audits/pdf?ids=${auditIds}`;
            response = await axios.get(url, {
              responseType: 'blob',
              headers: {
                'Accept': 'application/pdf'
              }
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `audits-${audits.length}-selected.pdf`;
            link.click();
            window.URL.revokeObjectURL(downloadUrl);
          } else if (format === 'csv') {
            url = `/api/reports/audits/csv?ids=${auditIds}`;
            filename = `audits-${new Date().toISOString().split('T')[0]}.csv`;
            response = await axios.get(url, {
              responseType: 'blob',
              headers: {
                'Accept': 'text/csv'
              }
            });
            const blob = new Blob([response.data], { type: 'text/csv' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.click();
            window.URL.revokeObjectURL(downloadUrl);
          } else if (format === 'excel') {
            url = `/api/reports/audits/excel?ids=${auditIds}`;
            filename = `audits-${new Date().toISOString().split('T')[0]}.xlsx`;
            response = await axios.get(url, {
              responseType: 'blob',
              headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              }
            });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.click();
            window.URL.revokeObjectURL(downloadUrl);
          }
        } else {
          // Export all audits
          if (format === 'pdf') {
            url = '/api/reports/audits/pdf';
            response = await axios.get(url, {
              responseType: 'blob',
              headers: {
                'Accept': 'application/pdf'
              }
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'all-audits.pdf';
            link.click();
            window.URL.revokeObjectURL(downloadUrl);
          } else if (format === 'csv') {
            url = '/api/reports/audits/csv';
            filename = `audits-${new Date().toISOString().split('T')[0]}.csv`;
            response = await axios.get(url, {
              responseType: 'blob',
              headers: {
                'Accept': 'text/csv'
              }
            });
            const blob = new Blob([response.data], { type: 'text/csv' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.click();
            window.URL.revokeObjectURL(downloadUrl);
          } else if (format === 'excel') {
            url = '/api/reports/audits/excel';
            filename = `audits-${new Date().toISOString().split('T')[0]}.xlsx`;
            response = await axios.get(url, {
              responseType: 'blob',
              headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              }
            });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.click();
            window.URL.revokeObjectURL(downloadUrl);
          }
        }
      }

      if (onExport) {
        onExport(format);
      }
      showSuccess(`${format.toUpperCase()} exported successfully!`);
      handleClose();
    } catch (error) {
      console.error('Export error:', error);
      const errorMsg = error.response?.data?.error || error.message || `Failed to export ${format.toUpperCase()}`;
      showError(errorMsg);
    }
  };

  const handleEmailShare = async () => {
    try {
      if (auditId) {
        // Single audit email
        const emailUrl = `/audit/${auditId}`;
        const subject = encodeURIComponent(`Audit Report: ${auditName || 'Audit'}`);
        const body = encodeURIComponent(`Please review this audit report:\n${window.location.origin}${emailUrl}`);
        window.open(`mailto:?subject=${subject}&body=${body}`);
      } else if (audits && audits.length > 0) {
        // Multiple audits email
        const auditLinks = audits.map(a => `${window.location.origin}/audit/${a.id}`).join('\n');
        const subject = encodeURIComponent(`Audit Reports: ${audits.length} audits`);
        const body = encodeURIComponent(`Please review these audit reports:\n\n${auditLinks}`);
        window.open(`mailto:?subject=${subject}&body=${body}`);
      }
      handleClose();
    } catch (error) {
      console.error('Email share error:', error);
      showError('Failed to open email client');
    }
  };

  return (
    <>
      <Tooltip title="Export Options">
        <IconButton
          onClick={handleClick}
          color="primary"
          size="small"
        >
          <FileDownloadIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {auditId && (
          <MenuItem onClick={() => handleExport('enhanced-pdf')}>
            <ListItemIcon>
              <AssessmentIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="QA Report (Enhanced)" 
              secondary="With Executive Summary & Action Plan"
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        )}
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon>
            <PictureAsPdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('excel')}>
          <ListItemIcon>
            <GridOnIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as Excel</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEmailShare}>
          <ListItemIcon>
            <EmailIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share via Email</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportMenu;

