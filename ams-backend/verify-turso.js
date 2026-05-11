require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  const tables = ['Asset', 'Employee', 'Consumable', 'Accessory', 'License', 'Request', 'Maintenance', 'Component', 'AuditLog'];
  for (const table of tables) {
    try {
      const r = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(table, r.rows[0]?.count ?? 0);
    } catch (e) {
      console.log(table, 'missing/error:', e.message);
    }
  }
})();