const db = require('../config/database-loader');

/**
 * Script to create Food Safety Audit - CDR template
 * Scoring: Yes = score value, No = 0, N/A = excluded from total
 */

const personalHygieneItems = [
  {
    title: "Designated hand wash sink with all necessary amenities available at back entrance (Soft care Plus, Des E Spray, Tissue paper/ air dryer available)",
    category: "Personal Hygiene",
    criteria: "Critical",
    score: 3,
    order_index: 1
  },
  {
    title: "No open cuts and wounds",
    category: "Personal Hygiene",
    criteria: "Major",
    score: 2,
    order_index: 2
  },
  {
    title: "Hands are washed hourly and sanitized.",
    category: "Personal Hygiene",
    criteria: "Major",
    score: 2,
    order_index: 3
  },
  {
    title: "Personal Hygiene of staff maintained/personal hygiene checklist maintained",
    category: "Personal Hygiene",
    criteria: "Minor",
    score: 1,
    order_index: 4
  },
  {
    title: "People are cleanly shaven and nails are short & clean. Beard Mask worn by staff with beard",
    category: "Personal Hygiene",
    criteria: "Minor",
    score: 1,
    order_index: 5
  },
  {
    title: "No eating, drinking, chewing tobacco and smoking in the production / restaurant area.",
    category: "Personal Hygiene",
    criteria: "Minor",
    score: 1,
    order_index: 6
  },
  {
    title: "No wrist band, rings, necklace, watches or jewelery worn in production/restaurant area",
    category: "Personal Hygiene",
    criteria: "Minor",
    score: 1,
    order_index: 7
  },
  {
    title: "Uniform (with apron if applicable) of the staff is clean, not torn .",
    category: "Personal Hygiene",
    criteria: "Minor",
    score: 1,
    order_index: 8
  },
  {
    title: "Staff not touching mouth, nose, eyes, hairs in the production area",
    category: "Personal Hygiene",
    criteria: "Minor",
    score: 1,
    order_index: 9
  },
  {
    title: "Lockers & changing area are recommended for staff (As Applicable)",
    category: "Personal Hygiene",
    criteria: "Minor",
    score: 1,
    order_index: 10
  },
  {
    title: "Staff washing and sanitizing hands while entering, after clearance, handling money, coughing, sneezing etc.",
    category: "Personal Hygiene",
    criteria: "Minor",
    score: 1,
    order_index: 11
  },
  {
    title: "Staff wearing proper hairnets in the production area",
    category: "Personal Hygiene",
    criteria: "Minor",
    score: 1,
    order_index: 12
  }
];

async function createFoodSafetyTemplate() {
  try {
    await db.init();
    const dbInstance = db.getDb();

    console.log('Creating Food Safety Audit - CDR template...');

    // Create template
    dbInstance.run(
      'INSERT INTO checklist_templates (name, category, description, created_by) VALUES (?, ?, ?, ?)',
      [
        'Food Safety Audit - CDR',
        'Food Safety',
        'Food Safety Audit template with Personal Hygiene category. Scoring: Yes = score value, No = 0, N/A = excluded from total.',
        1 // Default admin user ID
      ],
      function(err, result) {
        if (err) {
          console.error('Error creating template:', err);
          process.exit(1);
        }

        // Handle both callback pattern (SQL Server) and this.lastID pattern (SQLite/MySQL/PostgreSQL)
        const templateId = result && result.lastID ? result.lastID : (this.lastID || null);
        if (!templateId) {
          console.error('Error: Could not get template ID');
          process.exit(1);
        }
        
        console.log(`Template created with ID: ${templateId}`);
        createItems(templateId);
      }
    );

    function createItems(templateId) {

        let itemsProcessed = 0;
        let totalOperations = 0;
        let completedOperations = 0;
        const totalItems = personalHygieneItems.length;
        const optionsPerItem = 3; // Yes, No, N/A
        totalOperations = totalItems * (1 + optionsPerItem); // 1 item + 3 options per item

        function checkCompletion() {
          if (completedOperations === totalOperations) {
            console.log(`\n✅ Template created successfully!`);
            console.log(`   Template ID: ${templateId}`);
            console.log(`   Template Name: Food Safety Audit - CDR`);
            console.log(`   Category: Food Safety`);
            console.log(`   Items Created: ${totalItems}`);
            console.log(`   Category: Personal Hygiene`);
            console.log(`\n📊 Scoring System:`);
            console.log(`   - Yes: Gets the score value (Critical=3, Major=2, Minor=1)`);
            console.log(`   - No: Gets 0 points`);
            console.log(`   - N/A: Excluded from total score calculation`);
            console.log(`\n🎯 Total Possible Score: ${personalHygieneItems.reduce((sum, item) => sum + item.score, 0)}`);
            console.log(`\n✨ Template is ready to use!`);
            
            db.close();
            process.exit(0);
          }
        }

        // Create checklist items with options
        personalHygieneItems.forEach((item, index) => {
          dbInstance.run(
            'INSERT INTO checklist_items (template_id, title, description, category, required, order_index) VALUES (?, ?, ?, ?, ?, ?)',
            [
              templateId,
              item.title,
              `Criteria: ${item.criteria} | Max Score: ${item.score}`,
              item.category,
              1, // required
              item.order_index
            ],
            function(itemErr, result) {
              if (itemErr) {
                console.error(`Error creating item ${index + 1}:`, itemErr);
                completedOperations++;
                checkCompletion();
                return;
              }

              // Handle both callback pattern (SQL Server) and this.lastID pattern (SQLite/MySQL/PostgreSQL)
              const itemId = (result && result.lastID) ? result.lastID : (this.lastID || null);
              if (!itemId) {
                console.error(`Error: Could not get item ID for item ${index + 1}`);
                completedOperations++;
                checkCompletion();
                return;
              }
              
              itemsProcessed++;
              completedOperations++;
              checkCompletion();

              // Create options: Yes, No, N/A
              // Yes = score value, No = 0, N/A = 'NA' (excluded from calculation)
              const options = [
                { text: 'Yes', mark: item.score.toString(), order: 1 },
                { text: 'No', mark: '0', order: 2 },
                { text: 'N/A', mark: 'NA', order: 3 }
              ];

              options.forEach((option) => {
                dbInstance.run(
                  'INSERT INTO checklist_item_options (item_id, option_text, mark, order_index) VALUES (?, ?, ?, ?)',
                  [itemId, option.text, option.mark, option.order],
                  function(optionErr) {
                    if (optionErr) {
                      console.error(`Error creating option for item ${itemId}:`, optionErr);
                    }
                    completedOperations++;
                    checkCompletion();
                  }
                );
              });
            }
          );
        });
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
createFoodSafetyTemplate();

