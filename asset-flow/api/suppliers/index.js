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

  // GET - List all suppliers
  if (req.method === 'GET') {
    try {
      const scope = parseScope(req.query.scope);
      const rows = await queryAll(
        `
        SELECT * FROM Supplier
        WHERE ${archivedPredicate(scope, 'Supplier.isArchived')}
        ORDER BY datetime(createdAt) DESC, name ASC
        `,
      );
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - Create new supplier
  if (req.method === 'POST') {
    try {
      const name = requireNonEmptyString(req.body.name, 'Supplier name');
      const contactPerson = String(req.body.contactPerson || '').trim();
      const email = String(req.body.email || '').trim();
      const phone = String(req.body.phone || '').trim();
      const address = String(req.body.address || '').trim();
      const website = String(req.body.website || '').trim();
      const category = String(req.body.category || '').trim();
      const notes = String(req.body.notes || '').trim();

      const id = uid();

      await run(
        `
        INSERT INTO Supplier (
          id, name, contactPerson, email, phone, address, website, category, notes,
          createdAt, isArchived
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
          id,
          name,
          contactPerson,
          email,
          phone,
          address,
          website,
          category,
          notes,
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