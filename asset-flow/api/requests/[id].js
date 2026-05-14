import { createClient } from '@libsql/client';

const nowIso = () => new Date().toISOString();
const requireNonEmptyString = (value, label) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
const getRequiredRow = async (db, table, id, label = 'Record') => {
  const result = await db.execute({ 
    sql: `SELECT * FROM ${table} WHERE id = ?`, 
    args: [String(id)] 
  });
  const row = result.rows[0];
  if (!row) throw new Error(`${label} not found`);
  return row;
};

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Request ID is required' });
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const queryOne = async (sql, args = []) => {
    const result = await db.execute({ sql, args });
    return result.rows[0] || null;
  };

  const run = async (sql, args = []) => {
    return await db.execute({ sql, args });
  };

  // GET - Get single request
  if (req.method === 'GET') {
    try {
      const request = await queryOne('SELECT * FROM Request WHERE id = ?', [String(id)]);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      return res.status(200).json(request);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PATCH - Update status/Archive/Restore
  if (req.method === 'PATCH') {
    try {
      const { action, status } = req.body;
      
      if (action === 'updateStatus' && status) {
        const allowed = ['Pending', 'Approved', 'Rejected', 'In Progress', 'Completed', 'Closed'];
        if (!allowed.includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }
        
        await run('UPDATE Request SET status = ? WHERE id = ?', [status, String(id)]);
      } else if (action === 'archive') {
        await run(
          `
          UPDATE Request
          SET isArchived = 1, archivedAt = ?, archivedById = ?, archivedByName = ?
          WHERE id = ?
          `,
          [nowIso(), req.body.archivedById || '', req.body.archivedByName || '', String(id)],
        );
      } else if (action === 'restore') {
        await run(
          `
          UPDATE Request
          SET isArchived = 0, archivedAt = NULL, archivedById = NULL, archivedByName = NULL
          WHERE id = ?
          `,
          [String(id)],
        );
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // DELETE - Delete request
  if (req.method === 'DELETE') {
    try {
      const existing = await queryOne('SELECT requestNumber, requestorName FROM Request WHERE id = ?', [String(id)]);
      if (!existing) {
        return res.status(404).json({ error: 'Request not found' });
      }

      await run('DELETE FROM Request WHERE id = ?', [String(id)]);

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}