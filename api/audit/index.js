import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const uid = () => randomUUID();
const nowIso = () => new Date().toISOString();

export default async function handler(req, res) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const queryAll = async (sql, args = []) => {
    const result = await db.execute({ sql, args });
    return result.rows || [];
  };

  const run = async (sql, args = []) => {
    return await db.execute({ sql, args });
  };

  // GET - List all audit logs
  if (req.method === 'GET') {
    try {
      const rows = await queryAll(
        `
        SELECT * FROM AuditLog
        ORDER BY datetime(createdAt) DESC
        LIMIT 500
        `,
      );
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - Create audit log entry
  if (req.method === 'POST') {
    try {
      const type = String(req.body.type || '').trim();
      const entity = String(req.body.entity || '').trim();
      const message = String(req.body.message || '').trim();
      const user = String(req.body.user || 'SYSTEM').trim();

      if (!type || !entity || !message) {
        return res.status(400).json({ error: 'Type, entity, and message are required' });
      }

      const id = uid();

      await run(
        `
        INSERT INTO AuditLog (id, timestamp, type, entity, message, user, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          new Date().toLocaleString(),
          type,
          entity,
          message,
          user,
          nowIso(),
        ],
      );

      return res.status(201).json({ id });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // DELETE - Clear all audit logs
  if (req.method === 'DELETE') {
    try {
      await run('DELETE FROM AuditLog');
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}