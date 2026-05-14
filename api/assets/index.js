import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

// Helper functions
const uid = () => randomUUID();
const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
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
const requireNonEmptyString = (value, label) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

export default async function handler(req, res) {
  // Initialize database
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

  // GET - List all assets
  if (req.method === 'GET') {
    try {
      const scope = parseScope(req.query.scope);
      const rows = await queryAll(
        `
        SELECT
          Asset.*,
          Employee.name AS assignedTo,
          Employee.employeeNumber AS assignedEmployeeNumber
        FROM Asset
        LEFT JOIN Employee ON Employee.id = Asset.employeeId
        WHERE ${archivedPredicate(scope, 'Asset.isArchived')}
        ORDER BY datetime(COALESCE(Asset.createdAt, Asset.updatedAt)) DESC
        `,
      );
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - Create new asset
  if (req.method === 'POST') {
    try {
      const name = requireNonEmptyString(req.body.name, 'Asset name');
      const tag = requireNonEmptyString(req.body.tag, 'Asset tag');
      const category = requireNonEmptyString(req.body.category, 'Asset category');

      const id = uid();

      await run(
        `
        INSERT INTO Asset (
          id, tag, name, category, status, serialNo, modelNo, manufacturer,
          unitCost, location, purchaseDate, notes, receipt, createdAt, updatedAt, isArchived
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
          id,
          tag,
          name,
          category,
          req.body.status || 'Available',
          req.body.serialNo || '',
          req.body.modelNo || '',
          req.body.manufacturer || '',
          Number(req.body.unitCost || 0),
          req.body.location || '',
          req.body.purchaseDate || null,
          req.body.notes || null,
          req.body.receipt || null,
          nowIso(),
          nowIso(),
        ],
      );

      return res.status(201).json({ id });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}