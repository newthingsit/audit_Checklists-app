/**
 * Create SOS (Speed of Service) Checklist Template
 * This script creates the SOS checklist template in the database
 */

const db = require('../config/database-loader');
const logger = require('../utils/logger');

const sosTemplate = {
  name: 'SOS Checklist',
  category: 'Speed of Service',
  description: 'Speed of Service audit checklist for measuring service delivery times'
};

const sosItems = [
  // Order Taking Speed
  { title: 'Order Taking Time', description: 'Time taken to take customer order', category: 'Speed', required: true, input_type: 'time_based', order_index: 1 },
  { title: 'Order Confirmation', description: 'Order confirmation provided to customer', category: 'Speed', required: true, input_type: 'option_select', order_index: 2 },
  
  // Food Preparation Speed
  { title: 'Food Preparation Time', description: 'Time from order to food ready', category: 'Speed', required: true, input_type: 'time_based', order_index: 3 },
  { title: 'Beverage Preparation Time', description: 'Time to prepare beverages', category: 'Speed', required: true, input_type: 'time_based', order_index: 4 },
  
  // Service Delivery
  { title: 'Order Delivery Time', description: 'Time from ready to served to customer', category: 'Speed', required: true, input_type: 'time_based', order_index: 5 },
  { title: 'Payment Processing Time', description: 'Time taken for payment processing', category: 'Speed', required: true, input_type: 'time_based', order_index: 6 },
  
  // Quality Checks
  { title: 'Order Accuracy', description: 'Order delivered matches customer order', category: 'Quality', required: true, input_type: 'option_select', order_index: 7 },
  { title: 'Food Temperature', description: 'Food served at correct temperature', category: 'Quality', required: true, input_type: 'option_select', order_index: 8 },
  { title: 'Presentation Quality', description: 'Food presentation meets standards', category: 'Quality', required: true, input_type: 'option_select', order_index: 9 },
  
  // Cleanliness & Hygiene
  { title: 'Service Area Cleanliness', description: 'Service area is clean and organized', category: 'Cleanliness & Hygiene', required: true, input_type: 'option_select', order_index: 10 },
  { title: 'Staff Hygiene', description: 'Staff follow proper hygiene practices', category: 'Cleanliness & Hygiene', required: true, input_type: 'option_select', order_index: 11 },
  { title: 'Equipment Cleanliness', description: 'Service equipment is clean', category: 'Cleanliness & Hygiene', required: true, input_type: 'option_select', order_index: 12 },
  
  // Processes
  { title: 'Order Flow Process', description: 'Order flow process is followed correctly', category: 'Processes', required: true, input_type: 'option_select', order_index: 13 },
  { title: 'Communication Process', description: 'Staff communication is clear and effective', category: 'Processes', required: true, input_type: 'option_select', order_index: 14 },
  { title: 'Queue Management', description: 'Queue is managed efficiently', category: 'Processes', required: true, input_type: 'option_select', order_index: 15 },
  
  // HK (Housekeeping)
  { title: 'Dining Area Maintenance', description: 'Dining area is well maintained', category: 'HK', required: true, input_type: 'option_select', order_index: 16 },
  { title: 'Table Setup', description: 'Tables are properly set up', category: 'HK', required: true, input_type: 'option_select', order_index: 17 },
  { title: 'Waste Management', description: 'Waste is managed properly', category: 'HK', required: true, input_type: 'option_select', order_index: 18 }
];

const defaultOptions = [
  { option_text: 'Yes', mark: '3' },
  { option_text: 'No', mark: '0' },
  { option_text: 'NA', mark: 'NA' }
];

function createSOSChecklist() {
  return new Promise((resolve, reject) => {
    const dbInstance = db.getDb();
    
    logger.info('[SOS Checklist] Creating SOS checklist template...');
    
    // Check if template already exists
    dbInstance.get(
      `SELECT id FROM checklist_templates WHERE name = ?`,
      [sosTemplate.name],
      (err, existing) => {
        if (err) {
          logger.error('Error checking existing SOS template:', err);
          return reject(err);
        }
        
        if (existing) {
          logger.info(`[SOS Checklist] Template "${sosTemplate.name}" already exists with ID ${existing.id}`);
          return resolve(existing.id);
        }
        
        // Create template
        dbInstance.run(
          `INSERT INTO checklist_templates (name, category, description)
           VALUES (?, ?, ?)`,
          [sosTemplate.name, sosTemplate.category, sosTemplate.description],
          function(insertErr, result) {
            if (insertErr) {
              logger.error('Error creating SOS template:', insertErr);
              return reject(insertErr);
            }
            
            // Handle both SQL Server (result.lastID) and SQLite (this.lastID)
            const templateId = (result && result.lastID !== undefined) ? result.lastID : (this.lastID || 0);
            
            if (!templateId || templateId === 0) {
              logger.error('[SOS Checklist] Failed to get template ID after insert');
              return reject(new Error('Failed to create template - no ID returned'));
            }
            
            logger.info(`[SOS Checklist] Created template with ID ${templateId}`);
            
            // Insert items
            let itemsProcessed = 0;
            const errors = [];
            
            sosItems.forEach((item, index) => {
              dbInstance.run(
                `INSERT INTO checklist_items (template_id, title, description, category, required, order_index, input_type, max_score)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [templateId, item.title, item.description, item.category, item.required ? 1 : 0, item.order_index, item.input_type || 'option_select', 3],
                function(itemErr, itemResult) {
                  if (itemErr) {
                    logger.error(`Error creating item "${item.title}":`, itemErr);
                    errors.push({ item: item.title, error: itemErr.message });
                  } else {
                    // Handle both SQL Server (itemResult.lastID) and SQLite (this.lastID)
                    const itemId = (itemResult && itemResult.lastID !== undefined) ? itemResult.lastID : (this.lastID || 0);
                    
                    if (itemId && itemId !== 0) {
                      // Add options for option_select items
                      if (item.input_type === 'option_select' || !item.input_type) {
                        defaultOptions.forEach((option, optIndex) => {
                          dbInstance.run(
                            `INSERT INTO checklist_item_options (item_id, option_text, mark, order_index)
                             VALUES (?, ?, ?, ?)`,
                            [itemId, option.option_text, option.mark, optIndex],
                            (optErr) => {
                              if (optErr) {
                                logger.error(`Error creating option for "${item.title}":`, optErr);
                              }
                            }
                          );
                        });
                      }
                    } else {
                      logger.error(`[SOS Checklist] Failed to get item ID for "${item.title}"`);
                      errors.push({ item: item.title, error: 'Failed to get item ID after insert' });
                    }
                  }
                  
                  itemsProcessed++;
                  if (itemsProcessed === sosItems.length) {
                    if (errors.length > 0) {
                      logger.warn(`[SOS Checklist] Created with ${errors.length} errors`);
                    } else {
                      logger.info(`[SOS Checklist] Successfully created template with ${sosItems.length} items`);
                    }
                    resolve(templateId);
                  }
                }
              );
            });
          }
        );
      }
    );
  });
}

// Run if called directly
if (require.main === module) {
  createSOSChecklist()
    .then((templateId) => {
      logger.info(`[SOS Checklist] Template created successfully with ID ${templateId}`);
      process.exit(0);
    })
    .catch((err) => {
      logger.error('[SOS Checklist] Failed to create template:', err);
      process.exit(1);
    });
}

module.exports = { createSOSChecklist };
