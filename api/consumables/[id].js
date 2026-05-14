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
    return res.status(400).json({ error: 'Consumable ID is required' });
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

  // GET - Get single consumable
  if (req.method === 'GET') {
    try {
      const consumable = await queryOne('SELECT * FROM Consumable WHERE id = ?', [String(id)]);
      if (!consumable) {
        return res.status(404).json({ error: 'Consumable not found' });
      }
      return res.status(200).json(consumable);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT - Update consumable
  if (req.method === 'PUT') {
    try {
      await getRequiredRow(db, 'Consumable', id, 'Consumable');

      const name = requireNonEmptyString(req.body.name, 'Consumable name');
      const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
      const remaining = requireNonNegativeNumber(req.body.remaining ?? 0, 'Remaining');
      
      if (remaining > total) {
        return res.status(400).json({ error: 'Remaining cannot exceed total.' });
      }

      await run(
        `
        UPDATE Consumable
        SET name = ?, category = ?, modelNo = ?, location = ?, itemNo = ?, orderNumber = ?,
            purchaseDate = ?, minQty = ?, total = ?, remaining = ?, unitCost = ?
        WHERE id = ?
        `,
        [
          name,
          req.body.category || '',
          req.body.modelNo || '',
          req.body.location || '',
          req.body.itemNo || '',
          req.body.orderNumber || '',
          req.body.purchaseDate || null,
          Number(req.body.minQty || 0),
          total,
          remaining,
          Number(req.body.unitCost || 0),
          String(id),
        ],
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // PATCH - Archive/Restore/Checkout
  if (req.method === 'PATCH') {
    try {
      const { action } = req.body;
      
      if (action === 'checkout') {
        const item = await getRequiredRow(db, 'Consumable', id, 'Consumable');
        const qty = Number(req.body.quantity || 1);
        const remaining = Number(item.remaining || 0);
        
        if (remaining < qty) {
          return res.status(400).json({ error: 'No stock available' });
        }
        
        await run('UPDATE Consumable SET remaining = ? WHERE id = ?', [remaining - qty, String(id)]);
      } else if (action === 'archive') {
        await run(
          `
          UPDATE Consumable
          SET isArchived = 1, archivedAt = ?, archivedById = ?, archivedByName = ?
          WHERE id = ?
          `,
          [nowIso(), req.body.archivedById || '', req.body.archivedByName || '', String(id)],
        );
      } else if (action === 'restore') {
        await run(
          `
          UPDATE Consumable
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

  // DELETE - Delete consumable
  if (req.method === 'DELETE') {
    try {
      const existing = await queryOne('SELECT name FROM Consumable WHERE id = ?', [String(id)]);
      if (!existing) {
        return res.status(404).json({ error: 'Consumable not found' });
      }

      await run('DELETE FROM Consumable WHERE id = ?', [String(id)]);

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}