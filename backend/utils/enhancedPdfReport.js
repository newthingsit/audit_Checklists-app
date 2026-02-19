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
const logger = require('./logger');
const { getAuditReportData } = require('./auditReportService');
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

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function decodeSignatureData(signatureData) {
  if (!signatureData) return null;
  const raw = String(signatureData);
  // Handle SVG data URI (from mobile path-based signatures)
  if (raw.startsWith('data:image/svg+xml;base64,')) {
    const base64 = raw.split('base64,')[1];
    try {
      return Buffer.from(base64, 'base64');
    } catch (err) {
      return null;
    }
  }
  // Handle paths-based JSON directly (mobile signature format)
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.paths) && parsed.paths.length > 0) {
      const w = parsed.width || 300;
      const h = parsed.height || 200;
      const pathEls = parsed.paths.map(d =>
        `<path d="${d}" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      ).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${pathEls}</svg>`;
      return Buffer.from(svg);
    }
  } catch (e) {
    // Not JSON, continue to base64 handling
  }
  const base64 = raw.includes('base64,') ? raw.split('base64,')[1] : raw;
  try {
    return Buffer.from(base64, 'base64');
  } catch (err) {
    return null;
  }
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
    // Validate URL format before attempting to fetch
    if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return resolve(null);
    }
    
    try {
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
    } catch (err) {
      logger.warn(`Error fetching remote image: ${url}`, err.message);
      resolve(null);
    }
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
  doc.text('Score By Category', PAGE.MARGIN, doc.y, { lineBreak: false });
  doc.y += 20;
  
  const tableY = doc.y;
  const colWidths = [PAGE.CONTENT_WIDTH * 0.4, PAGE.CONTENT_WIDTH * 0.2, PAGE.CONTENT_WIDTH * 0.2, PAGE.CONTENT_WIDTH * 0.2];
  const rowHeight = 22;
  
  // Draw header row background
  let x = PAGE.MARGIN;
  doc.rect(PAGE.MARGIN, tableY, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
  
  // Draw header text and vertical borders
  const headers = ['Category', 'Perfect Score', 'Actual Score', 'Percentage'];
  x = PAGE.MARGIN;
  headers.forEach((header, idx) => {
    if (idx > 0) {
      doc.moveTo(x, tableY).lineTo(x, tableY + rowHeight).stroke(COLORS.TABLE_BORDER);
    }
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(header, x + 5, tableY + 7, { width: colWidths[idx] - 10, align: idx === 0 ? 'left' : 'center', lineBreak: false });
    x += colWidths[idx];
  });
  
  // Category rows
  let rowY = tableY + rowHeight;
  const rows = Array.isArray(categoryData)
    ? categoryData
    : Object.keys(categoryData).sort().map(key => ({
        name: key,
        perfectScore: categoryData[key].perfectScore || 0,
        actualScore: categoryData[key].actualScore || 0,
        percentage: categoryData[key].percentage || 0
      }));
  
  rows.forEach((row, idx) => {
    const percentage = row.percentage !== undefined ? row.percentage : (row.perfectScore > 0 ? Math.round((row.actualScore / row.perfectScore) * 100) : 0);
    const bgColor = idx % 2 === 0 ? COLORS.LIGHT_BG : COLORS.WHITE;
    
    // Draw row background
    doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, rowHeight).fill(bgColor).stroke(COLORS.TABLE_BORDER);
    
    // Draw vertical borders
    x = PAGE.MARGIN;
    colWidths.forEach((width, colIdx) => {
      if (colIdx > 0) {
        doc.moveTo(x, rowY).lineTo(x, rowY + rowHeight).stroke(COLORS.TABLE_BORDER);
      }
      x += width;
    });
    
    x = PAGE.MARGIN;
    
    // Category name
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(String(row.name || '').toUpperCase(), x + 5, rowY + 7, { width: colWidths[0] - 10, lineBreak: false });
    x += colWidths[0];
    
    // Perfect Score
    doc.text(Math.round(row.perfectScore || 0).toString(), x + 5, rowY + 7, { width: colWidths[1] - 10, align: 'center', lineBreak: false });
    x += colWidths[1];
    
    // Actual Score
    doc.text(Math.round(row.actualScore || 0).toString(), x + 5, rowY + 7, { width: colWidths[2] - 10, align: 'center', lineBreak: false });
    x += colWidths[2];
    
    // Percentage
    doc.text(`${percentage}%`, x + 5, rowY + 7, { width: colWidths[3] - 10, align: 'center', lineBreak: false });
    
    rowY += rowHeight;
  });
  
  doc.y = rowY + 20;
}

/**
 * Draw category header
 */
function drawCategoryHeader(doc, categoryName, actualScore, perfectScore) {
  const percentage = perfectScore > 0 ? Math.round((actualScore / perfectScore) * 100) : 0;
  const startY = doc.y;
  
  doc.rect(PAGE.MARGIN, startY, PAGE.CONTENT_WIDTH, 25).fill(COLORS.SECTION_HEADER);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.WHITE);
  doc.text(
    `${categoryName.toUpperCase()} - ${percentage}% (${Math.round(actualScore)}/${Math.round(perfectScore)})`,
    PAGE.MARGIN + 10,
    startY + 7,
    { width: PAGE.CONTENT_WIDTH - 20, lineBreak: false }
  );
  
  doc.y = startY + 30;
}

/**
 * Draw subcategory header
 */
function drawSubcategoryHeader(doc, subcategoryName, actualScore, perfectScore) {
  const startY = doc.y;
  
  doc.rect(PAGE.MARGIN, startY, PAGE.CONTENT_WIDTH, 22).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.SECTION_HEADER);
  doc.text(
    `${subcategoryName} - (${Math.round(actualScore)}/${Math.round(perfectScore)})`,
    PAGE.MARGIN + 10,
    startY + 6,
    { width: PAGE.CONTENT_WIDTH - 20, align: 'center', lineBreak: false }
  );
  
  doc.y = startY + 25;
}

/**
 * Draw question table header
 * Matches View Report format: #, Question, Score, Response, Remarks, Photo
 */
function drawQuestionTableHeader(doc) {
  // Column widths: #(25), Question(flex), Score(45), Response(55), Remarks(65), Photo(55)
  const fixedWidth = 25 + 45 + 55 + 65 + 55;
  const questionWidth = PAGE.CONTENT_WIDTH - fixedWidth;
  const colWidths = [25, questionWidth, 45, 55, 65, 55];
  const headers = ['#', 'Question', 'Score', 'Response', 'Remarks', 'Photo'];
  
  const startY = doc.y;
  const rowHeight = 18;
  
  // Draw header background
  doc.rect(PAGE.MARGIN, startY, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
  
  // Draw column borders and text
  let x = PAGE.MARGIN;
  headers.forEach((header, idx) => {
    // Draw vertical border for each column
    if (idx > 0) {
      doc.moveTo(x, startY).lineTo(x, startY + rowHeight).stroke(COLORS.TABLE_BORDER);
    }
    
    // Draw header text (use lineBreak: false to prevent y position change)
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(header, x + 2, startY + 5, { 
      width: colWidths[idx] - 4, 
      align: idx === 1 ? 'left' : 'center',
      lineBreak: false 
    });
    x += colWidths[idx];
  });
  
  doc.y = startY + rowHeight;
  return colWidths;
}

/**
 * Get response text based on input type
 */
function getResponseByInputType(item) {
  const inputType = String(item.input_type || '').toLowerCase();
  
  switch (inputType) {
    case 'option_select':
    case 'dropdown':
      // Return selected option text or derive from mark
      return item.selected_option_text || (parseFloat(item.mark) > 0 ? 'Yes' : 'No');
    
    case 'short_answer':
    case 'long_answer':
      // Return the comment/text response
      return item.comment || item.response || '-';
    
    case 'number':
      // Return numeric value
      return item.comment || (item.mark !== undefined ? String(item.mark) : '-');
    
    case 'date':
      // Format date value
      if (item.comment) {
        try {
          const date = new Date(item.comment);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        } catch (e) { /* ignore */ }
        return item.comment;
      }
      return '-';
    
    case 'time':
      // Return time value
      return item.comment || '-';
    
    case 'image_upload':
      // Photo indicator
      return item.photo_url ? 'Photo Attached' : 'No Photo';
    
    case 'signature':
      // Signature indicator
      return item.photo_url || item.comment ? 'Signed' : 'Not Signed';
    
    case 'task':
      // Task checkbox status
      const status = String(item.status || '').toLowerCase();
      if (status === 'completed' || item.mark > 0) return 'Completed';
      if (status === 'failed') return 'Not Done';
      return item.selected_option_text || 'Pending';
    
    default:
      // Default: use selected option or derive from mark
      return item.selected_option_text || (parseFloat(item.mark) > 0 ? 'Yes' : 'No');
  }
}

/**
 * Check if input type is scorable (has numeric score)
 */
function isScorableInputType(inputType) {
  const type = String(inputType || '').toLowerCase();
  return ['option_select', 'dropdown', 'task', 'auto', ''].includes(type);
}

/**
 * Draw a question row with 6 columns matching View Report format
 * Columns: #, Question, Score, Response, Remarks, Photo
 */
async function drawQuestionRow(doc, item, index, colWidths, photos = {}) {
  const inputType = String(item.input_type || '').toLowerCase();
  const actualMark = parseFloat(item.mark) || 0;
  const maxMark = item.maxScore || 3;
  const response = getResponseByInputType(item);
  const isNA = response === 'NA' || response === 'N/A' || item.mark === 'NA' || response === 'Not Applicable';
  const isNo = response === 'No' || response === 'N' || response === 'Not Done' || response === 'No Photo' || response === 'Not Signed' || actualMark === 0;
  const isScorable = isScorableInputType(inputType);
  
  // Calculate row height based on content
  let rowHeight = 22;
  const hasPhoto = item.photo_url && photos[item.photo_url];
  const hasRemarks = item.comment && item.comment.trim() && !['short_answer', 'long_answer', 'number', 'date', 'time'].includes(inputType);
  
  // Photo in separate column - increase row height if photo exists
  if (hasPhoto) rowHeight = Math.max(rowHeight, 50);
  
  // Check if we need a new page
  if (doc.y + rowHeight > PAGE.HEIGHT - 60) {
    return false; // Signal that we need a new page
  }
  
  const startY = doc.y;
  let x = PAGE.MARGIN;
  
  // Draw row background and border
  doc.rect(PAGE.MARGIN, startY, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
  
  // Draw vertical column borders
  let borderX = PAGE.MARGIN;
  colWidths.forEach((width, idx) => {
    if (idx > 0) {
      doc.moveTo(borderX, startY).lineTo(borderX, startY + rowHeight).stroke(COLORS.TABLE_BORDER);
    }
    borderX += width;
  });
  
  // Column 1: Question number (#)
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
  doc.text(index.toString(), x + 2, startY + 7, { width: colWidths[0] - 4, align: 'center', lineBreak: false });
  x += colWidths[0];
  
  // Column 2: Question text (allow line break for long text)
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
  const titleText = item.title || '';
  doc.text(titleText, x + 2, startY + 4, { width: colWidths[1] - 4, height: rowHeight - 8, lineBreak: true, ellipsis: true });
  x += colWidths[1];
  
  // Column 3: Score - show score only for scorable input types
  if (isScorable) {
    doc.font('Helvetica').fontSize(8).fillColor(isNo ? COLORS.DANGER_RED : COLORS.TEXT_PRIMARY);
    doc.text(`${actualMark}/${maxMark}`, x + 2, startY + 7, { width: colWidths[2] - 4, align: 'center', lineBreak: false });
  } else {
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_SECONDARY);
    doc.text('-', x + 2, startY + 7, { width: colWidths[2] - 4, align: 'center', lineBreak: false });
  }
  x += colWidths[2];
  
  // Column 4: Response
  const responseText = isNA ? 'NA' : response;
  const responseColor = isNo ? COLORS.DANGER_RED : (response === 'Yes' ? COLORS.SUCCESS_GREEN : COLORS.TEXT_PRIMARY);
  doc.font('Helvetica').fontSize(8).fillColor(responseColor);
  doc.text(responseText, x + 2, startY + 7, { width: colWidths[3] - 4, align: 'center', lineBreak: false });
  x += colWidths[3];
  
  // Column 5: Remarks (allow line break for long remarks)
  const remarksText = hasRemarks ? item.comment : '—';
  doc.font('Helvetica').fontSize(6).fillColor(hasRemarks ? COLORS.REMARKS_RED : COLORS.TEXT_SECONDARY);
  doc.text(remarksText, x + 2, startY + 4, { width: colWidths[4] - 4, height: rowHeight - 8, lineBreak: true, ellipsis: true });
  x += colWidths[4];
  
  // Column 6: Photo thumbnail or dash
  if (hasPhoto) {
    try {
      const photoBuffer = photos[item.photo_url];
      if (photoBuffer) {
        const photoSize = Math.min(colWidths[5] - 8, rowHeight - 6, 40);
        doc.image(photoBuffer, x + 4, startY + 3, { width: photoSize, height: photoSize });
      } else {
        doc.font('Helvetica').fontSize(7).fillColor(COLORS.TEXT_SECONDARY);
        doc.text('—', x + 2, startY + 7, { width: colWidths[5] - 4, align: 'center', lineBreak: false });
      }
    } catch (err) {
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.TEXT_SECONDARY);
      doc.text('—', x + 2, startY + 7, { width: colWidths[5] - 4, align: 'center', lineBreak: false });
    }
  } else {
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.TEXT_SECONDARY);
    doc.text('—', x + 2, startY + 7, { width: colWidths[5] - 4, align: 'center', lineBreak: false });
  }
  
  doc.y = startY + rowHeight;
  return true;
}

/**
 * Draw Speed of Service Tracking section
 */
function drawSpeedOfServiceSection(doc, speedOfService = []) {
  if (!speedOfService || speedOfService.length === 0) return;
  
  // Calculate estimated height for first group to check if we need a new page
  const firstGroupRows = speedOfService[0] ? speedOfService[0].entries.length + 3 : 3; // +3 for headers
  const estimatedHeight = 30 + (firstGroupRows * 20);
  
  // Only add new page if we really need the space
  if (doc.y + estimatedHeight > PAGE.HEIGHT - 40) {
    doc.addPage();
    doc.y = PAGE.MARGIN;
  }
  
  // Section header
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 25).fill(COLORS.SECTION_HEADER);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.WHITE);
  doc.text('SPEED OF SERVICE – TRACKING', PAGE.MARGIN + 10, doc.y + 7, { width: PAGE.CONTENT_WIDTH - 20, align: 'center' });
  doc.y += 30;
  
  const colWidths = [35, PAGE.CONTENT_WIDTH - 35 - 120 - 90, 120, 90];
  
  speedOfService.forEach(group => {
    // Calculate height needed for this group
    const groupHeight = 40 + (group.entries.length * 20) + (Number.isFinite(group.averageSeconds) ? 20 : 0);
    
    if (doc.y + groupHeight > PAGE.HEIGHT - 40) {
      doc.addPage();
      doc.y = PAGE.MARGIN;
    }
    
    // Group header
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 20).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.SECTION_HEADER);
    doc.text(group.name, PAGE.MARGIN + 10, doc.y + 5, { width: PAGE.CONTENT_WIDTH - 20, align: 'center' });
    doc.y += 22;
    
    // Table header
    let x = PAGE.MARGIN;
    
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 18).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
    ['', 'Checkpoint', 'Time', 'Seconds'].forEach((header, idx) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
      doc.text(header, x + 3, doc.y + 5, { width: colWidths[idx] - 6, align: idx === 1 ? 'left' : 'center' });
      x += colWidths[idx];
    });
    doc.y += 18;
    
    group.entries.forEach((entry, idx) => {
      if (doc.y + 20 > PAGE.HEIGHT - 40) {
        doc.addPage();
        doc.y = PAGE.MARGIN;
      }
      
      x = PAGE.MARGIN;
      const rowHeight = 20;
      
      doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
      
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
      doc.text((idx + 1).toString(), x + 3, doc.y + 6, { width: colWidths[0] - 6, align: 'center' });
      x += colWidths[0];
      
      doc.text(entry.checkpoint || '', x + 3, doc.y + 6, { width: colWidths[1] - 6 });
      x += colWidths[1];
      
      const timeValue = entry.time_value || formatSeconds(entry.seconds);
      doc.text(String(timeValue || ''), x + 3, doc.y + 6, { width: colWidths[2] - 6, align: 'center' });
      x += colWidths[2];
      
      doc.text(entry.seconds !== null && entry.seconds !== undefined ? String(entry.seconds) : '', x + 3, doc.y + 6, { width: colWidths[3] - 6, align: 'center' });
      
      doc.y += rowHeight;
    });
    
    if (Number.isFinite(group.averageSeconds)) {
      x = PAGE.MARGIN;
      const rowHeight = 20;
      doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.LIGHT_BG).stroke(COLORS.TABLE_BORDER);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
      doc.text('AVG', x + 3, doc.y + 6, { width: colWidths[0] - 6, align: 'center' });
      x += colWidths[0];
      doc.text('Average', x + 3, doc.y + 6, { width: colWidths[1] - 6 });
      x += colWidths[1];
      doc.text(formatSeconds(group.averageSeconds), x + 3, doc.y + 6, { width: colWidths[2] - 6, align: 'center' });
      x += colWidths[2];
      doc.text(String(group.averageSeconds), x + 3, doc.y + 6, { width: colWidths[3] - 6, align: 'center' });
      doc.y += rowHeight;
    }
    
    doc.y += 8;
  });
}

/**
 * Draw Temperature Tracking section
 */
function drawTemperatureTrackingSection(doc, temperatureTracking = []) {
  if (!temperatureTracking || temperatureTracking.length === 0) return;
  
  // Calculate estimated height for first group to check if we need a new page
  const firstGroupRows = temperatureTracking[0] ? temperatureTracking[0].entries.length + 3 : 3;
  const estimatedHeight = 30 + (firstGroupRows * 20);
  
  // Only add new page if we really need the space
  if (doc.y + estimatedHeight > PAGE.HEIGHT - 40) {
    doc.addPage();
    doc.y = PAGE.MARGIN;
  }
  
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 25).fill(COLORS.SECTION_HEADER);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.WHITE);
  doc.text('TEMPERATURE TRACKING', PAGE.MARGIN + 10, doc.y + 7, { width: PAGE.CONTENT_WIDTH - 20, align: 'center' });
  doc.y += 30;
  
  const colWidths = [35, PAGE.CONTENT_WIDTH - 35 - 120 - 90, 120, 90];
  
  temperatureTracking.forEach(group => {
    // Calculate height needed for this group
    const groupHeight = 40 + (group.entries.length * 20) + (Number.isFinite(group.averageTemp) ? 20 : 0);
    
    if (doc.y + groupHeight > PAGE.HEIGHT - 40) {
      doc.addPage();
      doc.y = PAGE.MARGIN;
    }
    
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 20).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.SECTION_HEADER);
    doc.text(group.name, PAGE.MARGIN + 10, doc.y + 5, { width: PAGE.CONTENT_WIDTH - 20, align: 'center' });
    doc.y += 22;
    
    let x = PAGE.MARGIN;
    
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 18).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
    ['', 'Item', 'Type', 'Temperature'].forEach((header, idx) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
      doc.text(header, x + 3, doc.y + 5, { width: colWidths[idx] - 6, align: idx === 1 ? 'left' : 'center' });
      x += colWidths[idx];
    });
    doc.y += 18;
    
    group.entries.forEach((entry, idx) => {
      if (doc.y + 20 > PAGE.HEIGHT - 40) {
        doc.addPage();
        doc.y = PAGE.MARGIN;
      }
      x = PAGE.MARGIN;
      const rowHeight = 20;
      doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
      doc.text((idx + 1).toString(), x + 3, doc.y + 6, { width: colWidths[0] - 6, align: 'center' });
      x += colWidths[0];
      doc.text(entry.label || '', x + 3, doc.y + 6, { width: colWidths[1] - 6 });
      x += colWidths[1];
      doc.text(entry.type || '', x + 3, doc.y + 6, { width: colWidths[2] - 6, align: 'center' });
      x += colWidths[2];
      doc.text(entry.temperature !== null && entry.temperature !== undefined ? String(entry.temperature) : String(entry.raw || ''), x + 3, doc.y + 6, { width: colWidths[3] - 6, align: 'center' });
      doc.y += rowHeight;
    });
    
    if (Number.isFinite(group.averageTemp)) {
      x = PAGE.MARGIN;
      const rowHeight = 20;
      doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.LIGHT_BG).stroke(COLORS.TABLE_BORDER);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
      doc.text('AVG', x + 3, doc.y + 6, { width: colWidths[0] - 6, align: 'center' });
      x += colWidths[0];
      doc.text('Average', x + 3, doc.y + 6, { width: colWidths[1] - 6 });
      x += colWidths[1];
      doc.text('', x + 3, doc.y + 6, { width: colWidths[2] - 6, align: 'center' });
      x += colWidths[2];
      doc.text(String(group.averageTemp), x + 3, doc.y + 6, { width: colWidths[3] - 6, align: 'center' });
      doc.y += rowHeight;
    }
    
    doc.y += 8;
  });
}

/**
 * Draw Action Plan section - Matches View Report format
 * Columns: #, Category, Deviation, Severity, Corrective Action, Owner, Target Date, Status
 */
async function drawActionPlanSection(doc, actionPlanItems) {
  if (!actionPlanItems || actionPlanItems.length === 0) return;
  
  // Only limit to top 3 deviations as shown in View Report
  const topDeviations = actionPlanItems.slice(0, 3);
  
  // Check if we need a new page (need at least 200px for section)
  if (doc.y > PAGE.HEIGHT - 200) {
    doc.addPage();
    doc.y = PAGE.MARGIN;
  }
  
  // Section header (matching other sections style, not full page header)
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 25).fill(COLORS.SECTION_HEADER);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.WHITE);
  doc.text('ACTION PLAN - TOP 3 DEVIATIONS', PAGE.MARGIN + 10, doc.y + 7, { width: PAGE.CONTENT_WIDTH - 20, align: 'center' });
  doc.y += 30;
  
  // Subtitle
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_SECONDARY);
  doc.text('Corrective actions assigned to address the top identified deviations.', PAGE.MARGIN, doc.y, { width: PAGE.CONTENT_WIDTH });
  doc.y += 15;
  
  // Table header - Matching View Report columns exactly
  // #(25), Category(70), Deviation(120), Severity(50), Corrective Action(120), Owner(60), Target Date(55), Status(55)
  const colWidths = [25, 70, 110, 50, 110, 55, 50, 45];
  const headers = ['#', 'Category', 'Deviation', 'Severity', 'Corrective Action', 'Owner', 'Target', 'Status'];
  let x = PAGE.MARGIN;
  
  const headerHeight = 22;
  doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, headerHeight).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
  
  // Draw vertical borders for header
  let borderX = PAGE.MARGIN;
  colWidths.forEach((width, idx) => {
    if (idx > 0) {
      doc.moveTo(borderX, doc.y).lineTo(borderX, doc.y + headerHeight).stroke(COLORS.TABLE_BORDER);
    }
    borderX += width;
  });
  
  headers.forEach((header, idx) => {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(header, x + 2, doc.y + 7, { width: colWidths[idx] - 4, align: 'center', lineBreak: false });
    x += colWidths[idx];
  });
  
  doc.y += headerHeight;
  
  // Action plan rows
  for (let i = 0; i < topDeviations.length; i++) {
    const action = topDeviations[i];
    const rowHeight = 45;
    
    // Check for new page
    if (doc.y + rowHeight > PAGE.HEIGHT - 50) {
      doc.addPage();
      doc.y = PAGE.MARGIN;
      
      // Redraw header on new page
      x = PAGE.MARGIN;
      doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, headerHeight).fill(COLORS.TABLE_HEADER).stroke(COLORS.TABLE_BORDER);
      borderX = PAGE.MARGIN;
      colWidths.forEach((width, idx) => {
        if (idx > 0) {
          doc.moveTo(borderX, doc.y).lineTo(borderX, doc.y + headerHeight).stroke(COLORS.TABLE_BORDER);
        }
        borderX += width;
      });
      headers.forEach((header, idx) => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
        doc.text(header, x + 2, doc.y + 7, { width: colWidths[idx] - 4, align: 'center', lineBreak: false });
        x += colWidths[idx];
      });
      doc.y += headerHeight;
    }
    
    const rowY = doc.y;
    x = PAGE.MARGIN;
    
    // Draw row background and borders
    doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
    let lineX = PAGE.MARGIN;
    colWidths.forEach((w, idx) => {
      if (idx > 0) {
        doc.moveTo(lineX, rowY).lineTo(lineX, rowY + rowHeight).stroke(COLORS.TABLE_BORDER);
      }
      lineX += w;
    });
    
    // Column 1: Index (#)
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text((i + 1).toString(), x + 2, rowY + 8, { width: colWidths[0] - 4, align: 'center', lineBreak: false });
    x += colWidths[0];
    
    // Column 2: Category
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
    const categoryText = action.category || 'Quality';
    doc.text(categoryText, x + 2, rowY + 5, { width: colWidths[1] - 4, height: rowHeight - 10, lineBreak: true, ellipsis: true });
    x += colWidths[1];
    
    // Column 3: Deviation (Question)
    const deviationText = action.question || action.checklist_question || action.title || '';
    doc.text(deviationText, x + 2, rowY + 5, { width: colWidths[2] - 4, height: rowHeight - 10, lineBreak: true, ellipsis: true });
    x += colWidths[2];
    
    // Column 4: Severity (with color badge)
    const severity = action.severity || 'MAJOR';
    const severityColor = severity === 'CRITICAL' ? COLORS.DANGER_RED : COLORS.WARNING_YELLOW;
    const severityY = rowY + 8;
    const severityWidth = colWidths[3] - 8;
    const badgeHeight = 14;
    
    doc.rect(x + 4, severityY, severityWidth, badgeHeight).fill(severityColor);
    doc.font('Helvetica-Bold').fontSize(6).fillColor(COLORS.WHITE);
    doc.text(severity, x + 4, severityY + 4, { width: severityWidth, align: 'center', lineBreak: false });
    x += colWidths[3];
    
    // Column 5: Corrective Action (use correctiveAction field, not todo)
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
    const correctiveText = action.correctiveAction || action.todo || action.remarks || 'Address the audit deviation noted for this item.';
    doc.text(correctiveText, x + 2, rowY + 5, { width: colWidths[4] - 4, height: rowHeight - 10, lineBreak: true, ellipsis: true });
    x += colWidths[4];
    
    // Column 6: Owner (Assigned To)
    const owner = action.assignedTo || action.responsible_person || 'Auditor';
    doc.text(owner, x + 2, rowY + 8, { width: colWidths[5] - 4, align: 'center', lineBreak: false });
    x += colWidths[5];
    
    // Column 7: Target Date
    const dueDate = action.dueDate || action.target_date ? formatDate(action.dueDate || action.target_date, false) : 'N/A';
    doc.text(dueDate, x + 2, rowY + 8, { width: colWidths[6] - 4, align: 'center', lineBreak: false });
    x += colWidths[6];
    
    // Column 8: Status (with color badge)
    const status = action.status || 'Open';
    const statusColor = status === 'Closed' ? COLORS.SUCCESS_GREEN : COLORS.SECTION_HEADER;
    const statusY = rowY + 8;
    const statusWidth = colWidths[7] - 8;
    
    doc.rect(x + 4, statusY, statusWidth, badgeHeight).fill(statusColor);
    doc.font('Helvetica-Bold').fontSize(6).fillColor(COLORS.WHITE);
    doc.text(status.toUpperCase(), x + 4, statusY + 4, { width: statusWidth, align: 'center', lineBreak: false });
    
    doc.y = rowY + rowHeight;
  }
  
  doc.y += 15;
}

/**
 * Draw Acknowledgement section
 */
function drawAcknowledgementSection(doc, acknowledgement, items = []) {
  const ackItems = items.filter(i => 
    i.category && i.category.toUpperCase().includes('ACKNOWLEDGEMENT')
  );
  const hasSignature = acknowledgement && acknowledgement.signatureData;
  const hasManagerName = acknowledgement && acknowledgement.managerName;
  
  if (!hasSignature && !hasManagerName && ackItems.length === 0) return;
  
  // Calculate estimated height for this section
  const rowCount = (hasManagerName ? 1 : 0) + (hasSignature ? 1 : 0) + ackItems.length;
  const estimatedHeight = 50 + (rowCount * 30); // 30px per row approximately
  
  // Only add new page if needed
  if (doc.y + estimatedHeight > PAGE.HEIGHT - 40) {
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
  
  const signatureBuffer = hasSignature ? decodeSignatureData(acknowledgement.signatureData) : null;
  const managerName = acknowledgement && acknowledgement.managerName ? acknowledgement.managerName : '';
  
  const renderedItems = [];
  if (managerName) {
    renderedItems.push({ title: 'Manager on Duty', response: managerName });
  }
  if (signatureBuffer) {
    renderedItems.push({ title: 'Signature', response: 'Attached', signature: signatureBuffer });
  }
  renderedItems.push(...ackItems.map(item => ({
    title: item.title || '',
    response: item.comment || item.selected_option_text || '',
    photo_url: item.photo_url
  })));
  
  renderedItems.forEach((item, idx) => {
    x = PAGE.MARGIN;
    const rowHeight = item.signature ? 60 : 25;
    
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, rowHeight).fill(COLORS.WHITE).stroke(COLORS.TABLE_BORDER);
    
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text((idx + 1).toString(), x + 3, doc.y + 8, { width: colWidths[0] - 6, align: 'center' });
    x += colWidths[0];
    
    doc.text(item.title || '', x + 3, doc.y + 8, { width: colWidths[1] - 6 });
    x += colWidths[1];
    
    if (item.signature) {
      doc.text('Attached', x + 3, doc.y + 8, { width: colWidths[2] - 6, align: 'center' });
      try {
        doc.image(item.signature, x + 10, doc.y + 22, { width: 80, height: 30 });
      } catch (err) {
        // Ignore signature draw errors
      }
    } else if (item.photo_url) {
      doc.text('Attached', x + 3, doc.y + 8, { width: colWidths[2] - 6, align: 'center' });
    } else {
      doc.text(item.response || '', x + 3, doc.y + 8, { width: colWidths[2] - 6, align: 'center' });
    }
    
    doc.y += rowHeight;
  });
}

/**
 * Add page numbers and footer
 */
function addPageNumbers(doc, appName = 'LBF Audit App') {
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    
    // Page number (left)
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.TEXT_SECONDARY);
    doc.text(`Page ${i + 1} of ${totalPages}`, PAGE.MARGIN, PAGE.HEIGHT - 25);
    
    // Powered by (right)
    doc.text(`Powered By ${appName}`, PAGE.WIDTH - PAGE.MARGIN - 120, PAGE.HEIGHT - 25, { width: 120, align: 'right' });
  }
}

// ==================== MAIN EXPORT FUNCTION ====================

/**
 * Generate Enhanced Audit PDF Report
 */
async function generateEnhancedAuditPdf(auditId, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const reportData = await getAuditReportData(auditId, options);
      const audit = {
        template_name: reportData.audit.templateName,
        restaurant_name: reportData.audit.outletName,
        location_name: reportData.audit.outletName,
        store_number: reportData.audit.outletCode,
        city: reportData.audit.city,
        created_at: reportData.audit.startDate,
        completed_at: reportData.audit.endDate,
        auditor_name: reportData.audit.submittedBy
      };
      const items = reportData.items || [];
      const actionPlanItems = reportData.actionPlan || [];
      
      // Pre-fetch all photos
      const photos = {};
      for (const item of items) {
        if (item.photo_url) {
          const buffer = await fetchImage(item.photo_url);
          if (buffer) photos[item.photo_url] = buffer;
        }
      }
      
      const totalPerfectScore = reportData.summary.totalPerfect;
      const totalActualScore = reportData.summary.totalActual;
      const overallScore = reportData.summary.overallPercentage;
      const scoreByCategory = reportData.scoreByCategory || [];
      const detailedCategories = reportData.detailedCategories || [];
      
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
      drawScoreBySection(doc, scoreByCategory);
      
      // ==================== CATEGORY DETAILS PAGES ====================
      
      const categories = detailedCategories;
      let questionIndex = 1;
      
      // Draw regular categories
      for (const category of categories) {
        const catData = category;
        
        // Calculate minimum height needed: category header (30) + table header (18) + at least 1 row (22)
        const minCategoryHeight = 70;
        
        // Only add new page if we can't fit at least the header and one row
        if (doc.y + minCategoryHeight > PAGE.HEIGHT - 40) {
          doc.addPage();
          doc.y = PAGE.MARGIN;
        }
        
        // Category header
        drawCategoryHeader(doc, catData.name, catData.actualScore, catData.perfectScore);
        
        // Draw by subcategory
        const subcategories = catData.subsections || [];
        
        for (const subcatData of subcategories) {
          const subcat = subcatData.name;
          const hasSubcategoryHeader = subcat !== 'General' && subcategories.length > 1;
          
          // Calculate minimum height: subcategory header (if any) + table header + 1 row
          const minSubcatHeight = (hasSubcategoryHeader ? 25 : 0) + 18 + 22;
          
          if (doc.y + minSubcatHeight > PAGE.HEIGHT - 40) {
            doc.addPage();
            doc.y = PAGE.MARGIN;
          }
          
          // Subcategory header (if not 'General')
          if (hasSubcategoryHeader) {
            drawSubcategoryHeader(doc, subcat, subcatData.actualScore, subcatData.perfectScore);
          }
          
          // Question table header
          const colWidths = drawQuestionTableHeader(doc);
          
          // Questions
          for (let i = 0; i < subcatData.items.length; i++) {
            const item = subcatData.items[i];
            const success = await drawQuestionRow(doc, item, questionIndex, colWidths, photos);
            questionIndex += 1;
            
            if (!success) {
              // Need new page
              doc.addPage();
              doc.y = PAGE.MARGIN;
              
              // Redraw headers
              drawCategoryHeader(doc, catData.name, catData.actualScore, catData.perfectScore);
              if (subcat !== 'General') {
                drawSubcategoryHeader(doc, `${subcat} (continued)`, subcatData.actualScore, subcatData.perfectScore);
              }
              drawQuestionTableHeader(doc);
              
              // Retry drawing the row
              await drawQuestionRow(doc, item, questionIndex - 1, colWidths, photos);
            }
          }
        }
        
        doc.y += 10;
      }
      
      // ==================== ACTION PLAN ====================
      
      if (actionPlanItems.length > 0) {
        await drawActionPlanSection(doc, actionPlanItems);
      }
      
      // ==================== SPECIAL SECTIONS ====================
      
      // Speed of Service Tracking
      drawSpeedOfServiceSection(doc, reportData.speedOfService || []);
      
      // Temperature Tracking section
      drawTemperatureTrackingSection(doc, reportData.temperatureTracking || []);
      
      // Acknowledgement section
      drawAcknowledgementSection(doc, reportData.acknowledgement, items);
      
      // ==================== PAGE NUMBERS ====================
      
      addPageNumbers(doc, reportData.appName || 'LBF Audit App');
      
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
  const normalizeCategory = (value) => {
    if (!value) return '';
    const normalized = String(value).trim().replace(/\s+/g, ' ').toLowerCase();
    if (normalized.includes('speed of service')) return 'SPEED OF SERVICE';
    if (normalized.includes('quality')) return 'QUALITY';
    if (normalized.includes('service')) return 'SERVICE';
    if (normalized.includes('hygiene') || normalized.includes('cleanliness')) return 'HYGIENE';
    if (normalized.includes('acknowledg')) return 'ACKNOWLEDGEMENT';
    return normalized.toUpperCase();
  };
  const businessPriorityOrder = ['QUALITY', 'SERVICE', 'HYGIENE', 'SPEED OF SERVICE'];
  const getBusinessPriority = (category) => {
    const normalized = normalizeCategory(category);
    const index = businessPriorityOrder.findIndex(name => normalized.includes(name));
    return index === -1 ? 0 : (businessPriorityOrder.length - index);
  };
  const determineSeverity = (isCritical, category) => {
    if (isCritical) return { label: 'CRITICAL', level: 3 };
    const normalized = normalizeCategory(category);
    if (['QUALITY', 'SERVICE', 'HYGIENE', 'SPEED OF SERVICE'].some(cat => normalized.includes(cat))) {
      return { label: 'MAJOR', level: 2 };
    }
    return { label: 'MINOR', level: 1 };
  };

  const deviations = items.map(item => {
    const maxMark = item.maxScore || 3;
    const parsedMark = parseFloat(item.mark);
    const numericMark = Number.isFinite(parsedMark) ? parsedMark : null;
    const actualMark = Number.isFinite(numericMark) ? numericMark : 0;
    const isCritical = item.is_critical === 1 || item.is_critical === true;
    const isRequired = item.required === 1 || item.required === true;
    const categoryText = String(item.category || '').toUpperCase();
    const isSpeedOfService = categoryText.includes('SPEED OF SERVICE');
    const isAvgSection = String(item.section || '').toLowerCase().includes('avg');
    const avgMinutes = item.average_time_minutes !== undefined && item.average_time_minutes !== null
      ? Number(item.average_time_minutes)
      : null;
    const defaultSlaMinutes = Number(process.env.SPEED_OF_SERVICE_SLA_MINUTES || process.env.SOS_SLA_MINUTES || 2);
    const targetMinutes = Number(item.target_time_minutes) || defaultSlaMinutes;
    const isAcknowledgement = normalizeCategory(item.category).includes('ACKNOWLEDGEMENT');
    const selectedOptionText = String(item.selected_option_text || '').trim().toLowerCase();
    const isAnswerNo = selectedOptionText === 'no';
    const isMissingAnswer = !item.selected_option_id && !item.mark && !item.comment && !item.photo_url;
    const acknowledgementMissing = isAcknowledgement && isMissingAnswer;

    let deviationFlag = false;
    let speedOfServiceBreach = false;
    if (actualMark === 0 || isAnswerNo) deviationFlag = true;
    if (isCritical && actualMark < maxMark) deviationFlag = true;
    if (isRequired && isMissingAnswer) deviationFlag = true;
    if (isSpeedOfService && isAvgSection && Number.isFinite(avgMinutes) && avgMinutes > targetMinutes) {
      deviationFlag = true;
      speedOfServiceBreach = true;
    }
    if (acknowledgementMissing) deviationFlag = true;

    if (!deviationFlag) return null;

    const severity = determineSeverity(isCritical, item.category);
    const scoreLoss = Number.isFinite(numericMark)
      ? Math.max(0, (Number(maxMark) || 0) - numericMark)
      : (isMissingAnswer ? (Number(maxMark) || 0) : (Number.isFinite(avgMinutes) ? Math.max(0, avgMinutes - targetMinutes) : 0));

    return {
      ...item,
      severity: severity.label,
      severity_level: severity.level,
      score_loss: scoreLoss,
      business_priority: getBusinessPriority(item.category),
      deviation_reason: [
        actualMark === 0 ? 'Selected option score = 0' : null,
        isAnswerNo ? 'Answer marked as No' : null,
        isCritical && actualMark < maxMark ? 'Critical item with score below maximum' : null,
        isRequired && isMissingAnswer ? 'Required item with missing answer' : null,
        speedOfServiceBreach ? 'Speed of Service Avg exceeds SLA' : null,
        acknowledgementMissing ? 'Acknowledgement missing' : null
      ].filter(Boolean).join('; ') || 'Deviation detected'
    };
  }).filter(Boolean);

  return deviations.sort((a, b) => {
    if (b.severity_level !== a.severity_level) return b.severity_level - a.severity_level;
    if ((b.score_loss || 0) !== (a.score_loss || 0)) return (b.score_loss || 0) - (a.score_loss || 0);
    if ((b.business_priority || 0) !== (a.business_priority || 0)) return (b.business_priority || 0) - (a.business_priority || 0);
    return 0;
  }).slice(0, 3);
}

module.exports = {
  generateEnhancedAuditPdf,
  identifyDeviations,
  COLORS
};
