#!/usr/bin/env node
/**
 * Verify Speed of Service items are properly configured (time-based, not Yes/No/N/A)
 * 
 * Usage:
 *   node backend/scripts/verify-speed-of-service-items.js "CVR - CDR" "SERVICE (Speed of Service)"
 */

require('dotenv').config();
const dbLoader = require('../config/database-loader');

const TEMPLATE_NAME = process.argv[2] || 'CVR - CDR';
const CATEGORY = process.argv[3] || 'SERVICE (Speed of Service)';

async function main() {
  console.log('🔍 Verifying Speed of Service items...');
  console.log(`📋 Template: "${TEMPLATE_NAME}"`);
  console.log(`📂 Category: "${CATEGORY}"`);
  
  try {
    await dbLoader.init?.();
    const db = dbLoader.getDb();
    
    // Find template
    const template = await new Promise((resolve, reject) => {
      db.get('SELECT id, name FROM checklist_templates WHERE name = ?', [TEMPLATE_NAME], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    
    if (!template) {
      console.error(`❌ Template not found: "${TEMPLATE_NAME}"`);
      process.exit(1);
    }
    
    console.log(`✅ Found template: "${template.name}" (ID: ${template.id})`);
    const templateId = template.id;
    
    // Get all items in this category
    const itemsRaw = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM checklist_items 
         WHERE template_id = ? AND category = ?
         ORDER BY section, order_index`,
        [templateId, CATEGORY],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
    
    // Get options for each item
    const items = await Promise.all(itemsRaw.map(async (item) => {
      const options = await new Promise((resolve, reject) => {
        db.all(
          `SELECT option_text FROM checklist_item_options WHERE item_id = ? ORDER BY order_index`,
          [item.id],
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
          }
        );
      });
      
      return {
        ...item,
        option_count: options.length,
        options: options.map(o => o.option_text)
      };
    }));
    
    if (items.length === 0) {
      console.log(`\n⚠️  No items found in category "${CATEGORY}"`);
      console.log(`\n💡 Run this to create items:`);
      console.log(`   node backend/scripts/create-speed-of-service-items.js "${TEMPLATE_NAME}" "${CATEGORY}"`);
      process.exit(0);
    }
    
    console.log(`\n📊 Found ${items.length} items\n`);
    
    // Analyze items
    let correctItems = 0;
    let incorrectItems = 0;
    const issues = [];
    
    items.forEach(item => {
      const inputType = (item.input_type || '').toLowerCase();
      const title = item.title || '';
      const hasOptions = item.option_count > 0;
      const options = item.options ? item.options.split('|') : [];
      
      // Check if it's a Yes/No/N/A item (incorrect)
      const hasYesNoNA = options.some(opt => 
        opt && (opt.toLowerCase().includes('yes') || 
                opt.toLowerCase().includes('no') || 
                opt.toLowerCase().includes('n/a') ||
                opt.toLowerCase().includes('na'))
      );
      
      // Correct format: Time/Sec pairs with date or number input_type
      const isTimeItem = title.includes('(Time)') && inputType === 'date';
      const isSecItem = title.includes('(Sec)') && inputType === 'number';
      const isTableNo = title === 'Table no.' && inputType === 'number';
      const isCorrect = (isTimeItem || isSecItem || isTableNo) && !hasOptions;
      
      if (isCorrect) {
        correctItems++;
      } else {
        incorrectItems++;
        issues.push({
          id: item.id,
          title: item.title,
          input_type: item.input_type,
          section: item.section,
          hasOptions: hasOptions,
          hasYesNoNA: hasYesNoNA,
          options: options,
          issue: hasYesNoNA 
            ? 'Has Yes/No/N/A options (should be time-based)'
            : inputType === 'option_select'
            ? 'Uses option_select (should be date or number)'
            : !isTimeItem && !isSecItem && !isTableNo
            ? 'Not a Time/Sec pair or Table no.'
            : hasOptions
            ? 'Has options but should be time-based input'
            : 'Unknown issue'
        });
      }
    });
    
    // Print summary
    console.log('='.repeat(60));
    console.log('📋 VERIFICATION RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Correct items (time-based): ${correctItems}`);
    console.log(`❌ Incorrect items: ${incorrectItems}`);
    console.log(`📊 Total items: ${items.length}`);
    console.log('='.repeat(60));
    
    if (incorrectItems > 0) {
      console.log('\n❌ ISSUES FOUND:\n');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. Item ID: ${issue.id}`);
        console.log(`   Title: "${issue.title}"`);
        console.log(`   Section: ${issue.section || 'None'}`);
        console.log(`   Input Type: ${issue.input_type || 'None'}`);
        console.log(`   Issue: ${issue.issue}`);
        if (issue.hasYesNoNA) {
          console.log(`   Options: ${issue.options.join(', ')}`);
        }
        console.log('');
      });
      
      console.log('\n💡 TO FIX:');
      console.log(`   Run: node backend/scripts/create-speed-of-service-items.js "${TEMPLATE_NAME}" "${CATEGORY}"`);
      console.log(`   Or use API: POST /api/templates/admin/update-speed-of-service`);
      console.log(`   This will replace all incorrect items with proper time-based items.\n`);
    } else {
      console.log('\n✅ ALL ITEMS ARE CORRECTLY CONFIGURED!');
      console.log('   All Speed of Service items use time-based inputs (Time/Sec pairs)');
      console.log('   No Yes/No/N/A options found.\n');
    }
    
    // Group by section
    const bySection = {};
    items.forEach(item => {
      const section = item.section || 'No Section';
      if (!bySection[section]) {
        bySection[section] = { total: 0, correct: 0, incorrect: 0 };
      }
      bySection[section].total++;
      const isCorrect = !issues.find(i => i.id === item.id);
      if (isCorrect) {
        bySection[section].correct++;
      } else {
        bySection[section].incorrect++;
      }
    });
    
    console.log('📊 BY SECTION:');
    Object.entries(bySection).sort().forEach(([section, stats]) => {
      const status = stats.incorrect === 0 ? '✅' : '❌';
      console.log(`   ${status} ${section}: ${stats.correct}/${stats.total} correct`);
    });
    console.log('');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (dbLoader.close) {
      dbLoader.close();
    }
  }
}

main();
