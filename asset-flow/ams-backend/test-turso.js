require('dotenv').config();
const { createClient } = require('@libsql/client');

(async () => {
  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('🔗 Connecting to Turso...');
    const result = await db.execute('SELECT 1 as ok');
    console.log('✅ Turso connection OK\n');

    // Create Supplier table
    console.log('📋 Creating Supplier table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Supplier (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contactPerson TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        website TEXT,
        category TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        isArchived INTEGER DEFAULT 0,
        archivedAt TEXT,
        archivedById TEXT,
        archivedByName TEXT
      )
    `);
    console.log('✅ Supplier table created\n');

    // Create indexes
    console.log('📑 Creating indexes...');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_supplier_name ON Supplier(name)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_supplier_category ON Supplier(category)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_supplier_archived ON Supplier(isArchived)');
    console.log('✅ Indexes created\n');

    // Verify table exists
    const tableCheck = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='Supplier'"
    );

    if (tableCheck.rows.length > 0) {
      console.log('✅ Supplier table EXISTS');

      const columns = await db.execute('PRAGMA table_info(Supplier)');
      console.log(`\n📋 Table Structure: ${columns.rows.length} columns`);
      columns.rows.forEach(row => {
        console.log(`   - ${row.name} (${row.type})`);
      });

      const count = await db.execute('SELECT COUNT(*) as count FROM Supplier');
      console.log(`\n📊 Total Records: ${count.rows[0].count}`);
      
      console.log('\n🎉 Supplier table is ready to use!');
      console.log('   Visit: http://localhost:5173/suppliers');
    } else {
      console.log('❌ Failed to create Supplier table');
    }

    await db.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  // Add this after the Supplier check:
const tables = [
  'Employee', 'Asset', 'License', 'LicenseAssignment',
  'Notification', 'AuditLog', 'Maintenance', 'Request',
  'Component', 'Accessory', 'Consumable', 'Supplier'
];

console.log('\n📋 Checking all tables...');
for (const table of tables) {
  const result = await db.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
  );
  console.log(`${result.rows.length > 0 ? '✅' : '❌'} ${table}`);
}
})();