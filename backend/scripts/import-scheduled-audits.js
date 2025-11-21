/**
 * Bulk Import Scheduled Audits from CSV/Excel Data
 * 
 * Usage:
 * node scripts/import-scheduled-audits.js <csv-file-path>
 * 
 * CSV Format (with headers):
 * Employee,Name,Checklist,Store,Store Name,Start Date,Status
 * 
 * Example:
 * LB19800,Muraree Choudhary,CA - CDR Plan,5438,PG Lullu BLR,Nov 30, 2025,UPCOMING
 */

const db = require('../config/database-loader');
const fs = require('fs');
const path = require('path');

// Initialize database
db.init().then(() => {
  importScheduledAudits();
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

/**
 * Parse CSV data
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim());
  const expectedHeaders = ['Employee', 'Name', 'Checklist', 'Store', 'Store Name', 'Start Date', 'Status'];
  
  // Check if headers match (case-insensitive)
  const normalizedHeaders = headers.map(h => h.toLowerCase());
  const normalizedExpected = expectedHeaders.map(h => h.toLowerCase());
  
  if (!normalizedHeaders.every(h => normalizedExpected.includes(h))) {
    console.warn('Warning: CSV headers may not match expected format');
    console.log('Found headers:', headers);
    console.log('Expected headers:', expectedHeaders);
  }

  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < headers.length) continue; // Skip incomplete rows
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
}

/**
 * Convert date string to ISO format
 * Handles formats like "Nov 30, 2025", "30/11/2025", etc.
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try parsing as "Nov 30, 2025" format
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  // Try other formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/    // YYYY-MM-DD
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // Assume DD/MM/YYYY
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        return dateStr;
      }
    }
  }
  
  return null;
}

/**
 * Find user by employee ID or name
 */
function findUser(dbInstance, employeeId, name) {
  return new Promise((resolve, reject) => {
    // First try to find by employee ID if there's an employee_id column
    // Otherwise, try by name
    dbInstance.get(
      'SELECT id, name, email FROM users WHERE name = ? OR email LIKE ? LIMIT 1',
      [name, `%${employeeId}%`],
      (err, user) => {
        if (err) return reject(err);
        resolve(user);
      }
    );
  });
}

/**
 * Find template by name (case-insensitive partial match)
 */
function findTemplate(dbInstance, checklistName) {
  return new Promise((resolve, reject) => {
    // Try exact match first
    dbInstance.get(
      'SELECT id, name FROM checklist_templates WHERE name = ? LIMIT 1',
      [checklistName],
      (err, template) => {
        if (err) return reject(err);
        if (template) return resolve(template);
        
        // Try partial match
        dbInstance.get(
          'SELECT id, name FROM checklist_templates WHERE LOWER(name) LIKE ? LIMIT 1',
          [`%${checklistName.toLowerCase()}%`],
          (err, template) => {
            if (err) return reject(err);
            resolve(template);
          }
        );
      }
    );
  });
}

/**
 * Find or create location by store number and name
 */
function findOrCreateLocation(dbInstance, storeNumber, storeName, createdBy) {
  return new Promise((resolve, reject) => {
    // Try to find by store number or name
    dbInstance.get(
      'SELECT id, name FROM locations WHERE name = ? OR name LIKE ? LIMIT 1',
      [storeName, `%${storeNumber}%`],
      async (err, location) => {
        if (err) return reject(err);
        
        if (location) {
          return resolve(location);
        }
        
        // Create new location
        const locationName = storeName || `Store ${storeNumber}`;
        dbInstance.run(
          'INSERT INTO locations (name, address, created_by) VALUES (?, ?, ?)',
          [locationName, `Store ${storeNumber}`, createdBy],
          function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, name: locationName });
          }
        );
      }
    );
  });
}

/**
 * Create scheduled audit
 */
function createScheduledAudit(dbInstance, templateId, locationId, assignedTo, scheduledDate, createdBy) {
  return new Promise((resolve, reject) => {
    dbInstance.run(
      `INSERT INTO scheduled_audits (template_id, location_id, assigned_to, scheduled_date, frequency, next_run_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [templateId, locationId, assignedTo, scheduledDate, 'once', scheduledDate, 'pending', createdBy],
      function(err, result) {
        if (err) return reject(err);
        const scheduleId = (result && result.lastID) ? result.lastID : (this.lastID || 0);
        resolve(scheduleId);
      }
    );
  });
}

/**
 * Main import function
 */
async function importScheduledAudits() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('Usage: node scripts/import-scheduled-audits.js <csv-file-path>');
    console.error('Example: node scripts/import-scheduled-audits.js scheduled-audits.csv');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: File not found: ${csvFilePath}`);
    process.exit(1);
  }

  const dbInstance = db.getDb();
  const createdBy = 1; // Default admin user ID - adjust as needed

  try {
    console.log(`Reading CSV file: ${csvFilePath}`);
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    console.log('Parsing CSV data...');
    const rows = parseCSV(csvContent);
    console.log(`Found ${rows.length} rows to import`);

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const employeeId = row['Employee'] || row['employee'] || '';
      const name = row['Name'] || row['name'] || '';
      const checklist = row['Checklist'] || row['checklist'] || '';
      const store = row['Store'] || row['store'] || '';
      const storeName = row['Store Name'] || row['store name'] || row['StoreName'] || '';
      const startDate = row['Start Date'] || row['start date'] || row['StartDate'] || '';
      const status = row['Status'] || row['status'] || 'UPCOMING';

      try {
        // Skip if required fields are missing
        if (!name || !checklist || !startDate) {
          console.log(`Skipping row ${i + 1}: Missing required fields`);
          results.skipped++;
          continue;
        }

        // Parse date
        const scheduledDate = parseDate(startDate);
        if (!scheduledDate) {
          console.log(`Skipping row ${i + 1}: Invalid date format: ${startDate}`);
          results.skipped++;
          continue;
        }

        // Find user
        const user = await findUser(dbInstance, employeeId, name);
        if (!user) {
          console.log(`Skipping row ${i + 1}: User not found: ${name} (${employeeId})`);
          results.skipped++;
          results.errors.push(`Row ${i + 1}: User not found: ${name}`);
          continue;
        }

        // Find template
        const template = await findTemplate(dbInstance, checklist);
        if (!template) {
          console.log(`Skipping row ${i + 1}: Template not found: ${checklist}`);
          results.skipped++;
          results.errors.push(`Row ${i + 1}: Template not found: ${checklist}`);
          continue;
        }

        // Find or create location
        const location = await findOrCreateLocation(dbInstance, store, storeName, createdBy);

        // Create scheduled audit
        const scheduleId = await createScheduledAudit(
          dbInstance,
          template.id,
          location.id,
          user.id,
          scheduledDate,
          createdBy
        );

        console.log(`✓ Row ${i + 1}: Created scheduled audit #${scheduleId} for ${name} - ${checklist} at ${storeName}`);
        results.success++;
      } catch (error) {
        console.error(`✗ Row ${i + 1}: Error - ${error.message}`);
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Print summary
    console.log('\n=== Import Summary ===');
    console.log(`Total rows: ${rows.length}`);
    console.log(`Successfully imported: ${results.success}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Skipped: ${results.skipped}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error importing scheduled audits:', error);
    process.exit(1);
  }
}

