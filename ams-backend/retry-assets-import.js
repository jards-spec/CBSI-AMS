require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const dumpPath = path.join(__dirname, 'prisma', 'dev.dump.utf8.sql');

(async () => {
  const dump = fs.readFileSync(dumpPath, 'utf8').replace(/^\uFEFF/, '');

  const assetStatements = dump
    .split(/;\s*(?:\r?\n|$)/g)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('INSERT INTO Asset VALUES('));

  let ok = 0;
  let failed = 0;

  for (const stmt of assetStatements) {
    try {
      await client.execute(stmt);
      ok += 1;
    } catch (e) {
      failed += 1;
      console.error('Asset insert failed:', e.message);
    }
  }

  console.log('Asset retry done');
  console.log('Inserted:', ok);
  console.log('Failed:', failed);
})();