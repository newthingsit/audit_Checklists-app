import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';

const PrintPreviewModal = ({ open, onClose, audit, onPrint }) => {
  if (!audit) return null;

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Audit Report - ${audit.restaurant_name}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              color: #000;
            }
            .no-print {
              display: none;
            }
          }
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          .header {
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #1976d2;
            font-size: 28px;
          }
          .header-info {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            flex-wrap: wrap;
          }
          .info-item {
            margin: 5px 0;
          }
          .info-label {
            font-weight: bold;
            color: #666;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: bold;
            font-size: 12px;
            margin-top: 10px;
          }
          .status-completed {
            background-color: #4caf50;
            color: white;
          }
          .status-in_progress {
            background-color: #ff9800;
            color: white;
          }
          .status-failed {
            background-color: #f44336;
            color: white;
          }
          .status-pending {
            background-color: #9e9e9e;
            color: white;
          }
          .score {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            margin: 20px 0;
          }
          .items-section {
            margin-top: 30px;
          }
          .item {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .item-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 10px;
          }
          .item-title {
            font-weight: bold;
            font-size: 14px;
            color: #333;
          }
          .item-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
          }
          .status-completed-item {
            background-color: #c8e6c9;
            color: #2e7d32;
          }
          .status-failed-item {
            background-color: #ffcdd2;
            color: #c62828;
          }
          .status-warning-item {
            background-color: #ffe0b2;
            color: #e65100;
          }
          .status-pending-item {
            background-color: #e0e0e0;
            color: #616161;
          }
          .item-description {
            color: #666;
            font-size: 12px;
            margin: 8px 0;
          }
          .item-comment {
            background-color: #f5f5f5;
            padding: 8px;
            border-left: 3px solid #1976d2;
            margin-top: 8px;
            font-size: 11px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 11px;
          }
          .category-badge {
            display: inline-block;
            background-color: #e3f2fd;
            color: #1976d2;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            margin-right: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${audit.restaurant_name || 'Restaurant Audit'}</h1>
          <div class="header-info">
            <div class="info-item">
              <span class="info-label">Template: </span>${audit.template_name || 'N/A'}
            </div>
            <div class="info-item">
              <span class="info-label">Store: </span>${audit.location || 'N/A'}
            </div>
            <div class="info-item">
              <span class="info-label">Date: </span>${new Date(audit.created_at).toLocaleDateString()}
            </div>
            <div class="info-item">
              <span class="status-badge status-${audit.status || 'in_progress'}">
                ${(audit.status || 'in_progress').toUpperCase()}
              </span>
            </div>
          </div>
          ${audit.score !== null ? `<div class="score">Score: ${audit.score}%</div>` : ''}
          ${audit.notes ? `<div style="margin-top: 15px; padding: 10px; background-color: #f5f5f5; border-left: 3px solid #1976d2;"><strong>Notes:</strong> ${audit.notes}</div>` : ''}
        </div>

        <div class="items-section">
          <h2 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px;">Audit Items</h2>
          ${(audit.items || []).map((item, index) => `
            <div class="item">
              <div class="item-header">
                <div>
                  <span class="category-badge">${item.category || 'General'}</span>
                  <span class="item-title">${index + 1}. ${item.title || 'Untitled Item'}</span>
                </div>
                <span class="item-status status-${item.status || 'pending'}-item">
                  ${(item.status || 'pending').toUpperCase()}
                </span>
              </div>
              ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
              ${item.comment ? `<div class="item-comment"><strong>Comment:</strong> ${item.comment}</div>` : ''}
              ${item.required ? '<div style="margin-top: 8px; font-size: 10px; color: #d32f2f;"><strong>Required Item</strong></div>' : ''}
            </div>
          `).join('')}
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Restaurant Audit & Checklist System</p>
        </div>
      </body>
    </html>
  `;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
    
    if (onPrint) {
      onPrint();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PrintIcon color="primary" />
          <span>Print Preview - {audit.restaurant_name || 'Audit Report'}</span>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            overflow: 'auto',
            p: 3,
            bgcolor: '#f5f5f5'
          }}
        >
          <Box
            sx={{
              maxWidth: '800px',
              margin: '0 auto',
              bgcolor: 'white',
              p: 3,
              boxShadow: 2,
              borderRadius: 1
            }}
          >
            {/* Header */}
            <Box sx={{ borderBottom: '3px solid #1976d2', pb: 2.5, mb: 3 }}>
              <Typography variant="h4" sx={{ color: '#1976d2', mb: 1.5, fontWeight: 600 }}>
                {audit.restaurant_name || 'Restaurant Audit'}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', display: 'block' }}>
                    Template:
                  </Typography>
                  <Typography variant="body2">{audit.template_name || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', display: 'block' }}>
                    Store:
                  </Typography>
                  <Typography variant="body2">{audit.location || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', display: 'block' }}>
                    Date:
                  </Typography>
                  <Typography variant="body2">
                    {new Date(audit.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', display: 'block', mb: 0.5 }}>
                    Status:
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-block',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 3,
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      bgcolor: audit.status === 'completed' ? '#4caf50' : 
                              audit.status === 'failed' ? '#f44336' :
                              audit.status === 'pending' ? '#9e9e9e' : '#ff9800',
                      color: 'white'
                    }}
                  >
                    {(audit.status || 'in_progress').toUpperCase()}
                  </Box>
                </Box>
              </Box>
              {audit.score !== null && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    Score: {audit.score}%
                  </Typography>
                </Box>
              )}
              {audit.notes && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f5f5f5', borderLeft: '3px solid #1976d2' }}>
                  <Typography variant="body2">
                    <strong>Notes:</strong> {audit.notes}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Items Section */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ color: '#1976d2', borderBottom: '2px solid #1976d2', pb: 1.25, mb: 2 }}>
                Audit Items
              </Typography>
              {(audit.items || []).map((item, index) => (
                <Box
                  key={item.id || index}
                  sx={{
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                    pageBreakInside: 'avoid'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Box>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          bgcolor: '#e3f2fd',
                          color: '#1976d2',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.625rem',
                          mr: 1
                        }}
                      >
                        {item.category || 'General'}
                      </Box>
                      <Typography component="span" sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#333' }}>
                        {index + 1}. {item.title || 'Untitled Item'}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.6875rem',
                        fontWeight: 'bold',
                        bgcolor: item.status === 'completed' ? '#c8e6c9' :
                                item.status === 'failed' ? '#ffcdd2' :
                                item.status === 'warning' ? '#ffe0b2' : '#e0e0e0',
                        color: item.status === 'completed' ? '#2e7d32' :
                               item.status === 'failed' ? '#c62828' :
                               item.status === 'warning' ? '#e65100' : '#616161'
                      }}
                    >
                      {(item.status || 'pending').toUpperCase()}
                    </Box>
                  </Box>
                  {item.description && (
                    <Typography variant="body2" sx={{ color: '#666', fontSize: '0.75rem', mb: 1 }}>
                      {item.description}
                    </Typography>
                  )}
                  {item.comment && (
                    <Box sx={{ bgcolor: '#f5f5f5', p: 1, borderLeft: '3px solid #1976d2', mt: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.6875rem' }}>
                        <strong>Comment:</strong> {item.comment}
                      </Typography>
                    </Box>
                  )}
                  {item.required && (
                    <Typography variant="caption" sx={{ color: '#d32f2f', mt: 1, display: 'block', fontSize: '0.625rem' }}>
                      <strong>Required Item</strong>
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 5, pt: 2.5, borderTop: '1px solid #ddd', textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#666', fontSize: '0.6875rem' }}>
                Generated on {new Date().toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', fontSize: '0.6875rem', mt: 0.5 }}>
                Restaurant Audit & Checklist System
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          startIcon={<PrintIcon />}
          color="primary"
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintPreviewModal;

