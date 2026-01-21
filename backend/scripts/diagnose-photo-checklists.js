const db = require('../config/database-loader');

const parseList = (value) =>
  String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

const normalize = (val) => (val === null || val === undefined ? '' : String(val));

const getDbType = () => (process.env.DB_TYPE || 'sqlite').toLowerCase();

const getTableColumns = async (dbInstance, table) => {
  const dbType = getDbType();
  if (dbType === 'mssql' || dbType === 'sqlserver') {
    const rows = await dbInstance.all(
      `SELECT COLUMN_NAME as name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?`,
      [table]
    );
    return (rows || []).map(r => String(r.name));
  }
  if (dbType === 'mysql') {
    const rows = await dbInstance.all(
      `SELECT COLUMN_NAME as name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    return (rows || []).map(r => String(r.name));
  }
  if (dbType === 'pg' || dbType === 'postgres' || dbType === 'postgresql') {
    const rows = await dbInstance.all(
      `SELECT column_name as name FROM information_schema.columns WHERE table_name = $1`,
      [table]
    );
    return (rows || []).map(r => String(r.name));
  }
  const rows = await dbInstance.all(`PRAGMA table_info(${table})`);
  return (rows || []).map(r => String(r.name));
};

const getTemplates = async (dbInstance, templateIds, templateNames) => {
  if (templateIds.length > 0) {
    const placeholders = templateIds.map(() => '?').join(',');
    return dbInstance.all(
      `SELECT * FROM checklist_templates WHERE id IN (${placeholders}) ORDER BY id`,
      templateIds
    );
  }
  if (templateNames.length > 0) {
    const placeholders = templateNames.map(() => '?').join(',');
    return dbInstance.all(
      `SELECT * FROM checklist_templates WHERE name IN (${placeholders}) ORDER BY id`,
      templateNames
    );
  }
  return dbInstance.all(`SELECT * FROM checklist_templates ORDER BY id`);
};

const pickColumns = (row, columns) => {
  const picked = {};
  columns.forEach(col => {
    if (row && Object.prototype.hasOwnProperty.call(row, col)) {
      picked[col] = row[col];
    }
  });
  return picked;
};

const main = async () => {
  const idsArg = process.argv.find(a => a.startsWith('--ids='));
  const namesArg = process.argv.find(a => a.startsWith('--names='));
  const templateIds = parseList(idsArg ? idsArg.split('=')[1] : '').map(id => parseInt(id, 10)).filter(n => !Number.isNaN(n));
  const templateNames = parseList(namesArg ? namesArg.split('=')[1] : '');

  await db.init();
  const dbInstance = db.getDb();

  const templateColumns = await getTableColumns(dbInstance, 'checklist_templates');
  const itemColumns = await getTableColumns(dbInstance, 'checklist_items');

  const templateMetaCols = ['id', 'name', 'category', 'created_at', 'description', 'version', 'source', 'enable_attachments', 'enable_photos']
    .filter(c => templateColumns.includes(c));
  const itemMetaCols = ['id', 'title', 'input_type', 'section', 'subcategory', 'category', 'required', 'is_critical', 'allow_photo', 'photo_label', 'attachment_label']
    .filter(c => itemColumns.includes(c));

  const templates = await getTemplates(dbInstance, templateIds, templateNames);
  if (!templates || templates.length === 0) {
    console.log('No templates found for the provided filters.');
    return;
  }

  console.log('\n=== CHECKLIST PHOTO DIAGNOSTIC ===\n');

  for (const tmpl of templates) {
    const meta = pickColumns(tmpl, templateMetaCols);
    meta.id = tmpl.id;
    meta.name = tmpl.name;

    const items = await dbInstance.all(
      `SELECT * FROM checklist_items WHERE template_id = ? ORDER BY order_index, id`,
      [tmpl.id]
    );

    const first20 = (items || []).slice(0, 20).map(item => pickColumns(item, itemMetaCols));
    const photoCandidates = (items || []).filter(i => /photo/i.test(normalize(i.title)));
    const missingPhotoType = photoCandidates.filter(i => String(i.input_type || '').toLowerCase() !== 'image_upload');
    const imageUploadCount = (items || []).filter(i => String(i.input_type || '').toLowerCase() === 'image_upload').length;

    console.log(`Template: ${tmpl.name} (id=${tmpl.id})`);
    if (templateMetaCols.length > 0) {
      console.log('Meta:', meta);
    } else {
      console.log('Meta:', { id: tmpl.id, name: tmpl.name, category: tmpl.category, created_at: tmpl.created_at });
    }
    console.log(`Items: total=${items.length}, image_upload=${imageUploadCount}, photo_title_missing_type=${missingPhotoType.length}`);
    console.log('First 20 items:');
    first20.forEach(row => {
      console.log(`  - id=${row.id} | ${row.title} | input_type=${row.input_type || 'auto'}`);
    });
    console.log('---');
  }

  console.log('\nNOTE: Columns not present in the DB are omitted from output.\n');
};

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Diagnostic failed:', err);
    process.exit(1);
  });
