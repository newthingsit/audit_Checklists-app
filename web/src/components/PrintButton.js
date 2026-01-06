import React, { useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PrintPreviewModal from './PrintPreviewModal';

const PrintButton = ({ audit, variant = 'icon', ...props }) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePrintClick = () => {
    if (!audit) {
      console.error('No audit data provided');
      return;
    }
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    if (!audit) {
      console.error('No audit data provided');
      return;
    }

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

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  return (
    <>
      {variant === 'icon' ? (
        <Tooltip title="Print Audit Report">
          <IconButton onClick={handlePrintClick} color="primary" {...props}>
            <PrintIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          startIcon={<PrintIcon />}
          onClick={handlePrintClick}
          variant="outlined"
          {...props}
        >
          Print
        </Button>
      )}
      <PrintPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        audit={audit}
        onPrint={handlePrint}
      />
    </>
  );
};

export default PrintButton;

