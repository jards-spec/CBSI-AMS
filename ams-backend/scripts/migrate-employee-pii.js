require('dotenv').config();
const { createClient } = require('@libsql/client');
const { encryptString } = require('../crypto-utils');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const queryAll = async (sql, args = []) => {
  const res = await db.execute({ sql, args });
  return res.rows || [];
};

const run = async (sql, args = []) => db.execute({ sql, args });

(async () => {
  console.log('[migrate] starting employee PII migration...');

  // Find employees with plaintext phone/jobTitle that are not yet encrypted
  const rows = await queryAll(`
    SELECT id, employeeNumber, phone, jobTitle, phoneEnc, jobTitleEnc
    FROM Employee
    WHERE
      (length(COALESCE(phone, '')) > 0 OR length(COALESCE(jobTitle, '')) > 0)
      AND
      (length(COALESCE(phoneEnc, '')) = 0 OR length(COALESCE(jobTitleEnc, '')) = 0)
    LIMIT 10000
  `);

  console.log(`[migrate] rows to migrate: ${rows.length}`);

  let migrated = 0;

  for (const row of rows) {
    const phonePlain = String(row.phone || '');
    const jobTitlePlain = String(row.jobTitle || '');

    const phoneEnc = encryptString(phonePlain);
    const jobTitleEnc = encryptString(jobTitlePlain);

    await run(
      `
      UPDATE Employee
      SET phoneEnc = ?,
          jobTitleEnc = ?,
          phone = '',
          jobTitle = ''
      WHERE id = ?
      `,
      [phoneEnc, jobTitleEnc, String(row.id)],
    );

    migrated += 1;
  }

  console.log(`[migrate] completed. migrated: ${migrated}`);
  process.exit(0);
})().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});