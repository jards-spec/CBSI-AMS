import { createClient } from '@libsql/client';

const nowIso = () => new Date().toISOString();
const requireNonEmptyString = (value, label) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
const requireNonNegativeNumber = (value, label) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) throw new Error(`${label} must be 0 or greater.`);
  return num;
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
    return res.status(400).json({ error: 'Component ID is required' });
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

  // GET - Get single component
  if (req.method === 'GET') {
    try {
      const component = await queryOne('SELECT * FROM Component WHERE id = ?', [String(id)]);
      if (!component) {
        return res.status(404).json({ error: 'Component not found' });
      }
      return res.status(200).json(component);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT - Update component
  if (req.method === 'PUT') {
    try {
      await getRequiredRow(db, 'Component', id, 'Component');

      const name = requireNonEmptyString(req.body.name, 'Component name');
      const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
      const remaining = requireNonNegativeNumber(req.body.remaining ?? 0, 'Remaining');
      
      if (remaining > total) {
        return res.status(400).json({ error: 'Remaining cannot exceed total.' });
      }

      await run(
        `
        UPDATE Component
        SET name = ?, category = ?, model = ?, location = ?, total = ?, remaining = ?, minQty = ?,
            status = ?, assignedTo = ?, checkoutDate = ?, expectedCheckinDate = ?, notes = ?, unitCost = ?
        WHERE id = ?
        `,
        [
          name,
          req.body.category || '',
          req.body.model || '',
          req.body.location || '',
          total,
          remaining,
          Number(req.body.minQty || 0),
          req.body.status || 'AVAILABLE',
          req.body.assignedTo || null,
          req.body.checkoutDate || null,
          req.body.expectedCheckinDate || null,
          req.body.notes || null,
          Number(req.body.unitCost || 0),
          String(id),
        ],
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // PATCH - Archive/Restore/Checkin/Checkout
  if (req.method === 'PATCH') {
    try {
      const { action } = req.body;
      
      if (action === 'checkin') {
        await run("UPDATE Component SET status = 'AVAILABLE' WHERE id = ?", [String(id)]);
      } else if (action === 'checkout') {
        await run("UPDATE Component SET status = 'DEPLOYED' WHERE id = ?", [String(id)]);
      } else if (action === 'archive') {
        await run(
          `
          UPDATE Component
          SET isArchived = 1, archivedAt = ?, archivedById = ?, archivedByName = ?
          WHERE id = ?
          `,
          [nowIso(), req.body.archivedById || '', req.body.archivedByName || '', String(id)],
        );
      } else if (action === 'restore') {
        await run(
          `
          UPDATE Component
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

  // DELETE - Delete component
  if (req.method === 'DELETE') {
    try {
      const existing = await queryOne('SELECT name FROM Component WHERE id = ?', [String(id)]);
      if (!existing) {
        return res.status(404).json({ error: 'Component not found' });
      }

      await run('DELETE FROM Component WHERE id = ?', [String(id)]);

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}