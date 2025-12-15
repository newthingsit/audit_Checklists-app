const ExcelJS = require('exceljs');

/**
 * Create an Excel workbook with formatted data
 * @param {Array} sheets - Array of sheet configurations { name, headers, rows }
 * @returns {Promise<Buffer>} - Excel file buffer
 */
const createExcelWorkbook = async (sheets) => {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = 'Audit Checklist System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create each sheet
  for (const sheetConfig of sheets) {
    const worksheet = workbook.addWorksheet(sheetConfig.name || 'Sheet1');
    
    // Set column headers
    if (sheetConfig.headers && sheetConfig.headers.length > 0) {
      worksheet.columns = sheetConfig.headers.map(header => ({
        header: header.label || header,
        key: header.key || header,
        width: header.width || 15
      }));
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;
    }
    
    // Add data rows
    if (sheetConfig.rows && sheetConfig.rows.length > 0) {
      sheetConfig.rows.forEach((row, index) => {
        const worksheetRow = worksheet.addRow(row);
        
        // Alternate row colors for better readability
        if (index % 2 === 0) {
          worksheetRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        }
        
        // Center align numeric columns
        row.forEach((cell, cellIndex) => {
          if (typeof cell === 'number') {
            worksheetRow.getCell(cellIndex + 1).alignment = { horizontal: 'center' };
          }
        });
      });
    }
    
    // Auto-fit columns (with max width limit)
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength < 10 ? 10 : maxLength + 2, 50);
    });
    
    // Freeze header row
    worksheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Export audits to Excel format
 * @param {Array} audits - Array of audit objects
 * @returns {Promise<Buffer>} - Excel file buffer
 */
const exportAuditsToExcel = async (audits) => {
  const headers = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Restaurant Name', key: 'restaurant_name', width: 25 },
    { header: 'Store Number', key: 'store_number', width: 15 },
    { header: 'Location', key: 'location_name', width: 25 },
    { header: 'Template', key: 'template_name', width: 20 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Score (%)', key: 'score', width: 12 },
    { header: 'Audit By Name', key: 'user_name', width: 20 },
    { header: 'Audit By Email', key: 'user_email', width: 25 },
    { header: 'Created Date', key: 'created_at', width: 18 },
    { header: 'Scheduled Date', key: 'scheduled_date', width: 18 },
    { header: 'Completed Date', key: 'completed_at', width: 18 }
  ];
  
  const rows = audits.map(audit => [
    audit.id,
    audit.restaurant_name || '',
    audit.store_number || '',
    audit.location_name || '',
    audit.template_name || '',
    audit.category || '',
    audit.status || '',
    audit.score !== null ? audit.score : '',
    audit.user_name || '',
    audit.user_email || '',
    audit.created_at ? formatDateForExcel(audit.created_at) : '',
    audit.scheduled_date ? formatDateForExcel(audit.scheduled_date) : '',
    audit.completed_at ? formatDateForExcel(audit.completed_at) : ''
  ]);
  
  return await createExcelWorkbook([
    {
      name: 'Audits',
      headers,
      rows
    }
  ]);
};

/**
 * Export store analytics to Excel
 * @param {Array} storeAnalytics - Array of store analytics objects
 * @returns {Promise<Buffer>} - Excel file buffer
 */
const exportStoreAnalyticsToExcel = async (storeAnalytics) => {
  const headers = [
    { header: 'Store Number', key: 'store_number', width: 15 },
    { header: 'Store Name', key: 'store_name', width: 25 },
    { header: 'Brand Name', key: 'brand_name', width: 20 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'State', key: 'state', width: 15 },
    { header: 'Template', key: 'template', width: 20 },
    { header: 'Total Audits', key: 'total_audits', width: 15 },
    { header: 'Completed', key: 'completed_audits', width: 15 },
    { header: 'In Progress', key: 'in_progress_audits', width: 15 },
    { header: 'Average Score', key: 'average_score', width: 15 },
    { header: 'Completion Rate (%)', key: 'completion_rate', width: 18 },
    { header: 'Items Completion Rate (%)', key: 'items_completion_rate', width: 22 },
    { header: 'Scheduled Date', key: 'scheduled_date', width: 18 },
    { header: 'Completed Date', key: 'completed_date', width: 18 },
    { header: 'Deviation (days)', key: 'avg_deviation', width: 18 }
  ];
  
  const rows = storeAnalytics.map(store => [
    store.store_number || '',
    store.store_name || '',
    store.brand_name || '',
    store.city || '',
    store.state || '',
    store.template || '',
    store.total_audits || 0,
    store.completed_audits || 0,
    store.in_progress_audits || 0,
    store.average_score ? parseFloat(store.average_score).toFixed(2) : '',
    store.completion_rate || 0,
    store.items_completion_rate || 0,
    store.scheduled_date || '',
    store.completed_date || '',
    store.avg_deviation !== null && store.avg_deviation !== undefined ? parseFloat(store.avg_deviation).toFixed(2) : ''
  ]);
  
  return await createExcelWorkbook([
    {
      name: 'Store Analytics',
      headers,
      rows
    }
  ]);
};

/**
 * Export monthly scorecard to Excel
 * @param {Object} scorecardData - Monthly scorecard data
 * @returns {Promise<Buffer>} - Excel file buffer
 */
const exportMonthlyScorecardToExcel = async (scorecardData) => {
  const sheets = [];
  
  // Summary sheet
  if (scorecardData.summary) {
    sheets.push({
      name: 'Summary',
      headers: [
        { header: 'Metric', key: 'metric', width: 25 },
        { header: 'Value', key: 'value', width: 15 }
      ],
      rows: [
        ['Total Audits', scorecardData.summary.totalAudits || 0],
        ['Completed Audits', scorecardData.summary.completedAudits || 0],
        ['In Progress', scorecardData.summary.inProgressAudits || 0],
        ['Average Score', scorecardData.summary.avgScore ? `${scorecardData.summary.avgScore}%` : 'N/A'],
        ['Min Score', scorecardData.summary.minScore ? `${scorecardData.summary.minScore}%` : 'N/A'],
        ['Max Score', scorecardData.summary.maxScore ? `${scorecardData.summary.maxScore}%` : 'N/A'],
        ['Completion Rate', scorecardData.summary.completionRate ? `${scorecardData.summary.completionRate}%` : 'N/A']
      ]
    });
  }
  
  // By Template sheet
  if (scorecardData.byTemplate && scorecardData.byTemplate.length > 0) {
    sheets.push({
      name: 'By Template',
      headers: [
        { header: 'Template', key: 'template', width: 25 },
        { header: 'Total Audits', key: 'count', width: 15 },
        { header: 'Completed', key: 'completed', width: 15 },
        { header: 'Average Score', key: 'avgScore', width: 15 }
      ],
      rows: scorecardData.byTemplate.map(t => [
        t.template_name,
        t.count,
        t.completed,
        t.avgScore > 0 ? `${t.avgScore}%` : 'N/A'
      ])
    });
  }
  
  // By Location sheet
  if (scorecardData.byLocation && scorecardData.byLocation.length > 0) {
    sheets.push({
      name: 'By Location',
      headers: [
        { header: 'Location', key: 'location', width: 25 },
        { header: 'Total Audits', key: 'count', width: 15 },
        { header: 'Completed', key: 'completed', width: 15 },
        { header: 'Average Score', key: 'avgScore', width: 15 }
      ],
      rows: scorecardData.byLocation.map(l => [
        l.location_name,
        l.count,
        l.completed,
        l.avgScore > 0 ? `${l.avgScore}%` : 'N/A'
      ])
    });
  }
  
  // Daily Breakdown sheet
  if (scorecardData.dailyBreakdown && scorecardData.dailyBreakdown.length > 0) {
    sheets.push({
      name: 'Daily Breakdown',
      headers: [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Total Audits', key: 'count', width: 15 },
        { header: 'Completed', key: 'completed', width: 15 },
        { header: 'Average Score', key: 'avgScore', width: 15 }
      ],
      rows: scorecardData.dailyBreakdown.map(d => [
        d.date,
        d.count,
        d.completed,
        d.avgScore > 0 ? `${d.avgScore}%` : 'N/A'
      ])
    });
  }
  
  // Audits sheet
  if (scorecardData.audits && scorecardData.audits.length > 0) {
    sheets.push({
      name: 'Audit Details',
      headers: [
        { header: 'Restaurant', key: 'restaurant', width: 25 },
        { header: 'Store', key: 'store', width: 20 },
        { header: 'Template', key: 'template', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Score', key: 'score', width: 12 },
        { header: 'Date', key: 'date', width: 18 }
      ],
      rows: scorecardData.audits.map(a => [
        a.restaurant_name,
        a.location_name || 'N/A',
        a.template_name,
        a.status,
        a.score !== null ? `${a.score}%` : 'N/A',
        a.created_at ? formatDateForExcel(a.created_at) : ''
      ])
    });
  }
  
  return await createExcelWorkbook(sheets);
};

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
 * Export dashboard analytics to Excel
 * @param {Object} dashboardData - Dashboard analytics data
 * @returns {Promise<Buffer>} - Excel file buffer
 */
const exportDashboardReportToExcel = async (dashboardData) => {
  const sheets = [];
  
  // Summary Sheet
  if (dashboardData) {
    sheets.push({
      name: 'Summary',
      headers: [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ],
      rows: [
        ['Total Audits', dashboardData.total || 0],
        ['Completed Audits', dashboardData.completed || 0],
        ['In Progress Audits', dashboardData.inProgress || 0],
        ['Average Score', dashboardData.avgScore ? `${dashboardData.avgScore}%` : 'N/A'],
        ['Schedule Adherence', dashboardData.scheduleAdherence ? `${dashboardData.scheduleAdherence.adherence || 0}%` : 'N/A'],
        ['On-Time Completions', dashboardData.scheduleAdherence ? `${dashboardData.scheduleAdherence.onTime || 0} of ${dashboardData.scheduleAdherence.total || 0}` : 'N/A'],
        ['Current Month - Total', dashboardData.currentMonthStats?.total || 0],
        ['Current Month - Completed', dashboardData.currentMonthStats?.completed || 0],
        ['Current Month - Avg Score', dashboardData.currentMonthStats?.avgScore ? `${dashboardData.currentMonthStats.avgScore}%` : 'N/A'],
        ['Last Month - Total', dashboardData.lastMonthStats?.total || 0],
        ['Last Month - Completed', dashboardData.lastMonthStats?.completed || 0],
        ['Last Month - Avg Score', dashboardData.lastMonthStats?.avgScore ? `${dashboardData.lastMonthStats.avgScore}%` : 'N/A'],
        ['Month Change - Total', dashboardData.monthChange?.total || 0],
        ['Month Change - Completed', dashboardData.monthChange?.completed || 0],
        ['Month Change - Avg Score', dashboardData.monthChange?.avgScore ? `${dashboardData.monthChange.avgScore}%` : 'N/A']
      ]
    });
  }

  // Status Breakdown Sheet
  if (dashboardData?.byStatus && dashboardData.byStatus.length > 0) {
    sheets.push({
      name: 'Status Breakdown',
      headers: [
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Count', key: 'count', width: 15 },
        { header: 'Percentage', key: 'percentage', width: 15 }
      ],
      rows: dashboardData.byStatus.map(s => [
        s.status || 'N/A',
        s.count || 0,
        s.percentage ? `${s.percentage}%` : '0%'
      ])
    });
  }

  // Monthly Trends Sheet
  if (dashboardData?.byMonth && dashboardData.byMonth.length > 0) {
    sheets.push({
      name: 'Monthly Trends',
      headers: [
        { header: 'Month', key: 'month', width: 20 },
        { header: 'Total Audits', key: 'total', width: 15 },
        { header: 'Completed', key: 'completed', width: 15 },
        { header: 'Average Score', key: 'avgScore', width: 15 }
      ],
      rows: dashboardData.byMonth.map(m => [
        m.month || 'N/A',
        m.total || 0,
        m.completed || 0,
        m.avgScore ? `${m.avgScore}%` : 'N/A'
      ])
    });
  }

  // Top Stores Sheet
  if (dashboardData?.topStores && dashboardData.topStores.length > 0) {
    sheets.push({
      name: 'Top Stores',
      headers: [
        { header: 'Store Name', key: 'store_name', width: 25 },
        { header: 'Location', key: 'location', width: 25 },
        { header: 'Total Audits', key: 'total', width: 15 },
        { header: 'Completed', key: 'completed', width: 15 },
        { header: 'Average Score', key: 'avgScore', width: 15 }
      ],
      rows: dashboardData.topStores.map(store => [
        store.store_name || 'N/A',
        store.location || 'N/A',
        store.total || 0,
        store.completed || 0,
        store.avgScore ? `${store.avgScore}%` : 'N/A'
      ])
    });
  }

  // Top Users/Auditors Sheet
  if (dashboardData?.topUsers && dashboardData.topUsers.length > 0) {
    sheets.push({
      name: 'Top Auditors',
      headers: [
        { header: 'Auditor Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Total Audits', key: 'total', width: 15 },
        { header: 'Completed', key: 'completed', width: 15 },
        { header: 'Average Score', key: 'avgScore', width: 15 }
      ],
      rows: dashboardData.topUsers.map(user => [
        user.name || 'N/A',
        user.email || 'N/A',
        user.total || 0,
        user.completed || 0,
        user.avgScore ? `${user.avgScore}%` : 'N/A'
      ])
    });
  }

  // Recent Audits Sheet
  if (dashboardData?.recent && dashboardData.recent.length > 0) {
    sheets.push({
      name: 'Recent Audits',
      headers: [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Restaurant', key: 'restaurant', width: 25 },
        { header: 'Store Number', key: 'store_number', width: 15 },
        { header: 'Location', key: 'location', width: 25 },
        { header: 'Template', key: 'template', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Score', key: 'score', width: 12 },
        { header: 'Auditor', key: 'auditor', width: 20 },
        { header: 'Created Date', key: 'created_at', width: 18 },
        { header: 'Completed Date', key: 'completed_at', width: 18 }
      ],
      rows: dashboardData.recent.map(audit => [
        audit.id || '',
        audit.restaurant_name || 'N/A',
        audit.store_number || 'N/A',
        audit.location_name || 'N/A',
        audit.template_name || 'N/A',
        audit.status || 'N/A',
        audit.score !== null ? `${audit.score}%` : 'N/A',
        audit.user_name || 'N/A',
        audit.created_at ? formatDateForExcel(audit.created_at) : 'N/A',
        audit.completed_at ? formatDateForExcel(audit.completed_at) : 'N/A'
      ])
    });
  }

  // Schedule Adherence Details Sheet
  if (dashboardData?.scheduleAdherence) {
    sheets.push({
      name: 'Schedule Adherence',
      headers: [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ],
      rows: [
        ['Total Scheduled Audits', dashboardData.scheduleAdherence.total || 0],
        ['Completed On Time', dashboardData.scheduleAdherence.onTime || 0],
        ['Adherence Percentage', `${dashboardData.scheduleAdherence.adherence || 0}%`],
        ['Not Completed On Time', (dashboardData.scheduleAdherence.total || 0) - (dashboardData.scheduleAdherence.onTime || 0)]
      ]
    });
  }

  return await createExcelWorkbook(sheets);
};

module.exports = {
  createExcelWorkbook,
  exportAuditsToExcel,
  exportStoreAnalyticsToExcel,
  exportMonthlyScorecardToExcel,
  exportDashboardReportToExcel
};

