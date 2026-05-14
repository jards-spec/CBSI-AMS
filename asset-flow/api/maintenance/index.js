import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const uid = () => randomUUID();
const nowIso = () => new Date().toISOString();
const parseScope = (value) => {
  const raw = String(value || 'active').toLowerCase();
  if (raw === 'archived') return 'archived';
  if (raw === 'all') return 'all';
  return 'active';
};
const archivedPredicate = (scope, columnRef = 'isArchived') => {
  if (scope === 'archived') return `COALESCE(${columnRef}, 0) = 1`;
  if (scope === 'all') return '1 = 1';
  return `COALESCE(${columnRef}, 0) = 0`;
};
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

export default async function handler(req, res) {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const queryAll = async (sql, args = []) => {
    const result = await db.execute({ sql, args });
    return result.rows || [];
  };

  const queryOne = async (sql, args = []) => {
    const rows = await queryAll(sql, args);
    return rows[0] || null;
  };

  const run = async (sql, args = []) => {
    return await db.execute({ sql, args });
  };

  // GET - List all maintenance tickets
  if (req.method === 'GET') {
    try {
      const scope = parseScope(req.query.scope);
      const rows = await queryAll(
        `
        SELECT * FROM Maintenance
        WHERE ${archivedPredicate(scope, 'Maintenance.isArchived')}
        ORDER BY datetime(COALESCE(submittedAt, createdAt, startDate)) DESC
        `,
      );
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - Create new maintenance ticket
  if (req.method === 'POST') {
    try {
      const title = requireNonEmptyString(req.body.title, 'Title');
      const description = requireNonEmptyString(req.body.description, 'Description');
      const status = normalizeMaintenanceStatus(req.body.status || 'Open');
      const priority = normalizeMaintenancePriority(req.body.priority || 'Medium');
      const cost = requireNonNegativeNumber(req.body.cost ?? 0, 'Cost');
      const assetId = String(req.body.assetId || '').trim();
      const category = String(req.body.category || 'Other').trim() || 'Other';
      const submittedAt = nowIso();

      const id = uid();

      await run(
        `
        INSERT INTO Maintenance (
          id, assetName, issue, status, priority, cost, startDate,
          title, description, submittedBy, submittedById, submittedAt,
          assetId, category, updatedAt, createdAt, isArchived
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
          id,
          assetId || title,
          description,
          status,
          priority,
          cost,
          submittedAt,
          title,
          description,
          req.body.submittedBy || 'System',
          req.body.submittedById || '',
          submittedAt,
          assetId,
          category,
          nowIso(),
          nowIso(),
        ],
      );

      return res.status(201).json({ id });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}