import React, { forwardRef } from 'react';

// Styles optimized for PDF/Print
const styles = {
  container: {
    backgroundColor: '#ffffff',
    padding: '20px',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    color: '#1a202c',
    maxWidth: '210mm', // A4 width
  },
  header: {
    backgroundColor: '#1a365d',
    color: '#ffffff',
    padding: '16px 20px',
    marginBottom: '20px',
    borderRadius: '4px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  headerCompany: {
    fontSize: '14px',
    textAlign: 'right',
    margin: 0,
  },
  scoreSection: {
    textAlign: 'center',
    padding: '20px 0',
  },
  scoreValue: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#2b6cb0',
    margin: 0,
  },
  scoreSubtext: {
    fontSize: '14px',
    color: '#718096',
    margin: '4px 0 0 0',
  },
  section: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    marginBottom: '16px',
    padding: '16px',
    pageBreakInside: 'avoid',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#2b6cb0',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid #2b6cb0',
  },
  categoryHeader: {
    backgroundColor: '#2b6cb0',
    color: '#ffffff',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginTop: '16px',
    marginBottom: '8px',
    borderRadius: '4px',
  },
  subsectionHeader: {
    backgroundColor: '#e2e8f0',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#2b6cb0',
    marginBottom: '8px',
    borderRadius: '2px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  detailItem: {
    padding: '8px',
    backgroundColor: '#f7fafc',
    borderRadius: '4px',
  },
  detailLabel: {
    fontSize: '10px',
    color: '#718096',
    textTransform: 'uppercase',
    marginBottom: '2px',
  },
  detailValue: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#1a202c',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
  },
  tableHeader: {
    backgroundColor: '#e2e8f0',
  },
  th: {
    padding: '8px 6px',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: '10px',
    borderBottom: '1px solid #cbd5e0',
    color: '#1a202c',
  },
  td: {
    padding: '6px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '10px',
    verticalAlign: 'top',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  badgeCritical: {
    backgroundColor: '#e53e3e',
  },
  badgeMajor: {
    backgroundColor: '#d69e2e',
  },
  badgeMinor: {
    backgroundColor: '#38a169',
  },
  badgeOpen: {
    backgroundColor: '#3182ce',
  },
  badgeClosed: {
    backgroundColor: '#38a169',
  },
  photo: {
    maxWidth: '60px',
    maxHeight: '60px',
    borderRadius: '4px',
    objectFit: 'cover',
  },
  signature: {
    maxWidth: '150px',
    maxHeight: '50px',
  },
  footer: {
    marginTop: '20px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#718096',
  },
  remarksRed: {
    color: '#c53030',
    fontSize: '10px',
  },
  responseYes: {
    color: '#38a169',
    fontWeight: 'bold',
  },
  responseNo: {
    color: '#e53e3e',
    fontWeight: 'bold',
  },
  pageBreak: {
    pageBreakBefore: 'always',
  },
};

const normalizePhotoUrl = (raw) => {
  if (!raw) return '';
  const value = String(raw);
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('data:')) return value;
  const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || '';
  if (value.includes('://')) return value;
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const formatScore = (actual, perfect) => {
  const actualNum = Number(actual);
  const perfectNum = Number(perfect);
  if (!Number.isFinite(actualNum) || !Number.isFinite(perfectNum)) {
    return `${actual ?? '—'}/${perfect ?? '—'}`;
  }
  return `${Math.round(actualNum)}/${Math.round(perfectNum)}`;
};

const formatDisplayDate = (value, includeTime = true) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (includeTime) {
    return date.toLocaleString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return date.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric'
  });
};

const getResponseText = (item) => {
  if (item.selected_option_text) return item.selected_option_text;
  if (String(item.mark || '').toUpperCase() === 'NA') return 'NA';
  return parseFloat(item.mark) > 0 ? 'Yes' : 'No';
};

const getResponseStyle = (item) => {
  const response = getResponseText(item);
  if (response === 'Yes') return styles.responseYes;
  if (response === 'No') return styles.responseNo;
  return {};
};

const PrintableReport = forwardRef(({ report }, ref) => {
  if (!report) return null;

  const { audit, summary, scoreByCategory, detailedCategories, speedOfService, temperatureTracking, acknowledgement, actionPlan } = report;

  return (
    <div ref={ref} style={styles.container} id="printable-report">
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={styles.headerTitle}>{audit.templateName} - Report</p>
          <p style={styles.headerCompany}>Lite Bite Foods</p>
        </div>
      </div>

      {/* Overall Score */}
      <div style={styles.scoreSection}>
        <p style={styles.scoreValue}>{summary.overallPercentage}%</p>
        <p style={styles.scoreSubtext}>({Math.round(summary.totalActual)}/{Math.round(summary.totalPerfect)})</p>
      </div>

      {/* Details Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Details</div>
        <div style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>Outlet Name</div>
            <div style={styles.detailValue}>{audit.outletName || '—'}</div>
          </div>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>Start Date</div>
            <div style={styles.detailValue}>{formatDisplayDate(audit.startDate)}</div>
          </div>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>End Date</div>
            <div style={styles.detailValue}>{formatDisplayDate(audit.endDate)}</div>
          </div>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>Submitted By</div>
            <div style={styles.detailValue}>{audit.submittedBy || '—'}</div>
          </div>
        </div>
      </div>

      {/* Score By Category */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Score By Category</div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Category</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Perfect Score</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Actual Score</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {(scoreByCategory || []).map((row, idx) => (
              <tr key={row.name} style={{ backgroundColor: idx % 2 === 0 ? '#f7fafc' : '#ffffff' }}>
                <td style={styles.td}>{row.name}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{Math.round(row.perfectScore)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{Math.round(row.actualScore)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{row.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Categories */}
      {(detailedCategories || []).map((category, catIdx) => (
        <div key={category.name} style={{ ...styles.section, ...(catIdx > 0 ? styles.pageBreak : {}) }}>
          <div style={styles.categoryHeader}>
            {category.name.toUpperCase()} - {category.percentage}% ({formatScore(category.actualScore, category.perfectScore)})
          </div>
          
          {(category.subsections || []).map((section) => (
            <div key={`${category.name}-${section.name}`} style={{ marginBottom: '12px' }}>
              {section.name !== 'General' && (
                <div style={styles.subsectionHeader}>
                  {section.name} ({formatScore(section.actualScore, section.perfectScore)})
                </div>
              )}
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{ ...styles.th, width: '30px', textAlign: 'center' }}>#</th>
                    <th style={styles.th}>Question</th>
                    <th style={{ ...styles.th, width: '50px', textAlign: 'center' }}>Score</th>
                    <th style={{ ...styles.th, width: '60px', textAlign: 'center' }}>Response</th>
                    <th style={{ ...styles.th, width: '100px' }}>Remarks</th>
                    <th style={{ ...styles.th, width: '70px', textAlign: 'center' }}>Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {(section.items || []).map((item, index) => (
                    <tr key={item.audit_item_id || `${item.item_id}-${index}`}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{index + 1}</td>
                      <td style={styles.td}>{item.title}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{formatScore(item.mark || 0, item.maxScore || 0)}</td>
                      <td style={{ ...styles.td, textAlign: 'center', ...getResponseStyle(item) }}>
                        {getResponseText(item)}
                      </td>
                      <td style={{ ...styles.td, ...styles.remarksRed }}>
                        {item.comment || '—'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {item.photo_url ? (
                          <img
                            src={normalizePhotoUrl(item.photo_url)}
                            alt="Audit"
                            style={styles.photo}
                            crossOrigin="anonymous"
                          />
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}

      {/* Speed of Service */}
      {speedOfService && speedOfService.length > 0 && (
        <div style={styles.section}>
          <div style={styles.categoryHeader}>SPEED OF SERVICE - TRACKING</div>
          {speedOfService.map((group) => (
            <div key={group.name} style={{ marginBottom: '12px' }}>
              <div style={styles.subsectionHeader}>{group.name}</div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{ ...styles.th, width: '30px', textAlign: 'center' }}>#</th>
                    <th style={styles.th}>Checkpoint</th>
                    <th style={{ ...styles.th, width: '100px', textAlign: 'center' }}>Time</th>
                    <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Seconds</th>
                  </tr>
                </thead>
                <tbody>
                  {(group.entries || []).map((entry, index) => (
                    <tr key={`${group.name}-${index}`}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{index + 1}</td>
                      <td style={styles.td}>{entry.checkpoint}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{entry.time_value || '—'}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{entry.seconds ?? '—'}</td>
                    </tr>
                  ))}
                  {Number.isFinite(group.averageSeconds) && (
                    <tr style={{ backgroundColor: '#f7fafc', fontWeight: 'bold' }}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>AVG</td>
                      <td style={styles.td}>Average</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>—</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{group.averageSeconds}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Temperature Tracking */}
      {temperatureTracking && temperatureTracking.length > 0 && (
        <div style={styles.section}>
          <div style={styles.categoryHeader}>TEMPERATURE TRACKING</div>
          {temperatureTracking.map((group) => (
            <div key={group.name} style={{ marginBottom: '12px' }}>
              <div style={styles.subsectionHeader}>{group.name}</div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{ ...styles.th, width: '30px', textAlign: 'center' }}>#</th>
                    <th style={styles.th}>Item</th>
                    <th style={{ ...styles.th, width: '100px', textAlign: 'center' }}>Type</th>
                    <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Temperature</th>
                  </tr>
                </thead>
                <tbody>
                  {(group.entries || []).map((entry, index) => (
                    <tr key={`${group.name}-${index}`}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{index + 1}</td>
                      <td style={styles.td}>{entry.label}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{entry.type || '—'}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{entry.temperature ?? entry.raw ?? '—'}</td>
                    </tr>
                  ))}
                  {Number.isFinite(group.averageTemp) && (
                    <tr style={{ backgroundColor: '#f7fafc', fontWeight: 'bold' }}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>AVG</td>
                      <td style={styles.td}>Average</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>—</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{group.averageTemp}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Acknowledgement */}
      {(acknowledgement?.managerName || acknowledgement?.signatureData) && (
        <div style={styles.section}>
          <div style={styles.categoryHeader}>ACKNOWLEDGEMENT</div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={{ ...styles.th, width: '30px', textAlign: 'center' }}>#</th>
                <th style={styles.th}>Question</th>
                <th style={{ ...styles.th, width: '150px', textAlign: 'center' }}>Response</th>
              </tr>
            </thead>
            <tbody>
              {acknowledgement.managerName && (
                <tr>
                  <td style={{ ...styles.td, textAlign: 'center' }}>1</td>
                  <td style={styles.td}>Manager on Duty</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{acknowledgement.managerName}</td>
                </tr>
              )}
              {acknowledgement.signatureData && (
                <tr>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{acknowledgement.managerName ? 2 : 1}</td>
                  <td style={styles.td}>Signature</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <img
                      src={acknowledgement.signatureData}
                      alt="Signature"
                      style={styles.signature}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Plan */}
      {actionPlan && actionPlan.length > 0 && (
        <div style={styles.section}>
          <div style={styles.categoryHeader}>ACTION PLAN - TOP 3 DEVIATIONS</div>
          <p style={{ fontSize: '10px', color: '#718096', marginBottom: '8px' }}>
            Corrective actions assigned to address the top identified deviations.
          </p>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={{ ...styles.th, width: '25px', textAlign: 'center' }}>#</th>
                <th style={{ ...styles.th, width: '70px' }}>Category</th>
                <th style={styles.th}>Deviation</th>
                <th style={{ ...styles.th, width: '55px', textAlign: 'center' }}>Severity</th>
                <th style={styles.th}>Corrective Action</th>
                <th style={{ ...styles.th, width: '60px', textAlign: 'center' }}>Owner</th>
                <th style={{ ...styles.th, width: '70px', textAlign: 'center' }}>Target</th>
                <th style={{ ...styles.th, width: '50px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {actionPlan.slice(0, 3).map((action, index) => (
                <tr key={`${action.question}-${index}`}>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{index + 1}</td>
                  <td style={styles.td}>{action.category || 'Quality'}</td>
                  <td style={styles.td}>{action.question}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={{
                      ...styles.badge,
                      ...(action.severity === 'CRITICAL' ? styles.badgeCritical : 
                          action.severity === 'MINOR' ? styles.badgeMinor : styles.badgeMajor)
                    }}>
                      {action.severity || 'MAJOR'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {action.correctiveAction || action.todo || action.remarks || 'Address the audit deviation noted for this item.'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{action.assignedTo || 'Auditor'}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{formatDisplayDate(action.dueDate, false)}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={{
                      ...styles.badge,
                      ...(action.status === 'Closed' ? styles.badgeClosed : styles.badgeOpen)
                    }}>
                      {action.status || 'Open'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <span>Generated: {new Date().toLocaleString()}</span>
        <span>Powered by LBF Audit App</span>
      </div>
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';

export default PrintableReport;
