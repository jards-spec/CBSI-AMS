import { createClient } from '@libsql/client';

// Helper functions
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
  // Get asset ID from URL
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Asset ID is required' });
  }

  // Initialize database
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

  // GET - Get single asset
  if (req.method === 'GET') {
    try {
      const asset = await queryOne('SELECT * FROM Asset WHERE id = ?', [String(id)]);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      return res.status(200).json(asset);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT - Update asset
  if (req.method === 'PUT') {
    try {
      // Verify asset exists
      await getRequiredRow(db, 'Asset', id, 'Asset');

      const name = requireNonEmptyString(req.body.name, 'Asset name');
      const tag = requireNonEmptyString(req.body.tag, 'Asset tag');
      const category = requireNonEmptyString(req.body.category, 'Asset category');

      await run(
        `
        UPDATE Asset
        SET tag = ?, name = ?, category = ?, status = ?, employeeId = ?, serialNo = ?, modelNo = ?,
            manufacturer = ?, unitCost = ?, location = ?, purchaseDate = ?, notes = ?, receipt = ?, updatedAt = ?
        WHERE id = ?
        `,
        [
          tag,
          name,
          category,
          req.body.status || 'Available',
          req.body.employeeId || null,
          req.body.serialNo || '',
          req.body.modelNo || '',
          req.body.manufacturer || '',
          Number(req.body.unitCost || 0),
          req.body.location || '',
          req.body.purchaseDate || null,
          req.body.notes || null,
          req.body.receipt || null,
          nowIso(),
          String(id),
        ],
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // DELETE - Delete asset
  if (req.method === 'DELETE') {
    try {
      // Verify asset exists
      const existing = await queryOne('SELECT tag, name FROM Asset WHERE id = ?', [String(id)]);
      if (!existing) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      await run('DELETE FROM Asset WHERE id = ?', [String(id)]);

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}