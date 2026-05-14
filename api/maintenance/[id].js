import { createClient } from '@libsql/client';

const nowIso = () => new Date().toISOString();
const normalizeMaintenanceStatus = (value = '') => {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'pending') return 'Open';
  if (raw === 'in progress') return 'In Progress';
  if (raw === 'resolved') return 'Resolved';
  if (raw === 'closed') return 'Closed';
  if (raw === 'open') return 'Open';
  return 'Open';
};
const normalizeMaintenancePriority = (value = '') => {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'low') return 'Low';
  if (raw === 'high') return 'High';
  if (raw === 'critical') return 'Critical';
  return 'Medium';
};
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
    return res.status(400).json({ error: 'Maintenance ID is required' });
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

  // GET - Get single maintenance ticket
  if (req.method === 'GET') {
    try {
      const maintenance = await queryOne('SELECT * FROM Maintenance WHERE id = ?', [String(id)]);
      if (!maintenance) {
        return res.status(404).json({ error: 'Maintenance ticket not found' });
      }
      return res.status(200).json(maintenance);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // PUT - Update maintenance ticket
  if (req.method === 'PUT') {
    try {
      await getRequiredRow(db, 'Maintenance', id, 'Maintenance');

      const title = requireNonEmptyString(req.body.title, 'Title');
      const description = requireNonEmptyString(req.body.description, 'Description');
      const status = normalizeMaintenanceStatus(req.body.status || 'Open');
      const priority = normalizeMaintenancePriority(req.body.priority || 'Medium');
      const cost = requireNonNegativeNumber(req.body.cost ?? 0, 'Cost');
      const submittedAt = String(req.body.submittedAt || nowIso());
      const assetId = String(req.body.assetId || '').trim();
      const category = String(req.body.category || 'Other').trim() || 'Other';

      await run(
        `
        UPDATE Maintenance
        SET assetName = ?, issue = ?, status = ?, priority = ?, cost = ?, startDate = ?,
            title = ?, description = ?, submittedAt = ?, assetId = ?, category = ?, updatedAt = ?
        WHERE id = ?
        `,
        [
          assetId || title,
          description,
          status,
          priority,
          cost,
          submittedAt,
          title,
          description,
          submittedAt,
          assetId,
          category,
          nowIso(),
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
          UPDATE Maintenance
          SET isArchived = 1, archivedAt = ?, archivedById = ?, archivedByName = ?
          WHERE id = ?
          `,
          [nowIso(), req.body.archivedById || '', req.body.archivedByName || '', String(id)],
        );
      } else if (action === 'restore') {
        await run(
          `
          UPDATE Maintenance
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

  // DELETE - Delete maintenance ticket
  if (req.method === 'DELETE') {
    try {
      const existing = await queryOne('SELECT title, assetName FROM Maintenance WHERE id = ?', [String(id)]);
      if (!existing) {
        return res.status(404).json({ error: 'Maintenance ticket not found' });
      }

      await run('DELETE FROM Maintenance WHERE id = ?', [String(id)]);

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}