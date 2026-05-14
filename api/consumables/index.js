import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const uid = () => randomUUID();
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

  const run = async (sql, args = []) => {
    return await db.execute({ sql, args });
  };

  // GET - List all consumables
  if (req.method === 'GET') {
    try {
      const scope = parseScope(req.query.scope);
      const rows = await queryAll(
        `
        SELECT * FROM Consumable
        WHERE ${archivedPredicate(scope, 'Consumable.isArchived')}
        ORDER BY datetime(createdAt) DESC
        `,
      );
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - Create new consumable
  if (req.method === 'POST') {
    try {
      const name = requireNonEmptyString(req.body.name, 'Consumable name');
      const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
      const remaining = requireNonNegativeNumber(req.body.remaining ?? total, 'Remaining');
      
      if (remaining > total) {
        return res.status(400).json({ error: 'Remaining cannot exceed total.' });
      }

      const id = uid();

      await run(
        `
        INSERT INTO Consumable (
          id, name, category, modelNo, location, itemNo, orderNumber, purchaseDate,
          minQty, total, remaining, unitCost, createdAt, isArchived
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
          id,
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
          today(),
        ],
      );

      return res.status(201).json({ id });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}