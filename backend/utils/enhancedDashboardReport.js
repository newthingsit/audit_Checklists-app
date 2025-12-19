const ExcelJS = require('exceljs');
const db = require('../config/database-loader');
const logger = require('../utils/logger');

/**
 * Format date for Excel (DD-MM-YYYY)
 */
const formatDateForExcel = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Calculate deviation in days between scheduled and actual dates
 */
const calculateDeviation = (scheduledDate, actualDate) => {
  if (!scheduledDate || !actualDate) return '';
  
  const scheduled = new Date(scheduledDate);
  const actual = new Date(actualDate);
  
  scheduled.setHours(0, 0, 0, 0);
  actual.setHours(0, 0, 0, 0);
  
  const diffTime = actual - scheduled;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Create enhanced dashboard report matching the Excel structure
 */
const createEnhancedDashboardReport = async (userId, isAdmin, dateFrom, dateTo) => {
  const dbInstance = db.getDb();
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  // Build date filter
  let dateFilter = '';
  const dateParams = [];
  
  if (dateFrom && dateTo) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE) AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else if (dbType === 'mysql') {
      dateFilter = 'AND DATE(a.created_at) >= ? AND DATE(a.created_at) <= ?';
    } else {
      // SQLite and PostgreSQL
      dateFilter = 'AND DATE(a.created_at) >= ? AND DATE(a.created_at) <= ?';
    }
    dateParams.push(dateFrom, dateTo);
  } else if (dateFrom) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) >= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) >= ?';
    }
    dateParams.push(dateFrom);
  } else if (dateTo) {
    if (dbType === 'mssql' || dbType === 'sqlserver') {
      dateFilter = 'AND CAST(a.created_at AS DATE) <= CAST(? AS DATE)';
    } else {
      dateFilter = 'AND DATE(a.created_at) <= ?';
    }
    dateParams.push(dateTo);
  }
  
  // Query to get detailed audit data with scheduled audits, locations, and action items
  // Note: For SQL Server, we avoid using NTEXT columns (a.location) with COALESCE
  const isMssql = dbType === 'mssql' || dbType === 'sqlserver';
  
  let query;
  if (isMssql) {
    query = `
      SELECT 
        a.id as audit_id,
        a.restaurant_name,
        COALESCE(l.store_number, '') as store_number,
        COALESCE(l.name, CAST(a.location AS NVARCHAR(MAX)), '') as location_name,
        a.location_id,
        a.template_id,
        ct.name as template_name,
        COALESCE(ct.category, '') as template_category,
        a.status,
        a.score,
        a.created_at,
        a.completed_at,
        a.scheduled_audit_id,
        COALESCE(a.original_scheduled_date, sa.scheduled_date) as scheduled_date,
        a.original_scheduled_date,
        u.id as user_id,
        u.name as auditor_name,
        u.email as auditor_email,
        COALESCE(l.city, '') as city,
        COALESCE(l.state, '') as state,
        NULL as manager_id,
        NULL as manager_name,
        (SELECT COUNT(*) FROM action_items WHERE audit_id = a.id) as total_action_items,
        (SELECT COUNT(*) FROM action_items WHERE audit_id = a.id AND status = 'completed') as completed_action_items,
        (SELECT COUNT(*) FROM action_items WHERE audit_id = a.id AND status != 'completed') as pending_action_items
      FROM audits a
      JOIN checklist_templates ct ON a.template_id = ct.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id
      WHERE 1=1
    `;
  } else {
    query = `
      SELECT 
        a.id as audit_id,
        a.restaurant_name,
        COALESCE(l.store_number, '') as store_number,
        COALESCE(l.name, a.location, '') as location_name,
        a.location_id,
        a.template_id,
        ct.name as template_name,
        COALESCE(ct.category, '') as template_category,
        a.status,
        a.score,
        a.created_at,
        a.completed_at,
        a.scheduled_audit_id,
        COALESCE(a.original_scheduled_date, sa.scheduled_date) as scheduled_date,
        a.original_scheduled_date,
        u.id as user_id,
        u.name as auditor_name,
        u.email as auditor_email,
        COALESCE(l.city, '') as city,
        COALESCE(l.state, '') as state,
        NULL as manager_id,
        NULL as manager_name,
        (SELECT COUNT(*) FROM action_items WHERE audit_id = a.id) as total_action_items,
        (SELECT COUNT(*) FROM action_items WHERE audit_id = a.id AND status = 'completed') as completed_action_items,
        (SELECT COUNT(*) FROM action_items WHERE audit_id = a.id AND status != 'completed') as pending_action_items
      FROM audits a
      JOIN checklist_templates ct ON a.template_id = ct.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN scheduled_audits sa ON a.scheduled_audit_id = sa.id
      WHERE 1=1
    `;
  }
  
  if (!isAdmin) {
    query += ' AND a.user_id = ?';
    dateParams.unshift(userId);
  }
  
  query += ` ${dateFilter} ORDER BY a.created_at DESC, a.restaurant_name`;
  
  return new Promise((resolve, reject) => {
    dbInstance.all(query, dateParams, async (err, audits) => {
      if (err) {
        logger.error('Error fetching audit data for enhanced report:', err);
        logger.error('Query:', query);
        logger.error('Params:', dateParams);
        return reject(err);
      }
      
      // Group audits by template/category to create "audit cycles"
      const templateGroups = {};
      const auditData = [];
      
      audits.forEach(audit => {
        const templateKey = audit.template_name || audit.template_category || 'Other';
        
        if (!templateGroups[templateKey]) {
          templateGroups[templateKey] = [];
        }
        
        // Calculate deviation
        const scheduledDate = audit.scheduled_date || audit.created_at;
        const actualDate = audit.completed_at || audit.created_at;
        const deviation = calculateDeviation(scheduledDate, actualDate);
        
        // Determine if action plan is done
        const actionPlanDone = audit.total_action_items > 0 ? 
          (audit.completed_action_items === audit.total_action_items ? 'Yes' : 'No') : 
          'N/A';
        
        // Action plan status
        let actionPlanStatus = 'N/A';
        if (audit.total_action_items > 0) {
          if (audit.completed_action_items === audit.total_action_items) {
            actionPlanStatus = 'Completed';
          } else if (audit.completed_action_items > 0) {
            actionPlanStatus = 'In Progress';
          } else {
            actionPlanStatus = 'Pending';
          }
        }
        
        auditData.push({
          audit_id: audit.audit_id,
          restaurant_name: audit.restaurant_name,
          store_number: audit.store_number || '',
          location_name: audit.location_name || '',
          city: audit.city || '',
          state: audit.state || '',
          template_name: audit.template_name,
          template_category: audit.template_category,
          scheduled_date: scheduledDate,
          actual_date: actualDate,
          deviation: deviation,
          score: audit.score,
          status: audit.status,
          auditor_name: audit.auditor_name,
          auditor_email: audit.auditor_email,
          manager_name: audit.manager_name,
          action_plan_done: actionPlanDone,
          action_plan_status: actionPlanStatus,
          total_action_items: audit.total_action_items,
          completed_action_items: audit.completed_action_items
        });
      });
      
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Audit Checklist System';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Create main detailed report sheet
      const detailSheet = workbook.addWorksheet('Audit Details');
      
      // Headers matching the Excel structure
      detailSheet.columns = [
        { header: 'Cat', key: 'category', width: 15 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'Code', key: 'code', width: 12 },
        { header: 'Outlet Name', key: 'outlet_name', width: 30 },
        { header: 'Auditor Name', key: 'auditor_name', width: 20 },
        { header: 'Manager Name', key: 'manager_name', width: 20 },
        { header: 'Template', key: 'template', width: 20 },
        { header: 'Scheduled Date', key: 'scheduled_date', width: 18 },
        { header: 'Actual Date', key: 'actual_date', width: 18 },
        { header: 'Deviation (days)', key: 'deviation', width: 15 },
        { header: 'Audit Score %', key: 'score', width: 15 },
        { header: 'Action Plan Done', key: 'action_plan_done', width: 15 },
        { header: 'Action Plan Status', key: 'action_plan_status', width: 18 },
        { header: 'Status', key: 'status', width: 15 }
      ];
      
      // Style header row
      const headerRow = detailSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;
      
      // Add data rows
      auditData.forEach((audit, index) => {
        const row = detailSheet.addRow([
          audit.template_category || '',
          audit.city || '',
          audit.store_number || '',
          audit.restaurant_name || '',
          audit.auditor_name || '',
          audit.manager_name || '',
          audit.template_name || '',
          audit.scheduled_date ? formatDateForExcel(audit.scheduled_date) : '',
          audit.actual_date ? formatDateForExcel(audit.actual_date) : '',
          audit.deviation !== '' ? audit.deviation : '',
          audit.score !== null ? `${audit.score}%` : 'N/A',
          audit.action_plan_done,
          audit.action_plan_status,
          audit.status || ''
        ]);
        
        // Alternate row colors
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        }
        
        // Center align numeric columns
        row.getCell(10).alignment = { horizontal: 'center' }; // Deviation
        row.getCell(11).alignment = { horizontal: 'center' }; // Score
      });
      
      // Freeze header row
      detailSheet.views = [{ state: 'frozen', ySplit: 1 }];
      
      // Create summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      
      // Calculate summary metrics
      const totalAudits = auditData.length;
      const completedAudits = auditData.filter(a => a.status === 'completed').length;
      const perfectVisits = auditData.filter(a => a.deviation === 0 || a.deviation === '').length;
      const visitsDone = completedAudits;
      const vdStrikeRate = totalAudits > 0 ? Math.round((visitsDone / totalAudits) * 100) : 0;
      
      // Action plan metrics
      const auditsWithActions = auditData.filter(a => a.total_action_items > 0).length;
      const completedActions = auditData.filter(a => a.action_plan_status === 'Completed').length;
      const apStrikeRate = auditsWithActions > 0 ? Math.round((completedActions / auditsWithActions) * 100) : 0;
      const apAdherence = auditsWithActions > 0 ? Math.round((completedActions / auditsWithActions) * 100) : 0;
      
      // Schedule adherence - uses original_scheduled_date for accurate tracking
      const onTimeAudits = auditData.filter(a => {
        // Only count audits that were from scheduled audits
        if (!a.scheduled_audit_id) return false;
        
        // Use original_scheduled_date or fallback to scheduled_date
        const scheduledDate = a.original_scheduled_date || a.scheduled_date;
        const completedDate = a.completed_at || a.actual_date;
        
        if (!scheduledDate || !completedDate) return false;
        
        // Compare dates (just the date part, not time)
        const deviation = calculateDeviation(scheduledDate, completedDate);
        return deviation === 0; // 0 days deviation means on-time
      }).length;
      
      // Total scheduled audits (only count audits from scheduled audits)
      const scheduledAuditsCount = auditData.filter(a => a.scheduled_audit_id).length;
      const scheduleAdherence = scheduledAuditsCount > 0 ? Math.round((onTimeAudits / scheduledAuditsCount) * 100) : 0;
      
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ];
      
      const summaryHeaderRow = summarySheet.getRow(1);
      summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summaryHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      summaryHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
      summaryHeaderRow.height = 20;
      
      summarySheet.addRows([
        ['Total Units', totalAudits],
        ['Outstation Units', auditData.filter(a => a.city && a.city !== '').length],
        ['Perfect Visits', perfectVisits],
        ['Visits Done', visitsDone],
        ['VD Strike Rate', `${vdStrikeRate}%`],
        ['Action Plan', auditsWithActions],
        ['AP Strike Rate', `${apStrikeRate}%`],
        ['Scheduled Audits', scheduledAuditsCount],
        ['Schedule Adherence (On-Time)', onTimeAudits],
        ['Schedule Adherence %', `${scheduleAdherence}%`],
        ['AP Adherence', completedActions],
        ['AP Adherence %', `${apAdherence}%`]
      ]);
      
      // Highlight key metrics
      const vdStrikeRow = summarySheet.getRow(6);
      vdStrikeRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
      
      const scheduleAdherenceRow = summarySheet.getRow(11);
      scheduleAdherenceRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      
      const apAdherenceRow = summarySheet.getRow(12);
      apAdherenceRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    });
  });
};

module.exports = {
  createEnhancedDashboardReport,
  formatDateForExcel,
  calculateDeviation
};

