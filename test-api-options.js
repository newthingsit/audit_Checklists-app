const axios = require('axios');

async function testTemplateAPI() {
  try {
    const response = await axios.get('http://localhost:5000/api/checklists/44');
    const items = response.data.items || [];
    
    console.log(`\nTemplate ID: 44`);
    console.log(`Total items: ${items.length}`);
    console.log('\n--- Item Details ---');
    
    items.forEach((item, index) => {
      console.log(`\nItem ${index + 1}:`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Title: ${item.title}`);
      console.log(`  Input Type: ${item.input_type}`);
      console.log(`  Options: ${item.options ? `${item.options.length} options` : 'NO OPTIONS'}`);
      
      if (item.options && item.options.length > 0) {
        item.options.forEach((opt, optIndex) => {
          console.log(`    Option ${optIndex + 1}: ${opt.option_text} (mark: ${opt.mark}, id: ${opt.id})`);
        });
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testTemplateAPI();
