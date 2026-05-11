require('dotenv').config();
const { createClient } = require('@libsql/client');

process.on('unhandledRejection', (e) => {
  console.error('Unhandled rejection:', e);
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e);
  process.exit(1);
});

console.log('[check] starting...');
console.log('[check] TURSO_DATABASE_URL set?', !!process.env.TURSO_DATABASE_URL);
console.log('[check] TURSO_AUTH_TOKEN set?', !!process.env.TURSO_AUTH_TOKEN);

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const queryAll = async (sql, args = []) => {
  const res = await db.execute({ sql, args });
  return res.rows || [];
};

(async () => {
  console.log('[check] testing connection...');
  const ok = await queryAll('SELECT 1 as ok');
  console.log('[check] connection ok:', ok[0]);

  console.log('[check] PRAGMA table_info(Employee)...');
  const cols = await queryAll('PRAGMA table_info(Employee)');
  console.log('[check] Employee columns count:', cols.length);
  console.table(cols.map((c) => ({ name: c.name, type: c.type })));


  console.log('[check] sample encryption lengths...');
  const rows = await queryAll(`
    SELECT
      employeeNumber,
      length(COALESCE(phone, '')) AS phoneLen,
      length(COALESCE(phoneEnc, '')) AS phoneEncLen,
      instr(COALESCE(phoneEnc, ''), '.') AS phoneEncHasDot,
      length(COALESCE(jobTitle, '')) AS jobTitleLen,
      length(COALESCE(jobTitleEnc, '')) AS jobTitleEncLen,
      instr(COALESCE(jobTitleEnc, ''), '.') AS jobTitleEncHasDot
    FROM Employee
    LIMIT 10
  `);

  console.table(rows);

  console.log('[check] done.');
  process.exit(0);
})();