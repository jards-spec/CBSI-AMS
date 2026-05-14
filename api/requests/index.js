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
const requireNonEmptyString = (value, label) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
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

  const run = async (sql, args = []) => {
    return await db.execute({ sql, args });
  };

  // GET - List all requests
  if (req.method === 'GET') {
    try {
      const scope = parseScope(req.query.scope);
      const rows = await queryAll(
        `
        SELECT * FROM Request
        WHERE ${archivedPredicate(scope, 'Request.isArchived')}
        ORDER BY datetime(createdAt) DESC
        `,
      );
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - Create new request
  if (req.method === 'POST') {
    try {
      const requestNumber = requireNonEmptyString(req.body.requestNumber, 'Request number');
      const requestorName = String(req.body.requestorName || 'System').trim();
      const department = String(req.body.department || 'Unassigned').trim();
      const managerName = String(req.body.managerName || '').trim();
      const dateSubmitted = String(req.body.dateSubmitted || nowIso());
      const items = Array.isArray(req.body.items) ? req.body.items : [];

      const id = uid();

      await run(
        `
        INSERT INTO Request (
          id, requestNumber, requestorName, department, managerName, dateSubmitted,
          items, status, submittedById, submittedByEmail, createdAt, isArchived
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
          id,
          requestNumber,
          requestorName,
          department,
          managerName,
          dateSubmitted,
          JSON.stringify(items),
          'Pending',
          req.body.submittedById || '',
          req.body.submittedByEmail || '',
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