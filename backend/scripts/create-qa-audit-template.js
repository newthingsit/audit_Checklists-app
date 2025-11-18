const db = require('../config/database');

// QA Audit - CDR Plan Template
const qaAuditTemplate = {
  name: 'QA Audit - CDR Plan',
  category: 'Quality Assurance',
  description: 'Comprehensive QA Audit checklist for Customer Data Record (CDR) compliance and quality assurance',
  items: [
    // Customer Data Management
    { title: 'Customer Data Accuracy', description: 'Verify all customer records are accurate and up-to-date', category: 'Customer Data Management', required: true },
    { title: 'Data Privacy Compliance', description: 'Ensure compliance with data privacy regulations (GDPR, CCPA, etc.)', category: 'Customer Data Management', required: true },
    { title: 'Data Retention Policy', description: 'Verify data retention policies are being followed', category: 'Customer Data Management', required: true },
    { title: 'Data Backup and Recovery', description: 'Confirm regular backups and recovery procedures are in place', category: 'Customer Data Management', required: true },
    
    // Process Compliance
    { title: 'CDR Process Documentation', description: 'Verify all CDR processes are properly documented', category: 'Process Compliance', required: true },
    { title: 'Process Adherence', description: 'Check if team members are following documented processes', category: 'Process Compliance', required: true },
    { title: 'Process Improvement', description: 'Review and document any process improvements needed', category: 'Process Compliance', required: true },
    { title: 'Training and Certification', description: 'Verify team members have required training and certifications', category: 'Process Compliance', required: true },
    
    // Quality Standards
    { title: 'Quality Metrics Tracking', description: 'Verify quality metrics are being tracked and reported', category: 'Quality Standards', required: true },
    { title: 'Quality Threshold Compliance', description: 'Check if quality thresholds are being met', category: 'Quality Standards', required: true },
    { title: 'Quality Review Process', description: 'Verify quality review process is being followed', category: 'Quality Standards', required: true },
    { title: 'Corrective Action Implementation', description: 'Check if corrective actions from previous audits are implemented', category: 'Quality Standards', required: true },
    
    // System and Tools
    { title: 'System Access Controls', description: 'Verify proper access controls are in place', category: 'System and Tools', required: true },
    { title: 'System Performance', description: 'Check system performance and response times', category: 'System and Tools', required: true },
    { title: 'Tool Configuration', description: 'Verify all tools are properly configured', category: 'System and Tools', required: true },
    { title: 'System Security', description: 'Review system security measures and vulnerabilities', category: 'System and Tools', required: true },
    
    // Documentation and Reporting
    { title: 'Documentation Completeness', description: 'Verify all required documentation is complete', category: 'Documentation and Reporting', required: true },
    { title: 'Report Accuracy', description: 'Check accuracy of reports and metrics', category: 'Documentation and Reporting', required: true },
    { title: 'Report Timeliness', description: 'Verify reports are generated and delivered on time', category: 'Documentation and Reporting', required: true },
    { title: 'Audit Trail', description: 'Confirm proper audit trail is maintained', category: 'Documentation and Reporting', required: true },
    
    // Risk Management
    { title: 'Risk Assessment', description: 'Review risk assessment documentation', category: 'Risk Management', required: true },
    { title: 'Risk Mitigation', description: 'Verify risk mitigation measures are in place', category: 'Risk Management', required: true },
    { title: 'Incident Management', description: 'Check incident management procedures', category: 'Risk Management', required: true },
    { title: 'Business Continuity', description: 'Verify business continuity plans are updated', category: 'Risk Management', required: true }
  ]
};

db.init().then(() => {
  const dbInstance = db.getDb();
  
  // Check if template already exists
  dbInstance.get(
    'SELECT id FROM checklist_templates WHERE name = ?',
    [qaAuditTemplate.name],
    (err, existing) => {
      if (err) {
        console.error('Error checking template:', err);
        process.exit(1);
      }
      
      if (existing) {
        console.log(`Template "${qaAuditTemplate.name}" already exists with ID ${existing.id}`);
        process.exit(0);
      }
      
      // Create template
      dbInstance.run(
        'INSERT INTO checklist_templates (name, category, description) VALUES (?, ?, ?)',
        [qaAuditTemplate.name, qaAuditTemplate.category, qaAuditTemplate.description],
        function(err) {
          if (err) {
            console.error('Error creating template:', err);
            process.exit(1);
          }
          
          const templateId = this.lastID;
          console.log(`Created template "${qaAuditTemplate.name}" with ID ${templateId}`);
          
          // Insert items
          const stmt = dbInstance.prepare(
            'INSERT INTO checklist_items (template_id, title, description, category, required, order_index) VALUES (?, ?, ?, ?, ?, ?)'
          );
          
          qaAuditTemplate.items.forEach((item, index) => {
            stmt.run([
              templateId,
              item.title,
              item.description,
              item.category,
              item.required ? 1 : 0,
              index
            ]);
          });
          
          stmt.finalize((err) => {
            if (err) {
              console.error('Error creating items:', err);
              process.exit(1);
            }
            console.log(`Created ${qaAuditTemplate.items.length} checklist items`);
            console.log('QA Audit - CDR Plan template created successfully!');
            process.exit(0);
          });
        }
      );
    }
  );
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

