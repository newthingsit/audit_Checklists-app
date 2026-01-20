/**
 * Enhanced PDF Report Generator - CVR/CDR Style
 * 
 * Matches the reference report format exactly:
 * - Header with company name, overall score
 * - Details table (Outlet, Start Date, End Date, Submitted by)
 * - Score By category summary
 * - Category-wise questions with subcategories
 * - Embedded photos in questions
 * - Remarks in red
 * - Speed of Service Tracking
 * - Temperature Tracking
 * - Acknowledgement section
 * - Action Plan with photos and To Do items
 * - Page numbering and "Powered By" footer
 */

const PDFDocument = require('pdfkit');
const db = require('../config/database-loader');
const logger = require('./logger');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// ==================== COLORS ====================
const COLORS = {
  HEADER_BG: '#1a365d',      // Dark blue header
  HEADER_TEXT: '#ffffff',
  SECTION_HEADER: '#2b6cb0', // Blue section headers
  TABLE_HEADER: '#e2e8f0',   // Light gray table header
  TABLE_BORDER: '#cbd5e0',
  TEXT_PRIMARY: '#1a202c',
  TEXT_SECONDARY: '#718096',
  REMARKS_RED: '#c53030',    // Red for remarks
  SUCCESS_GREEN: '#38a169',
  WARNING_YELLOW: '#d69e2e',
  DANGER_RED: '#e53e3e',
  LIGHT_BG: '#f7fafc',
  WHITE: '#ffffff'
};

// Page dimensions
const PAGE = {
  WIDTH: 595.28,
  HEIGHT: 841.89,
  MARGIN: 40,
  get CONTENT_WIDTH() { return this.WIDTH - (this.MARGIN * 2); }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Format date for display
 */
function formatDate(dateString, includeTime = true) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  let formatted = date.toLocaleDateString('en-IN', options);
  
  if (includeTime) {
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    formatted += ' ' + date.toLocaleTimeString('en-IN', timeOptions);
  }
  
  return formatted;
}

/**
 * Get score color based on percentage
 */
function getScoreColor(percentage) {
  if (percentage >= 90) return COLORS.SUCCESS_GREEN;
  if (percentage >= 70) return COLORS.WARNING_YELLOW;
  return COLORS.DANGER_RED;
}

/**
 * Fetch image from URL and return as buffer
 */
async function fetchImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(null);
    
    // Handle local file paths
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
      const localPath = path.join(__dirname, '..', url.startsWith('/') ? url.substring(1) : url);
      if (fs.existsSync(localPath)) {
        try {
          const buffer = fs.readFileSync(localPath);
          return resolve(buffer);
        } catch (err) {
          logger.warn(`Failed to read local image: ${localPath}`);
          return resolve(null);
        }
      }
      return resolve(null);
    }
    
    // Handle remote URLs
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, { timeout: 5000 }, (response) => {
      if (response.statusCode !== 200) {
        return resolve(null);
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', () => resolve(null));
    });
    
    request.on('error', () => resolve(null));
    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });
  });
}

// ==================== PDF DRAWING FUNCTIONS ====================

/**
 * Draw the report header with company name and overall score
 */
function drawHeader(doc, audit, overallScore, totalActual, totalPerfect) {
  const y = PAGE.MARGIN;
  
  // Header background
  doc.rect(0, 0, PAGE.WIDTH, 50).fill(COLORS.HEADER_BG);
  
  // Report title (left)
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.WHITE);
  const templateName = audit.template_name || 'CVR 2 – (CDR) Plan';
  doc.text(`${templateName} - Report`, PAGE.MARGIN, 18, { width: 300 });
  
  // Company name (right)
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.WHITE);
  doc.text('Lite Bite Foods', PAGE.WIDTH - PAGE.MARGIN - 100, 18, { width: 100, align: 'right' });
  
  doc.y = 60;
  
  // Overall Score - Large centered
  doc.font('Helvetica-Bold').fontSize(28).fillColor(COLORS.SECTION_HEADER);
  doc.text(`${overallScore.toFixed(1)}%`, PAGE.MARGIN, doc.y, { width: PAGE.CONTENT_WIDTH, align: 'center' });
  
  doc.font('Helvetica').fontSize(12).fillColor(COLORS.TEXT_SECONDARY);
  doc.text(`(${Math.round(totalActual)}/${Math.round(totalPerfect)})`, PAGE.MARGIN, doc.y + 5, { width: PAGE.CONTENT_WIDTH, align: 'center' });
  
  doc.y += 30;
}

/**
 * Draw the Details section (Outlet Name, Start Date, End Date, Submitted by)
 */
function drawDetailsSection(doc, audit) {
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.TEXT_PRIMARY);
  doc.text('Details', PAGE.MARGIN, doc.y);
  doc.y += 15;
  
  const tableY = doc.y;
  const colWidths = [PAGE.CONTENT_WIDTH / 4, PAGE.CONTENT_WIDTH / 4, PAGE.CONTENT_WIDTH / 4, PAGE.CONTENT_WIDTH / 4];
  const rowHeight = 40;
  
  // Header row
  const headers = ['Outlet Name', 'Start Date', 'End Date', 'Submitted by :'];
  let x = PAGE.MARGIN;
  
  headers.forEach((header, idx) => {
    doc.rect(x, tableY, colWidths[idx], 20).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(header, x + 5, tableY + 6, { width: colWidths[idx] - 10, align: 'center' });
    x += colWidths[idx];
  });
  
  // Data row
  const storeName = audit.restaurant_name || audit.location_name || 'N/A';
  const startDate = formatDate(audit.created_at, true);
  const endDate = formatDate(audit.completed_at || audit.created_at, true);
  const submittedBy = audit.auditor_name || 'N/A';
  
  const data = [storeName, startDate, endDate, submittedBy];
  x = PAGE.MARGIN;
  
  data.forEach((value, idx) => {
    doc.rect(x, tableY + 20, colWidths[idx], rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(value, x + 5, tableY + 30, { width: colWidths[idx] - 10, align: 'center' });
    x += colWidths[idx];
  });
  
  doc.y = tableY + 20 + rowHeight + 15;
}

/**
 * Draw Score By section (Category summary table)
 */
function drawScoreBySection(doc, categoryData) {
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.TEXT_PRIMARY);
  doc.text('Score By', PAGE.MARGIN, doc.y);
  doc.y += 15;
  
  const tableY = doc.y;
  const colWidths = [PAGE.CONTENT_WIDTH * 0.4, PAGE.CONTENT_WIDTH * 0.2, PAGE.CONTENT_WIDTH * 0.2, PAGE.CONTENT_WIDTH * 0.2];
  const rowHeight = 22;
  
  // Header row
  let x = PAGE.MARGIN;
  const headers = ['', 'Perfect Score', 'Actual Score', 'Percentage'];
  
  headers.forEach((header, idx) => {
    doc.rect(x, tableY, colWidths[idx], rowHeight).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(header, x + 5, tableY + 7, { width: colWidths[idx] - 10, align: idx === 0 ? 'left' : 'center' });
    x += colWidths[idx];
  });
  
  // Category rows
  let rowY = tableY + rowHeight;
  const categories = Object.keys(categoryData).sort();
  
  categories.forEach((category, idx) => {
    const data = categoryData[category];
    const percentage = data.perfectScore > 0 ? Math.round((data.actualScore / data.perfectScore) * 100) : 0;
    const bgColor = idx % 2 === 0 ? COLORS.LIGHT_BG : COLORS.WHITE;
    
    x = PAGE.MARGIN;
    
    // Category name
    doc.rect(x, rowY, colWidths[0], rowHeight).fill(bgColor).stroke(COLORS.TABLE_BORDER);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(category.toUpperCase(), x + 5, rowY + 7, { width: colWidths[0] - 10 });
    x += colWidths[0];
    
    // Perfect Score
    doc.rect(x, rowY, colWidths[1], rowHeight).fill(bgColor).stroke(COLORS.TABLE_BORDER);
    doc.text(Math.round(data.perfectScore).toString(), x + 5, rowY + 7, { width: colWidths[1] - 10, align: 'center' });
    x += colWidths[1];
    
    // Actual Score
    doc.rect(x, rowY, colWidths[2], rowHeight).fill(bgColor).stroke(COLORS.TABLE_BORDER);
    doc.text(Math.round(data.actualScore).toString(), x + 5, rowY + 7, { width: colWidths[2] - 10, align: 'center' });
    x += colWidths[2];
    
    // Percentage
    doc.rect(x, rowY, colWidths[3], rowHeight).fill(bgColor).stroke(COLORS.TABLE_BORDER);
    doc.text(`${percentage}%`, x + 5, rowY + 7, { width: colWidths[3] - 10, align: 'center' });
    
    rowY += rowHeight;
  });
  
  doc.y = rowY + 20;
}

/**
 * Draw category header
 */
function drawCategoryHeader(doc, categoryName, actualScore, perfectScore) {
  const percentage = perfectScore > 0 ? Math.round((actualScore / perfectScore) * 100) : 0;
  
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 25).fill(COLORS.SECTION_HEADER);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.WHITE);
  doc.text(
    `${categoryName.toUpperCase()} - ${percentage}% (${Math.round(actualScore)}/${Math.round(perfectScore)})`,
    PAGE.MARGIN + 10,
    doc.y + 7,
    { width: PAGE.CONTENT_WIDTH - 20 }
  );
  
  doc.y += 30;
}

/**
 * Draw subcategory header
 */
function drawSubcategoryHeader(doc, subcategoryName, actualScore, perfectScore) {
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 22).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.SECTION_HEADER);
  doc.text(
    `${subcategoryName} - (${Math.round(actualScore)}/${Math.round(perfectScore)})`,
    PAGE.MARGIN + 10,
    doc.y + 6,
    { width: PAGE.CONTENT_WIDTH - 20, align: 'center' }
  );
  
  doc.y += 25;
}

/**
 * Draw question table header
 */
function drawQuestionTableHeader(doc) {
  const colWidths = [35, PAGE.CONTENT_WIDTH - 35 - 60 - 70, 60, 70];
  const headers = ['', 'Question', 'Score', 'Response'];
  let x = PAGE.MARGIN;
  
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 18).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
  
  headers.forEach((header, idx) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(header, x + 3, doc.y + 5, { width: colWidths[idx] - 6, align: idx === 1 ? 'left' : 'center' });
    x += colWidths[idx];
  });
  
  doc.y += 18;
  return colWidths;
}

/**
 * Draw a question row with optional photo and remarks
 */
async function drawQuestionRow(doc, item, index, colWidths, photos = {}) {
  const actualMark = parseFloat(item.mark) || 0;
  const maxMark = item.maxScore || 3;
  const response = item.selected_option_text || (actualMark > 0 ? 'Yes' : 'No');
  const isNA = response === 'NA' || response === 'N/A' || item.mark === 'NA';
  const isNo = response === 'No' || response === 'N' || actualMark === 0;
  
  // Calculate row height based on content
  let rowHeight = 25;
  const hasPhoto = item.photo_url && photos[item.photo_url];
  const hasRemarks = item.comment && item.comment.trim();
  const hasSubcategoryTag = item.subcategory && item.subcategory.toLowerCase().includes('house keeping');
  
  if (hasPhoto) rowHeight += 60;
  if (hasRemarks) rowHeight += 20;
  if (hasSubcategoryTag) rowHeight += 15;
  
  // Check if we need a new page
  if (doc.y + rowHeight > PAGE.HEIGHT - 60) {
    return false; // Signal that we need a new page
  }
  
  const rowY = doc.y;
  let x = PAGE.MARGIN;
  
  // Draw row background
  doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
  
  // Question number
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
  doc.text(index.toString(), x + 3, rowY + 8, { width: colWidths[0] - 6, align: 'center' });
  x += colWidths[0];
  
  // Question text column
  let questionY = rowY + 5;
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
  
  // Draw question text
  doc.text(item.title || '', x + 3, questionY, { width: colWidths[1] - 6 });
  questionY += 12;
  
  // Draw photo if exists
  if (hasPhoto) {
    try {
      const photoBuffer = photos[item.photo_url];
      if (photoBuffer) {
        doc.image(photoBuffer, x + 5, questionY, { width: 50, height: 50 });
      }
    } catch (err) {
      // Skip photo on error
    }
    questionY += 55;
  }
  
  // Draw subcategory tag if applicable
  if (hasSubcategoryTag) {
    doc.rect(x + 3, questionY, 60, 12).fill('#e2e8f0').stroke(COLORS.TABLE_BORDER);
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.TEXT_SECONDARY);
    doc.text('House Keeping', x + 5, questionY + 3, { width: 56 });
    questionY += 15;
  }
  
  // Draw remarks in red
  if (hasRemarks) {
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.REMARKS_RED);
    doc.text(`Remarks: ${item.comment}`, x + 3, questionY, { width: colWidths[1] - 6 });
  }
  
  x += colWidths[1];
  
  // Score column
  doc.font('Helvetica').fontSize(8).fillColor(isNo ? COLORS.DANGER_RED : COLORS.TEXT_PRIMARY);
  doc.text(`${actualMark}/${maxMark}`, x + 3, rowY + 8, { width: colWidths[2] - 6, align: 'center' });
  x += colWidths[2];
  
  // Response column
  const responseText = isNA ? 'Not Applicable' : response;
  doc.font('Helvetica').fontSize(8).fillColor(isNo ? COLORS.DANGER_RED : COLORS.TEXT_PRIMARY);
  doc.text(responseText, x + 3, rowY + 8, { width: colWidths[3] - 6, align: 'center' });
  
  doc.y = rowY + rowHeight;
  return true;
}

/**
 * Draw Speed of Service Tracking section
 */
function drawSpeedOfServiceSection(doc, items) {
  // Filter speed of service items
  const sosItems = items.filter(i => 
    i.category && (
      i.category.toUpperCase().includes('SPEED OF SERVICE') ||
      i.category.toUpperCase().includes('TRACKING')
    )
  );
  
  if (sosItems.length === 0) return;
  
  // Check for new page
  if (doc.y > PAGE.HEIGHT - 200) {
    doc.addPage();
    doc.y = PAGE.MARGIN;
  }
  
  // Section header
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 25).fill(COLORS.SECTION_HEADER);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.WHITE);
  doc.text('SPEED OF SERVICE – TRACKING', PAGE.MARGIN + 10, doc.y + 7, { width: PAGE.CONTENT_WIDTH - 20, align: 'center' });
  doc.y += 30;
  
  // Group by subcategory (Trnx-1, Trnx-2, etc.)
  const groups = {};
  sosItems.forEach(item => {
    const group = item.subcategory || 'General';
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
  });
  
  // Draw each transaction group
  Object.keys(groups).forEach(groupName => {
    if (doc.y > PAGE.HEIGHT - 100) {
      doc.addPage();
      doc.y = PAGE.MARGIN;
    }
    
    // Group header
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 20).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.SECTION_HEADER);
    doc.text(groupName, PAGE.MARGIN + 10, doc.y + 5, { width: PAGE.CONTENT_WIDTH - 20, align: 'center' });
    doc.y += 22;
    
    // Table header
    const colWidths = [35, PAGE.CONTENT_WIDTH - 35 - 120, 120];
    let x = PAGE.MARGIN;
    
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 18).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
    ['', 'Question', 'Response'].forEach((header, idx) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
      doc.text(header, x + 3, doc.y + 5, { width: colWidths[idx] - 6, align: idx === 1 ? 'left' : 'center' });
      x += colWidths[idx];
    });
    doc.y += 18;
    
    // Items
    groups[groupName].forEach((item, idx) => {
      if (doc.y > PAGE.HEIGHT - 40) {
        doc.addPage();
        doc.y = PAGE.MARGIN;
      }
      
      x = PAGE.MARGIN;
      const rowHeight = 20;
      
      doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
      
      // Index
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
      doc.text((idx + 1).toString(), x + 3, doc.y + 6, { width: colWidths[0] - 6, align: 'center' });
      x += colWidths[0];
      
      // Question
      doc.text(item.title || '', x + 3, doc.y + 6, { width: colWidths[1] - 6 });
      x += colWidths[1];
      
      // Response
      const response = item.comment || item.selected_option_text || '';
      doc.text(response, x + 3, doc.y + 6, { width: colWidths[2] - 6, align: 'center' });
      
      doc.y += rowHeight;
    });
    
    doc.y += 10;
  });
}

/**
 * Draw Action Plan section
 */
async function drawActionPlanSection(doc, actionItems, items, photos = {}) {
  if (!actionItems || actionItems.length === 0) return;
  
  // New page for action plan
  doc.addPage();
  doc.y = PAGE.MARGIN;
  
  // Header
  doc.rect(0, 0, PAGE.WIDTH, 50).fill(COLORS.HEADER_BG);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.WHITE);
  doc.text('Action Plan', PAGE.MARGIN, 18);
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Lite Bite Foods', PAGE.WIDTH - PAGE.MARGIN - 100, 18, { width: 100, align: 'right' });
  
  doc.y = 70;
  
  // Table header
  const colWidths = [30, 180, 40, 55, 60, 70, 50];
  const headers = ['', 'Question', 'Score', 'Response', 'Assigned to', 'Complete by Date', 'Status'];
  let x = PAGE.MARGIN;
  
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 25).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
  
  headers.forEach((header, idx) => {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(header, x + 2, doc.y + 8, { width: colWidths[idx] - 4, align: 'center' });
    x += colWidths[idx];
  });
  
  doc.y += 25;
  
  // Action items
  for (let i = 0; i < actionItems.length; i++) {
    const action = actionItems[i];
    
    // Find related item for details
    const relatedItem = items.find(item => item.item_id === action.item_id) || {};
    const hasPhoto = relatedItem.photo_url && photos[relatedItem.photo_url];
    const hasRemarks = relatedItem.comment && relatedItem.comment.trim();
    
    // Calculate row height
    let rowHeight = 80;
    if (hasPhoto) rowHeight += 50;
    
    // Check for new page
    if (doc.y + rowHeight > PAGE.HEIGHT - 60) {
      doc.addPage();
      doc.y = PAGE.MARGIN;
      
      // Redraw header
      x = PAGE.MARGIN;
      doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 25).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
      headers.forEach((header, idx) => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
        doc.text(header, x + 2, doc.y + 8, { width: colWidths[idx] - 4, align: 'center' });
        x += colWidths[idx];
      });
      doc.y += 25;
    }
    
    const rowY = doc.y;
    x = PAGE.MARGIN;
    
    // Draw row background
    doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
    
    // Draw vertical lines
    let lineX = PAGE.MARGIN;
    colWidths.forEach(w => {
      lineX += w;
      doc.moveTo(lineX, rowY).lineTo(lineX, rowY + rowHeight).stroke(COLORS.TABLE_BORDER);
    });
    
    // Index
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.TEXT_PRIMARY);
    doc.text((i + 1).toString(), x + 2, rowY + 10, { width: colWidths[0] - 4, align: 'center' });
    x += colWidths[0];
    
    // Question column (with Question label, Remarks, Photo, To Do)
    let qY = rowY + 5;
    
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.SECTION_HEADER);
    doc.text('Question', x + 2, qY);
    qY += 10;
    
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(action.title || relatedItem.title || '', x + 2, qY, { width: colWidths[1] - 4 });
    qY += 25;
    
    // Remarks
    if (hasRemarks) {
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.REMARKS_RED);
      doc.text('Remarks', x + 2, qY);
      qY += 10;
      doc.font('Helvetica').fontSize(7);
      doc.text(relatedItem.comment, x + 2, qY, { width: colWidths[1] - 4 });
      qY += 15;
    }
    
    // Photo
    if (hasPhoto) {
      try {
        const photoBuffer = photos[relatedItem.photo_url];
        if (photoBuffer) {
          doc.image(photoBuffer, x + 2, qY, { width: 40, height: 40 });
        }
      } catch (err) {
        // Skip photo on error
      }
      qY += 45;
    }
    
    // To Do
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.SECTION_HEADER);
    doc.text('To Do:', x + 2, qY);
    qY += 10;
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(action.corrective_action || relatedItem.comment || '', x + 2, qY, { width: colWidths[1] - 4 });
    
    x += colWidths[1];
    
    // Score
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text('0', x + 2, rowY + 35, { width: colWidths[2] - 4, align: 'center' });
    x += colWidths[2];
    
    // Response
    doc.text('No', x + 2, rowY + 35, { width: colWidths[3] - 4, align: 'center' });
    x += colWidths[3];
    
    // Assigned to
    doc.text(action.assigned_to_name || action.auditor_name || 'N/A', x + 2, rowY + 35, { width: colWidths[4] - 4, align: 'center' });
    x += colWidths[4];
    
    // Complete by Date
    const dueDate = action.due_date ? formatDate(action.due_date, false) : 'N/A';
    doc.text(dueDate, x + 2, rowY + 35, { width: colWidths[5] - 4, align: 'center' });
    x += colWidths[5];
    
    // Status
    doc.text(action.status || 'To Do', x + 2, rowY + 35, { width: colWidths[6] - 4, align: 'center' });
    
    doc.y = rowY + rowHeight;
  }
}

/**
 * Draw Acknowledgement section
 */
function drawAcknowledgementSection(doc, audit, items) {
  // Find acknowledgement items
  const ackItems = items.filter(i => 
    i.category && i.category.toUpperCase().includes('ACKNOWLEDGEMENT')
  );
  
  if (ackItems.length === 0) return;
  
  if (doc.y > PAGE.HEIGHT - 150) {
    doc.addPage();
    doc.y = PAGE.MARGIN;
  }
  
  // Section header
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 25).fill(COLORS.SECTION_HEADER);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.WHITE);
  doc.text('ACKNOWLEDGEMENT', PAGE.MARGIN + 10, doc.y + 7, { width: PAGE.CONTENT_WIDTH - 20, align: 'center' });
  doc.y += 30;
  
  // Table header
  const colWidths = [35, PAGE.CONTENT_WIDTH - 35 - 150, 150];
  let x = PAGE.MARGIN;
  
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 18).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
  ['', 'Question', 'Response'].forEach((header, idx) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(header, x + 3, doc.y + 5, { width: colWidths[idx] - 6, align: idx === 1 ? 'left' : 'center' });
    x += colWidths[idx];
  });
  doc.y += 18;
  
  // Acknowledgement items
  ackItems.forEach((item, idx) => {
    x = PAGE.MARGIN;
    const rowHeight = item.title && item.title.toLowerCase().includes('signature') ? 60 : 25;
    
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
    
    // Index
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text((idx + 1).toString(), x + 3, doc.y + 8, { width: colWidths[0] - 6, align: 'center' });
    x += colWidths[0];
    
    // Question
    doc.text(item.title || '', x + 3, doc.y + 8, { width: colWidths[1] - 6 });
    x += colWidths[1];
    
    // Response
    const response = item.comment || item.selected_option_text || '';
    doc.text(response, x + 3, doc.y + 8, { width: colWidths[2] - 6, align: 'center' });
    
    doc.y += rowHeight;
  });
}

/**
 * Add page numbers and footer
 */
function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    
    // Page number (left)
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_SECONDARY);
    doc.text(`Page ${i + 1} of ${totalPages}`, PAGE.MARGIN, PAGE.HEIGHT - 25);
    
    // Powered by (right)
    doc.text('Powered By Accrue', PAGE.WIDTH - PAGE.MARGIN - 100, PAGE.HEIGHT - 25, { width: 100, align: 'right' });
  }
}

// ==================== MAIN EXPORT FUNCTION ====================

/**
 * Generate Enhanced Audit PDF Report
 */
async function generateEnhancedAuditPdf(auditId, options = {}) {
  const dbInstance = db.getDb();
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  const isSqlServer = dbType === 'mssql' || dbType === 'sqlserver';
  
  return new Promise(async (resolve, reject) => {
    try {
      // Fetch audit data
      const audit = await new Promise((res, rej) => {
        dbInstance.get(
          `SELECT a.*, ct.name as template_name, ct.category as template_category,
                  u.name as auditor_name, u.email as auditor_email,
                  l.name as location_name, l.store_number, l.city, l.state
           FROM audits a
           JOIN checklist_templates ct ON a.template_id = ct.id
           LEFT JOIN users u ON a.user_id = u.id
           LEFT JOIN locations l ON a.location_id = l.id
           WHERE a.id = ?`,
          [auditId],
          (err, row) => err ? rej(err) : res(row)
        );
      });
      
      if (!audit) {
        return reject(new Error('Audit not found'));
      }
      
      // Fetch audit items
      const items = await new Promise((res, rej) => {
        dbInstance.all(
          `SELECT 
            ai.id as audit_item_id,
            ai.item_id,
            ai.status,
            ai.selected_option_id,
            ai.mark,
            ai.comment,
            ai.photo_url,
            ci.title,
            ci.description,
            ci.category,
            ci.subcategory,
            ci.section,
            ci.is_critical,
            ci.required,
            ci.weight,
            ci.order_index,
            cio.option_text as selected_option_text,
            cio.mark as selected_mark,
            (SELECT MAX(${isSqlServer ? 'TRY_CAST(mark AS FLOAT)' : 'CAST(mark AS REAL)'}) 
             FROM checklist_item_options 
             WHERE item_id = ci.id AND mark NOT IN ('NA', 'N/A', '')) as max_mark
          FROM audit_items ai
          JOIN checklist_items ci ON ai.item_id = ci.id
          LEFT JOIN checklist_item_options cio ON ai.selected_option_id = cio.id
          WHERE ai.audit_id = ?
          ORDER BY ci.category, ci.subcategory, ci.order_index`,
          [auditId],
          (err, rows) => err ? rej(err) : res((rows || []).map(r => ({ ...r, maxScore: parseFloat(r.max_mark) || 3 })))
        );
      });
      
      // Fetch action items
      const actionItems = await new Promise((res, rej) => {
        dbInstance.all(
          `SELECT ai.*, u.name as assigned_to_name
           FROM action_items ai
           LEFT JOIN users u ON ai.assigned_to = u.id
           WHERE ai.audit_id = ?
           ORDER BY ai.id`,
          [auditId],
          (err, rows) => err ? rej(err) : res(rows || [])
        );
      });
      
      // Pre-fetch all photos
      const photos = {};
      for (const item of items) {
        if (item.photo_url) {
          const buffer = await fetchImage(item.photo_url);
          if (buffer) photos[item.photo_url] = buffer;
        }
      }
      
      // Calculate category scores
      const categoryData = {};
      let totalPerfectScore = 0;
      let totalActualScore = 0;
      
      items.forEach(item => {
        const cat = item.category || 'Uncategorized';
        if (!categoryData[cat]) {
          categoryData[cat] = { perfectScore: 0, actualScore: 0, items: [], subcategories: {} };
        }
        
        const maxScore = item.maxScore || 3;
        const actualMark = parseFloat(item.mark) || 0;
        
        categoryData[cat].items.push(item);
        categoryData[cat].perfectScore += maxScore;
        categoryData[cat].actualScore += actualMark;
        
        // Track subcategories
        const subcat = item.subcategory || item.section || 'General';
        if (!categoryData[cat].subcategories[subcat]) {
          categoryData[cat].subcategories[subcat] = { perfectScore: 0, actualScore: 0, items: [] };
        }
        categoryData[cat].subcategories[subcat].items.push(item);
        categoryData[cat].subcategories[subcat].perfectScore += maxScore;
        categoryData[cat].subcategories[subcat].actualScore += actualMark;
        
        totalPerfectScore += maxScore;
        totalActualScore += actualMark;
      });
      
      const overallScore = totalPerfectScore > 0 ? (totalActualScore / totalPerfectScore) * 100 : 0;
      
      // Create PDF
      const doc = new PDFDocument({ 
        margin: PAGE.MARGIN, 
        size: 'A4',
        bufferPages: true 
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // ==================== PAGE 1: HEADER & SUMMARY ====================
      
      // Header
      drawHeader(doc, audit, overallScore, totalActualScore, totalPerfectScore);
      
      // Details section
      drawDetailsSection(doc, audit);
      
      // Score By section
      drawScoreBySection(doc, categoryData);
      
      // ==================== CATEGORY DETAILS PAGES ====================
      
      const categories = Object.keys(categoryData).sort();
      
      // Filter out special categories for later
      const regularCategories = categories.filter(cat => 
        !cat.toUpperCase().includes('SPEED OF SERVICE') &&
        !cat.toUpperCase().includes('TRACKING') &&
        !cat.toUpperCase().includes('ACKNOWLEDGEMENT') &&
        !cat.toUpperCase().includes('TEMPERATURE')
      );
      
      // Draw regular categories
      for (const category of regularCategories) {
        const catData = categoryData[category];
        
        // New page for each category (or check space)
        if (doc.y > PAGE.HEIGHT - 200) {
          doc.addPage();
          doc.y = PAGE.MARGIN;
        }
        
        // Category header
        drawCategoryHeader(doc, category, catData.actualScore, catData.perfectScore);
        
        // Draw by subcategory
        const subcategories = Object.keys(catData.subcategories);
        
        for (const subcat of subcategories) {
          const subcatData = catData.subcategories[subcat];
          
          if (doc.y > PAGE.HEIGHT - 150) {
            doc.addPage();
            doc.y = PAGE.MARGIN;
          }
          
          // Subcategory header (if not 'General')
          if (subcat !== 'General' && subcategories.length > 1) {
            drawSubcategoryHeader(doc, subcat, subcatData.actualScore, subcatData.perfectScore);
          }
          
          // Question table header
          const colWidths = drawQuestionTableHeader(doc);
          
          // Questions
          let globalIndex = items.indexOf(subcatData.items[0]) + 1;
          
          for (let i = 0; i < subcatData.items.length; i++) {
            const item = subcatData.items[i];
            const success = await drawQuestionRow(doc, item, globalIndex + i, colWidths, photos);
            
            if (!success) {
              // Need new page
              doc.addPage();
              doc.y = PAGE.MARGIN;
              
              // Redraw headers
              drawCategoryHeader(doc, category, catData.actualScore, catData.perfectScore);
              if (subcat !== 'General') {
                drawSubcategoryHeader(doc, `${subcat} (continued)`, subcatData.actualScore, subcatData.perfectScore);
              }
              drawQuestionTableHeader(doc);
              
              // Retry drawing the row
              await drawQuestionRow(doc, item, globalIndex + i, colWidths, photos);
            }
          }
        }
        
        doc.y += 15;
      }
      
      // ==================== SPECIAL SECTIONS ====================
      
      // Speed of Service Tracking
      drawSpeedOfServiceSection(doc, items);
      
      // Acknowledgement section
      drawAcknowledgementSection(doc, audit, items);
      
      // ==================== ACTION PLAN ====================
      
      // Create action items from deviations if none exist
      let actionsToShow = actionItems;
      if (actionsToShow.length === 0) {
        // Find deviations
        const deviations = items.filter(item => {
          const actualMark = parseFloat(item.mark) || 0;
          const response = item.selected_option_text || '';
          return actualMark === 0 || response === 'No' || response === 'N' || item.status === 'failed';
        });
        
        actionsToShow = deviations.slice(0, 10).map((item, idx) => ({
          id: idx + 1,
          audit_id: auditId,
          item_id: item.item_id,
          title: item.title,
          severity: item.is_critical ? 'CRITICAL' : 'MAJOR',
          status: 'To Do',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          corrective_action: item.comment || item.title,
          auditor_name: audit.auditor_name
        }));
      }
      
      if (actionsToShow.length > 0) {
        await drawActionPlanSection(doc, actionsToShow, items, photos);
      }
      
      // ==================== PAGE NUMBERS ====================
      
      addPageNumbers(doc);
      
      doc.end();
      
      logger.info(`[Enhanced PDF] Generated report for audit ${auditId}`);
      
    } catch (error) {
      logger.error('[Enhanced PDF] Error generating report:', error);
      reject(error);
    }
  });
}

/**
 * Identify deviations from audit items
 */
function identifyDeviations(items) {
  return items.filter(item => {
    const actualMark = parseFloat(item.mark) || 0;
    const maxMark = item.maxScore || 3;
    const isCritical = item.is_critical === 1 || item.is_critical === true;
    const response = item.selected_option_text || '';
    
    // Deviation criteria
    if (actualMark === 0) return true;
    if (isCritical && actualMark < maxMark) return true;
    if (response === 'No' || response === 'N' || response === 'Fail') return true;
    if (item.status === 'failed') return true;
    
    return false;
  }).map(item => {
    const isCritical = item.is_critical === 1 || item.is_critical === true;
    return {
      ...item,
      severity: isCritical ? 'CRITICAL' : 'MAJOR',
      severity_level: isCritical ? 3 : 2
    };
  }).sort((a, b) => b.severity_level - a.severity_level).slice(0, 3);
}

module.exports = {
  generateEnhancedAuditPdf,
  identifyDeviations,
  COLORS
};
