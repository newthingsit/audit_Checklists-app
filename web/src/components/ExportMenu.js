import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import DescriptionIcon from '@mui/icons-material/Description';
import { showSuccess, showError } from '../utils/toast';

const ExportMenu = ({ auditId, auditName, onExport }) => {
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

      if (auditId) {
        // Single audit export
        if (format === 'pdf') {
          url = `/api/reports/audit/${auditId}/pdf`;
          filename = `${auditName || 'audit'}.pdf`;
          window.open(url, '_blank');
        } else if (format === 'csv') {
          url = `/api/reports/audit/${auditId}/csv`;
          filename = `${auditName || 'audit'}.csv`;
          const response = await fetch(url);
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(downloadUrl);
        }
      } else {
        // Multiple audits export
        if (format === 'pdf') {
          url = '/api/reports/audits/pdf';
          window.open(url, '_blank');
        } else if (format === 'csv') {
          url = '/api/reports/audits/csv';
          filename = 'audits.csv';
          const response = await fetch(url);
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(downloadUrl);
        }
      }

      if (onExport) {
        onExport(format);
      }
      showSuccess(`${format.toUpperCase()} exported successfully!`);
      handleClose();
    } catch (error) {
      console.error('Export error:', error);
      showError(`Failed to export ${format.toUpperCase()}`);
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
      </Menu>
    </>
  );
};

export default ExportMenu;

