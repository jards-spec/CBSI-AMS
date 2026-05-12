import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Helper functions
const uid = () => randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const normalizeEmployeeNumber = (value = '') => String(value).trim().toUpperCase();
const requireNonEmptyString = (value, label) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
const normalizeRole = (value = '') => {
  const raw = String(value).trim();
  if (!raw) return 'User';
  return raw;
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialize database
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const run = async (sql, args = []) => {
    return await db.execute({ sql, args });
  };

  const queryOne = async (sql, args = []) => {
    const result = await db.execute({ sql, args });
    return result.rows[0] || null;
  };

  try {
    // Get request body
    const { name, email, employeeNumber, department, password } = req.body;

    // Validate input
    const empName = requireNonEmptyString(name, 'Name');
    const empEmail = requireNonEmptyString(email, 'Email');
    const empNum = normalizeEmployeeNumber(requireNonEmptyString(employeeNumber, 'Employee Number'));
    const dept = String(department || 'Unassigned').trim();
    const pass = String(password || '');

    // Password validation
    if (pass.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check for duplicate employee number
    const duplicate = await queryOne(
      'SELECT id FROM Employee WHERE upper(employeeNumber) = ?',
      [empNum],
    );
    if (duplicate) {
      return res.status(400).json({ error: 'Employee Number already exists' });
    }

    // Generate ID and avatar
    const id = uid();
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=0f172a&color=38bdf8`;

    // Hash password
    const hashedPassword = await bcrypt.hash(pass, 12);

    // Insert new employee
    await run(
      `
      INSERT INTO Employee (
        id, name, email, employeeNumber, password, department, role, avatar, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `,
      [
        id,
        empName,
        empEmail,
        empNum,
        hashedPassword,
        dept,
        'User',
        avatar,
        today(),
      ],
    );

    // Get created employee
    const created = await queryOne('SELECT * FROM Employee WHERE id = ?', [id]);

    // Remove password from response
    const { password: _, ...safeUser } = created;

    return res.status(201).json({
      success: true,
      user: safeUser,
      message: 'Account created successfully.',
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}