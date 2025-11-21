const db = require('../config/database-loader');

// Initialize database
db.init().then(() => {
  createTemplate();
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

// QA Audit CDR Template Data
const templateData = {
  name: 'QA Audit- CDR',
  category: 'Quality Assurance',
  description: 'Comprehensive Quality Assurance Audit Checklist for CDR (Comprehensive Daily Review)',
  items: [
    // Personal Hygiene
    {
      title: 'Designated hand wash sink with all necessary amenities available at back restaurant (Soft care Plus, Des E Spray, Tissue paper/ air dryer available, dust bin)',
      category: 'Personal Hygiene',
      required: true,
      order_index: 0
    },
    {
      title: 'Hands are washed hourly and sanitized',
      category: 'Personal Hygiene',
      required: true,
      order_index: 1
    },
    {
      title: 'Personal Hygiene of staff maintained/personal hygiene checklist maintained',
      category: 'Personal Hygiene',
      required: true,
      order_index: 2
    },
    {
      title: 'People are cleanly shaven and nails are short & clean. Beard Mask worn by staff with beard',
      category: 'Personal Hygiene',
      required: true,
      order_index: 3
    },
    {
      title: 'No eating, drinking, chewing tobacco and smoking in the production / restaurant area.',
      category: 'Personal Hygiene',
      required: true,
      order_index: 4
    },
    {
      title: 'Uniform (with apron if applicable) of the staff is clean, not torn.',
      category: 'Personal Hygiene',
      required: true,
      order_index: 5
    },
    {
      title: 'Staff not touching mouth, nose, eyes, hairs in the production area',
      category: 'Personal Hygiene',
      required: true,
      order_index: 6
    },
    {
      title: 'Staff washing and sanitizing hands after clearance, handling money, coughing, sneezing etc.',
      category: 'Personal Hygiene',
      required: true,
      order_index: 7
    },
    {
      title: 'Staff wearing proper hairnets in the production area',
      category: 'Personal Hygiene',
      required: true,
      order_index: 8
    },
    
    // Equipment Condition and Maintenance
    {
      title: 'Trolleys of goods in good condition',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 9
    },
    {
      title: 'RO cleaning/service schedule available, displayed.',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 10
    },
    {
      title: 'Hot water facility available in pot wash and jet spray area',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 11
    },
    {
      title: 'All paint peeling off from ceiling or wall.',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 12
    },
    {
      title: 'No leakage from taps and with proper tap covers.',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 13
    },
    {
      title: 'Hood ducts clean and Duct cleaning done by an external agency if required. Records available - Health check up of equipments done periodically',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 14
    },
    {
      title: 'Equipments well maintained',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 15
    },
    {
      title: 'Display temperature gauges of chillers/freezers available and working',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 16
    },
    {
      title: 'All chillers/freezers conforming to required temperatures, no variation between internal and display temperature',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 17
    },
    {
      title: 'All gaskets on refrigeration/ freezer units are well maintained',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 18
    },
    {
      title: 'Dish washing machine working properly and at the right temperature (attaining wash temp 60°C - 65°C)',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 19
    },
    {
      title: 'Light fixtures covered with clean and shatter proof light covers',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 20
    },
    {
      title: 'All chillers, freezers and under counters are numbered',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 21
    },
    {
      title: 'All fly catchers are clean and UV tubes carry date of beginning of shelf life',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 22
    },
    {
      title: 'All gas pipes rust free and in good condition. Flame of gas bluish in colour, Servicing done.',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 23
    },
    {
      title: 'No rusty/damaged racks',
      category: 'Equipment Condition and Maintenance',
      required: true,
      order_index: 24
    },
    
    // Receiving And Storage
    {
      title: 'No expired material found in the outlet',
      category: 'Receiving And Storage',
      required: true,
      order_index: 25
    },
    {
      title: 'FIFO/FEFO being followed properly, no overstock',
      category: 'Receiving And Storage',
      required: true,
      order_index: 26
    },
    {
      title: 'Food and non food items are kept separately',
      category: 'Receiving And Storage',
      required: true,
      order_index: 27
    },
    {
      title: 'Chemicals maintained for incoming material (to be from approved vendor, of approved brand).',
      category: 'Receiving And Storage',
      required: true,
      order_index: 28
    },
    {
      title: 'Store maintained clean and organized, gunnysacks/thermacol, news paper not used',
      category: 'Receiving And Storage',
      required: true,
      order_index: 29
    },
    {
      title: 'Materials are kept in organised manner',
      category: 'Receiving And Storage',
      required: true,
      order_index: 30
    },
    {
      title: 'Food items properly sealed/Containers are labelled and date tag not be pasted on original date tag.',
      category: 'Receiving And Storage',
      required: true,
      order_index: 31
    },
    {
      title: 'Materials not directly kept on floor (6" off the floor)',
      category: 'Receiving And Storage',
      required: true,
      order_index: 32
    },
    {
      title: 'Glass Policy followed',
      category: 'Receiving And Storage',
      required: true,
      order_index: 33
    },
    {
      title: 'Freezer/Chiller doors having Veg & Non veg logo and not damaged due to overstuffing/wrong handling.',
      category: 'Receiving And Storage',
      required: true,
      order_index: 34
    },
    {
      title: 'Temperature checked while receiving perishable items (milk, chicken,etc) and products not to be left at ambient temperature for more than 15 mins.',
      category: 'Receiving And Storage',
      required: true,
      order_index: 35
    },
    {
      title: 'Dented, rusted, damaged, swollen or leaking cans/ products marked as "Do Not Use" and kept separately.',
      category: 'Receiving And Storage',
      required: true,
      order_index: 36
    },
    {
      title: 'Recommended shelf life followed for all the items and secondary shelf life given after opening. Shelf life chart displayed.',
      category: 'Receiving And Storage',
      required: true,
      order_index: 37
    },
    
    // Product Safety
    {
      title: 'Stored food/gloves not exposed to splash, dust or other contamination or any Food safety hazard.',
      category: 'Product Safety',
      required: true,
      order_index: 38
    },
    {
      title: 'Gloves are worn while handling ready to eat foods and butchery items',
      category: 'Product Safety',
      required: true,
      order_index: 39
    },
    {
      title: 'Potable water is used in production',
      category: 'Product Safety',
      required: true,
      order_index: 40
    },
    {
      title: 'Thawing done as per procedure, date and time when thawing started is mentioned',
      category: 'Product Safety',
      required: true,
      order_index: 41
    },
    {
      title: 'Separate cutting boards & Knifes for Veg and non veg items available',
      category: 'Product Safety',
      required: true,
      order_index: 42
    },
    {
      title: 'Expired and nearby expiry items are identified, and kept separately - spoilage report made',
      category: 'Product Safety',
      required: true,
      order_index: 43
    },
    {
      title: 'Food containers are made of stainless steel or food grade plastic',
      category: 'Product Safety',
      required: true,
      order_index: 44
    },
    {
      title: 'Food is not exposed to danger zone - not left outside the chiller. All perishable food items not to be left at ambient temperature for more than 15min',
      category: 'Product Safety',
      required: true,
      order_index: 45
    },
    {
      title: 'Right temperature maintained in storage area/Hot Bain Marie/Cold Bain Marie',
      category: 'Product Safety',
      required: true,
      order_index: 46
    },
    {
      title: 'Food items kept at recommended temperature as per manufacturer\'s guidelines',
      category: 'Product Safety',
      required: true,
      order_index: 47
    },
    {
      title: 'No vendors allowed access to the production area',
      category: 'Product Safety',
      required: true,
      order_index: 48
    },
    {
      title: 'Canned foods stored as per norms',
      category: 'Product Safety',
      required: true,
      order_index: 49
    },
    
    // Service
    {
      title: 'Food/Beverage handled as per norms (e.g spoons, cups inside)',
      category: 'Service',
      required: true,
      order_index: 50
    },
    {
      title: 'No expired, fermented, spoilt items found.',
      category: 'Service',
      required: true,
      order_index: 51
    },
    {
      title: 'Beverage system, drink machines, ice machines are clean',
      category: 'Service',
      required: true,
      order_index: 52
    },
    {
      title: 'Proper serving temperature is maintained (Chutney/Beverages,Salad)',
      category: 'Service',
      required: true,
      order_index: 53
    },
    {
      title: 'Guest tables and chairs are cleaned & sanitised properly after each use',
      category: 'Service',
      required: true,
      order_index: 54
    },
    {
      title: 'Food & beverage in conformity',
      category: 'Service',
      required: true,
      order_index: 55
    },
    {
      title: 'Ice cubes machine, ice cubes handled hygienically. Sanitizer for ice cube scoop and table top available, being used.',
      category: 'Service',
      required: true,
      order_index: 56
    },
    {
      title: 'No scaling observed in Bain Marie, chaffing dishes, Dish wash machine',
      category: 'Service',
      required: true,
      order_index: 57
    },
    {
      title: 'Dish wash / glass wash machine working properly, Suma Dime / Mini tablet being used/dish wash area free from bad odour',
      category: 'Service',
      required: true,
      order_index: 58
    },
    {
      title: 'Personal belongings not kept with the food material',
      category: 'Service',
      required: true,
      order_index: 59
    },
    {
      title: 'Wiping cloths are clean, without any smell and stitched properly (No loose threads).',
      category: 'Service',
      required: true,
      order_index: 60
    },
    {
      title: 'Bar/Service/L4 store area properly cleaned and well maintained',
      category: 'Service',
      required: true,
      order_index: 61
    },
    {
      title: 'Customer complaint handling procedure records are maintained',
      category: 'Service',
      required: true,
      order_index: 62
    },
    
    // SCM (Supply Chain Management)
    {
      title: 'Food is being transported in clean & temperature controlled vehicle.',
      category: 'SCM',
      required: true,
      order_index: 63
    },
    {
      title: 'Proper Segregation of Veg & Non veg is maintained while transporting food.',
      category: 'SCM',
      required: true,
      order_index: 64
    },
    {
      title: 'All Food / Food Ingredients & Packing Materials provided are as per FSSAI',
      category: 'SCM',
      required: true,
      order_index: 65
    },
    {
      title: 'Cleaning Chemicals & Cleaning tools are provided',
      category: 'SCM',
      required: true,
      order_index: 66
    },
    {
      title: 'Food grade certificate for all food contact packing material is available at Warehouse',
      category: 'SCM',
      required: true,
      order_index: 67
    },
    
    // Other Requirements
    {
      title: 'Medical- All food handlers go for annual medical examination & inoculation against the enteric group of diseases as per recommended schedule of the va',
      category: 'Other Requirements',
      required: true,
      order_index: 68
    },
    {
      title: 'All documentation & records are available and retained for a period of 3 months atleast.',
      category: 'Other Requirements',
      required: true,
      order_index: 69
    },
    {
      title: 'Potable water meeting standards of IS-10500 & tested semi-annually through an NABL accredited lab.',
      category: 'Other Requirements',
      required: true,
      order_index: 70
    },
    {
      title: 'Measuring & monitoring devices are calibrated periodically.',
      category: 'Other Requirements',
      required: true,
      order_index: 71
    },
    {
      title: 'No safety hazard present in resturant like open wire, improperly aligned drain grating.',
      category: 'Other Requirements',
      required: true,
      order_index: 72
    },
    {
      title: 'Fire extinguishers are regularly inspected and properly maintained.',
      category: 'Other Requirements',
      required: true,
      order_index: 73
    },
    {
      title: 'First Aid Kit available in the outlet.',
      category: 'Other Requirements',
      required: true,
      order_index: 74
    },
    
    // Regulatory Requirement
    {
      title: 'Preventive maintenance schedules and records are regularly updated - recommended.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 75
    },
    {
      title: 'FSSAI Licence & Golden Rules board available and displayed.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 76
    },
    {
      title: 'Running water and electricity available at the outlets.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 77
    },
    {
      title: 'Stamping certificate for Weighing scales/Peg Measurment available, displayed near the machine.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 78
    },
    {
      title: 'Hard Copies of MSDS for all cleaning chemicals available, staff aware of it.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 79
    },
    {
      title: 'FosTAC Trainer available, certificate displayed.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 80
    },
    {
      title: 'Copies of medical records available & Follow up done for Medical records if not available.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 81
    },
    {
      title: 'Colour coded cutting boards used as per norms.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 82
    },
    {
      title: 'Freezer/Chiller doors and fryers having Veg. & Non veg. logos.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 83
    },
    {
      title: 'Food grade certificates for all food contact packing material is available at the outlet (soft copy) and staff aware of it.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 84
    },
    
    // QA Requirement
    {
      title: 'QA and Cleaning Chemicals SOPs available, staff aware about it.',
      category: 'QA Requirement',
      required: true,
      order_index: 85
    },
    
    // Regulatory Requirement (continued)
    {
      title: 'Training done by FosTAC certified trainers as per the modules shared every month and staff aware/have knowledge of food safety as per training topics.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 86
    },
    {
      title: 'Shared of previous audit report within 2 days of audit.',
      category: 'Regulatory Requirement',
      required: true,
      order_index: 87
    },
    
    // Cleaning and Sanitation
    {
      title: 'All equipments maintained clean (Hoods, Filters, Oven, M/W, D/W, Chillers, Freezers, Pulverizer, FDU & Cooking range, cutlery holder, etc.)',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 88
    },
    {
      title: 'Detergent used as per norms at the dish wash area.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 89
    },
    {
      title: 'Adequate stock of cleaning chemicals, sanitisers available.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 90
    },
    {
      title: 'All high touch points are sanitized once a day.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 91
    },
    {
      title: 'Cleaning schedule displayed and cleaning done as per schedule. Chemical consumption sheet available & recommended cleaning chemicals available in th',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 92
    },
    {
      title: 'Garbage bins Foot operated, clean/bins as per biodegradable & recyclable basis (colour coded-green, blue, black [hazardous]) and without offensive odo',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 93
    },
    {
      title: 'Recommended chemicals, Mops and tools used for cleaning, sanitizing. Cleaning tools to be kept on the tool bracket when not in use.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 94
    },
    {
      title: 'Sanitizer in proper strength in Jerry Can/spray bottles available.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 95
    },
    {
      title: 'Production, store area are cleaned and properly maintained.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 96
    },
    {
      title: 'Drains, drain pipe, chili traps (new stores) and grease traps are clean with proper alignment of drain cover.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 97
    },
    {
      title: 'Ceiling, fresh air vents, wall tiles and floor are clean.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 98
    },
    {
      title: 'Baskets, trolley, working counters, sink maintained clean.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 99
    },
    {
      title: 'No blackened pans /patilas & No old tags on cleaned utensils.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 100
    },
    {
      title: 'All gaskets on refrigeration/ freezer units are properly cleaned.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 101
    },
    {
      title: 'All crockery and cutlery are free of foul smell.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 102
    },
    {
      title: 'Aprons, gloves are available for KST Staff.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 103
    },
    {
      title: 'Cleaning chemicals are kept securely and away from the food area. They should be kept in a lower rack/level.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 104
    },
    {
      title: 'Water cooler and hot holding units are properly cleaned.',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 105
    },
    {
      title: 'Colour coded clean kitchen dusters used and dipped in sanitizer in cambor - Red for butchery and green for kitchen (Appropriate Pol wash procedure bein)',
      category: 'Cleaning and Sanitation',
      required: true,
      order_index: 106
    },
    
    // Pest Control
    {
      title: 'Pest sighting noted and informed to PC agency. If pest infestation is severe, then the outlet to be shut as it will be classified as a Zero tolerance Point.',
      category: 'Pest Control',
      required: true,
      order_index: 107
    },
    {
      title: 'No pest droppings observed.',
      category: 'Pest Control',
      required: true,
      order_index: 108
    },
    {
      title: 'No damage was caused due to pest problem.',
      category: 'Pest Control',
      required: true,
      order_index: 109
    },
    {
      title: 'All Fly Catchers and air curtains working.',
      category: 'Pest Control',
      required: true,
      order_index: 110
    },
    {
      title: 'Pest Control Service Schedule displayed and followed. Pesticides name with dilution chart, trend analysis (if required), available in outlet as shared by the l',
      category: 'Pest Control',
      required: true,
      order_index: 111
    },
    {
      title: 'All lockers, changing room area, L4 emptied before pest control on deep pest control day, Dilution of pesticide to be supervised before PC Operation.',
      category: 'Pest Control',
      required: true,
      order_index: 112
    },
    {
      title: 'All gaps/cracks closed to avoid pest entries.',
      category: 'Pest Control',
      required: true,
      order_index: 113
    },
    {
      title: 'Roda boxes map/layout available with proper tracking if being used.',
      category: 'Pest Control',
      required: true,
      order_index: 114
    },
    {
      title: 'ID, medical certificate and training certificate of PC Agency Technician available at the outlet.',
      category: 'Pest Control',
      required: true,
      order_index: 115
    },
    {
      title: 'No expired and spoilt food found in kitchen, chillers or U/C.',
      category: 'Pest Control',
      required: true,
      order_index: 116
    },
    
    // Production
    {
      title: 'Veg and Non veg, Raw and cooked food segregated.',
      category: 'Production',
      required: true,
      order_index: 117
    },
    {
      title: 'All working counters cleaned, sanitized before starting the work.',
      category: 'Production',
      required: true,
      order_index: 118
    },
    {
      title: 'Vegetables are sanitized as per recommended procedure, procedure displayed at BOH.',
      category: 'Production',
      required: true,
      order_index: 119
    },
    {
      title: 'All equipments to be used are sanitized in the morning and as per SOP (Cutting boards/knives, tools) with proper contact time.',
      category: 'Production',
      required: true,
      order_index: 120
    },
    {
      title: 'All Foods covered, beer date tag with product name (DOM, DOE).',
      category: 'Production',
      required: true,
      order_index: 121
    },
    {
      title: 'No Misbranding/old tag observed.',
      category: 'Production',
      required: true,
      order_index: 122
    },
    {
      title: 'Cooking / holding done at right temperature.',
      category: 'Production',
      required: true,
      order_index: 123
    },
    {
      title: 'Product Quality (after doing sensory of cooked food/chutney etc) Good.',
      category: 'Production',
      required: true,
      order_index: 124
    },
    {
      title: 'Production sheet available & maintained for all inhouse items.',
      category: 'Production',
      required: true,
      order_index: 125
    },
    {
      title: 'All temperature records maintained for deep freezer & chillers.',
      category: 'Production',
      required: true,
      order_index: 126
    },
    {
      title: 'Hot and Cold counter / Bain marie temperature in conformity.',
      category: 'Production',
      required: true,
      order_index: 127
    },
    {
      title: 'Clean trays /containers /utensils used.',
      category: 'Production',
      required: true,
      order_index: 128
    },
    {
      title: 'No material kept on floor.',
      category: 'Production',
      required: true,
      order_index: 129
    },
    {
      title: 'Only food handlers handling the food stuff.',
      category: 'Production',
      required: true,
      order_index: 130
    },
    {
      title: 'Thermometer available and calibration record maintained.',
      category: 'Production',
      required: true,
      order_index: 131
    },
    {
      title: 'Cutting boards clean, free from cuts and scratches.',
      category: 'Production',
      required: true,
      order_index: 132
    },
    {
      title: 'Used, dark oil kept segregated and handed over to Warehouse for further sending to approved agency.',
      category: 'Production',
      required: true,
      order_index: 133
    },
    {
      title: 'Equipments used in production are food grade, made of non-toxic, impervious, non-corrosive material which is easy to clean & disinfect. And equipments',
      category: 'Production',
      required: true,
      order_index: 134
    },
    
    // ACKNOWLEDGEMENT
    {
      title: 'Manager on Duty',
      category: 'ACKNOWLEDGEMENT',
      required: false,
      order_index: 135
    },
    {
      title: 'Signature',
      category: 'ACKNOWLEDGEMENT',
      required: false,
      order_index: 136
    }
  ]
};

async function createTemplate() {
  const dbInstance = db.getDb();
  
  try {
    console.log('Creating QA Audit CDR Template...');
    
    // Helper function for running queries (compatible with SQL Server)
    const runDb = (query, params = []) => {
      return new Promise((resolve, reject) => {
        dbInstance.run(query, params, (err, result) => {
          if (err) return reject(err);
          // For SQL Server, result contains lastID and changes
          // For SQLite, result is { lastID, changes }
          const lastID = result?.lastID !== undefined ? result.lastID : (result?.id || null);
          const changes = result?.changes !== undefined ? result.changes : (result?.rowsAffected?.[0] || 0);
          resolve({ lastID, changes });
        });
      });
    };

    const getDbRow = (query, params = []) => {
      return new Promise((resolve, reject) => {
        dbInstance.get(query, params, (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
    };
    
    // Check if template already exists
    const existing = await getDbRow(
      'SELECT id FROM checklist_templates WHERE name = ?',
      [templateData.name]
    );

    if (existing) {
      console.log(`Template "${templateData.name}" already exists with ID ${existing.id}`);
      console.log('Deleting existing template to recreate...');
      
      // First, check if there are audits using this template
      const auditCount = await getDbRow(
        'SELECT COUNT(*) as count FROM audits WHERE template_id = ?',
        [existing.id]
      );
      
      if (auditCount && auditCount.count > 0) {
        console.log(`Warning: Found ${auditCount.count} audit(s) using this template.`);
        console.log('Deleting related audit items and options...');
        
        // Get all item IDs from this template
        const items = await getAllRows(
          'SELECT id FROM checklist_items WHERE template_id = ?',
          [existing.id]
        );
        
        if (items.length > 0) {
          const itemIds = items.map(i => i.id);
          
          // Get all option IDs from these items
          const options = await getAllRows(
            `SELECT id FROM checklist_item_options WHERE item_id IN (${itemIds.map(() => '?').join(',')})`,
            itemIds
          );
          
          if (options.length > 0) {
            const optionIds = options.map(o => o.id);
            
            // Delete audit_items that reference these options
            await runDb(
              `DELETE FROM audit_items WHERE selected_option_id IN (${optionIds.map(() => '?').join(',')})`,
              optionIds
            );
            console.log(`  Deleted audit_items referencing ${options.length} options`);
          }
          
          // Delete audit_items that reference these items
          await runDb(
            `DELETE FROM audit_items WHERE item_id IN (${itemIds.map(() => '?').join(',')})`,
            itemIds
          );
          console.log(`  Deleted audit_items referencing ${items.length} items`);
        }
        
        // Delete the audits themselves
        await runDb(
          'DELETE FROM audits WHERE template_id = ?',
          [existing.id]
        );
        console.log(`  Deleted ${auditCount.count} audit(s)`);
      }
      
      // Now delete the template (cascade will delete items and options)
      await runDb(
        'DELETE FROM checklist_templates WHERE id = ?',
        [existing.id]
      );
      console.log('Existing template deleted.');
    }

    // Create template
    const result = await runDb(
      'INSERT INTO checklist_templates (name, category, description) VALUES (?, ?, ?)',
      [templateData.name, templateData.category, templateData.description]
    );

    const templateId = result.lastID;
    
    if (!templateId || templateId === 0) {
      throw new Error('Failed to create template - no ID returned');
    }

    console.log(`Template created with ID: ${templateId}`);

    // Insert items
    let itemCount = 0;
    for (const item of templateData.items) {
      await runDb(
        'INSERT INTO checklist_items (template_id, title, description, category, required, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        [
          templateId,
          item.title,
          item.description || '',
          item.category,
          item.required ? 1 : 0,
          item.order_index
        ]
      );
      itemCount++;
      
      // Log progress for large templates
      if (itemCount % 20 === 0) {
        console.log(`  Inserted ${itemCount} items...`);
      }
    }

    console.log(`Successfully created template "${templateData.name}" with ${itemCount} items`);
    console.log('Template is ready to use!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating template:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

