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
    return res.status(400).json({ error: 'Supplier ID is required' });
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

  // GET - Get single supplier
  if (req.method === 'GET') {
    try {
      const supplier = await queryOne('SELECT * FROM Supplier WHERE id = ?', [String(id)]);
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      return res.status(200).json(supplier);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT - Update supplier
  if (req.method === 'PUT') {
    try {
      await getRequiredRow(db, 'Supplier', id, 'Supplier');

      const name = requireNonEmptyString(req.body.name, 'Supplier name');
      const contactPerson = String(req.body.contactPerson || '').trim();
      const email = String(req.body.email || '').trim();
      const phone = String(req.body.phone || '').trim();
      const address = String(req.body.address || '').trim();
      const website = String(req.body.website || '').trim();
      const category = String(req.body.category || '').trim();
      const notes = String(req.body.notes || '').trim();

      await run(
        `
        UPDATE Supplier
        SET name = ?, contactPerson = ?, email = ?, phone = ?, address = ?,
            website = ?, category = ?, notes = ?
        WHERE id = ?
        `,
        [
          name,
          contactPerson,
          email,
          phone,
          address,
          website,
          category,
          notes,
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
          UPDATE Supplier
          SET isArchived = 1, archivedAt = ?, archivedById = ?, archivedByName = ?
          WHERE id = ?
          `,
          [nowIso(), req.body.archivedById || '', req.body.archivedByName || '', String(id)],
        );
      } else if (action === 'restore') {
        await run(
          `
          UPDATE Supplier
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

  // DELETE - Delete supplier
  if (req.method === 'DELETE') {
    try {
      const existing = await queryOne('SELECT name FROM Supplier WHERE id = ?', [String(id)]);
      if (!existing) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      await run('DELETE FROM Supplier WHERE id = ?', [String(id)]);

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}