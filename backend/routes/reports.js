const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../config/database-loader');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { exportAuditsToExcel, exportStoreAnalyticsToExcel, exportMonthlyScorecardToExcel, exportDashboardReportToExcel } = require('../utils/excelExport');
const { createEnhancedDashboardReport } = require('../utils/enhancedDashboardReport');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to check if user is admin
const isAdminUser = (user) => {
  if (!user) return false;
  const role = user.role ? user.role.toLowerCase() : '';
  return role === 'admin' || role === 'superadmin';
};

// Export audit to PDF (admins can export any audit)
router.get('/audit/:id/pdf', authenticate, (req, res) => {
  const auditId = req.params.id;
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const dbInstance = db.getDb();

  const whereClause = isAdmin ? 'WHERE a.id = ?' : 'WHERE a.id = ? AND a.user_id = ?';
  const params = isAdmin ? [auditId] : [auditId, userId];

  dbInstance.get(
    `SELECT a.*, ct.name as template_name, ct.category, u.name as user_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN users u ON a.user_id = u.id
     ${whereClause}`,
    params,
    (err, audit) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!audit) {
        return res.status(404).json({ error: 'Audit not found' });
      }

      // First, get all items with their selected options
      dbInstance.all(
        `SELECT ai.*, ci.title, ci.description, ci.category, ci.required, ci.order_index,
                cio.option_text as selected_option_text, cio.mark as selected_mark,
                ai.photo_url, ai.mark, ai.status, ai.comment
         FROM audit_items ai
         JOIN checklist_items ci ON ai.item_id = ci.id
         LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
         WHERE ai.audit_id = ?
         ORDER BY ci.order_index, ci.id`,
        [auditId],
        (err, items) => {
          if (err) {
            logger.error('Error fetching audit items for PDF:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
          }

          // Get all options for each item to calculate max scores
          Promise.all(items.map((item) => {
            return new Promise((resolve, reject) => {
              dbInstance.all(
                `SELECT mark FROM checklist_item_options WHERE item_id = ?`,
                [item.item_id],
                (err, options) => {
                  if (err) {
                    logger.error('Error fetching options:', err);
                    return resolve({ ...item, maxScore: parseFloat(item.selected_mark) || 3 });
                  }
                  
                  // Find max numeric score (exclude 'NA')
                  const numericMarks = options
                    .map(o => parseFloat(o.mark))
                    .filter(m => !isNaN(m));
                  const maxScore = numericMarks.length > 0 ? Math.max(...numericMarks) : (parseFloat(item.selected_mark) || 3);
                  
                  resolve({ ...item, maxScore });
                }
              );
            });
          })).then(itemsWithMaxScores => {

          // Calculate category-wise scores
          const categoryData = {};
          let totalPerfectScore = 0;
          let totalActualScore = 0;
          
          itemsWithMaxScores.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!categoryData[cat]) {
              categoryData[cat] = { 
                perfectScore: 0, 
                actualScore: 0, 
                count: 0, 
                items: [] 
              };
            }
            categoryData[cat].items.push(item);
            categoryData[cat].count++;
            
            const maxScore = item.maxScore || 3;
            const actualMark = parseFloat(item.mark) || 0;
            
            categoryData[cat].perfectScore += maxScore;
            categoryData[cat].actualScore += actualMark;
            totalPerfectScore += maxScore;
            totalActualScore += actualMark;
          });

          // Create PDF with professional table-based format matching CVR 2 CDR Plan Report
          const doc = new PDFDocument({ margin: 40, size: 'A4' });
          res.setHeader('Content-Type', 'application/pdf');
          const storeName = audit.restaurant_name || audit.location || 'Restaurant';
          const fileName = `${audit.template_name || 'Report'} - ${storeName}.pdf`;
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
          doc.pipe(res);

          const pageWidth = 595.28; // A4 width in points
          const pageHeight = 841.89; // A4 height in points
          const margin = 40;
          const contentWidth = pageWidth - (margin * 2);
          const BLUE = '#1a365d'; // Dark blue for headers
          const LIGHT_BLUE = '#e8f4fd';
          const GRAY = '#f5f5f5';
          const BORDER_COLOR = '#333';
          
          // Calculate overall score
          const overallScore = totalPerfectScore > 0 ? Math.round((totalActualScore / totalPerfectScore) * 1000) / 10 : 0;
          
          // Track page numbers
          let currentPage = 1;
          const totalPagesEstimate = Math.ceil(itemsWithMaxScores.length / 8) + 2;
          
          // Helper: Draw footer
          const drawFooter = () => {
            doc.fontSize(9).fillColor('#666');
            doc.text(`Page ${currentPage} of ${totalPagesEstimate}`, margin, pageHeight - 30, { width: 100 });
            doc.text('Powered By LBF Audit App', pageWidth - margin - 150, pageHeight - 30, { width: 150, align: 'right' });
          };
          
          // Helper: Check if need new page
          const checkNewPage = (neededSpace = 100) => {
            if (doc.y > pageHeight - neededSpace - 50) {
              drawFooter();
              doc.addPage();
              currentPage++;
              return true;
            }
            return false;
          };
          
          // Helper: Draw table row
          const drawTableRow = (y, columns, heights, isHeader = false, bgColor = null) => {
            let x = margin;
            const rowHeight = heights || 25;
            
            columns.forEach((col, idx) => {
              const colWidth = col.width || 100;
              
              // Background
              if (isHeader) {
                doc.rect(x, y, colWidth, rowHeight).fill(BLUE);
                doc.fillColor('#fff');
              } else if (bgColor) {
                doc.rect(x, y, colWidth, rowHeight).fill(bgColor);
                doc.fillColor('#000');
              } else {
                doc.rect(x, y, colWidth, rowHeight).stroke(BORDER_COLOR);
                doc.fillColor('#000');
              }
              
              // Border
              doc.rect(x, y, colWidth, rowHeight).stroke(BORDER_COLOR);
              
              // Text
              doc.fontSize(col.fontSize || 9);
              if (isHeader) doc.fillColor('#fff');
              else doc.fillColor('#000');
              
              const textY = y + (rowHeight - (col.fontSize || 9)) / 2;
              doc.text(col.text || '', x + 4, textY, { 
                width: colWidth - 8, 
                align: col.align || 'left',
                lineBreak: false
              });
              
              x += colWidth;
            });
            
            return y + rowHeight;
          };

          // ==================== PAGE 1: HEADER AND SUMMARY ====================
          
          // Blue Header Bar
          doc.rect(0, 0, pageWidth, 50).fill(BLUE);
          doc.fontSize(16).fillColor('#fff');
          doc.text(`${audit.template_name || 'Audit'} - Report`, margin, 15, { width: contentWidth - 100 });
          doc.fontSize(12).fillColor('#fff');
          doc.text('Lite Bite Foods', pageWidth - margin - 120, 18, { width: 120, align: 'right' });
          
          // Overall Score (large, centered)
          doc.y = 70;
          doc.fontSize(32).fillColor('#000');
          doc.text(`${overallScore}%`, margin, 70, { width: contentWidth, align: 'center' });
          doc.fontSize(14).fillColor('#666');
          doc.text(`(${Math.round(totalActualScore)}/${Math.round(totalPerfectScore)})`, margin, 105, { width: contentWidth, align: 'center' });
          
          // Details Section
          doc.y = 140;
          doc.fontSize(12).fillColor('#000').text('Details', margin, doc.y, { underline: true });
          doc.moveDown(0.5);
          
          // Details Table
          const detailsY = doc.y;
          const detailColWidths = [contentWidth / 4, contentWidth / 4, contentWidth / 4, contentWidth / 4];
          
          // Header row
          let rowY = drawTableRow(detailsY, [
            { text: 'Outlet Name', width: detailColWidths[0], align: 'center' },
            { text: 'Start Date', width: detailColWidths[1], align: 'center' },
            { text: 'End Date', width: detailColWidths[2], align: 'center' },
            { text: 'Submitted by', width: detailColWidths[3], align: 'center' }
          ], 25, true);
          
          // Data row
          const startDate = new Date(audit.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
          const endDate = audit.completed_at ? new Date(audit.completed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'In Progress';
          
          rowY = drawTableRow(rowY, [
            { text: storeName, width: detailColWidths[0], align: 'center', fontSize: 8 },
            { text: startDate, width: detailColWidths[1], align: 'center', fontSize: 8 },
            { text: endDate, width: detailColWidths[2], align: 'center', fontSize: 8 },
            { text: audit.user_name || 'N/A', width: detailColWidths[3], align: 'center', fontSize: 8 }
          ], 35);
          
          doc.y = rowY + 20;
          
          // Score By Section
          doc.fontSize(12).fillColor('#000').text('Score By', margin, doc.y, { underline: true });
          doc.moveDown(0.5);
          
          // Define display categories with mappings
          const displayCategories = [
            { name: 'QUALITY', match: ['quality', 'QUALITY'] },
            { name: 'SERVICE', match: ['service', 'SERVICE', 'speed', 'Speed of Service'] },
            { name: 'HYGIENE & CLEANLINESS', match: ['hygiene', 'cleanliness', 'HYGIENE', 'CLEANLINESS'] },
            { name: 'PROCESSES', match: ['processes', 'PROCESSES', 'process'] },
            { name: 'House Keeping', match: ['hk', 'HK', 'housekeeping', 'House Keeping', 'house keeping'] }
          ];
          
          // Group all categories into display categories
          const displayCategoryData = {};
          displayCategories.forEach(dc => {
            displayCategoryData[dc.name] = { perfectScore: 0, actualScore: 0, count: 0 };
          });
          
          // Map raw categories to display categories
          Object.keys(categoryData).forEach(rawCat => {
            const catLower = rawCat.toLowerCase();
            let matched = false;
            
            for (const dc of displayCategories) {
              for (const matchStr of dc.match) {
                if (catLower.includes(matchStr.toLowerCase())) {
                  displayCategoryData[dc.name].perfectScore += categoryData[rawCat].perfectScore;
                  displayCategoryData[dc.name].actualScore += categoryData[rawCat].actualScore;
                  displayCategoryData[dc.name].count += categoryData[rawCat].count;
                  matched = true;
                  break;
                }
              }
              if (matched) break;
            }
            
            // If no match, add to the original category name
            if (!matched) {
              if (!displayCategoryData[rawCat]) {
                displayCategoryData[rawCat] = { perfectScore: 0, actualScore: 0, count: 0 };
              }
              displayCategoryData[rawCat].perfectScore += categoryData[rawCat].perfectScore;
              displayCategoryData[rawCat].actualScore += categoryData[rawCat].actualScore;
              displayCategoryData[rawCat].count += categoryData[rawCat].count;
            }
          });
          
          // Score By Table
          const scoreByY = doc.y;
          const scoreColWidths = [contentWidth * 0.4, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.2];
          
          // Header
          rowY = drawTableRow(scoreByY, [
            { text: '', width: scoreColWidths[0] },
            { text: 'Perfect Score', width: scoreColWidths[1], align: 'center' },
            { text: 'Actual Score', width: scoreColWidths[2], align: 'center' },
            { text: 'Percentage', width: scoreColWidths[3], align: 'center' }
          ], 22, true);
          
          // Main categories (not House Keeping)
          const mainCategories = ['QUALITY', 'SERVICE', 'HYGIENE & CLEANLINESS', 'PROCESSES'];
          mainCategories.forEach(cat => {
            const data = displayCategoryData[cat];
            if (data && data.count > 0) {
              const pct = data.perfectScore > 0 ? Math.round((data.actualScore / data.perfectScore) * 100) : 0;
              rowY = drawTableRow(rowY, [
                { text: cat, width: scoreColWidths[0], fontSize: 9 },
                { text: Math.round(data.perfectScore).toString(), width: scoreColWidths[1], align: 'center' },
                { text: Math.round(data.actualScore).toString(), width: scoreColWidths[2], align: 'center' },
                { text: `${pct}%`, width: scoreColWidths[3], align: 'center' }
              ], 22);
            }
          });
          
          doc.y = rowY + 15;
          
          // House Keeping Table (separate)
          const hkData = displayCategoryData['House Keeping'];
          if (hkData && hkData.count > 0) {
            const hkY = doc.y;
            const hkPct = hkData.perfectScore > 0 ? Math.round((hkData.actualScore / hkData.perfectScore) * 100) : 0;
            
            // Header
            rowY = drawTableRow(hkY, [
              { text: '', width: scoreColWidths[0] },
              { text: 'Perfect Score', width: scoreColWidths[1], align: 'center' },
              { text: 'Actual Score', width: scoreColWidths[2], align: 'center' },
              { text: 'Percentage', width: scoreColWidths[3], align: 'center' }
            ], 22, true);
            
            rowY = drawTableRow(rowY, [
              { text: 'House Keeping', width: scoreColWidths[0], fontSize: 9 },
              { text: Math.round(hkData.perfectScore).toString(), width: scoreColWidths[1], align: 'center' },
              { text: Math.round(hkData.actualScore).toString(), width: scoreColWidths[2], align: 'center' },
              { text: `${hkPct}%`, width: scoreColWidths[3], align: 'center' }
            ], 22);
            
            doc.y = rowY + 15;
          }
          
          // Other categories not matched
          Object.keys(displayCategoryData).forEach(cat => {
            if (!mainCategories.includes(cat) && cat !== 'House Keeping') {
              const data = displayCategoryData[cat];
              if (data && data.count > 0) {
                const pct = data.perfectScore > 0 ? Math.round((data.actualScore / data.perfectScore) * 100) : 0;
                
                rowY = drawTableRow(doc.y, [
                  { text: '', width: scoreColWidths[0] },
                  { text: 'Perfect Score', width: scoreColWidths[1], align: 'center' },
                  { text: 'Actual Score', width: scoreColWidths[2], align: 'center' },
                  { text: 'Percentage', width: scoreColWidths[3], align: 'center' }
                ], 22, true);
                
                rowY = drawTableRow(rowY, [
                  { text: cat, width: scoreColWidths[0], fontSize: 9 },
                  { text: Math.round(data.perfectScore).toString(), width: scoreColWidths[1], align: 'center' },
                  { text: Math.round(data.actualScore).toString(), width: scoreColWidths[2], align: 'center' },
                  { text: `${pct}%`, width: scoreColWidths[3], align: 'center' }
                ], 22);
                
                doc.y = rowY + 15;
              }
            }
          });
          
          // Details Section - OUTLET question/response table
          checkNewPage(100);
          doc.fontSize(12).fillColor('#000').text('Details', margin, doc.y, { underline: true });
          doc.moveDown(0.5);
          
          const detailQY = doc.y;
          const detailQColWidths = [40, contentWidth * 0.25, contentWidth - 40 - (contentWidth * 0.25)];
          
          rowY = drawTableRow(detailQY, [
            { text: '', width: detailQColWidths[0] },
            { text: 'Question', width: detailQColWidths[1], align: 'center' },
            { text: 'Response', width: detailQColWidths[2], align: 'center' }
          ], 22, true);
          
          // Find OUTLET question
          const outletItem = itemsWithMaxScores.find(item => 
            item.title && item.title.toLowerCase().includes('outlet')
          );
          
          if (outletItem) {
            const outletResponse = outletItem.selected_option_text || outletItem.comment || storeName;
            rowY = drawTableRow(rowY, [
              { text: '1', width: detailQColWidths[0], align: 'center' },
              { text: 'OUTLET', width: detailQColWidths[1] },
              { text: outletResponse, width: detailQColWidths[2], align: 'center' }
            ], 25);
          } else {
            rowY = drawTableRow(rowY, [
              { text: '1', width: detailQColWidths[0], align: 'center' },
              { text: 'OUTLET', width: detailQColWidths[1] },
              { text: storeName, width: detailQColWidths[2], align: 'center' }
            ], 25);
          }
          
          doc.y = rowY + 20;
          drawFooter();
          
          // ==================== CATEGORY DETAIL PAGES ====================
          // Group items by category
          const sortedCategories = Object.keys(categoryData).sort((a, b) => {
            const order = ['QUALITY', 'SERVICE', 'HYGIENE', 'CLEANLINESS', 'PROCESSES', 'HK', 'House Keeping'];
            const aIdx = order.findIndex(o => a.toUpperCase().includes(o));
            const bIdx = order.findIndex(o => b.toUpperCase().includes(o));
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
          
          for (const cat of sortedCategories) {
            const catItems = categoryData[cat].items;
            const catPerfect = Math.round(categoryData[cat].perfectScore);
            const catActual = Math.round(categoryData[cat].actualScore);
            const catPct = catPerfect > 0 ? Math.round((catActual / catPerfect) * 100) : 0;
            
            // New page for each major category
            doc.addPage();
            currentPage++;
            
            // Category Header with blue background
            doc.rect(margin, 40, contentWidth, 30).fill(LIGHT_BLUE);
            doc.rect(margin, 40, contentWidth, 30).stroke(BORDER_COLOR);
            doc.fontSize(14).fillColor(BLUE);
            doc.text(`${cat.toUpperCase()} - ${catPct}% (${catActual}/${catPerfect})`, margin + 10, 48, { width: contentWidth - 20 });
            
            doc.y = 85;
            
            // Table header
            const qColWidths = [40, contentWidth * 0.50, 60, 80];
            const qHeaderY = doc.y;
            
            rowY = drawTableRow(qHeaderY, [
              { text: '', width: qColWidths[0] },
              { text: 'Question', width: qColWidths[1], align: 'center' },
              { text: 'Score', width: qColWidths[2], align: 'center' },
              { text: 'Response', width: qColWidths[3], align: 'center' }
            ], 25, true);
            
            // Items
            let questionNum = 1;
            for (const item of catItems) {
              // Check if we need a new page
              if (rowY > pageHeight - 150) {
                drawFooter();
                doc.addPage();
                currentPage++;
                
                // Re-draw category header
                doc.rect(margin, 40, contentWidth, 30).fill(LIGHT_BLUE);
                doc.rect(margin, 40, contentWidth, 30).stroke(BORDER_COLOR);
                doc.fontSize(14).fillColor(BLUE);
                doc.text(`${cat.toUpperCase()} - ${catPct}% (${catActual}/${catPerfect}) (continued)`, margin + 10, 48, { width: contentWidth - 20 });
                
                // Re-draw table header
                rowY = 85;
                rowY = drawTableRow(rowY, [
                  { text: '', width: qColWidths[0] },
                  { text: 'Question', width: qColWidths[1], align: 'center' },
                  { text: 'Score', width: qColWidths[2], align: 'center' },
                  { text: 'Response', width: qColWidths[3], align: 'center' }
                ], 25, true);
              }
              
              const actualMark = parseFloat(item.mark) || 0;
              const maxMark = item.maxScore || 3;
              const response = item.selected_option_text || (item.mark === 'NA' ? 'N/A' : (actualMark > 0 ? 'Yes' : 'No'));
              const scoreText = `${actualMark}/${maxMark}`;
              
              // Check if item has photo - need more row height
              const hasPhoto = item.photo_url ? true : false;
              const rowHeight = hasPhoto ? 70 : 35;
              
              // Draw row background
              let x = margin;
              doc.rect(x, rowY, qColWidths[0], rowHeight).stroke(BORDER_COLOR);
              doc.rect(x + qColWidths[0], rowY, qColWidths[1], rowHeight).stroke(BORDER_COLOR);
              doc.rect(x + qColWidths[0] + qColWidths[1], rowY, qColWidths[2], rowHeight).stroke(BORDER_COLOR);
              doc.rect(x + qColWidths[0] + qColWidths[1] + qColWidths[2], rowY, qColWidths[3], rowHeight).stroke(BORDER_COLOR);
              
              // Question number
              doc.fontSize(9).fillColor('#000');
              doc.text(questionNum.toString(), x + 4, rowY + 5, { width: qColWidths[0] - 8, align: 'center' });
              
              // Question text with title
              doc.text(item.title || '', x + qColWidths[0] + 4, rowY + 5, { width: qColWidths[1] - 8 });
              
              // Score
              doc.text(scoreText, x + qColWidths[0] + qColWidths[1] + 4, rowY + 5, { width: qColWidths[2] - 8, align: 'center' });
              
              // Response
              doc.text(response, x + qColWidths[0] + qColWidths[1] + qColWidths[2] + 4, rowY + 5, { width: qColWidths[3] - 8, align: 'center' });
              
              // Add photo if exists
              if (hasPhoto) {
                try {
                  const fs = require('fs');
                  const path = require('path');
                  const uploadsPath = path.join(__dirname, '..', 'uploads');
                  let photoPath = item.photo_url;
                  const localPath = path.join(uploadsPath, path.basename(photoPath));
                  
                  if (fs.existsSync(localPath)) {
                    doc.image(localPath, x + qColWidths[0] + 4, rowY + 25, { width: 50, height: 40, fit: [50, 40] });
                  }
                } catch (imgErr) {
                  // Skip image if error
                }
              }
              
              rowY += rowHeight;
              questionNum++;
            }
            
            doc.y = rowY + 10;
            drawFooter();
          }
          
          doc.end();
          }).catch(err => {
            logger.error('Error generating PDF:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Error generating PDF', details: err.message });
            }
          });
        }
      );
    }
  );
});

// Export audits to CSV (admins see all audits, supports filtering)
router.get('/audits/csv', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { ids } = req.query; // Optional: comma-separated audit IDs
  const dbInstance = db.getDb();

  // Get all unique categories from checklist items (comma-separated)
  // Also get scheduled_date if audit was created from a scheduled audit
  const dbType = process.env.DB_TYPE || 'sqlite';
  let categorySubquery;
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    // SQL Server: Use STUFF with FOR XML PATH for better compatibility
    categorySubquery = `(SELECT STUFF((SELECT DISTINCT N',' + category 
                        FROM checklist_items 
                        WHERE template_id = ct.id AND category IS NOT NULL AND category != N''
                        FOR XML PATH(N''), TYPE).value(N'.', N'NVARCHAR(MAX)'), 1, 1, N''))`;
  } else if (dbType === 'mysql') {
    // MySQL: Use GROUP_CONCAT to combine categories
    categorySubquery = `(SELECT GROUP_CONCAT(DISTINCT ci.category SEPARATOR ', ') 
                        FROM checklist_items ci 
                        WHERE ci.template_id = ct.id AND ci.category IS NOT NULL AND ci.category != '')`;
  } else if (dbType === 'postgres' || dbType === 'postgresql') {
    // PostgreSQL: Use STRING_AGG to combine categories
    categorySubquery = `(SELECT STRING_AGG(DISTINCT ci.category, ', ') 
                        FROM checklist_items ci 
                        WHERE ci.template_id = ct.id AND ci.category IS NOT NULL AND ci.category != '')`;
  } else {
    // SQLite: Use GROUP_CONCAT (SQLite 3.5.0+)
    categorySubquery = `(SELECT GROUP_CONCAT(DISTINCT ci.category, ', ') 
                        FROM checklist_items ci 
                        WHERE ci.template_id = ct.id AND ci.category IS NOT NULL AND ci.category != '')`;
  }
  
  // Use ISNULL for SQL Server, COALESCE for others
  const categorySelect = (dbType === 'mssql' || dbType === 'sqlserver')
    ? `ISNULL(NULLIF(ct.category, N''), ISNULL(${categorySubquery}, N''))`
    : `COALESCE(NULLIF(ct.category, ''), ${categorySubquery}, '')`;
  
  let query = `SELECT a.id, a.restaurant_name, a.location, a.status, a.score, 
     a.completed_items, a.total_items, ct.name as template_name, 
     ${categorySelect} as template_category,
     a.created_at, a.completed_at, a.scheduled_audit_id,
     COALESCE(sa.scheduled_date, a.created_at) as audit_date,
     u.name as user_name, u.email as user_email,
     l.store_number as location_store_number
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN locations l ON a.location_id = l.id
     LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id`;
  
  let params = [];
  
  // If specific IDs are requested, use them
  if (ids) {
    const auditIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (auditIds.length > 0) {
      const placeholders = auditIds.map(() => '?').join(',');
      query += ` WHERE a.id IN (${placeholders})`;
      params = auditIds;
    } else {
      return res.status(400).json({ error: 'Invalid audit IDs' });
    }
  } else {
    // Otherwise, filter by user (or show all for admins)
    if (isAdmin) {
      query += ` WHERE 1=1`;
    } else {
      query += ` WHERE a.user_id = ?`;
      params = [userId];
    }
  }
  
  query += ` ORDER BY a.created_at DESC`;

  dbInstance.all(query, params,
    (err, audits) => {
      if (err) {
        logger.error('Database error in CSV export:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      // Debug: Log first audit to check category field
      if (audits && audits.length > 0) {
        logger.debug('Sample audit data:', {
          id: audits[0].id,
          template_name: audits[0].template_name,
          template_category: audits[0].template_category
        });
      }

      try {
        // Helper function to format date to India time (IST - UTC+5:30) - Date only
        const formatIndiaDate = (dateString) => {
          if (!dateString) return '';
          try {
            const date = new Date(dateString);
            // Convert to IST (UTC+5:30)
            // Get UTC time in milliseconds
            const utcTime = date.getTime();
            // IST is UTC+5:30 = 5.5 hours = 19800000 milliseconds
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istTime = new Date(utcTime + istOffset);
            
            // Format as DD-MM-YYYY (date only, no time)
            const day = String(istTime.getUTCDate()).padStart(2, '0');
            const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
            const year = istTime.getUTCFullYear();
            
            return `${day}-${month}-${year}`;
          } catch (error) {
            logger.error('Error formatting date:', error);
            return dateString;
          }
        };

        // Helper function to extract store number from location string or use location store_number
        const getStoreNumber = (audit) => {
          if (audit.location_store_number) {
            return audit.location_store_number;
          }
          // Extract store number from location string like "Store 5541"
          if (audit.location) {
            const match = audit.location.match(/Store\s*#?\s*(\d+)/i) || audit.location.match(/(\d+)/);
            if (match && match[1]) {
              return match[1];
            }
            return audit.location;
          }
          return '';
        };

        // Generate CSV header
        const headers = [
          'ID',
          'Restaurant Name',
          'Store Number',
          'Template',
          'Category',
          'Status',
          'Score (%)',
          'Completed Items',
          'Total Items',
          'Audit By Name',
          'Audit By Email',
          'Created Date',
          'Completed Date'
        ];

        // Generate CSV rows
        const rows = audits.map(audit => {
          const storeNumber = getStoreNumber(audit);
          const row = [
            audit.id,
            `"${(audit.restaurant_name || '').replace(/"/g, '""')}"`,
            storeNumber ? `"${String(storeNumber).replace(/"/g, '""')}"` : '',
            `"${(audit.template_name || '').replace(/"/g, '""')}"`,
            `"${(audit.template_category || '').replace(/"/g, '""')}"`,
            audit.status || '',
            audit.score !== null ? audit.score : '',
            audit.completed_items || 0,
            audit.total_items || 0,
            `"${(audit.user_name || '').replace(/"/g, '""')}"`,
            `"${(audit.user_email || '').replace(/"/g, '""')}"`,
            // Use scheduled_date if available, otherwise use created_at
            formatIndiaDate(audit.audit_date || audit.created_at),
            formatIndiaDate(audit.completed_at)
          ];
          
          return row.join(',');
        });

        // Combine header and rows
        const csvContent = [
          headers.join(','),
          ...rows
        ].join('\n');

        // Set response headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audits-export.csv');
        
        // Send CSV content
        res.send(csvContent);
      } catch (error) {
        logger.error('Error generating CSV:', error);
        res.status(500).json({ error: 'Error generating CSV file', details: error.message });
      }
    }
  );
});

// Export audits to Excel
router.get('/audits/excel', authenticate, async (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { ids, status, restaurant, date_from, date_to, min_score, max_score, template_id } = req.query;
  const dbInstance = db.getDb();

  // Helper function to format dates to India time (DD-MM-YYYY)
  const formatIndiaDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      // Convert to IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(date.getTime() + istOffset);
      
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const year = istDate.getUTCFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (error) {
      return dateString;
    }
  };

  try {
    // Build query similar to CSV export
    const dbType = process.env.DB_TYPE || 'sqlite';
    let categoryQuery;
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      categoryQuery = `(SELECT STUFF((SELECT DISTINCT N',' + category FROM checklist_items WHERE template_id = ct.id AND category IS NOT NULL AND category != N'' FOR XML PATH('')), 1, 1, ''))`;
    } else if (dbType === 'mysql') {
      categoryQuery = `(SELECT GROUP_CONCAT(DISTINCT ci.category, ', ') FROM checklist_items ci WHERE ci.template_id = ct.id AND ci.category IS NOT NULL AND ci.category != '')`;
    } else {
      categoryQuery = `(SELECT GROUP_CONCAT(DISTINCT ci.category, ', ') FROM checklist_items ci WHERE ci.template_id = ct.id AND ci.category IS NOT NULL AND ci.category != '')`;
    }

    let query = `
      SELECT a.*, 
        ct.name as template_name,
        ${categoryQuery} as template_category,
        l.name as location_name,
        l.store_number,
        u.name as user_name,
        u.email as user_email,
        sa.scheduled_date,
        COALESCE(sa.scheduled_date, a.created_at) as audit_date
      FROM audits a
      JOIN checklist_templates ct ON a.template_id = ct.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (!isAdmin) {
      conditions.push('a.user_id = ?');
      params.push(userId);
    }
    
    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (idList.length > 0) {
        const placeholders = idList.map(() => '?').join(',');
        conditions.push(`a.id IN (${placeholders})`);
        params.push(...idList);
      }
    }
    
    if (status && status !== 'all') {
      conditions.push('a.status = ?');
      params.push(status);
    }
    
    if (restaurant) {
      conditions.push('a.restaurant_name LIKE ?');
      params.push(`%${restaurant}%`);
    }
    
    if (date_from) {
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        conditions.push('CAST(a.created_at AS DATE) >= CAST(? AS DATE)');
      } else {
        conditions.push('DATE(a.created_at) >= ?');
      }
      params.push(date_from);
    }
    
    if (date_to) {
      if (dbType === 'mssql' || dbType === 'sqlserver') {
        conditions.push('CAST(a.created_at AS DATE) <= CAST(? AS DATE)');
      } else {
        conditions.push('DATE(a.created_at) <= ?');
      }
      params.push(date_to);
    }
    
    if (min_score !== undefined) {
      conditions.push('a.score >= ?');
      params.push(min_score);
    }
    
    if (max_score !== undefined) {
      conditions.push('a.score <= ?');
      params.push(max_score);
    }
    
    if (template_id) {
      conditions.push('a.template_id = ?');
      params.push(template_id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    dbInstance.all(query, params, async (err, audits) => {
      if (err) {
        logger.error('Error fetching audits for Excel export:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      try {
        // Format audits for Excel
        const formattedAudits = audits.map(audit => ({
          ...audit,
          store_number: audit.store_number || (audit.location_name ? extractStoreNumber(audit.location_name) : ''),
          category: audit.template_category || '',
          created_at: formatIndiaDate(audit.audit_date || audit.created_at),
          scheduled_date: audit.scheduled_date ? formatIndiaDate(audit.scheduled_date) : '',
          completed_at: audit.completed_at ? formatIndiaDate(audit.completed_at) : ''
        }));
        
        const buffer = await exportAuditsToExcel(formattedAudits);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=audits-export.xlsx');
        res.send(buffer);
      } catch (excelErr) {
        logger.error('Error generating Excel file:', excelErr);
        res.status(500).json({ error: 'Error generating Excel file', details: excelErr.message });
      }
    });
  } catch (error) {
    logger.error('Error in Excel export:', error);
    res.status(500).json({ error: 'Error exporting to Excel', details: error.message });
  }
  
  // Helper to extract store number
  function extractStoreNumber(location) {
    if (!location) return '';
    const match = location.match(/#(\d+)/);
    return match ? match[1] : '';
  }
});

// Export multiple audits to PDF (admins see all audits, supports filtering)
router.get('/audits/pdf', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { ids } = req.query; // Optional: comma-separated audit IDs
  const dbInstance = db.getDb();

  let query = `SELECT a.id, a.restaurant_name, a.location, a.location_id, a.template_id, a.status, a.score, 
     a.completed_items, a.total_items, ct.name as template_name,
     a.created_at, a.completed_at, u.name as user_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN users u ON a.user_id = u.id`;
  
  let params = [];
  
  // If specific IDs are requested, use them
  if (ids) {
    const auditIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (auditIds.length > 0) {
      const placeholders = auditIds.map(() => '?').join(',');
      query += ` WHERE a.id IN (${placeholders})`;
      params = auditIds;
    } else {
      return res.status(400).json({ error: 'Invalid audit IDs' });
    }
  } else {
    // Otherwise, filter by user (or show all for admins)
    if (isAdmin) {
      query += ` WHERE 1=1`;
    } else {
      query += ` WHERE a.user_id = ?`;
      params = [userId];
    }
  }
  
  query += ` ORDER BY a.created_at DESC`;

  dbInstance.all(query, params, async (err, audits) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = ids ? `audits-${audits.length}-selected.pdf` : 'all-audits.pdf';
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Audit History Report', { align: 'center' });
    doc.fontSize(14).text(`Total Audits: ${audits.length}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const completed = audits.filter(a => a.status === 'completed').length;
    const inProgress = audits.filter(a => a.status === 'in_progress').length;
    const scores = audits.filter(a => a.score !== null).map(a => a.score);
    const avgScore = scores.length > 0 
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 
      : 0;

    doc.fontSize(16).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Audits: ${audits.length}`);
    doc.text(`Completed: ${completed}`);
    doc.text(`In Progress: ${inProgress}`);
    doc.text(`Average Score: ${avgScore}%`);
    doc.moveDown();

    // Audit Details with Failed Items
    doc.fontSize(16).text('Audit Details', { underline: true });
    doc.moveDown(0.5);

    // Process audits sequentially to fetch failed items
    for (let index = 0; index < audits.length; index++) {
      const audit = audits[index];
      
      // Fetch failed items for this audit
      let failedItems = [];
      let recurringFailures = [];
      
      if (audit.status === 'completed' && audit.template_id && audit.location_id) {
        try {
          // Get failed items from this audit
          const failedItemsQuery = `
            SELECT ai.item_id, ci.title, ai.status, ai.comment
            FROM audit_items ai
            JOIN checklist_items ci ON ai.item_id = ci.id
            WHERE ai.audit_id = ?
              AND (
                ai.status = 'failed'
                OR (ai.selected_option_id IS NOT NULL AND EXISTS (
                  SELECT 1 FROM checklist_item_options cio 
                  WHERE cio.id = ai.selected_option_id 
                  AND (cio.mark = '0' OR cio.mark = 'No' OR cio.mark = 'Fail' OR cio.mark = 'N/A')
                ))
              )
            ORDER BY ci.order_index
          `;
          
          failedItems = await new Promise((resolve, reject) => {
            dbInstance.all(failedItemsQuery, [audit.id], (err, items) => {
              if (err) reject(err);
              else resolve(items || []);
            });
          });

          // Check for recurring failures (same items failed in previous audit)
          if (failedItems.length > 0 && audit.template_id && audit.location_id) {
            const dbType = process.env.DB_TYPE || 'sqlite';
            const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';
            
            let recurringQuery;
            if (isSqlServer) {
              recurringQuery = `
                SELECT TOP 1 a.id, a.completed_at
                FROM audits a
                WHERE a.template_id = ? 
                  AND a.location_id = ?
                  AND a.status = 'completed'
                  AND a.id < ?
                  AND a.completed_at < ?
                ORDER BY a.completed_at DESC
              `;
            } else {
              recurringQuery = `
                SELECT a.id, a.completed_at
                FROM audits a
                WHERE a.template_id = ? 
                  AND a.location_id = ?
                  AND a.status = 'completed'
                  AND a.id < ?
                  AND a.completed_at < ?
                ORDER BY a.completed_at DESC
                LIMIT 1
              `;
            }
            
            const previousAudit = await new Promise((resolve, reject) => {
              dbInstance.get(recurringQuery, [
                audit.template_id, 
                audit.location_id, 
                audit.id,
                audit.completed_at || audit.created_at
              ], (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
            });

            if (previousAudit) {
              // Get failed items from previous audit
              const previousFailedQuery = `
                SELECT ai.item_id
                FROM audit_items ai
                WHERE ai.audit_id = ?
                  AND (
                    ai.status = 'failed'
                    OR (ai.selected_option_id IS NOT NULL AND EXISTS (
                      SELECT 1 FROM checklist_item_options cio 
                      WHERE cio.id = ai.selected_option_id 
                      AND (cio.mark = '0' OR cio.mark = 'No' OR cio.mark = 'Fail' OR cio.mark = 'N/A')
                    ))
                  )
              `;
              
              const previousFailed = await new Promise((resolve, reject) => {
                dbInstance.all(previousFailedQuery, [previousAudit.id], (err, items) => {
                  if (err) reject(err);
                  else resolve((items || []).map(i => i.item_id));
                });
              });
              
              // Find items that failed in both audits (recurring)
              const previousFailedSet = new Set(previousFailed);
              recurringFailures = failedItems.filter(item => previousFailedSet.has(item.item_id));
            }
          }
        } catch (error) {
          logger.error('Error fetching failed items for audit history:', error);
          // Continue without failed items
        }
      }

      doc.fontSize(11);
      doc.text(`${index + 1}. ${audit.restaurant_name}`, { continued: false });
      doc.fontSize(10).fillColor('gray');
      doc.text(`   Location: ${audit.location || 'N/A'} | Template: ${audit.template_name}`);
      if (isAdmin && audit.user_name) {
        doc.text(`   Created By: ${audit.user_name}`);
      }
      doc.text(`   Status: ${audit.status} | Score: ${audit.score !== null ? audit.score + '%' : 'N/A'}`);
      doc.text(`   Items: ${audit.completed_items || 0}/${audit.total_items || 0} completed`);
      doc.text(`   Date: ${new Date(audit.created_at).toLocaleDateString()}`);
      if (audit.completed_at) {
        doc.text(`   Completed: ${new Date(audit.completed_at).toLocaleDateString()}`);
      }
      
      // Show failed items
      if (failedItems.length > 0) {
        doc.fillColor('red');
        doc.text(`   Failed Items: ${failedItems.length}`);
        if (recurringFailures.length > 0) {
          doc.text(`   ⚠️ Recurring Failures: ${recurringFailures.length} items (highlighted below)`);
        }
        doc.fillColor('black');
        
        // List failed items
        failedItems.slice(0, 10).forEach((item, idx) => {
          const isRecurring = recurringFailures.some(rf => rf.item_id === item.item_id);
          doc.fillColor(isRecurring ? 'red' : 'black');
          doc.text(`     ${idx + 1}. ${item.title}${isRecurring ? ' ⚠️ (Recurring)' : ''}`);
        });
        if (failedItems.length > 10) {
          doc.text(`     ... and ${failedItems.length - 10} more`);
        }
        doc.fillColor('black');
      }
      
      doc.fillColor('black');
      doc.moveDown(0.5);
    }

    doc.end();
  });
});

// Get monthly scorecard report (admins see all audits)
// Supports multiple months (comma-separated: month=1,2,3) and multiple locations (comma-separated: location_id=1,2,3)
router.get('/monthly-scorecard', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { year, month, location_id, compare_mode } = req.query;
  const dbInstance = db.getDb();

  // Parse multiple months if provided (comma-separated)
  let months = [];
  if (month) {
    months = month.toString().split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m) && m >= 1 && m <= 12);
  }
  if (months.length === 0) {
    // Default to current month if not specified
    months = [new Date().getMonth() + 1];
  }

  // Parse multiple location_ids if provided (comma-separated)
  let locationIds = [];
  if (location_id) {
    locationIds = location_id.toString().split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  }

  // Default to current year if not specified
  const reportYear = year || new Date().getFullYear();
  const yearStr = String(reportYear);

  // Build query with optional location filter
  let locationFilter = '';
  let params = [];
  
  // Build date filter for multiple months
  const dbType = process.env.DB_TYPE || 'sqlite';
  let dateQuery;
  if (months.length === 1) {
    // Single month - use existing logic
    const monthPadded = String(months[0]).padStart(2, '0');
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
      params.push(yearStr, months[0]);
    } else if (dbType === 'mysql') {
      dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
      params.push(yearStr, months[0]);
    } else {
      dateQuery = `strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) = ?`;
      params.push(yearStr, monthPadded);
    }
  } else {
    // Multiple months - use IN clause
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      const monthPlaceholders = months.map(() => '?').join(',');
      dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) IN (${monthPlaceholders})`;
      params.push(yearStr, ...months);
    } else if (dbType === 'mysql') {
      const monthPlaceholders = months.map(() => '?').join(',');
      dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) IN (${monthPlaceholders})`;
      params.push(yearStr, ...months);
    } else {
      // SQLite and PostgreSQL
      const monthPaddeds = months.map(m => String(m).padStart(2, '0'));
      const monthPlaceholders = monthPaddeds.map(() => '?').join(',');
      dateQuery = `strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) IN (${monthPlaceholders})`;
      params.push(yearStr, ...monthPaddeds);
    }
  }
  
  // Build location filter for multiple locations
  if (locationIds.length > 0) {
    const locationPlaceholders = locationIds.map(() => '?').join(',');
    locationFilter = `AND a.location_id IN (${locationPlaceholders})`;
    params.push(...locationIds);
  }
  
  // Build WHERE clause - admins see all audits
  const whereClause = isAdmin 
    ? `WHERE ${dateQuery}`
    : `WHERE a.user_id = ? AND ${dateQuery}`;
  
  if (!isAdmin) {
    params.unshift(userId);
  }
  
  dbInstance.all(
    `SELECT a.*, ct.name as template_name, ct.category, l.name as location_name, u.name as user_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN locations l ON a.location_id = l.id
     LEFT JOIN users u ON a.user_id = u.id
     ${whereClause}
     ${locationFilter}
     ORDER BY a.created_at DESC`,
    params,
    async (err, audits) => {
      if (err) {
        logger.error('Monthly scorecard error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      // Calculate statistics
      const totalAudits = audits.length;
      const completedAudits = audits.filter(a => a.status === 'completed').length;
      const inProgressAudits = audits.filter(a => a.status === 'in_progress').length;
      
      const scores = audits.filter(a => a.score !== null).map(a => a.score);
      const avgScore = scores.length > 0 
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 
        : 0;
      
      const minScore = scores.length > 0 ? Math.min(...scores) : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

      // Group by template
      const byTemplate = {};
      audits.forEach(audit => {
        if (!byTemplate[audit.template_name]) {
          byTemplate[audit.template_name] = {
            template_name: audit.template_name,
            count: 0,
            completed: 0,
            avgScore: 0,
            scores: []
          };
        }
        byTemplate[audit.template_name].count++;
        if (audit.status === 'completed') {
          byTemplate[audit.template_name].completed++;
        }
        if (audit.score !== null) {
          byTemplate[audit.template_name].scores.push(audit.score);
        }
      });

      // Calculate average scores per template
      Object.keys(byTemplate).forEach(template => {
        const templateData = byTemplate[template];
        if (templateData.scores.length > 0) {
          templateData.avgScore = Math.round(
            (templateData.scores.reduce((a, b) => a + b, 0) / templateData.scores.length) * 100
          ) / 100;
        }
      });

      // Group by location
      const byLocation = {};
      audits.forEach(audit => {
        const locationName = audit.location_name || 'Unspecified';
        if (!byLocation[locationName]) {
          byLocation[locationName] = {
            location_name: locationName,
            count: 0,
            completed: 0,
            avgScore: 0,
            scores: []
          };
        }
        byLocation[locationName].count++;
        if (audit.status === 'completed') {
          byLocation[locationName].completed++;
        }
        if (audit.score !== null) {
          byLocation[locationName].scores.push(audit.score);
        }
      });

      // Calculate average scores per location
      Object.keys(byLocation).forEach(location => {
        const locationData = byLocation[location];
        if (locationData.scores.length > 0) {
          locationData.avgScore = Math.round(
            (locationData.scores.reduce((a, b) => a + b, 0) / locationData.scores.length) * 100
          ) / 100;
        }
      });

      // Daily breakdown
      const dailyBreakdown = {};
      audits.forEach(audit => {
        const date = new Date(audit.created_at).toISOString().split('T')[0];
        if (!dailyBreakdown[date]) {
          dailyBreakdown[date] = {
            date,
            count: 0,
            completed: 0,
            avgScore: 0,
            scores: []
          };
        }
        dailyBreakdown[date].count++;
        if (audit.status === 'completed') {
          dailyBreakdown[date].completed++;
        }
        if (audit.score !== null) {
          dailyBreakdown[date].scores.push(audit.score);
        }
      });

      // Calculate average scores per day
      Object.keys(dailyBreakdown).forEach(date => {
        const dayData = dailyBreakdown[date];
        if (dayData.scores.length > 0) {
          dayData.avgScore = Math.round(
            (dayData.scores.reduce((a, b) => a + b, 0) / dayData.scores.length) * 100
          ) / 100;
        }
      });

      // If compare_mode is enabled and multiple months, group by month for comparison
      let monthComparison = null;
      if (compare_mode === 'true' && months.length > 1) {
        monthComparison = {};
        months.forEach(m => {
          const monthName = new Date(reportYear, m - 1, 1).toLocaleString('default', { month: 'long' });
          const monthAudits = audits.filter(a => {
            const auditDate = new Date(a.created_at);
            return auditDate.getFullYear() === parseInt(reportYear) && auditDate.getMonth() + 1 === m;
          });
          
          const monthScores = monthAudits.filter(a => a.score !== null).map(a => a.score);
          const monthAvgScore = monthScores.length > 0 
            ? Math.round((monthScores.reduce((a, b) => a + b, 0) / monthScores.length) * 100) / 100 
            : 0;
          
          monthComparison[monthName] = {
            month: m,
            monthName: monthName,
            totalAudits: monthAudits.length,
            completedAudits: monthAudits.filter(a => a.status === 'completed').length,
            inProgressAudits: monthAudits.filter(a => a.status === 'in_progress').length,
            avgScore: monthAvgScore,
            minScore: monthScores.length > 0 ? Math.min(...monthScores) : 0,
            maxScore: monthScores.length > 0 ? Math.max(...monthScores) : 0,
            completionRate: monthAudits.length > 0 
              ? Math.round((monthAudits.filter(a => a.status === 'completed').length / monthAudits.length) * 100) 
              : 0
          };
        });
      }

      // Build response
      const response = {
        period: months.length === 1 ? {
          year: parseInt(reportYear),
          month: months[0],
          monthName: new Date(reportYear, months[0] - 1, 1).toLocaleString('default', { month: 'long' })
        } : {
          year: parseInt(reportYear),
          months: months.map(m => ({
            month: m,
            monthName: new Date(reportYear, m - 1, 1).toLocaleString('default', { month: 'long' })
          }))
        },
        summary: {
          totalAudits,
          completedAudits,
          inProgressAudits,
          avgScore,
          minScore,
          maxScore,
          completionRate: totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0
        },
        byTemplate: Object.values(byTemplate),
        byLocation: Object.values(byLocation),
        dailyBreakdown: Object.values(dailyBreakdown).sort((a, b) => a.date.localeCompare(b.date)),
        audits: audits.map(a => ({
          id: a.id,
          restaurant_name: a.restaurant_name,
          location_name: a.location_name,
          template_name: a.template_name,
          status: a.status,
          score: a.score,
          created_at: a.created_at
        }))
      };

      // Add month comparison if enabled
      if (monthComparison) {
        response.monthComparison = monthComparison;
      }

      // Check if Excel export is requested
      if (req.query.format === 'excel') {
        try {
          const buffer = await exportMonthlyScorecardToExcel(response);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          const filename = months.length === 1 
            ? `monthly-scorecard-${reportYear}-${String(months[0]).padStart(2, '0')}.xlsx`
            : `monthly-scorecard-${reportYear}-${months.map(m => String(m).padStart(2, '0')).join('-')}.xlsx`;
          res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
          res.send(buffer);
          return;
        } catch (excelErr) {
          logger.error('Error generating Excel file:', excelErr);
          return res.status(500).json({ error: 'Error generating Excel file', details: excelErr.message });
        }
      }

      res.json(response);
    }
  );
});

// Export monthly scorecard to PDF
router.get('/monthly-scorecard/pdf', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { year, month, location_id } = req.query;
  const dbInstance = db.getDb();

  // Parse multiple months if provided (comma-separated)
  let months = [];
  if (month) {
    months = month.toString().split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m) && m >= 1 && m <= 12);
  }
  if (months.length === 0) {
    // Default to current month if not specified
    months = [new Date().getMonth() + 1];
  }

  // Parse multiple location_ids if provided (comma-separated)
  let locationIds = [];
  if (location_id) {
    locationIds = location_id.toString().split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  }

  // Default to current year if not specified
  const reportYear = year || new Date().getFullYear();
  const yearStr = String(reportYear);

  // Build query with optional location filter
  let locationFilter = '';
  let params = [];
  
  // Build date filter for multiple months
  const dbType = process.env.DB_TYPE || 'sqlite';
  let dateQuery;
  if (months.length === 1) {
    // Single month - use existing logic
    const monthPadded = String(months[0]).padStart(2, '0');
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
      params.push(yearStr, months[0]);
    } else if (dbType === 'mysql') {
      dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
      params.push(yearStr, months[0]);
    } else {
      dateQuery = `strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) = ?`;
      params.push(yearStr, monthPadded);
    }
  } else {
    // Multiple months - use IN clause
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      const monthPlaceholders = months.map(() => '?').join(',');
      dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) IN (${monthPlaceholders})`;
      params.push(yearStr, ...months);
    } else if (dbType === 'mysql') {
      const monthPlaceholders = months.map(() => '?').join(',');
      dateQuery = `YEAR(a.created_at) = ? AND MONTH(a.created_at) IN (${monthPlaceholders})`;
      params.push(yearStr, ...months);
    } else {
      // SQLite and PostgreSQL
      const monthPaddeds = months.map(m => String(m).padStart(2, '0'));
      const monthPlaceholders = monthPaddeds.map(() => '?').join(',');
      dateQuery = `strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) IN (${monthPlaceholders})`;
      params.push(yearStr, ...monthPaddeds);
    }
  }
  
  // Build location filter for multiple locations
  if (locationIds.length > 0) {
    const locationPlaceholders = locationIds.map(() => '?').join(',');
    locationFilter = `AND a.location_id IN (${locationPlaceholders})`;
    params.push(...locationIds);
  }
  
  // Build WHERE clause - admins see all audits
  const whereClause = isAdmin 
    ? `WHERE ${dateQuery}`
    : `WHERE a.user_id = ? AND ${dateQuery}`;
  
  if (!isAdmin) {
    params.unshift(userId);
  }
  
  const monthNames = months.map(m => new Date(reportYear, m - 1, 1).toLocaleString('default', { month: 'long' }));
  const monthName = monthNames.length === 1 ? monthNames[0] : monthNames.join(', ');
  
  dbInstance.all(
    `SELECT a.*, ct.name as template_name, ct.category, l.name as location_name, u.name as user_name
     FROM audits a
     JOIN checklist_templates ct ON a.template_id = ct.id
     LEFT JOIN locations l ON a.location_id = l.id
     LEFT JOIN users u ON a.user_id = u.id
     ${whereClause}
     ${locationFilter}
     ORDER BY a.created_at DESC`,
    params,
    (err, audits) => {
      if (err) {
        logger.error('Monthly scorecard PDF error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      // Calculate statistics
      const totalAudits = audits.length;
      const completedAudits = audits.filter(a => a.status === 'completed').length;
      const scores = audits.filter(a => a.score !== null).map(a => a.score);
      const avgScore = scores.length > 0 
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 
        : 0;

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      const filename = months.length === 1 
        ? `monthly-scorecard-${reportYear}-${String(months[0]).padStart(2, '0')}.pdf`
        : `monthly-scorecard-${reportYear}-${months.map(m => String(m).padStart(2, '0')).join('-')}.pdf`;
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      doc.pipe(res);

      // Header
      doc.fontSize(24).text('Monthly Scorecard Report', { align: 'center' });
      doc.fontSize(16).text(`${monthName} ${reportYear}`, { align: 'center' });
      doc.moveDown(2);

      // Summary
      doc.fontSize(18).text('Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Total Audits: ${totalAudits}`);
      doc.text(`Completed Audits: ${completedAudits}`);
      doc.text(`Completion Rate: ${totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0}%`);
      doc.text(`Average Score: ${avgScore}%`);
      doc.moveDown();

      // Audit Details
      doc.fontSize(18).text('Audit Details', { underline: true });
      doc.moveDown(0.5);

      audits.forEach((audit, index) => {
        doc.fontSize(11);
        doc.text(`${index + 1}. ${audit.restaurant_name}`, { continued: false });
        doc.fontSize(10).fillColor('gray');
        doc.text(`   Location: ${audit.location_name || 'N/A'} | Template: ${audit.template_name}`);
        doc.text(`   Status: ${audit.status} | Score: ${audit.score !== null ? audit.score + '%' : 'N/A'}`);
        doc.text(`   Date: ${new Date(audit.created_at).toLocaleDateString()}`);
        doc.fillColor('black');
        doc.moveDown(0.5);
      });

      doc.end();
    }
  );
});

// Export scheduled audits report to PDF
router.get('/scheduled-audits/pdf', authenticate, (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to, location_id, template_id } = req.query;
  const dbInstance = db.getDb();

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, u.name as assigned_to_name
     FROM scheduled_audits sa
     JOIN checklist_templates ct ON sa.template_id = ct.id
     LEFT JOIN locations l ON sa.location_id = l.id
     LEFT JOIN users u ON sa.assigned_to = u.id
     WHERE sa.created_by = ?`;
  
  const params = [userId];

  const dbType = process.env.DB_TYPE || 'sqlite';
  if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) >= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) <= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) <= ?';
    }
    params.push(date_to);
  }
  if (location_id) {
    query += ' AND sa.location_id = ?';
    params.push(location_id);
  }
  if (template_id) {
    query += ' AND sa.template_id = ?';
    params.push(template_id);
  }

  query += ' ORDER BY sa.scheduled_date ASC';

  dbInstance.all(query, params, (err, schedules) => {
    if (err) {
      logger.error('Scheduled audits PDF error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    const dateRange = date_from && date_to 
      ? `${date_from} to ${date_to}`
      : 'All Time';
    res.setHeader('Content-Disposition', `attachment; filename=scheduled-audits-report-${dateRange.replace(/\s+/g, '-')}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).text('Scheduled Audits Report', { align: 'center' });
    doc.fontSize(16).text(dateRange, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const totalSchedules = schedules.length;
    const completed = schedules.filter(s => s.status === 'completed').length;
    const pending = schedules.filter(s => (s.status || 'pending') === 'pending').length;

    doc.fontSize(18).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Scheduled Audits: ${totalSchedules}`);
    doc.text(`Completed: ${completed}`);
    doc.text(`Pending: ${pending}`);
    doc.moveDown();

    // Schedule Details
    doc.fontSize(18).text('Schedule Details', { underline: true });
    doc.moveDown(0.5);

    schedules.forEach((schedule, index) => {
      doc.fontSize(11);
      doc.text(`${index + 1}. ${schedule.template_name}`, { continued: false });
      doc.fontSize(10).fillColor('gray');
      doc.text(`   Location: ${schedule.location_name || 'N/A'} | Assigned: ${schedule.assigned_to_name || 'Unassigned'}`);
      doc.text(`   Scheduled Date: ${new Date(schedule.scheduled_date).toLocaleDateString()}`);
      doc.text(`   Frequency: ${schedule.frequency} | Status: ${schedule.status || 'pending'}`);
      if (schedule.next_run_date) {
        doc.text(`   Next Run: ${new Date(schedule.next_run_date).toLocaleDateString()}`);
      }
      doc.fillColor('black');
      doc.moveDown(0.5);
    });

    doc.end();
  });
});

// Export scheduled audits report to CSV
router.get('/scheduled-audits/csv', authenticate, (req, res) => {
  const userId = req.user.id;
  const { date_from, date_to, location_id, template_id } = req.query;
  const dbInstance = db.getDb();

  let query = `SELECT sa.*, ct.name as template_name, l.name as location_name, u.name as assigned_to_name
     FROM scheduled_audits sa
     JOIN checklist_templates ct ON sa.template_id = ct.id
     LEFT JOIN locations l ON sa.location_id = l.id
     LEFT JOIN users u ON sa.assigned_to = u.id
     WHERE sa.created_by = ?`;
  
  const params = [userId];

  const dbType = process.env.DB_TYPE || 'sqlite';
  if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) >= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      query += ' AND CAST(sa.scheduled_date AS DATE) <= CAST(? AS DATE)';
    } else {
      query += ' AND DATE(sa.scheduled_date) <= ?';
    }
    params.push(date_to);
  }
  if (location_id) {
    query += ' AND sa.location_id = ?';
    params.push(location_id);
  }
  if (template_id) {
    query += ' AND sa.template_id = ?';
    params.push(template_id);
  }

  query += ' ORDER BY sa.scheduled_date ASC';

  dbInstance.all(query, params, (err, schedules) => {
    if (err) {
      logger.error('Scheduled audits CSV error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    try {
      // Generate CSV header
      const headers = [
        'ID',
        'Template',
        'Location',
        'Assigned To',
        'Scheduled Date',
        'Next Run Date',
        'Frequency',
        'Status',
        'Created Date'
      ];

      // Generate CSV rows
      const rows = schedules.map(schedule => {
        const row = [
          schedule.id,
          `"${(schedule.template_name || '').replace(/"/g, '""')}"`,
          `"${(schedule.location_name || 'N/A').replace(/"/g, '""')}"`,
          `"${(schedule.assigned_to_name || 'Unassigned').replace(/"/g, '""')}"`,
          new Date(schedule.scheduled_date).toLocaleDateString(),
          schedule.next_run_date ? new Date(schedule.next_run_date).toLocaleDateString() : 'N/A',
          schedule.frequency || '',
          schedule.status || 'pending',
          new Date(schedule.created_at).toLocaleString()
        ];
        return row.join(',');
      });

      // Combine header and rows
      const csvContent = [
        headers.join(','),
        ...rows
      ].join('\n');

      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=scheduled-audits-report.csv');
      
      // Send CSV content
      res.send(csvContent);
    } catch (error) {
      logger.error('Error generating CSV:', error);
      res.status(500).json({ error: 'Error generating CSV file', details: error.message });
    }
  });
});

// Get store-based analytics report (grouped by location/store)
router.get('/analytics-by-store', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { date_from, date_to, format } = req.query; // format: 'json' or 'csv'
  const dbInstance = db.getDb();

  // Build date filter
  let dateFilter = '';
  let params = [];
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (date_from && date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE) AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) >= ? AND DATE(a.created_at) <= ?';
    }
    params.push(date_from, date_to);
  } else if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) >= ?';
    }
    params.push(date_from);
  } else if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) <= ?';
    }
    params.push(date_to);
  }

  // Build user filter
  const userFilter = isAdmin ? '' : 'AND a.user_id = ?';
  if (!isAdmin) {
    params.push(userId);
  }

  // Query to get all audits with location information, including scheduled audit data
  const query = `
    SELECT 
      a.id,
      a.restaurant_name,
      a.location,
      a.location_id,
      a.status,
      a.score,
      a.completed_items,
      a.total_items,
      a.created_at,
      a.completed_at,
      a.scheduled_audit_id,
      l.name as location_name,
      l.store_number,
      l.address,
      l.city,
      l.state,
      ct.id as template_id,
      ct.name as template_name,
      u.name as auditor_name,
      sa.scheduled_date
    FROM audits a
    LEFT JOIN locations l ON a.location_id = l.id
    LEFT JOIN checklist_templates ct ON a.template_id = ct.id
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id
    WHERE 1=1 ${userFilter} ${dateFilter}
    ORDER BY l.store_number, l.name, a.created_at DESC
  `;

  dbInstance.all(query, params, async (err, audits) => {
    if (err) {
      logger.error('Store analytics error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Group audits by store/location AND template (one row per store-template combination)
    const storeData = {};
    
    audits.forEach(audit => {
      // Use location_id, location_name, and template_id as key to create separate rows per template
      const templateId = audit.template_id || 'unknown';
      const templateName = audit.template_name || 'Unknown Template';
      const storeKey = audit.location_id 
        ? `${audit.location_id}_${audit.location_name || audit.location || 'Unknown'}_${templateId}`
        : `text_${audit.location || 'Unknown'}_${templateId}`;
      
      if (!storeData[storeKey]) {
        storeData[storeKey] = {
          store_id: audit.location_id || null,
          store_name: audit.location_name || audit.location || 'Unknown Store',
          store_number: audit.store_number || null,
          address: audit.address || null,
          city: audit.city || null,
          state: audit.state || null,
          template_id: templateId,
          template_name: templateName,
          total_audits: 0,
          completed_audits: 0,
          in_progress_audits: 0,
          total_score: 0,
          score_count: 0,
          average_score: 0,
          min_score: null,
          max_score: null,
          total_items: 0,
          completed_items: 0,
          scheduled_dates: [], // Track scheduled dates
          completed_dates: [], // Track completed dates
          deviations: [], // Track deviations in days
          audits: []
        };
      }

      const store = storeData[storeKey];
      store.total_audits++;
      
      if (audit.status === 'completed') {
        store.completed_audits++;
      } else if (audit.status === 'in_progress') {
        store.in_progress_audits++;
      }

      if (audit.score !== null) {
        store.total_score += audit.score;
        store.score_count++;
        if (store.min_score === null || audit.score < store.min_score) {
          store.min_score = audit.score;
        }
        if (store.max_score === null || audit.score > store.max_score) {
          store.max_score = audit.score;
        }
      }

      store.total_items += audit.total_items || 0;
      store.completed_items += audit.completed_items || 0;
      
      // Track scheduled date, fallback to created_at if not available
      const scheduledDateForTracking = audit.scheduled_date || audit.created_at;
      if (scheduledDateForTracking) {
        store.scheduled_dates.push(scheduledDateForTracking);
      }
      
      // Track completed date
      if (audit.completed_at) {
        store.completed_dates.push(audit.completed_at);
      }
      
      // Calculate deviation in days
      // Use scheduled_date if available, otherwise use created_at (matching Scheduled Date column)
      // Formula: scheduled_date - completed_date (or created_date if not completed)
      // Positive = early completion, Negative = late completion
      const scheduledDateForCalc = audit.scheduled_date || audit.created_at;
      const actualDate = audit.completed_at ? new Date(audit.completed_at) : new Date(audit.created_at);
      const scheduledDateObj = new Date(scheduledDateForCalc);
      
      // Normalize dates to compare only date part (set time to 00:00:00)
      const normalizeDate = (date) => {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      };
      
      const scheduledNormalized = normalizeDate(scheduledDateObj);
      const actualNormalized = normalizeDate(actualDate);
      
      // Calculate difference in days: scheduled_date - actual_date
      const diffTime = scheduledNormalized - actualNormalized;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      store.deviations.push(diffDays);
      
      store.audits.push({
        id: audit.id,
        restaurant_name: audit.restaurant_name,
        template_name: audit.template_name,
        status: audit.status,
        score: audit.score,
        auditor_name: audit.auditor_name,
        created_at: audit.created_at,
        completed_at: audit.completed_at,
        scheduled_date: audit.scheduled_date
      });
    });

    // Helper function to format date to India time (IST - UTC+5:30) - Date only
    const formatIndiaDate = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        const utcTime = date.getTime();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(utcTime + istOffset);
        const day = String(istTime.getUTCDate()).padStart(2, '0');
        const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
        const year = istTime.getUTCFullYear();
        return `${day}-${month}-${year}`;
      } catch (error) {
        return dateString;
      }
    };

    // Calculate averages and completion rates
    const storeAnalytics = Object.values(storeData).map(store => {
      // Average Score: Only count audits with scores, round to 2 decimal places
      store.average_score = store.score_count > 0 
        ? Math.round((store.total_score / store.score_count) * 100) / 100 
        : 0;
      
      // Completion Rate: Percentage of completed audits
      store.completion_rate = store.total_audits > 0
        ? Math.round((store.completed_audits / store.total_audits) * 100)
        : 0;
      
      // Items Completion Rate: Percentage of completed items
      store.items_completion_rate = store.total_items > 0
        ? Math.round((store.completed_items / store.total_items) * 100)
        : 0;
      
      // Min/Max Score: Only show if there are scores
      if (store.score_count === 0) {
        store.min_score = null;
        store.max_score = null;
      }
      
      // Template is already set per store-template combination
      store.template = store.template_name || '';
      
      // Get latest scheduled date, fallback to created_at if no scheduled date
      if (store.scheduled_dates.length > 0) {
        const latestScheduled = new Date(Math.max(...store.scheduled_dates.map(d => new Date(d).getTime())));
        store.scheduled_date = formatIndiaDate(latestScheduled.toISOString());
      } else {
        // Fallback to latest created_at if no scheduled dates
        if (store.audits.length > 0) {
          const latestCreated = new Date(Math.max(...store.audits.map(a => new Date(a.created_at).getTime())));
          store.scheduled_date = formatIndiaDate(latestCreated.toISOString());
        } else {
          store.scheduled_date = '';
        }
      }
      
      // Get latest completed date
      if (store.completed_dates.length > 0) {
        const latestCompleted = new Date(Math.max(...store.completed_dates.map(d => new Date(d).getTime())));
        store.completed_date = formatIndiaDate(latestCompleted.toISOString());
      } else {
        store.completed_date = '';
      }
      
      // Calculate average deviation
      if (store.deviations.length > 0) {
        const sum = store.deviations.reduce((a, b) => a + b, 0);
        store.avg_deviation = Math.round((sum / store.deviations.length) * 100) / 100;
      } else {
        store.avg_deviation = '';
      }
      
      return store;
    });

    // Sort by store number, then by store name, then by template name
    storeAnalytics.sort((a, b) => {
      // First sort by store number
      if (a.store_number && b.store_number) {
        const numCompare = a.store_number.localeCompare(b.store_number);
        if (numCompare !== 0) return numCompare;
      } else if (a.store_number) return -1;
      else if (b.store_number) return 1;
      
      // Then by store name
      const nameCompare = a.store_name.localeCompare(b.store_name);
      if (nameCompare !== 0) return nameCompare;
      
      // Finally by template name
      return (a.template_name || '').localeCompare(b.template_name || '');
    });

    // Return CSV, Excel, or JSON
    if (format === 'excel') {
      try {
        const buffer = await exportStoreAnalyticsToExcel(storeAnalytics);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=store-analytics-${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);
        return;
      } catch (excelErr) {
        logger.error('Error generating Excel file:', excelErr);
        return res.status(500).json({ error: 'Error generating Excel file', details: excelErr.message });
      }
    } else if (format === 'csv') {
      try {
        // CSV Headers
        const headers = [
          'Store Number',
          'Store Name',
          'Brand Name',
          'City',
          'State',
          'Template',
          'Scheduled Date',
          'Completed Date',
          'Deviation in Schedule (days)',
          'Total Audits',
          'Completed Audits',
          'In Progress Audits',
          'Average Score',
          'Min Score',
          'Max Score',
          'Completion Rate (%)',
          'Total Items',
          'Completed Items',
          'Items Completion Rate (%)'
        ];

        // CSV Rows
        const rows = storeAnalytics.map(store => {
          const row = [
            store.store_number || '',
            store.store_name || '',
            store.address || '',
            store.city || '',
            store.state || '',
            store.template || '',
            store.scheduled_date || '',
            store.completed_date || '',
            store.avg_deviation !== '' ? store.avg_deviation : '',
            store.total_audits,
            store.completed_audits,
            store.in_progress_audits,
            store.average_score,
            store.min_score !== null ? store.min_score : '',
            store.max_score !== null ? store.max_score : '',
            store.completion_rate,
            store.total_items,
            store.completed_items,
            store.items_completion_rate
          ];
          // Escape commas and quotes in CSV
          return row.map(cell => {
            const cellStr = String(cell || '');
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',');
        });

        // Combine header and rows
        const csvContent = [
          headers.join(','),
          ...rows
        ].join('\n');

        // Set response headers
        const filename = `planner-analytics-bystore-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        // Send CSV content
        res.send(csvContent);
      } catch (error) {
        logger.error('Error generating CSV:', error);
        res.status(500).json({ error: 'Error generating CSV file', details: error.message });
      }
    } else {
      // Return JSON
      res.json({
        summary: {
          total_stores: storeAnalytics.length,
          total_audits: audits.length,
          date_range: {
            from: date_from || 'all',
            to: date_to || 'all'
          }
        },
        stores: storeAnalytics
      });
    }
  });
});

// Storewise PDF Report - Groups audits by store/location (similar to CVR 2 (CDR) Plan format)
router.get('/storewise/pdf', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { date_from, date_to, template_id } = req.query;
  const dbInstance = db.getDb();

  // Build date filter
  let dateFilter = '';
  let params = [];
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (date_from && date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE) AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) >= ? AND DATE(a.created_at) <= ?';
    }
    params.push(date_from, date_to);
  } else if (date_from) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) >= ?';
    }
    params.push(date_from);
  } else if (date_to) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) <= ?';
    }
    params.push(date_to);
  }

  // Build user filter
  const userFilter = isAdmin ? '' : 'AND a.user_id = ?';
  if (!isAdmin) {
    params.push(userId);
  }

  // Build template filter
  let templateFilter = '';
  if (template_id) {
    templateFilter = 'AND a.template_id = ?';
    params.push(template_id);
  }

  // Query to get all audits with location information
  const query = `
    SELECT 
      a.id,
      a.restaurant_name,
      a.location,
      a.location_id,
      a.status,
      a.score,
      a.completed_items,
      a.total_items,
      a.created_at,
      a.completed_at,
      a.scheduled_audit_id,
      l.name as location_name,
      l.store_number,
      l.address,
      l.city,
      l.state,
      ct.id as template_id,
      ct.name as template_name,
      u.name as auditor_name,
      sa.scheduled_date
    FROM audits a
    LEFT JOIN locations l ON a.location_id = l.id
    LEFT JOIN checklist_templates ct ON a.template_id = ct.id
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id
    WHERE 1=1 ${userFilter} ${dateFilter} ${templateFilter}
    ORDER BY l.store_number, l.name, a.created_at DESC
  `;

  dbInstance.all(query, params, async (err, audits) => {
    if (err) {
      logger.error('Storewise PDF error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Group audits by store/location
    const storeData = {};
    
    audits.forEach(audit => {
      const storeKey = audit.location_id 
        ? `${audit.location_id}_${audit.location_name || audit.location || 'Unknown'}`
        : `text_${audit.location || 'Unknown'}`;
      
      if (!storeData[storeKey]) {
        storeData[storeKey] = {
          store_id: audit.location_id || null,
          store_name: audit.location_name || audit.location || 'Unknown Store',
          store_number: audit.store_number || null,
          address: audit.address || null,
          city: audit.city || null,
          state: audit.state || null,
          total_audits: 0,
          completed_audits: 0,
          in_progress_audits: 0,
          total_score: 0,
          score_count: 0,
          average_score: 0,
          min_score: null,
          max_score: null,
          audits: []
        };
      }

      const store = storeData[storeKey];
      store.total_audits++;
      
      if (audit.status === 'completed') {
        store.completed_audits++;
      } else if (audit.status === 'in_progress') {
        store.in_progress_audits++;
      }

      if (audit.score !== null) {
        store.total_score += audit.score;
        store.score_count++;
        if (store.min_score === null || audit.score < store.min_score) {
          store.min_score = audit.score;
        }
        if (store.max_score === null || audit.score > store.max_score) {
          store.max_score = audit.score;
        }
      }

      store.audits.push({
        id: audit.id,
        restaurant_name: audit.restaurant_name,
        template_name: audit.template_name,
        status: audit.status,
        score: audit.score,
        auditor_name: audit.auditor_name,
        created_at: audit.created_at,
        completed_at: audit.completed_at,
        scheduled_date: audit.scheduled_date
      });
    });

    // Calculate averages
    const storeAnalytics = Object.values(storeData).map(store => {
      store.average_score = store.score_count > 0 
        ? Math.round((store.total_score / store.score_count) * 100) / 100 
        : 0;
      store.completion_rate = store.total_audits > 0
        ? Math.round((store.completed_audits / store.total_audits) * 100)
        : 0;
      return store;
    });

    // Sort by store number, then by store name
    storeAnalytics.sort((a, b) => {
      if (a.store_number && b.store_number) {
        const numCompare = a.store_number.localeCompare(b.store_number);
        if (numCompare !== 0) return numCompare;
      } else if (a.store_number) return -1;
      else if (b.store_number) return 1;
      return (a.store_name || '').localeCompare(b.store_name || '');
    });

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    
    // Determine template name for filename
    let templateName = 'All Templates';
    if (template_id && audits.length > 0) {
      templateName = audits[0].template_name || 'Report';
    } else if (audits.length > 0) {
      templateName = audits[0].template_name || 'Report';
    }
    
    const fileName = `${templateName} - Report Storewise.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    doc.pipe(res);

    // Helper function to format date
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (error) {
        return dateString;
      }
    };

    // Header Section
    doc.fontSize(18).fillColor('#000').text(`${templateName} - Report Storewise`, { align: 'center' });
    doc.fontSize(14).fillColor('#666').text('Lite Bite Foods', { align: 'center' });
    
    // Date range
    if (date_from || date_to) {
      doc.fontSize(10).fillColor('#666');
      const dateRange = date_from && date_to 
        ? `${formatDate(date_from)} to ${formatDate(date_to)}`
        : date_from 
          ? `From ${formatDate(date_from)}`
          : `Until ${formatDate(date_to)}`;
      doc.text(`Period: ${dateRange}`, { align: 'center' });
    }
    
    doc.moveDown(1);

    // Summary Section
    doc.fontSize(12).fillColor('#000').text('Summary', { underline: true });
    doc.fontSize(10).fillColor('#333');
    doc.text(`Total Stores: ${storeAnalytics.length}`);
    doc.text(`Total Audits: ${audits.length}`);
    doc.text(`Completed Audits: ${audits.filter(a => a.status === 'completed').length}`);
    doc.text(`In Progress: ${audits.filter(a => a.status === 'in_progress').length}`);
    
    const allScores = audits.filter(a => a.score !== null).map(a => a.score);
    const overallAvg = allScores.length > 0 
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100 
      : 0;
    doc.text(`Overall Average Score: ${overallAvg}%`);
    doc.moveDown(1.5);

    // Store-wise Details
    doc.fontSize(12).fillColor('#000').text('Store-wise Details', { underline: true });
    doc.moveDown(0.5);

    let pageNumber = 1;
    const addFooter = () => {
      doc.fontSize(8).fillColor('#999');
      doc.text(`Page ${pageNumber}`, 50, doc.page.height - 50);
      doc.text('Powered By Accrue', doc.page.width - 150, doc.page.height - 50, { align: 'right' });
    };

    storeAnalytics.forEach((store, index) => {
      // Check if we need a new page
      if (doc.y > 700) {
        addFooter();
        doc.addPage();
        pageNumber++;
      }

      // Store Header
      doc.fontSize(11).fillColor('#000').text(`${index + 1}. ${store.store_name}`, { underline: true });
      
      // Store Details
      doc.fontSize(9).fillColor('#333');
      if (store.store_number) {
        doc.text(`Store Number: ${store.store_number}`);
      }
      if (store.address) {
        doc.text(`Address: ${store.address}`);
      }
      if (store.city || store.state) {
        doc.text(`Location: ${[store.city, store.state].filter(Boolean).join(', ')}`);
      }
      doc.moveDown(0.3);

      // Store Statistics
      doc.fontSize(9).fillColor('#000');
      doc.text(`Total Audits: ${store.total_audits}`, { continued: true });
      doc.text(`  |  Completed: ${store.completed_audits}`, { continued: true });
      doc.text(`  |  In Progress: ${store.in_progress_audits}`, { continued: false });
      
      if (store.score_count > 0) {
        doc.text(`Average Score: ${store.average_score}%`, { continued: true });
        doc.text(`  |  Min: ${store.min_score}%`, { continued: true });
        doc.text(`  |  Max: ${store.max_score}%`, { continued: true });
        doc.text(`  |  Completion Rate: ${store.completion_rate}%`, { continued: false });
      }
      doc.moveDown(0.3);

      // Individual Audit Details
      if (store.audits.length > 0) {
        doc.fontSize(9).fillColor('#666').text('Audit Details:', { underline: true });
        store.audits.slice(0, 5).forEach((audit, auditIndex) => {
          const auditDate = formatDate(audit.created_at);
          const scoreText = audit.score !== null ? `${audit.score}%` : 'N/A';
          doc.fontSize(8).fillColor('#333');
          doc.text(`  ${auditIndex + 1}. ${audit.template_name || 'Audit'} - ${auditDate} - ${audit.status} - Score: ${scoreText}`);
          if (audit.auditor_name) {
            doc.text(`     Auditor: ${audit.auditor_name}`, { indent: 5 });
          }
        });
        if (store.audits.length > 5) {
          doc.fontSize(8).fillColor('#666');
          doc.text(`  ... and ${store.audits.length - 5} more audit(s)`, { indent: 5 });
        }
      }

      doc.moveDown(0.8);
    });

    // Final footer
    addFooter();

    doc.end();
  });
});

// Enhanced Dashboard Report - Detailed audit report matching Excel structure
router.get('/dashboard/enhanced', authenticate, requirePermission('view_analytics', 'manage_analytics'), async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = isAdminUser(req.user);
    const { date_from, date_to } = req.query;
    
    const buffer = await createEnhancedDashboardReport(userId, isAdmin, date_from, date_to);
    
    const filename = `enhanced-dashboard-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    res.send(buffer);
  } catch (error) {
    logger.error('Error generating enhanced dashboard report:', error);
    res.status(500).json({ 
      error: 'Error generating enhanced dashboard report', 
      details: error.message 
    });
  }
});

// Dashboard Report - Export comprehensive dashboard analytics to Excel
router.get('/dashboard/excel', authenticate, requirePermission('view_analytics', 'manage_analytics'), async (req, res) => {
  try {
    // Fetch data directly using the same queries as analytics/dashboard
    // but we need to get the data first, then export it
    const userId = req.user.id;
    const isAdmin = isAdminUser(req.user);
    const dbInstance = db.getDb();

    // Get dashboard analytics data (similar to /api/analytics/dashboard)
    const userFilter = isAdmin ? '' : 'WHERE user_id = ?';
    const userParams = isAdmin ? [] : [userId];
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const dbType = process.env.DB_TYPE || 'sqlite';

    // Fetch all dashboard data in parallel
    const [
      total,
      completed,
      inProgress,
      avgScore,
      byStatus,
      byMonth,
      topUsers,
      recent,
      currentMonthStats,
      lastMonthStats,
      topStores,
      scheduleAdherence
    ] = await Promise.all([
      // Total audits
      new Promise((resolve, reject) => {
        const query = isAdmin 
          ? 'SELECT COUNT(*) as total FROM audits'
          : 'SELECT COUNT(*) as total FROM audits WHERE user_id = ?';
        dbInstance.get(query, userParams, (err, row) => {
          if (err) {
            logger.error('Error fetching total audits:', err);
            return reject(err);
          }
          resolve(row?.total || 0);
        });
      }),
      // Completed audits
      new Promise((resolve, reject) => {
        const query = isAdmin
          ? 'SELECT COUNT(*) as total FROM audits WHERE status = ?'
          : 'SELECT COUNT(*) as total FROM audits WHERE user_id = ? AND status = ?';
        const params = isAdmin ? ['completed'] : [userId, 'completed'];
        dbInstance.get(query, params, (err, row) => err ? reject(err) : resolve(row.total));
      }),
      // In progress audits
      new Promise((resolve, reject) => {
        const query = isAdmin
          ? 'SELECT COUNT(*) as total FROM audits WHERE status = ?'
          : 'SELECT COUNT(*) as total FROM audits WHERE user_id = ? AND status = ?';
        const params = isAdmin ? ['in_progress'] : [userId, 'in_progress'];
        dbInstance.get(query, params, (err, row) => {
          if (err) {
            logger.error('Error fetching in progress audits:', err);
            return reject(err);
          }
          resolve(row?.total || 0);
        });
      }),
      // Average score
      new Promise((resolve, reject) => {
        const query = isAdmin
          ? 'SELECT AVG(score) as avg FROM audits WHERE score IS NOT NULL'
          : 'SELECT AVG(score) as avg FROM audits WHERE user_id = ? AND score IS NOT NULL';
        dbInstance.get(query, userParams, (err, row) => {
          if (err) {
            logger.error('Error fetching average score:', err);
            return reject(err);
          }
          resolve(row?.avg || 0);
        });
      }),
      // By status
      new Promise((resolve, reject) => {
        const query = isAdmin
          ? `SELECT status, COUNT(*) as count FROM audits GROUP BY status`
          : `SELECT status, COUNT(*) as count FROM audits WHERE user_id = ? GROUP BY status`;
        dbInstance.all(query, userParams, (err, rows) => {
          if (err) {
            logger.error('Error fetching audits by status:', err);
            return reject(err);
          }
          const total = (rows || []).reduce((sum, r) => sum + (r.count || 0), 0);
          resolve((rows || []).map(r => ({
            status: r.status || '',
            count: r.count || 0,
            percentage: total > 0 ? Math.round((r.count / total) * 100) : 0
          })));
        });
      }),
      // By month (last 12 months)
      new Promise((resolve, reject) => {
        let query;
        if (dbType === 'mssql' || dbType === 'sqlserver') {
          query = isAdmin
            ? `SELECT FORMAT(created_at, 'yyyy-MM') as month, COUNT(*) as total, 
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN status = 'completed' AND score IS NOT NULL THEN score ELSE NULL END) as avgScore
               FROM audits 
               WHERE created_at >= DATEADD(MONTH, -12, GETDATE())
               GROUP BY FORMAT(created_at, 'yyyy-MM')
               ORDER BY month DESC`
            : `SELECT FORMAT(created_at, 'yyyy-MM') as month, COUNT(*) as total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN status = 'completed' AND score IS NOT NULL THEN score ELSE NULL END) as avgScore
               FROM audits 
               WHERE user_id = ? AND created_at >= DATEADD(MONTH, -12, GETDATE())
               GROUP BY FORMAT(created_at, 'yyyy-MM')
               ORDER BY month DESC`;
        } else if (dbType === 'mysql') {
          query = isAdmin
            ? `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN status = 'completed' AND score IS NOT NULL THEN score ELSE NULL END) as avgScore
               FROM audits 
               WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
               GROUP BY DATE_FORMAT(created_at, '%Y-%m')
               ORDER BY month DESC`
            : `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN status = 'completed' AND score IS NOT NULL THEN score ELSE NULL END) as avgScore
               FROM audits 
               WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
               GROUP BY DATE_FORMAT(created_at, '%Y-%m')
               ORDER BY month DESC`;
        } else {
          query = isAdmin
            ? `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN status = 'completed' AND score IS NOT NULL THEN score ELSE NULL END) as avgScore
               FROM audits 
               WHERE created_at >= datetime('now', '-12 months')
               GROUP BY strftime('%Y-%m', created_at)
               ORDER BY month DESC`
            : `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN status = 'completed' AND score IS NOT NULL THEN score ELSE NULL END) as avgScore
               FROM audits 
               WHERE user_id = ? AND created_at >= datetime('now', '-12 months')
               GROUP BY strftime('%Y-%m', created_at)
               ORDER BY month DESC`;
        }
        dbInstance.all(query, userParams, (err, rows) => {
          if (err) {
            logger.error('Error fetching monthly trends:', err);
            logger.error('Query:', query);
            return reject(err);
          }
          resolve((rows || []).map(r => ({
            month: r.month || '',
            total: r.total || 0,
            completed: r.completed || 0,
            avgScore: r.avgScore ? Math.round(r.avgScore * 100) / 100 : 0
          })));
        });
      }),
      // Top users
      new Promise((resolve, reject) => {
        const dbType = process.env.DB_TYPE || 'sqlite';
        const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
        let query;
        const params = isAdmin ? [] : [userId];
        
        if (isMssql) {
          query = isAdmin
            ? `SELECT TOP 10 u.id, u.name, u.email, COUNT(a.id) as total,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN a.status = 'completed' AND a.score IS NOT NULL THEN CAST(a.score AS FLOAT) ELSE NULL END) as avgScore
               FROM users u
               LEFT JOIN audits a ON u.id = a.user_id
               GROUP BY u.id, u.name, u.email
               HAVING COUNT(a.id) > 0
               ORDER BY total DESC`
            : `SELECT u.id, u.name, u.email, COUNT(a.id) as total,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN a.status = 'completed' AND a.score IS NOT NULL THEN CAST(a.score AS FLOAT) ELSE NULL END) as avgScore
               FROM users u
               LEFT JOIN audits a ON u.id = a.user_id
               WHERE u.id = ?
               GROUP BY u.id, u.name, u.email
               ORDER BY total DESC`;
        } else {
          query = isAdmin
            ? `SELECT u.id, u.name, u.email, COUNT(a.id) as total,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN a.status = 'completed' AND a.score IS NOT NULL THEN a.score ELSE NULL END) as avgScore
               FROM users u
               LEFT JOIN audits a ON u.id = a.user_id
               GROUP BY u.id, u.name, u.email
               HAVING COUNT(a.id) > 0
               ORDER BY total DESC
               LIMIT 10`
            : `SELECT u.id, u.name, u.email, COUNT(a.id) as total,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN a.status = 'completed' AND a.score IS NOT NULL THEN a.score ELSE NULL END) as avgScore
               FROM users u
               LEFT JOIN audits a ON u.id = a.user_id
               WHERE u.id = ?
               GROUP BY u.id, u.name, u.email
               ORDER BY total DESC`;
        }
        
        dbInstance.all(query, params, (err, rows) => {
          if (err) {
            logger.error('Error fetching top users:', err);
            logger.error('Query:', query);
            return reject(err);
          }
          resolve((rows || []).map(r => ({
            id: r.id,
            name: r.name || '',
            email: r.email || '',
            total: r.total || 0,
            completed: r.completed || 0,
            avgScore: r.avgScore ? Math.round(r.avgScore * 100) / 100 : 0
          })));
        });
      }),
      // Recent audits
      new Promise((resolve, reject) => {
        const dbType = process.env.DB_TYPE || 'sqlite';
        const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
        let query;
        
        if (isMssql) {
          // SQL Server: Cast NTEXT to NVARCHAR(MAX) for compatibility
          query = isAdmin
            ? `SELECT TOP 20 a.id, a.restaurant_name, CAST(a.location AS NVARCHAR(MAX)) as location, a.location_id,
               a.template_id, a.status, a.score, a.created_at, a.completed_at,
               ct.name as template_name, ct.category, u.name as user_name
               FROM audits a
               JOIN checklist_templates ct ON a.template_id = ct.id
               LEFT JOIN users u ON a.user_id = u.id
               ORDER BY a.created_at DESC`
            : `SELECT TOP 20 a.id, a.restaurant_name, CAST(a.location AS NVARCHAR(MAX)) as location, a.location_id,
               a.template_id, a.status, a.score, a.created_at, a.completed_at,
               ct.name as template_name, ct.category, u.name as user_name
               FROM audits a
               JOIN checklist_templates ct ON a.template_id = ct.id
               LEFT JOIN users u ON a.user_id = u.id
               WHERE a.user_id = ?
               ORDER BY a.created_at DESC`;
        } else {
          query = isAdmin
            ? `SELECT a.id, a.restaurant_name, a.location, a.location_id,
               a.template_id, a.status, a.score, a.created_at, a.completed_at,
               ct.name as template_name, ct.category, u.name as user_name
               FROM audits a
               JOIN checklist_templates ct ON a.template_id = ct.id
               LEFT JOIN users u ON a.user_id = u.id
               ORDER BY a.created_at DESC
               LIMIT 20`
            : `SELECT a.id, a.restaurant_name, a.location, a.location_id,
               a.template_id, a.status, a.score, a.created_at, a.completed_at,
               ct.name as template_name, ct.category, u.name as user_name
               FROM audits a
               JOIN checklist_templates ct ON a.template_id = ct.id
               LEFT JOIN users u ON a.user_id = u.id
               WHERE a.user_id = ?
               ORDER BY a.created_at DESC
               LIMIT 20`;
        }
        
        dbInstance.all(query, userParams, (err, rows) => {
          if (err) {
            logger.error('Error fetching recent audits:', err);
            logger.error('Query:', query);
            return reject(err);
          }
          resolve(rows || []);
        });
      }),
      // Current month stats
      new Promise((resolve, reject) => {
        let query;
        const whereClause = isAdmin ? '' : 'WHERE a.user_id = ?';
        const params = isAdmin ? [] : [userId];
        
        if (dbType === 'mssql' || dbType === 'sqlserver') {
          query = `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
            AVG(a.score) as avg_score
           FROM audits a
           ${whereClause} AND YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
          if (isAdmin) {
            query = query.replace('AND YEAR', 'WHERE YEAR');
          }
          params.push(currentYear, currentMonth);
        } else if (dbType === 'mysql') {
          query = `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
            AVG(a.score) as avg_score
           FROM audits a
           ${whereClause} AND YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
          if (isAdmin) {
            query = query.replace('AND YEAR', 'WHERE YEAR');
          }
          params.push(currentYear, currentMonth);
        } else {
          query = `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
            AVG(a.score) as avg_score
           FROM audits a
           ${whereClause} AND strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) = ?`;
          if (isAdmin) {
            query = query.replace('AND strftime', 'WHERE strftime');
          }
          params.push(String(currentYear), String(currentMonth).padStart(2, '0'));
        }
        dbInstance.get(query, params, (err, row) => {
          if (err) return reject(err);
          resolve(row || { total: 0, completed: 0, avg_score: 0 });
        });
      }),
      // Last month stats
      new Promise((resolve, reject) => {
        let query;
        const whereClause = isAdmin ? '' : 'WHERE a.user_id = ?';
        const params = isAdmin ? [] : [userId];
        
        if (dbType === 'mssql' || dbType === 'sqlserver') {
          query = `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
            AVG(a.score) as avg_score
           FROM audits a
           ${whereClause} AND YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
          if (isAdmin) {
            query = query.replace('AND YEAR', 'WHERE YEAR');
          }
          params.push(lastMonthYear, lastMonth);
        } else if (dbType === 'mysql') {
          query = `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
            AVG(a.score) as avg_score
           FROM audits a
           ${whereClause} AND YEAR(a.created_at) = ? AND MONTH(a.created_at) = ?`;
          if (isAdmin) {
            query = query.replace('AND YEAR', 'WHERE YEAR');
          }
          params.push(lastMonthYear, lastMonth);
        } else {
          query = `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
            AVG(a.score) as avg_score
           FROM audits a
           ${whereClause} AND strftime('%Y', a.created_at) = ? AND strftime('%m', a.created_at) = ?`;
          if (isAdmin) {
            query = query.replace('AND strftime', 'WHERE strftime');
          }
          params.push(String(lastMonthYear), String(lastMonth).padStart(2, '0'));
        }
        dbInstance.get(query, params, (err, row) => {
          if (err) return reject(err);
          resolve(row || { total: 0, completed: 0, avg_score: 0 });
        });
      }),
      // Top stores
      new Promise((resolve, reject) => {
        const dbType = process.env.DB_TYPE || 'sqlite';
        const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
        let query;
        
        if (isMssql) {
          // SQL Server: Can't use NTEXT (a.location) in GROUP BY, so use l.name only
          query = isAdmin
            ? `SELECT TOP 10
               COALESCE(l.name, a.restaurant_name, '') as store_name,
               COALESCE(l.name, '') as location,
               COUNT(a.id) as total,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN a.status = 'completed' AND a.score IS NOT NULL THEN CAST(a.score AS FLOAT) ELSE NULL END) as avgScore
               FROM audits a
               LEFT JOIN locations l ON a.location_id = l.id
               WHERE a.restaurant_name IS NOT NULL OR l.name IS NOT NULL
               GROUP BY COALESCE(l.name, a.restaurant_name, ''), COALESCE(l.name, '')
               ORDER BY total DESC`
            : `SELECT TOP 10
               COALESCE(l.name, a.restaurant_name, '') as store_name,
               COALESCE(l.name, '') as location,
               COUNT(a.id) as total,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN a.status = 'completed' AND a.score IS NOT NULL THEN CAST(a.score AS FLOAT) ELSE NULL END) as avgScore
               FROM audits a
               LEFT JOIN locations l ON a.location_id = l.id
               WHERE a.user_id = ? AND (a.restaurant_name IS NOT NULL OR l.name IS NOT NULL)
               GROUP BY COALESCE(l.name, a.restaurant_name, ''), COALESCE(l.name, '')
               ORDER BY total DESC`;
        } else {
          query = isAdmin
            ? `SELECT 
               COALESCE(l.name, a.restaurant_name, '') as store_name,
               COALESCE(l.name, a.location, '') as location,
               COUNT(a.id) as total,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN a.status = 'completed' AND a.score IS NOT NULL THEN a.score ELSE NULL END) as avgScore
               FROM audits a
               LEFT JOIN locations l ON a.location_id = l.id
               WHERE a.restaurant_name IS NOT NULL OR l.name IS NOT NULL
               GROUP BY COALESCE(l.name, a.restaurant_name, ''), COALESCE(l.name, a.location, '')
               ORDER BY total DESC
               LIMIT 10`
            : `SELECT 
               COALESCE(l.name, a.restaurant_name, '') as store_name,
               COALESCE(l.name, a.location, '') as location,
               COUNT(a.id) as total,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN a.status = 'completed' AND a.score IS NOT NULL THEN a.score ELSE NULL END) as avgScore
               FROM audits a
               LEFT JOIN locations l ON a.location_id = l.id
               WHERE a.user_id = ? AND (a.restaurant_name IS NOT NULL OR l.name IS NOT NULL)
               GROUP BY COALESCE(l.name, a.restaurant_name, ''), COALESCE(l.name, a.location, '')
               ORDER BY total DESC
               LIMIT 10`;
        }
        
        dbInstance.all(query, userParams, (err, rows) => {
          if (err) {
            logger.error('Error fetching top stores:', err);
            logger.error('Query:', query);
            return reject(err);
          }
          resolve((rows || []).map(r => ({
            store_name: r.store_name || '',
            location: r.location || '',
            total: r.total || 0,
            completed: r.completed || 0,
            avgScore: r.avgScore ? Math.round(r.avgScore * 100) / 100 : 0
          })));
        });
      }),
      // Schedule adherence - uses original_scheduled_date from audits table for accurate tracking
      // This handles rescheduled audits correctly by comparing against the scheduled date at audit creation
      new Promise((resolve, reject) => {
        const dbType = process.env.DB_TYPE || 'sqlite';
        let query;
        const whereClause = isAdmin ? '' : 'AND (sa.created_by = ? OR sa.assigned_to = ?)';
        const params = isAdmin ? [] : [userId, userId];

        if (dbType === 'mssql' || dbType === 'sqlserver') {
          query = `
            SELECT
              COUNT(DISTINCT sa.id) as total_scheduled,
              SUM(CASE
                WHEN a.id IS NOT NULL AND a.status = 'completed'
                  AND (
                    -- Use original_scheduled_date if available, otherwise fall back to sa.scheduled_date
                    CAST(COALESCE(a.original_scheduled_date, sa.scheduled_date) AS DATE) = CAST(a.completed_at AS DATE)
                    OR 
                    -- Also count as on-time if completed on the same day as created (for audits without scheduled date)
                    CAST(a.created_at AS DATE) = CAST(a.completed_at AS DATE)
                  )
                THEN 1
                ELSE 0
              END) as completed_on_time
            FROM scheduled_audits sa
            LEFT JOIN audits a ON sa.id = a.scheduled_audit_id
            WHERE (sa.status = 'completed' OR a.id IS NOT NULL)
            ${whereClause}`;
        } else {
          query = `
            SELECT
              COUNT(DISTINCT sa.id) as total_scheduled,
              SUM(CASE
                WHEN a.id IS NOT NULL AND a.status = 'completed'
                  AND (
                    -- Use original_scheduled_date if available, otherwise fall back to sa.scheduled_date
                    DATE(COALESCE(a.original_scheduled_date, sa.scheduled_date)) = DATE(a.completed_at)
                    OR 
                    -- Also count as on-time if completed on the same day as created (for audits without scheduled date)
                    DATE(a.created_at) = DATE(a.completed_at)
                  )
                THEN 1
                ELSE 0
              END) as completed_on_time
            FROM scheduled_audits sa
            LEFT JOIN audits a ON sa.id = a.scheduled_audit_id
            WHERE (sa.status = 'completed' OR a.id IS NOT NULL)
            ${whereClause}`;
        }
        dbInstance.get(query, params, (err, row) => {
          if (err) {
            logger.error('Error calculating schedule adherence:', err);
            return reject(err);
          }
          const total = row?.total_scheduled || 0;
          const onTime = row?.completed_on_time || 0;
          const adherence = total > 0 ? Math.round((onTime / total) * 100) : 0;
          logger.debug(`Schedule Adherence: Total=${total}, OnTime=${onTime}, Adherence=${adherence}%`);
          resolve({ total, onTime, adherence });
        });
      })
    ]).catch(err => {
      logger.error('Error fetching dashboard data:', err);
      throw err;
    });

    // Calculate month-over-month changes
    const monthChange = {
      total: (currentMonthStats?.total || 0) - (lastMonthStats?.total || 0),
      completed: (currentMonthStats?.completed || 0) - (lastMonthStats?.completed || 0),
      avgScore: ((currentMonthStats?.avg_score || 0) - (lastMonthStats?.avg_score || 0))
    };

    // Prepare dashboard data
    const dashboardData = {
      total,
      completed,
      inProgress,
      avgScore: Math.round(avgScore * 100) / 100,
      byStatus,
      byMonth,
      topUsers,
      recent,
      currentMonthStats: {
        total: currentMonthStats.total || 0,
        completed: currentMonthStats.completed || 0,
        avgScore: Math.round((currentMonthStats.avg_score || 0) * 100) / 100
      },
      lastMonthStats: {
        total: lastMonthStats.total || 0,
        completed: lastMonthStats.completed || 0,
        avgScore: Math.round((lastMonthStats.avg_score || 0) * 100) / 100
      },
      monthChange,
      topStores,
      scheduleAdherence: scheduleAdherence || { total: 0, onTime: 0, adherence: 0 }
    };

    // Generate Excel file
    const buffer = await exportDashboardReportToExcel(dashboardData);
    
    // Set response headers
    const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Send the buffer
    res.send(buffer);
  } catch (error) {
    logger.error('Error generating dashboard report:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Error generating dashboard report', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Location Verification Report - Compare Store Location vs GPS Location by User
router.get('/location-verification', authenticate, requirePermission('view_location_verification', 'view_analytics', 'manage_analytics'), (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { date_from, date_to, user_id, location_id } = req.query;
  const dbInstance = db.getDb();

  const dbType = process.env.DB_TYPE || 'sqlite';
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  let params = [];
  let userFilter = '';
  let dateFilter = '';
  let locationFilter = '';
  let specificUserFilter = '';

  // Only admins can see all users' data
  if (!isAdmin) {
    userFilter = 'AND a.user_id = ?';
    params.push(userId);
  }

  // Filter by specific user (admin only)
  if (user_id && isAdmin) {
    specificUserFilter = 'AND a.user_id = ?';
    params.push(user_id);
  }

  // Date filters
  if (date_from) {
    if (isSqlServer) {
      dateFilter += ' AND CAST(a.created_at AS DATE) >= CAST(? AS DATE)';
    } else {
      dateFilter += ' AND DATE(a.created_at) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (isSqlServer) {
      dateFilter += ' AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter += ' AND DATE(a.created_at) <= ?';
    }
    params.push(date_to);
  }

  // Location filter
  if (location_id) {
    locationFilter = 'AND a.location_id = ?';
    params.push(location_id);
  }

  // Query to get audits with GPS data and store locations
  const query = `
    SELECT 
      a.id as audit_id,
      a.restaurant_name,
      a.status,
      a.score,
      a.created_at,
      a.completed_at,
      a.gps_latitude,
      a.gps_longitude,
      a.gps_accuracy,
      a.gps_timestamp,
      a.location_verified,
      l.id as location_id,
      l.name as location_name,
      l.store_number,
      l.address,
      l.city,
      l.state,
      l.latitude as store_latitude,
      l.longitude as store_longitude,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      ct.name as template_name
    FROM audits a
    LEFT JOIN locations l ON a.location_id = l.id
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN checklist_templates ct ON a.template_id = ct.id
    WHERE a.gps_latitude IS NOT NULL 
      AND a.gps_longitude IS NOT NULL
      ${userFilter}
      ${specificUserFilter}
      ${dateFilter}
      ${locationFilter}
    ORDER BY u.name, a.created_at DESC
  `;

  dbInstance.all(query, params, (err, audits) => {
    if (err) {
      logger.error('Location verification report error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Calculate distance between store location and GPS location
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      if (!lat1 || !lon1 || !lat2 || !lon2) return null;
      
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c * 1000; // Convert to meters
      return Math.round(distance);
    };

    // Process audits and add distance calculation
    const processedAudits = audits.map(audit => {
      const distance = calculateDistance(
        audit.store_latitude,
        audit.store_longitude,
        audit.gps_latitude,
        audit.gps_longitude
      );

      // Determine verification status based on distance
      let verification_status = 'unknown';
      if (distance !== null) {
        if (distance <= 100) verification_status = 'verified';
        else if (distance <= 500) verification_status = 'nearby';
        else if (distance <= 1000) verification_status = 'far';
        else verification_status = 'suspicious';
      } else if (!audit.store_latitude || !audit.store_longitude) {
        verification_status = 'no_store_coords';
      }

      return {
        ...audit,
        distance_meters: distance,
        verification_status,
        distance_display: distance !== null ? 
          (distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance} m`) : 
          'N/A'
      };
    });

    // Group by user
    const userGroups = {};
    processedAudits.forEach(audit => {
      const key = audit.user_id || 'unknown';
      if (!userGroups[key]) {
        userGroups[key] = {
          user_id: audit.user_id,
          user_name: audit.user_name || 'Unknown User',
          user_email: audit.user_email,
          audits: [],
          stats: {
            total: 0,
            verified: 0,
            nearby: 0,
            far: 0,
            suspicious: 0,
            no_store_coords: 0,
            unknown: 0,
            avg_distance: 0
          }
        };
      }
      userGroups[key].audits.push(audit);
      userGroups[key].stats.total++;
      userGroups[key].stats[audit.verification_status]++;
    });

    // Calculate averages and format response
    const userReports = Object.values(userGroups).map(group => {
      const validDistances = group.audits
        .filter(a => a.distance_meters !== null)
        .map(a => a.distance_meters);
      
      if (validDistances.length > 0) {
        group.stats.avg_distance = Math.round(
          validDistances.reduce((a, b) => a + b, 0) / validDistances.length
        );
      }

      // Calculate verification rate
      group.stats.verification_rate = group.stats.total > 0 
        ? Math.round(((group.stats.verified + group.stats.nearby) / group.stats.total) * 100)
        : 0;

      return group;
    });

    // Sort by user name
    userReports.sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));

    // Calculate overall summary
    const summary = {
      total_audits: processedAudits.length,
      total_users: userReports.length,
      verification_breakdown: {
        verified: processedAudits.filter(a => a.verification_status === 'verified').length,
        nearby: processedAudits.filter(a => a.verification_status === 'nearby').length,
        far: processedAudits.filter(a => a.verification_status === 'far').length,
        suspicious: processedAudits.filter(a => a.verification_status === 'suspicious').length,
        no_store_coords: processedAudits.filter(a => a.verification_status === 'no_store_coords').length
      },
      date_range: {
        from: date_from || 'all',
        to: date_to || 'all'
      }
    };

    res.json({
      summary,
      users: userReports
    });
  });
});

// Export Location Verification Report to CSV
router.get('/location-verification/csv', authenticate, requirePermission('view_location_verification', 'view_analytics', 'export_data'), (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);
  const { date_from, date_to, user_id, location_id } = req.query;
  const dbInstance = db.getDb();

  const dbType = process.env.DB_TYPE || 'sqlite';
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';

  let params = [];
  let userFilter = '';
  let dateFilter = '';
  let locationFilter = '';
  let specificUserFilter = '';

  if (!isAdmin) {
    userFilter = 'AND a.user_id = ?';
    params.push(userId);
  }

  if (user_id && isAdmin) {
    specificUserFilter = 'AND a.user_id = ?';
    params.push(user_id);
  }

  if (date_from) {
    if (isSqlServer) {
      dateFilter += ' AND CAST(a.created_at AS DATE) >= CAST(? AS DATE)';
    } else {
      dateFilter += ' AND DATE(a.created_at) >= ?';
    }
    params.push(date_from);
  }
  if (date_to) {
    if (isSqlServer) {
      dateFilter += ' AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter += ' AND DATE(a.created_at) <= ?';
    }
    params.push(date_to);
  }

  if (location_id) {
    locationFilter = 'AND a.location_id = ?';
    params.push(location_id);
  }

  const query = `
    SELECT 
      a.id as audit_id,
      a.restaurant_name,
      a.status,
      a.score,
      a.created_at,
      a.gps_latitude,
      a.gps_longitude,
      a.gps_accuracy,
      a.location_verified,
      l.name as location_name,
      l.store_number,
      l.address,
      l.city,
      l.latitude as store_latitude,
      l.longitude as store_longitude,
      u.name as user_name,
      u.email as user_email,
      ct.name as template_name
    FROM audits a
    LEFT JOIN locations l ON a.location_id = l.id
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN checklist_templates ct ON a.template_id = ct.id
    WHERE a.gps_latitude IS NOT NULL 
      AND a.gps_longitude IS NOT NULL
      ${userFilter}
      ${specificUserFilter}
      ${dateFilter}
      ${locationFilter}
    ORDER BY u.name, a.created_at DESC
  `;

  dbInstance.all(query, params, (err, audits) => {
    if (err) {
      logger.error('Location verification CSV error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      if (!lat1 || !lon1 || !lat2 || !lon2) return null;
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return Math.round(R * c * 1000);
    };

    // CSV Header
    let csv = 'User Name,User Email,Audit ID,Store Name,Store Number,Store Address,Store Latitude,Store Longitude,GPS Latitude,GPS Longitude,GPS Accuracy (m),Distance (m),Verification Status,Audit Date,Score,Status\n';

    audits.forEach(audit => {
      const distance = calculateDistance(
        audit.store_latitude, audit.store_longitude,
        audit.gps_latitude, audit.gps_longitude
      );

      let status = 'Unknown';
      if (distance !== null) {
        if (distance <= 100) status = 'Verified';
        else if (distance <= 500) status = 'Nearby';
        else if (distance <= 1000) status = 'Far';
        else status = 'Suspicious';
      } else if (!audit.store_latitude) {
        status = 'No Store Coordinates';
      }

      const escapeCsv = (val) => {
        if (val === null || val === undefined) return '';
        return `"${String(val).replace(/"/g, '""')}"`;
      };

      csv += [
        escapeCsv(audit.user_name),
        escapeCsv(audit.user_email),
        audit.audit_id,
        escapeCsv(audit.location_name || audit.restaurant_name),
        escapeCsv(audit.store_number),
        escapeCsv(audit.address),
        audit.store_latitude || '',
        audit.store_longitude || '',
        audit.gps_latitude,
        audit.gps_longitude,
        audit.gps_accuracy || '',
        distance || '',
        status,
        audit.created_at,
        audit.score || '',
        audit.status
      ].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=location-verification-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  });
});

// ========================================
// EMAIL REPORT FUNCTIONALITY
// ========================================

const { sendEmail, emailTemplates, isConfigured } = require('../utils/emailService');

// Send audit report via email
router.post('/audit/:id/email', authenticate, async (req, res) => {
  const auditId = req.params.id;
  const { recipientEmail, recipientName } = req.body;
  const dbInstance = db.getDb();
  
  if (!recipientEmail) {
    return res.status(400).json({ error: 'Recipient email is required' });
  }
  
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Email service not configured. Please set SMTP settings.' });
  }
  
  try {
    // Get audit details
    const audit = await new Promise((resolve, reject) => {
      dbInstance.get(
        `SELECT a.*, ct.name as template_name, ct.category, 
         u.name as auditor_name, l.name as store_name, l.store_number
         FROM audits a
         JOIN checklist_templates ct ON a.template_id = ct.id
         LEFT JOIN users u ON a.user_id = u.id
         LEFT JOIN locations l ON a.location_id = l.id
         WHERE a.id = ?`,
        [auditId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    
    // Get audit items for summary
    const items = await new Promise((resolve, reject) => {
      dbInstance.all(
        `SELECT ai.status, ai.mark, ci.category
         FROM audit_items ai
         JOIN checklist_items ci ON ai.item_id = ci.id
         WHERE ai.audit_id = ?`,
        [auditId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    // Calculate items summary
    const itemsSummary = {
      total: items.length,
      passed: items.filter(i => i.status === 'pass' || i.status === 'yes' || i.mark === 'A').length,
      failed: items.filter(i => i.status === 'fail' || i.status === 'no' || i.mark === 'C').length,
      na: items.filter(i => i.status === 'na' || i.status === 'n/a').length
    };
    
    // Calculate category scores
    const categories = {};
    items.forEach(item => {
      const cat = item.category || 'General';
      if (!categories[cat]) {
        categories[cat] = { total: 0, passed: 0 };
      }
      categories[cat].total++;
      if (item.status === 'pass' || item.status === 'yes' || item.mark === 'A' || item.mark === 'B') {
        categories[cat].passed++;
      }
    });
    
    const categoryScores = Object.entries(categories).map(([category, data]) => ({
      category,
      total: data.total,
      completed: data.passed,
      score: data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0
    }));
    
    // Generate email
    const storeName = audit.store_name || audit.restaurant_name || 'Unknown Store';
    const { subject, html } = emailTemplates.auditReport(
      storeName,
      audit.template_name,
      audit.score || 0,
      audit.auditor_name || 'Unknown',
      audit.completed_at || audit.created_at,
      itemsSummary,
      categoryScores
    );
    
    // Send email
    const sent = await sendEmail(recipientEmail, subject, html);
    
    if (sent) {
      logger.info(`Audit report ${auditId} emailed to ${recipientEmail}`);
      res.json({ success: true, message: `Report sent to ${recipientEmail}` });
    } else {
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    logger.error('Error sending audit report email:', error);
    res.status(500).json({ error: 'Error generating or sending report' });
  }
});

// Send report to store manager (auto-lookup email from location)
router.post('/audit/:id/email-store', authenticate, async (req, res) => {
  const auditId = req.params.id;
  const dbInstance = db.getDb();
  
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Email service not configured' });
  }
  
  try {
    // Get audit with store email
    const audit = await new Promise((resolve, reject) => {
      dbInstance.get(
        `SELECT a.*, l.email as store_email, l.name as store_name
         FROM audits a
         LEFT JOIN locations l ON a.location_id = l.id
         WHERE a.id = ?`,
        [auditId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    
    if (!audit.store_email) {
      return res.status(400).json({ error: 'Store does not have an email address configured' });
    }
    
    // Forward to the regular email endpoint
    req.body.recipientEmail = audit.store_email;
    req.body.recipientName = audit.store_name;
    
    // Call the email sending logic (reuse from above)
    return router.handle(req, res, () => {});
  } catch (error) {
    logger.error('Error sending store email:', error);
    res.status(500).json({ error: 'Error sending report to store' });
  }
});

// Get email configuration status
router.get('/email/status', authenticate, (req, res) => {
  res.json({
    configured: isConfigured(),
    message: isConfigured() 
      ? 'Email service is configured and ready' 
      : 'Email service not configured. Set SMTP_USER and SMTP_PASSWORD environment variables.'
  });
});

module.exports = router;

