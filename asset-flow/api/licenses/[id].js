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
    return res.status(400).json({ error: 'License ID is required' });
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

  // GET - Get single license
  if (req.method === 'GET') {
    try {
      const license = await queryOne('SELECT * FROM License WHERE id = ?', [String(id)]);
      if (!license) {
        return res.status(404).json({ error: 'License not found' });
      }
      return res.status(200).json(license);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT - Update license
  if (req.method === 'PUT') {
    try {
      const existingLicense = await getRequiredRow(db, 'License', id, 'License');
      const keyToStore = Object.prototype.hasOwnProperty.call(req.body, 'key')
        ? String(req.body.key || '')
        : String(existingLicense.key || '');

      const name = requireNonEmptyString(req.body.name, 'License name');
      const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
      const avail = requireNonNegativeNumber(req.body.avail ?? 0, 'Available');
      
      if (avail > total) {
        return res.status(400).json({ error: 'Available cannot exceed total.' });
      }

      await run(
        `
        UPDATE License
        SET name = ?, key = ?, manufacturer = ?, licensedEmail = ?,
            expirationDate = ?, minQty = ?, total = ?, avail = ?, unitCost = ?
        WHERE id = ?
        `,
        [
          name,
          keyToStore,
          req.body.manufacturer || '',
          req.body.licensedEmail || '',
          req.body.expirationDate || null,
          Number(req.body.minQty || 0),
          total,
          avail,
          Number(req.body.unitCost || 0),
          String(id),
        ],
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // PATCH - Archive/Restore
  if (req.method === 'PATCH') {
    try {
      const { action } = req.body;
      
      if (action === 'archive') {
        await run(
          `
          UPDATE License
          SET isArchived = 1, archivedAt = ?, archivedById = ?, archivedByName = ?
          WHERE id = ?
          `,
          [nowIso(), req.body.archivedById || '', req.body.archivedByName || '', String(id)],
        );
      } else if (action === 'restore') {
        await run(
          `
          UPDATE License
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

  // DELETE - Delete license
  if (req.method === 'DELETE') {
    try {
      const existing = await queryOne('SELECT name FROM License WHERE id = ?', [String(id)]);
      if (!existing) {
        return res.status(404).json({ error: 'License not found' });
      }

      await run('DELETE FROM License WHERE id = ?', [String(id)]);

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}