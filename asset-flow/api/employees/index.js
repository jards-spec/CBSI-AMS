import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

// Helper functions
const uid = () => randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
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
const normalizeRole = (value = '') => {
  const raw = String(value).trim();
  if (!raw) return 'User';
  if (raw === 'Viewer') return 'User';
  return raw;
};
const normalizeEmployeeNumber = (value = '') => String(value).trim().toUpperCase();
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

  // GET - List all employees
  if (req.method === 'GET') {
    try {
      const scope = parseScope(req.query.scope);
      const rows = await queryAll(
        `
        SELECT * FROM Employee
        WHERE ${archivedPredicate(scope, 'Employee.isArchived')}
        ORDER BY datetime(createdAt) DESC, name ASC
        `,
      );
      return res.status(200).json(rows);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - Create new employee
  if (req.method === 'POST') {
    try {
      const name = requireNonEmptyString(req.body.name, 'Name');
      const email = requireNonEmptyString(req.body.email, 'Email');
      const employeeNumber = normalizeEmployeeNumber(requireNonEmptyString(req.body.employeeNumber, 'Employee Number'));
      const password = requireNonEmptyString(req.body.password, 'Password');

      // Check for duplicate
      const duplicate = await queryOne(
        'SELECT id FROM Employee WHERE upper(employeeNumber) = ?',
        [employeeNumber],
      );
      if (duplicate) {
        return res.status(400).json({ error: 'Employee Number already exists' });
      }

      const id = uid();
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=38bdf8`;
      const hashedPassword = await bcrypt.hash(password, 12);

      await run(
        `
        INSERT INTO Employee (
          id, name, email, employeeNumber, password, department, role, avatar, createdAt, isArchived
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
          id,
          name,
          email,
          employeeNumber,
          hashedPassword,
          req.body.department || '',
          normalizeRole(req.body.role),
          avatar,
          today(),
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