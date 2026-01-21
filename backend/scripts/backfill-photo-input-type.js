const db = require('../config/database-loader');

const parseList = (value) =>
  String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const getDbType = () => (process.env.DB_TYPE || 'sqlite').toLowerCase();

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
      `SELECT * FROM checklist_templates WHERE LOWER(name) IN (${placeholders}) ORDER BY id`,
      templateNames.map(n => n.toLowerCase())
    );
  }
  return [];
};

const main = async () => {
  const idsArg = process.argv.find(a => a.startsWith('--ids='));
  const namesArg = process.argv.find(a => a.startsWith('--names='));
  const dryRun = process.argv.includes('--dry-run');

  const templateIds = parseList(idsArg ? idsArg.split('=')[1] : '')
    .map(id => parseInt(id, 10))
    .filter(n => !Number.isNaN(n));
  const templateNames = parseList(namesArg ? namesArg.split('=')[1] : '')
    .map(normalizeName);

  if (templateIds.length === 0 && templateNames.length === 0) {
    console.log('Provide --ids=ID1,ID2 or --names="Name A,Name B"');
    process.exit(1);
  }

  await db.init();
  const dbInstance = db.getDb();

  const templates = await getTemplates(dbInstance, templateIds, templateNames);
  if (!templates || templates.length === 0) {
    console.log('No templates found for the provided filters.');
    return;
  }

  const photoTypeSet = new Set(['image', 'photo', 'attachment', 'file']);

  for (const tmpl of templates) {
    const items = await dbInstance.all(
      `SELECT id, title, input_type FROM checklist_items WHERE template_id = ?`,
      [tmpl.id]
    );

    const toFix = (items || []).filter(i => {
      const titleHasPhoto = /photo/i.test(String(i.title || ''));
      const inputType = String(i.input_type || '').trim().toLowerCase();
      const typeNeedsFix = !inputType || inputType === 'auto' || !['image_upload', 'attachment'].includes(inputType);
      const typeAlias = photoTypeSet.has(inputType);
      return titleHasPhoto && (typeNeedsFix || typeAlias);
    });

    if (toFix.length === 0) {
      console.log(`Template ${tmpl.name} (${tmpl.id}): no photo fixes needed.`);
      continue;
    }

    const ids = toFix.map(i => i.id);
    const placeholders = ids.map(() => '?').join(',');

    if (dryRun) {
      console.log(`Template ${tmpl.name} (${tmpl.id}): would update ${ids.length} items -> image_upload`);
      continue;
    }

    await new Promise((resolve, reject) => {
      dbInstance.run(
        `UPDATE checklist_items SET input_type = 'image_upload'
         WHERE id IN (${placeholders})`,
        ids,
        (err) => (err ? reject(err) : resolve())
      );
    });

    console.log(`Template ${tmpl.name} (${tmpl.id}): updated ${ids.length} items -> image_upload`);
  }
};

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
