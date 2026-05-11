require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const dumpCandidates = [
  path.join(__dirname, 'prisma', 'dev.dump.utf8.sql'),
  path.join(__dirname, 'prisma', 'dev.dump.sql'),
  path.join(__dirname, 'dev.dump.utf8.sql'),
  path.join(__dirname, 'dev.dump.sql'),
];

const findDumpPath = () => {
  for (const p of dumpCandidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `No dump file found. Tried:\n${dumpCandidates.map((p) => `- ${p}`).join('\n')}`,
  );
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

(async () => {
  try {
    const dumpPath = findDumpPath();
    console.log(`Using dump: ${dumpPath}`);

    let dump = fs.readFileSync(dumpPath, 'utf8');
    dump = dump.replace(/^\uFEFF/, '');

    const statements = dump
      .split(/;\s*(?:\r?\n|$)/g)
      .map((s) => s.trim())
      .filter(Boolean);

    const auditInserts = statements.filter((s) =>
      /^INSERT\s+INTO\s+AuditLog\s+VALUES\s*\(/i.test(s),
    );

    if (auditInserts.length === 0) {
      console.log('No AuditLog INSERT statements found in dump.');
      process.exit(0);
    }

    const beforeRes = await client.execute('SELECT COUNT(*) AS count FROM AuditLog');
    const beforeCount = toNumber(beforeRes.rows?.[0]?.count ?? 0);

    let ok = 0;
    let failed = 0;

    for (const stmt of auditInserts) {
      // Deduplicate by primary key (id) instead of replacing existing rows.
      const safeStmt = stmt.replace(
        /^INSERT\s+INTO\s+AuditLog/i,
        'INSERT OR IGNORE INTO AuditLog',
      );

      try {
        await client.execute(`${safeStmt};`);
        ok += 1;
      } catch (err) {
        failed += 1;
        console.error('\nFAILED:\n', safeStmt.slice(0, 220), '\nERROR:', err.message);
      }
    }

    const afterRes = await client.execute('SELECT COUNT(*) AS count FROM AuditLog');
    const afterCount = toNumber(afterRes.rows?.[0]?.count ?? 0);
    const inserted = Math.max(afterCount - beforeCount, 0);

    console.log('\nAudit restore finished');
    console.log('Audit statements in dump:', auditInserts.length);
    console.log('Executed:', ok);
    console.log('Failed:', failed);
    console.log('Audit count before:', beforeCount);
    console.log('Audit count after:', afterCount);
    console.log('Inserted missing rows:', inserted);
  } catch (err) {
    console.error('Import failed:', err.message);
    process.exit(1);
  }
})();