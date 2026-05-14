import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  // Allow GET requests only
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database connection
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Test database connection
    const result = await db.execute('SELECT 1 as ok');

    // Return success
    return res.status(200).json({ 
      ok: true, 
      db: result.rows 
    });
  } catch (error) {
    // Return error
    return res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
}