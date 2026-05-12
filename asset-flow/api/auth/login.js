import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Helper functions
const normalizeEmployeeNumber = (value = '') => String(value).trim().toUpperCase();
const requireNonEmptyString = (value, label) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
const sanitizeEmployee = (row) => {
  if (!row) return row;
  const { password, ...safe } = row;
  return safe;
};
const isBcryptHash = (value = '') => /^\$2[aby]\$/.test(String(value));
const signAuthToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign(
    {
      sub: user.id,
      role: user.role || 'User',
      name: user.name,
      email: user.email,
      employeeNumber: user.employeeNumber || '',
      department: user.department || '',
    },
    secret,
    { expiresIn: '7d' },
  );
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

  const queryOne = async (sql, args = []) => {
    const result = await db.execute({ sql, args });
    return result.rows[0] || null;
  };

  try {
    // Get request body
    const { employeeNumber, password } = req.body;

    // Validate input
    const empNum = normalizeEmployeeNumber(requireNonEmptyString(employeeNumber, 'Employee Number'));
    const pass = requireNonEmptyString(password, 'Password');

    // Find employee
    const employee = await queryOne(
      'SELECT * FROM Employee WHERE upper(employeeNumber) = ? AND COALESCE(isArchived, 0) = 0',
      [empNum],
    );
    if (!employee) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Verify password
    const storedPassword = String(employee.password || '');
    let valid = false;

    if (isBcryptHash(storedPassword)) {
      valid = await bcrypt.compare(pass, storedPassword);
    } else {
      valid = storedPassword === pass;
    }

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Return success
    const safeUser = sanitizeEmployee(employee);
    const token = signAuthToken(safeUser);

    return res.status(200).json({ 
      success: true, 
      token, 
      user: safeUser 
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}