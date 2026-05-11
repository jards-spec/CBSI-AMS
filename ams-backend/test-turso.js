require('dotenv').config();
const { createClient } = require('@libsql/client');

(async () => {
  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const result = await db.execute('SELECT 1 as ok');
    console.log('Turso connection OK:', result.rows);
  } catch (error) {
    console.error('Turso connection failed:', error.message);
    process.exit(1);
  }
})();