/**
 * Enhanced PDF Report Generator
 * 
 * Generates professional Store-wise QA Audit Report matching the reference format:
 * - Section 1: Report Header (Outlet, Audit Name, Date, Auditor, Overall Score)
 * - Section 2: Executive Summary (Category Scorecard)
 * - Section 3: Category-wise Question Details with failure highlighting
 * - Section 4: Top-3 Deviations (Auto-generated)
 * - Section 5: Action Plan (Auto-generated from deviations)
 * - Page numbering and footer branding
 */

const PDFDocument = require('pdfkit');
const db = require('../config/database-loader');
const logger = require('./logger');
const path = require('path');
const fs = require('fs');

// ==================== SEVERITY CONFIGURATION ====================
const SEVERITY_CONFIG = {
  CRITICAL: { level: 3, label: 'CRITICAL', color: '#dc3545' },
  MAJOR: { level: 2, label: 'MAJOR', color: '#fd7e14' },
  MINOR: { level: 1, label: 'MINOR', color: '#6c757d' }
};

// Categories that warrant MAJOR severity
const MAJOR_SEVERITY_CATEGORIES = ['QUALITY', 'PROCESS', 'PROCESSES', 'SPEED OF SERVICE', 'SERVICE'];

// ==================== PDF STYLING CONSTANTS ====================
const COLORS = {
  PRIMARY: '#1a365d',      // Dark blue for headers
  SECONDARY: '#2c5282',    // Medium blue
  SUCCESS: '#38a169',      // Green for pass
  DANGER: '#e53e3e',       // Red for fail
  WARNING: '#dd6b20',      // Orange for warning
  LIGHT_BLUE: '#ebf8ff',   // Light blue background
  LIGHT_GRAY: '#f7fafc',   // Light gray background
  BORDER: '#e2e8f0',       // Border color
  TEXT_PRIMARY: '#1a202c', // Dark text
  TEXT_SECONDARY: '#718096' // Gray text
};

const PAGE = {
  WIDTH: 595.28,
  HEIGHT: 841.89,
  MARGIN: 40,
  get CONTENT_WIDTH() { return this.WIDTH - (this.MARGIN * 2); }
};

// ==================== DEVIATION IDENTIFICATION ====================

/**
 * Determine severity based on is_critical flag and category
 */
function determineSeverity(isCritical, category) {
  if (isCritical) {
    return SEVERITY_CONFIG.CRITICAL;
  }
  
  const upperCategory = (category || '').toUpperCase();
  for (const majorCat of MAJOR_SEVERITY_CATEGORIES) {
    if (upperCategory.includes(majorCat)) {
      return SEVERITY_CONFIG.MAJOR;
    }
  }
  
  return SEVERITY_CONFIG.MINOR;
}

/**
 * Get deviation reason based on the response data
 */
function getDeviationReason(item) {
  const reasons = [];
  const selectedMark = item.selected_mark || item.mark || '';
  const numericMark = parseFloat(selectedMark) || 0;
  const maxMark = item.maxScore || 3;
  const isCritical = item.is_critical === 1 || item.is_critical === true;
  const isRequired = item.required === 1 || item.required === true;
  
  if (selectedMark === '0' || numericMark === 0) {
    reasons.push('Selected option score = 0');
  }
  
  if (isCritical && numericMark < maxMark) {
    reasons.push('Critical item with score below maximum');
  }
  
  if (isRequired && (!item.selected_option_id && !item.mark && !item.comment)) {
    reasons.push('Required item with missing answer');
  }
  
  if (item.status === 'failed') {
    reasons.push('Item marked as failed');
  }
  
  return reasons.length > 0 ? reasons.join('; ') : 'Score below passing threshold';
}

/**
 * Identify all deviations from audit items
 * 
 * Deviation criteria:
 * - Selected option score = 0
 * - is_critical = true AND score < max
 * - Required = true AND answer is missing
 * - Status = 'failed'
 * - Selected option text = 'No', 'N', 'Fail', 'F'
 */
function identifyDeviations(items) {
  const deviations = items.map(item => {
    const selectedMark = item.selected_mark || item.mark || '';
    const numericMark = parseFloat(selectedMark) || 0;
    const maxMark = item.maxScore || 3;
    const isCritical = item.is_critical === 1 || item.is_critical === true;
    const isRequired = item.required === 1 || item.required === true;
    
    let isDeviation = false;
    
    // 1. Selected option score = 0
    if (selectedMark === '0' || numericMark === 0) {
      isDeviation = true;
    }
    
    // 2. is_critical AND score < max
    if (isCritical && numericMark < maxMark) {
      isDeviation = true;
    }
    
    // 3. Required AND answer missing
    if (isRequired && !item.selected_option_id && !item.mark && item.status !== 'completed') {
      isDeviation = true;
    }
    
    // 4. Status = 'failed'
    if (item.status === 'failed') {
      isDeviation = true;
    }
    
    // 5. Option text indicates failure
    if (item.selected_option_text && ['No', 'N', 'Fail', 'F'].includes(item.selected_option_text)) {
      isDeviation = true;
    }
    
    if (!isDeviation) return null;
    
    const severity = determineSeverity(isCritical, item.category);
    
    return {
      item_id: item.item_id,
      title: item.title,
      category: item.category,
      is_critical: isCritical,
      severity: severity.label,
      severity_level: severity.level,
      severity_color: severity.color,
      deviation_reason: getDeviationReason(item),
      selected_option: item.selected_option_text || '',
      mark: selectedMark,
      max_mark: maxMark,
      comment: item.comment || ''
    };
  }).filter(item => item !== null);
  
  // Sort by severity DESC, then is_critical DESC
  deviations.sort((a, b) => {
    if (b.severity_level !== a.severity_level) {
      return b.severity_level - a.severity_level;
    }
    return b.is_critical ? 1 : -1;
  });
  
  return deviations;
}

// ==================== PDF GENERATION ====================

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
      const audit = await fetchAuditData(dbInstance, auditId);
      if (!audit) {
        return reject(new Error('Audit not found'));
      }
      
      // Fetch audit items with options
      const items = await fetchAuditItems(dbInstance, auditId, isSqlServer);
      
      // Calculate category scores
      const categoryData = calculateCategoryScores(items);
      
      // Identify deviations
      const allDeviations = identifyDeviations(items);
      const top3Deviations = allDeviations.slice(0, 3);
      
      // Fetch action items
      const actionItems = await fetchActionItems(dbInstance, auditId);
      
      // Calculate overall score
      const { totalActualScore, totalPerfectScore, overallScore } = calculateOverallScore(items);
      
      // Create PDF document
      const doc = new PDFDocument({ 
        margin: PAGE.MARGIN, 
        size: 'A4',
        bufferPages: true 
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      let currentPage = 1;
      
      // ==================== SECTION 1: HEADER ====================
      drawReportHeader(doc, audit, overallScore, totalActualScore, totalPerfectScore);
      
      // ==================== SECTION 2: EXECUTIVE SUMMARY ====================
      doc.moveDown(1);
      drawExecutiveSummary(doc, categoryData, audit);
      
      // ==================== SECTION 3: CATEGORY DETAILS ====================
      doc.addPage();
      currentPage++;
      drawCategoryDetails(doc, items, categoryData, currentPage);
      
      // ==================== SECTION 4: TOP-3 DEVIATIONS ====================
      if (top3Deviations.length > 0) {
        checkNewPage(doc, 200);
        drawDeviationsSection(doc, top3Deviations);
      }
      
      // ==================== SECTION 5: ACTION PLAN ====================
      if (actionItems.length > 0) {
        checkNewPage(doc, 200);
        drawActionPlanSection(doc, actionItems);
      }
      
      // Add page numbers
      addPageNumbers(doc);
      
      doc.end();
      
    } catch (error) {
      logger.error('[Enhanced PDF] Error generating report:', error);
      reject(error);
    }
  });
}

// ==================== DATA FETCHING FUNCTIONS ====================

async function fetchAuditData(dbInstance, auditId) {
  return new Promise((resolve, reject) => {
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
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

async function fetchAuditItems(dbInstance, auditId, isSqlServer) {
  return new Promise((resolve, reject) => {
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
      ORDER BY ci.category, ci.order_index`,
      [auditId],
      (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []).map(r => ({ ...r, maxScore: parseFloat(r.max_mark) || 3 })));
      }
    );
  });
}

async function fetchActionItems(dbInstance, auditId) {
  return new Promise((resolve, reject) => {
    dbInstance.all(
      `SELECT ai.*, u.name as assigned_to_name
       FROM action_items ai
       LEFT JOIN users u ON ai.assigned_to = u.id
       WHERE ai.audit_id = ?
       ORDER BY ai.id`,
      [auditId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// ==================== CALCULATION FUNCTIONS ====================

function calculateCategoryScores(items) {
  const categoryData = {};
  
  items.forEach(item => {
    const category = item.category || 'Other';
    if (!categoryData[category]) {
      categoryData[category] = {
        items: [],
        perfectScore: 0,
        actualScore: 0,
        count: 0,
        completedCount: 0
      };
    }
    
    categoryData[category].items.push(item);
    categoryData[category].count++;
    
    const maxMark = item.maxScore || 3;
    const actualMark = parseFloat(item.selected_mark || item.mark) || 0;
    
    categoryData[category].perfectScore += maxMark;
    categoryData[category].actualScore += actualMark;
    
    if (item.status === 'completed') {
      categoryData[category].completedCount++;
    }
  });
  
  // Calculate percentage for each category
  Object.keys(categoryData).forEach(cat => {
    const data = categoryData[cat];
    data.percentage = data.perfectScore > 0 
      ? Math.round((data.actualScore / data.perfectScore) * 100) 
      : 0;
  });
  
  return categoryData;
}

function calculateOverallScore(items) {
  let totalActualScore = 0;
  let totalPerfectScore = 0;
  
  items.forEach(item => {
    const maxMark = item.maxScore || 3;
    const actualMark = parseFloat(item.selected_mark || item.mark) || 0;
    totalPerfectScore += maxMark;
    totalActualScore += actualMark;
  });
  
  const overallScore = totalPerfectScore > 0 
    ? Math.round((totalActualScore / totalPerfectScore) * 1000) / 10 
    : 0;
  
  return { totalActualScore, totalPerfectScore, overallScore };
}

// ==================== PDF DRAWING FUNCTIONS ====================

function checkNewPage(doc, neededSpace = 100) {
  if (doc.y > PAGE.HEIGHT - neededSpace - 50) {
    doc.addPage();
    doc.y = PAGE.MARGIN;
    return true;
  }
  return false;
}

function drawReportHeader(doc, audit, overallScore, actualScore, perfectScore) {
  // Blue header bar
  doc.rect(0, 0, PAGE.WIDTH, 60).fill(COLORS.PRIMARY);
  
  // Report title
  doc.fontSize(18).fillColor('#fff');
  doc.text(`${audit.template_name || 'Audit'} - Report`, PAGE.MARGIN, 18, { width: PAGE.CONTENT_WIDTH - 150 });
  
  // Company name (right aligned)
  doc.fontSize(12).fillColor('#fff');
  doc.text('Lite Bite Foods', PAGE.WIDTH - PAGE.MARGIN - 120, 22, { width: 120, align: 'right' });
  
  // Overall Score (large, centered)
  doc.y = 80;
  const scoreColor = overallScore >= 80 ? COLORS.SUCCESS : overallScore >= 60 ? COLORS.WARNING : COLORS.DANGER;
  doc.fontSize(42).fillColor(scoreColor);
  doc.text(`${overallScore}%`, PAGE.MARGIN, 80, { width: PAGE.CONTENT_WIDTH, align: 'center' });
  
  doc.fontSize(14).fillColor(COLORS.TEXT_SECONDARY);
  doc.text(`(${Math.round(actualScore)}/${Math.round(perfectScore)})`, PAGE.MARGIN, 130, { width: PAGE.CONTENT_WIDTH, align: 'center' });
  
  // Audit Details Table
  doc.y = 165;
  doc.fontSize(12).fillColor(COLORS.TEXT_PRIMARY).text('Details', PAGE.MARGIN, doc.y, { underline: true });
  doc.moveDown(0.5);
  
  const detailsY = doc.y;
  const colWidth = PAGE.CONTENT_WIDTH / 4;
  
  // Header row
  doc.rect(PAGE.MARGIN, detailsY, PAGE.CONTENT_WIDTH, 25).fill(COLORS.PRIMARY);
  doc.fontSize(9).fillColor('#fff');
  doc.text('Outlet Name', PAGE.MARGIN + 5, detailsY + 8, { width: colWidth - 10 });
  doc.text('Start Date', PAGE.MARGIN + colWidth + 5, detailsY + 8, { width: colWidth - 10 });
  doc.text('End Date', PAGE.MARGIN + colWidth * 2 + 5, detailsY + 8, { width: colWidth - 10 });
  doc.text('Auditor', PAGE.MARGIN + colWidth * 3 + 5, detailsY + 8, { width: colWidth - 10 });
  
  // Data row
  const dataY = detailsY + 25;
  doc.rect(PAGE.MARGIN, dataY, PAGE.CONTENT_WIDTH, 30).stroke(COLORS.BORDER);
  doc.fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
  
  const startDate = audit.created_at ? new Date(audit.created_at).toLocaleDateString('en-IN', { 
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  }) : 'N/A';
  const endDate = audit.completed_at ? new Date(audit.completed_at).toLocaleDateString('en-IN', { 
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  }) : 'In Progress';
  
  doc.text(audit.restaurant_name || 'N/A', PAGE.MARGIN + 5, dataY + 10, { width: colWidth - 10 });
  doc.text(startDate, PAGE.MARGIN + colWidth + 5, dataY + 10, { width: colWidth - 10 });
  doc.text(endDate, PAGE.MARGIN + colWidth * 2 + 5, dataY + 10, { width: colWidth - 10 });
  doc.text(audit.auditor_name || 'N/A', PAGE.MARGIN + colWidth * 3 + 5, dataY + 10, { width: colWidth - 10 });
  
  doc.y = dataY + 40;
}

function drawExecutiveSummary(doc, categoryData, audit) {
  doc.fontSize(12).fillColor(COLORS.TEXT_PRIMARY).text('Score By Category', PAGE.MARGIN, doc.y, { underline: true });
  doc.moveDown(0.5);
  
  const colWidths = [PAGE.CONTENT_WIDTH * 0.4, PAGE.CONTENT_WIDTH * 0.2, PAGE.CONTENT_WIDTH * 0.2, PAGE.CONTENT_WIDTH * 0.2];
  let rowY = doc.y;
  
  // Header
  doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, 22).fill(COLORS.PRIMARY);
  doc.fontSize(9).fillColor('#fff');
  doc.text('Category', PAGE.MARGIN + 5, rowY + 6, { width: colWidths[0] - 10 });
  doc.text('Perfect Score', PAGE.MARGIN + colWidths[0] + 5, rowY + 6, { width: colWidths[1] - 10, align: 'center' });
  doc.text('Actual Score', PAGE.MARGIN + colWidths[0] + colWidths[1] + 5, rowY + 6, { width: colWidths[2] - 10, align: 'center' });
  doc.text('Percentage', PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + 5, rowY + 6, { width: colWidths[3] - 10, align: 'center' });
  
  rowY += 22;
  
  // Data rows
  const categories = Object.keys(categoryData).sort();
  categories.forEach((cat, idx) => {
    const data = categoryData[cat];
    const bgColor = idx % 2 === 0 ? '#fff' : COLORS.LIGHT_GRAY;
    
    doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, 20).fill(bgColor).stroke(COLORS.BORDER);
    doc.fontSize(8).fillColor(COLORS.TEXT_PRIMARY);
    doc.text(cat, PAGE.MARGIN + 5, rowY + 6, { width: colWidths[0] - 10 });
    doc.text(Math.round(data.perfectScore).toString(), PAGE.MARGIN + colWidths[0] + 5, rowY + 6, { width: colWidths[1] - 10, align: 'center' });
    doc.text(Math.round(data.actualScore).toString(), PAGE.MARGIN + colWidths[0] + colWidths[1] + 5, rowY + 6, { width: colWidths[2] - 10, align: 'center' });
    
    // Color-code percentage
    const pctColor = data.percentage >= 80 ? COLORS.SUCCESS : data.percentage >= 60 ? COLORS.WARNING : COLORS.DANGER;
    doc.fillColor(pctColor);
    doc.text(`${data.percentage}%`, PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + 5, rowY + 6, { width: colWidths[3] - 10, align: 'center' });
    
    rowY += 20;
  });
  
  doc.y = rowY + 10;
}

function drawCategoryDetails(doc, items, categoryData, startPage) {
  doc.fontSize(14).fillColor(COLORS.PRIMARY).text('Category-wise Details', PAGE.MARGIN, PAGE.MARGIN);
  doc.moveDown(1);
  
  const categories = Object.keys(categoryData).sort();
  const colWidths = [30, PAGE.CONTENT_WIDTH * 0.50, 50, 70, PAGE.CONTENT_WIDTH * 0.15];
  
  categories.forEach(category => {
    const catItems = categoryData[category].items;
    if (!catItems || catItems.length === 0) return;
    
    const catData = categoryData[category];
    
    // Check for new page
    if (doc.y > PAGE.HEIGHT - 150) {
      doc.addPage();
      doc.y = PAGE.MARGIN;
    }
    
    // Category header
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 22).fill(COLORS.LIGHT_BLUE);
    doc.rect(PAGE.MARGIN, doc.y, PAGE.CONTENT_WIDTH, 22).stroke(COLORS.BORDER);
    doc.fontSize(10).fillColor(COLORS.PRIMARY);
    doc.text(`${category.toUpperCase()} - ${catData.percentage}% (${Math.round(catData.actualScore)}/${Math.round(catData.perfectScore)})`, 
      PAGE.MARGIN + 8, doc.y + 6, { width: PAGE.CONTENT_WIDTH - 16 });
    doc.y += 25;
    
    // Table header
    let rowY = doc.y;
    doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, 18).fill(COLORS.PRIMARY);
    doc.fontSize(7).fillColor('#fff');
    doc.text('#', PAGE.MARGIN + 2, rowY + 5, { width: colWidths[0] - 4, align: 'center' });
    doc.text('Question', PAGE.MARGIN + colWidths[0] + 2, rowY + 5, { width: colWidths[1] - 4 });
    doc.text('Score', PAGE.MARGIN + colWidths[0] + colWidths[1] + 2, rowY + 5, { width: colWidths[2] - 4, align: 'center' });
    doc.text('Response', PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + 2, rowY + 5, { width: colWidths[3] - 4, align: 'center' });
    doc.text('Status', PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, rowY + 5, { width: colWidths[4] - 4, align: 'center' });
    rowY += 18;
    
    // Items
    catItems.forEach((item, idx) => {
      if (rowY > PAGE.HEIGHT - 60) {
        doc.addPage();
        rowY = PAGE.MARGIN;
        // Re-draw header
        doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, 18).fill(COLORS.PRIMARY);
        doc.fontSize(7).fillColor('#fff');
        doc.text('#', PAGE.MARGIN + 2, rowY + 5, { width: colWidths[0] - 4, align: 'center' });
        doc.text('Question', PAGE.MARGIN + colWidths[0] + 2, rowY + 5, { width: colWidths[1] - 4 });
        doc.text('Score', PAGE.MARGIN + colWidths[0] + colWidths[1] + 2, rowY + 5, { width: colWidths[2] - 4, align: 'center' });
        doc.text('Response', PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + 2, rowY + 5, { width: colWidths[3] - 4, align: 'center' });
        doc.text('Status', PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, rowY + 5, { width: colWidths[4] - 4, align: 'center' });
        rowY += 18;
      }
      
      const actualMark = parseFloat(item.selected_mark || item.mark) || 0;
      const maxMark = item.maxScore || 3;
      const response = item.selected_option_text || (actualMark > 0 ? 'Yes' : 'No');
      const isFail = actualMark === 0 || item.status === 'failed' || response === 'No';
      
      // Highlight failures with red background
      const bgColor = isFail ? '#fee2e2' : (idx % 2 === 0 ? '#fff' : COLORS.LIGHT_GRAY);
      
      doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, 16).fill(bgColor).stroke(COLORS.BORDER);
      doc.fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
      
      doc.text((idx + 1).toString(), PAGE.MARGIN + 2, rowY + 4, { width: colWidths[0] - 4, align: 'center' });
      doc.text((item.title || '').substring(0, 70), PAGE.MARGIN + colWidths[0] + 2, rowY + 4, { width: colWidths[1] - 4, lineBreak: false });
      doc.text(`${actualMark}/${maxMark}`, PAGE.MARGIN + colWidths[0] + colWidths[1] + 2, rowY + 4, { width: colWidths[2] - 4, align: 'center' });
      
      // Color-code response
      doc.fillColor(isFail ? COLORS.DANGER : COLORS.SUCCESS);
      doc.text(response.substring(0, 12), PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + 2, rowY + 4, { width: colWidths[3] - 4, align: 'center' });
      
      // Status indicator
      doc.fillColor(isFail ? COLORS.DANGER : COLORS.SUCCESS);
      doc.text(isFail ? '✗ FAIL' : '✓ PASS', PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, rowY + 4, { width: colWidths[4] - 4, align: 'center' });
      
      rowY += 16;
    });
    
    doc.y = rowY + 15;
  });
}

function drawDeviationsSection(doc, deviations) {
  doc.fontSize(12).fillColor(COLORS.DANGER).text('⚠ Top-3 Deviations', PAGE.MARGIN, doc.y);
  doc.moveDown(0.5);
  
  const colWidths = [PAGE.CONTENT_WIDTH * 0.12, PAGE.CONTENT_WIDTH * 0.45, PAGE.CONTENT_WIDTH * 0.13, PAGE.CONTENT_WIDTH * 0.30];
  let rowY = doc.y;
  
  // Header
  doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, 20).fill(COLORS.DANGER);
  doc.fontSize(8).fillColor('#fff');
  doc.text('Category', PAGE.MARGIN + 3, rowY + 6, { width: colWidths[0] - 6 });
  doc.text('Checklist Item', PAGE.MARGIN + colWidths[0] + 3, rowY + 6, { width: colWidths[1] - 6 });
  doc.text('Severity', PAGE.MARGIN + colWidths[0] + colWidths[1] + 3, rowY + 6, { width: colWidths[2] - 6, align: 'center' });
  doc.text('Deviation Reason', PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + 3, rowY + 6, { width: colWidths[3] - 6 });
  rowY += 20;
  
  // Data rows
  deviations.forEach((dev, idx) => {
    const bgColor = idx % 2 === 0 ? '#fff' : '#fef2f2';
    doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, 22).fill(bgColor).stroke(COLORS.BORDER);
    doc.fontSize(7).fillColor(COLORS.TEXT_PRIMARY);
    
    doc.text((dev.category || '').substring(0, 15), PAGE.MARGIN + 3, rowY + 7, { width: colWidths[0] - 6 });
    doc.text((dev.title || '').substring(0, 55), PAGE.MARGIN + colWidths[0] + 3, rowY + 7, { width: colWidths[1] - 6 });
    
    // Severity badge
    doc.fillColor(dev.severity_color || COLORS.WARNING);
    doc.text(dev.severity, PAGE.MARGIN + colWidths[0] + colWidths[1] + 3, rowY + 7, { width: colWidths[2] - 6, align: 'center' });
    
    doc.fillColor(COLORS.TEXT_SECONDARY);
    doc.text((dev.deviation_reason || '').substring(0, 40), PAGE.MARGIN + colWidths[0] + colWidths[1] + colWidths[2] + 3, rowY + 7, { width: colWidths[3] - 6 });
    
    rowY += 22;
  });
  
  doc.y = rowY + 15;
}

function drawActionPlanSection(doc, actionItems) {
  if (doc.y > PAGE.HEIGHT - 180) {
    doc.addPage();
    doc.y = PAGE.MARGIN;
  }
  
  doc.fontSize(12).fillColor(COLORS.WARNING).text('📋 Action Plan', PAGE.MARGIN, doc.y);
  doc.moveDown(0.5);
  
  const colWidths = [
    PAGE.CONTENT_WIDTH * 0.10, // Category
    PAGE.CONTENT_WIDTH * 0.25, // Title
    PAGE.CONTENT_WIDTH * 0.10, // Severity
    PAGE.CONTENT_WIDTH * 0.20, // Corrective Action
    PAGE.CONTENT_WIDTH * 0.12, // Responsible
    PAGE.CONTENT_WIDTH * 0.10, // Target Date
    PAGE.CONTENT_WIDTH * 0.08  // Status
  ];
  
  let rowY = doc.y;
  
  // Header
  doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, 18).fill(COLORS.SECONDARY);
  doc.fontSize(7).fillColor('#fff');
  let x = PAGE.MARGIN + 2;
  ['Category', 'Deviation', 'Severity', 'Corrective Action', 'Responsible', 'Target Date', 'Status'].forEach((header, i) => {
    doc.text(header, x, rowY + 5, { width: colWidths[i] - 4, align: 'center' });
    x += colWidths[i];
  });
  rowY += 18;
  
  // Data rows
  actionItems.forEach((item, idx) => {
    if (rowY > PAGE.HEIGHT - 50) {
      doc.addPage();
      rowY = PAGE.MARGIN;
    }
    
    const bgColor = idx % 2 === 0 ? '#fff' : COLORS.LIGHT_GRAY;
    doc.rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, 20).fill(bgColor).stroke(COLORS.BORDER);
    doc.fontSize(6).fillColor(COLORS.TEXT_PRIMARY);
    
    x = PAGE.MARGIN + 2;
    
    doc.text((item.category || '').substring(0, 12), x, rowY + 6, { width: colWidths[0] - 4 });
    x += colWidths[0];
    
    doc.text((item.title || '').substring(0, 30), x, rowY + 6, { width: colWidths[1] - 4 });
    x += colWidths[1];
    
    // Severity color
    const sevColor = item.severity === 'CRITICAL' ? COLORS.DANGER : item.severity === 'MAJOR' ? COLORS.WARNING : COLORS.TEXT_SECONDARY;
    doc.fillColor(sevColor);
    doc.text(item.severity || 'MINOR', x, rowY + 6, { width: colWidths[2] - 4, align: 'center' });
    x += colWidths[2];
    
    doc.fillColor(COLORS.TEXT_PRIMARY);
    doc.text((item.corrective_action || '—').substring(0, 25), x, rowY + 6, { width: colWidths[3] - 4 });
    x += colWidths[3];
    
    doc.text((item.assigned_to_name || '—').substring(0, 15), x, rowY + 6, { width: colWidths[4] - 4 });
    x += colWidths[4];
    
    const targetDate = item.due_date ? new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
    doc.text(targetDate, x, rowY + 6, { width: colWidths[5] - 4, align: 'center' });
    x += colWidths[5];
    
    // Status color
    const statusColor = item.status === 'CLOSED' ? COLORS.SUCCESS : item.status === 'IN_PROGRESS' ? COLORS.SECONDARY : COLORS.WARNING;
    doc.fillColor(statusColor);
    doc.text(item.status || 'OPEN', x, rowY + 6, { width: colWidths[6] - 4, align: 'center' });
    
    rowY += 20;
  });
  
  doc.y = rowY + 10;
}

function addPageNumbers(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    
    // Footer
    doc.fontSize(8).fillColor(COLORS.TEXT_SECONDARY);
    doc.text(`Page ${i + 1} of ${pages.count}`, PAGE.MARGIN, PAGE.HEIGHT - 25, { width: 100 });
    doc.text('Powered By LBF Audit App', PAGE.WIDTH - PAGE.MARGIN - 150, PAGE.HEIGHT - 25, { width: 150, align: 'right' });
  }
}

// ==================== EXPORTS ====================
module.exports = {
  generateEnhancedAuditPdf,
  identifyDeviations,
  determineSeverity,
  SEVERITY_CONFIG,
  MAJOR_SEVERITY_CATEGORIES
};
