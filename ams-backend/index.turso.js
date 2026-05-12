require('dotenv').config();
const { encryptString, decryptString } = require('./crypto-utils');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');
const { randomUUID, randomBytes, createHash } = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const {
  sendAssetAssignmentEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  isMailerConfigured,
} = require('./mailer');

const app = express();

// CORS - Allow all origins for development
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const helmet = require('helmet');

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const uid = () => randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

const queryAll = async (sql, args = []) => {
  const res = await db.execute({ sql, args });
  return res.rows || [];
};

const queryOne = async (sql, args = []) => {
  const rows = await queryAll(sql, args);
  return rows[0] || null;
};

const run = async (sql, args = []) => db.execute({ sql, args });

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

const assignmentStatusPredicate = (value, column = 'status') => {
  const raw = String(value || 'active').toLowerCase();
  if (raw === 'removed') return `${column} = 'REMOVED'`;
  if (raw === 'all') return '1 = 1';
  return `${column} = 'ACTIVE'`;
};

const safeJsonParse = (value, fallback = []) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeRole = (value = '') => {
  const raw = String(value).trim();
  if (!raw) return 'User';
  if (raw === 'Viewer') return 'User';
  return raw;
};

const normalizeEmployeeNumber = (value = '') => String(value).trim().toUpperCase();

const isPrivilegedRole = (role = '') => {
  const normalized = String(role).trim().toLowerCase();
  return ['admin', 'superuser', 'super admin', 'it admin', 'manager'].includes(normalized);
};

const canRevealLicenseKeyRole = (role = '') => {
  const normalized = String(role).trim().toLowerCase();
  return ['admin', 'superuser', 'super admin'].includes(normalized);
};

const verifyStoredPassword = async (employee, plainPassword) => {
  const storedPassword = String(employee?.password || '');
  if (!storedPassword) return false;

  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(plainPassword, storedPassword);
  }

  const valid = storedPassword === plainPassword;
  if (valid) {
    const migratedHash = await bcrypt.hash(plainPassword, 12);
    await run('UPDATE Employee SET password = ? WHERE id = ?', [migratedHash, employee.id]);
  }

  return valid;
};

const normalizeResourceType = (value = '') => {
  const raw = String(value).trim().toLowerCase();
  const singular = raw.endsWith('s') ? raw.slice(0, -1) : raw;
  if (singular === 'asset') return 'asset';
  if (singular === 'component') return 'component';
  if (singular === 'accessory') return 'accessory';
  if (singular === 'consumable') return 'consumable';
  if (singular === 'license') return 'license';
  return singular;
};

const normalizeQuantity = (value) => {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const getAssetAuditLabel = (asset, fallbackId = '') => {
  const tag = String(asset?.tag || '').trim();
  const name = String(asset?.name || '').trim();

  if (tag && name) return `${tag} (${name})`;
  if (tag) return tag;
  if (name) return name;
  return `Asset ID ${fallbackId}`;
};

const sanitizeEmployee = (row) => {
  if (!row) return row;

  const {
    password,
    emailVerificationToken,
    emailVerificationExpiresAt,
    passwordResetToken,
    passwordResetExpiresAt,
    phoneEnc,
    jobTitleEnc,
    ...safe
  } = row;

  return {
    ...safe,
    phone: phoneEnc ? decryptString(phoneEnc) : (row.phone || ''),
    jobTitle: jobTitleEnc ? decryptString(jobTitleEnc) : (row.jobTitle || ''),
  };
};

// Password strength validation
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

const isBcryptHash = (value = '') => /^\$2[aby]\$/.test(String(value));

const serializeProfile = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  employeeNumber: row.employeeNumber || '',
  department: row.department || '',
  role: row.role || 'User',
  avatar: row.avatar || '',
  phone: row.phoneEnc ? decryptString(row.phoneEnc) : (row.phone || ''),
  jobTitle: row.jobTitleEnc ? decryptString(row.jobTitleEnc) : (row.jobTitle || ''),
  createdAt: row.createdAt || '',
});

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

const serializeMaintenance = (row) => ({
  id: row.id,
  title: row.title || row.assetName || 'Untitled Ticket',
  description: row.description || row.issue || '',
  priority: normalizeMaintenancePriority(row.priority || 'Medium'),
  status: normalizeMaintenanceStatus(row.status || 'Open'),
  submittedBy: row.submittedBy || 'System',
  submittedById: row.submittedById || '',
  submittedAt: row.submittedAt || row.createdAt || row.startDate || '',
  assetId: row.assetId || '',
  category: row.category || 'Other',
  cost: Number(row.cost || 0),
  isArchived: Number(row.isArchived || 0),
  archivedAt: row.archivedAt || null,
  archivedById: row.archivedById || null,
  archivedByName: row.archivedByName || null,
});

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

const writeAuditLog = async ({ type, entity, message, user = 'SYSTEM' }) => {
  await run(
    `
    INSERT INTO AuditLog (id, timestamp, type, entity, message, user, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [uid(), new Date().toLocaleString(), type, entity, message, user, nowIso()],
  );
};

const writeNotification = async ({
  employeeId,
  title,
  message,
  type = 'ASSET_ASSIGNMENT',
  metadata = null,
  status = 'PENDING',
}) => {
  await run(
    `
    INSERT INTO Notification (id, employeeId, type, title, message, metadata, isRead, status, confirmedAt, confirmedById, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, NULL, ?)
    `,
    [
      uid(),
      String(employeeId),
      String(type),
      String(title),
      String(message),
      metadata ? JSON.stringify(metadata) : null,
      String(status),
      nowIso(),
    ],
  );
};

const getRequiredRow = async (table, id, label = 'Record') => {
  const row = await queryOne(`SELECT * FROM ${table} WHERE id = ?`, [String(id)]);
  if (!row) throw new Error(`${label} not found`);
  return row;
};

const ensureNotArchived = (row, label = 'Record') => {
  if (Number(row?.isArchived || 0) === 1) throw new Error(`${label} is archived`);
};

const getActorMeta = (req) => ({
  actorId: req.user?.sub || '',
  actorName: req.user?.name || req.user?.email || req.user?.role || 'SYSTEM',
});

const isEmailVerificationRequired = () =>
  String(process.env.EMAIL_VERIFICATION_REQUIRED || 'true').toLowerCase() !== 'false';

const verificationTtlHours = () =>
  Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 24);

const createEmailVerificationToken = () => randomBytes(32).toString('hex');

const createEmailVerificationExpiry = () => {
  const hours = verificationTtlHours();
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
};

const buildEmailVerificationUrl = (token) => {
  const base =
    process.env.API_PUBLIC_BASE_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    'http://localhost:5000';
  return `${String(base).replace(/\/+$/, '')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
};

const passwordResetTtlMinutes = () =>
  Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60);

const createPasswordResetToken = () =>
  randomBytes(32).toString('hex');

const createPasswordResetExpiry = () => {
  const minutes = passwordResetTtlMinutes();
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
};

const hashToken = (token) =>
  createHash('sha256').update(String(token)).digest('hex');

const buildPasswordResetUrl = (token) => {
  const base =
    process.env.FRONTEND_PUBLIC_URL ||
    'http://localhost:5173';

  return `${String(base).replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
};

const ensurePasswordResetColumns = async () => {
  const columns = await queryAll('PRAGMA table_info(Employee)');
  const names = new Set(columns.map((c) => String(c.name)));

  if (!names.has('passwordResetToken')) {
    await run('ALTER TABLE Employee ADD COLUMN passwordResetToken TEXT');
  }

  if (!names.has('passwordResetExpiresAt')) {
    await run('ALTER TABLE Employee ADD COLUMN passwordResetExpiresAt TEXT');
  }
};

const ensureNotificationTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS Notification (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      isRead INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      confirmedAt TEXT,
      confirmedById TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  const columns = await queryAll('PRAGMA table_info(Notification)');
  const names = new Set(columns.map((c) => String(c.name)));

  if (!names.has('status')) {
    await run(`ALTER TABLE Notification ADD COLUMN status TEXT DEFAULT 'PENDING'`);
  }
  if (!names.has('confirmedAt')) {
    await run(`ALTER TABLE Notification ADD COLUMN confirmedAt TEXT`);
  }
  if (!names.has('confirmedById')) {
    await run(`ALTER TABLE Notification ADD COLUMN confirmedById TEXT`);
  }

  await run('CREATE INDEX IF NOT EXISTS idx_notification_employee_created ON Notification(employeeId, createdAt DESC)');
  await run('CREATE INDEX IF NOT EXISTS idx_notification_employee_read ON Notification(employeeId, isRead)');
};

const ensureLicenseAssignmentTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS LicenseAssignment (
      id TEXT PRIMARY KEY,
      licenseId TEXT NOT NULL,
      employeeId TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      assignedAt TEXT NOT NULL,
      assignedById TEXT,
      assignedByName TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      returnedAt TEXT,
      returnedById TEXT,
      returnedByName TEXT,
      notes TEXT
    )
  `);

  await run('CREATE INDEX IF NOT EXISTS idx_license_assignment_license_status ON LicenseAssignment(licenseId, status)');
  await run('CREATE INDEX IF NOT EXISTS idx_license_assignment_employee_status ON LicenseAssignment(employeeId, status)');
};

const ensureEmployeeVerificationColumns = async () => {
  const columns = await queryAll('PRAGMA table_info(Employee)');
  const names = new Set(columns.map((c) => String(c.name)));

  if (!names.has('emailVerified')) {
    await run('ALTER TABLE Employee ADD COLUMN emailVerified INTEGER DEFAULT 0');
  }
  if (!names.has('emailVerificationToken')) {
    await run('ALTER TABLE Employee ADD COLUMN emailVerificationToken TEXT');
  }
  if (!names.has('emailVerificationExpiresAt')) {
    await run('ALTER TABLE Employee ADD COLUMN emailVerificationExpiresAt TEXT');
  }
  if (!names.has('emailVerifiedAt')) {
    await run('ALTER TABLE Employee ADD COLUMN emailVerifiedAt TEXT');
  }

  if (!isEmailVerificationRequired()) {
    await run(`
      UPDATE Employee
      SET emailVerified = 1
      WHERE emailVerified IS NULL OR emailVerified = 0
    `);
  } else {
    await run(`
      UPDATE Employee
      SET emailVerified = 0
      WHERE emailVerified IS NULL
    `);
  }
};

const notifyAssetAssignment = async ({
  employeeId,
  assetId,
  req,
  checkoutDate,
  expectedCheckinDate,
  location,
}) => {
  try {
    if (!employeeId || !assetId) return;

    const employee = await queryOne(
      `
      SELECT id, name, email
      FROM Employee
      WHERE id = ? AND COALESCE(isArchived, 0) = 0
      `,
      [String(employeeId)],
    );

    if (!employee) return;

    const asset = await queryOne(
      `
      SELECT id, tag, name, location
      FROM Asset
      WHERE id = ?
      `,
      [String(assetId)],
    );

    if (!asset) return;

    if (employee.email && isMailerConfigured()) {
      await sendAssetAssignmentEmail({
        to: String(employee.email),
        employeeName: employee.name || '',
        assetTag: asset.tag || '',
        assetName: asset.name || '',
        assignedByName: req.user?.name || req.user?.email || req.user?.role || 'System',
        checkoutDate: checkoutDate || today(),
        expectedCheckinDate: expectedCheckinDate || '',
        location: location || asset.location || '',
      });
    }

    await writeNotification({
      employeeId: employee.id,
      title: 'Asset Assigned',
      message: `${asset.tag || asset.id} - ${asset.name || 'Asset'} has been assigned to you.`,
      type: 'ASSET_ASSIGNMENT',
      metadata: {
        assetId: String(asset.id),
        assetTag: asset.tag || '',
        assetName: asset.name || '',
        checkoutDate: checkoutDate || today(),
        expectedCheckinDate: expectedCheckinDate || '',
        location: location || asset.location || '',
      },
    });
  } catch (err) {
    console.error('Asset assignment email failed:', err.message);
  }
};

const archiveRecord = async ({ table, id, entity, message, label }, req) => {
  const row = await getRequiredRow(table, id, label || table);
  const actor = getActorMeta(req);

  await run(
    `
    UPDATE ${table}
    SET isArchived = 1, archivedAt = ?, archivedById = ?, archivedByName = ?
    WHERE id = ?
    `,
    [nowIso(), actor.actorId, actor.actorName, String(id)],
  );

  await writeAuditLog({
    type: 'ARCHIVED',
    entity: typeof entity === 'function' ? entity(row) : entity,
    message: typeof message === 'function' ? message(row) : message,
    user: actor.actorName,
  });

  return queryOne(`SELECT * FROM ${table} WHERE id = ?`, [String(id)]);
};

const restoreRecord = async ({ table, id, entity, message, label }, req) => {
  const row = await getRequiredRow(table, id, label || table);
  const actor = getActorMeta(req);

  await run(
    `
    UPDATE ${table}
    SET isArchived = 0, archivedAt = NULL, archivedById = NULL, archivedByName = NULL
    WHERE id = ?
    `,
    [String(id)],
  );

  await writeAuditLog({
    type: 'RESTORED',
    entity: typeof entity === 'function' ? entity(row) : entity,
    message: typeof message === 'function' ? message(row) : message,
    user: actor.actorName,
  });

  return queryOne(`SELECT * FROM ${table} WHERE id = ?`, [String(id)]);
};

const badRequest = (res, message) => res.status(400).json({ error: message });

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

const requireAuth = async (req, res, next) => {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT auth is not configured.' });

    const authHeader = String(req.headers.authorization || '').trim();
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header.' });

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authorization must be: Bearer <token>' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired.' });
      return res.status(401).json({ error: 'Invalid token.' });
    }

    const userId = String(decoded?.sub || '').trim();
    if (!userId) return res.status(401).json({ error: 'Token payload missing sub.' });

    const employee = await queryOne(
      `
      SELECT id, role, name, email, employeeNumber, department
      FROM Employee
      WHERE id = ? AND COALESCE(isArchived, 0) = 0
      `,
      [userId],
    );

    if (!employee) return res.status(401).json({ error: 'Authenticated user not found.' });

    req.user = {
      sub: String(employee.id),
      role: normalizeRole(employee.role || 'User'),
      name: employee.name || '',
      email: employee.email || '',
      employeeNumber: employee.employeeNumber || '',
      department: employee.department || '',
    };

    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!isPrivilegedRole(req.user?.role || 'User')) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  return next();
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Try again later.' },
});

app.get('/', (_req, res) => {
  res.send('AssetFlow API (Turso) Active');
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});

// Apply to all API routes
app.use('/api', apiLimiter);

app.get('/api/health/db', async (_req, res) => {
  try {
    const row = await queryOne('SELECT 1 as ok');
    res.json({ ok: true, db: row });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// AUTH (PUBLIC)
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const name = requireNonEmptyString(req.body.name, 'Name');
    const email = requireNonEmptyString(req.body.email, 'Email');
    const employeeNumber = normalizeEmployeeNumber(requireNonEmptyString(req.body.employeeNumber, 'Employee Number'));
    const department = String(req.body.department || 'Unassigned').trim();
    const password = String(req.body.password || '');

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
    return badRequest(res, passwordValidation.errors.join('. '));
    }

    const duplicate = await queryOne(
      'SELECT id FROM Employee WHERE upper(employeeNumber) = ?',
      [employeeNumber],
    );
    if (duplicate) return badRequest(res, 'Employee Number already exists');

    const id = uid();
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=38bdf8`;
    const hashedPassword = await bcrypt.hash(password, 12);

    const requireVerification = isEmailVerificationRequired();
    const verificationToken = requireVerification ? createEmailVerificationToken() : null;
    const verificationExpiresAt = requireVerification ? createEmailVerificationExpiry() : null;
    const emailVerified = requireVerification ? 0 : 1;
    const emailVerifiedAt = requireVerification ? null : nowIso();

    await run(
      `
      INSERT INTO Employee (
        id, name, email, employeeNumber, password, department, role, avatar, createdAt, isArchived,
        phone, jobTitle, emailVerified, emailVerificationToken, emailVerificationExpiresAt, emailVerifiedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '', '', ?, ?, ?, ?)
      `,
      [
        id,
        name,
        email,
        employeeNumber,
        hashedPassword,
        department,
        'User',
        avatar,
        today(),
        emailVerified,
        verificationToken,
        verificationExpiresAt,
        emailVerifiedAt,
      ],
    );

    if (requireVerification && verificationToken && isMailerConfigured()) {
      const verifyUrl = buildEmailVerificationUrl(verificationToken);
      await sendEmailVerificationEmail({
        to: email,
        name,
        verifyUrl,
      });
    }

    const created = await queryOne('SELECT * FROM Employee WHERE id = ?', [id]);
    return res.status(201).json({
      success: true,
      user: sanitizeEmployee(created),
      requiresEmailVerification: requireVerification,
      message: requireVerification
        ? 'Account created. Please verify your email before signing in.'
        : 'Account created successfully.',
    });
  } catch (e) {
    return badRequest(res, e.message);
  }
});

app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) return badRequest(res, 'Verification token is required.');

    const employee = await queryOne(
      'SELECT * FROM Employee WHERE emailVerificationToken = ?',
      [token],
    );
    if (!employee) return badRequest(res, 'Invalid verification token.');

    if (Number(employee.emailVerified || 0) === 1) {
      return res.json({ success: true, message: 'Email is already verified.' });
    }

    const expiresAt = String(employee.emailVerificationExpiresAt || '').trim();
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      return badRequest(res, 'Verification token has expired. Please request a new one.');
    }

    await run(
      `
      UPDATE Employee
      SET emailVerified = 1,
          emailVerifiedAt = ?,
          emailVerificationToken = NULL,
          emailVerificationExpiresAt = NULL
      WHERE id = ?
      `,
      [nowIso(), String(employee.id)],
    );

    return res.json({ success: true, message: 'Email verified successfully. You can now sign in.' });
  } catch (e) {
    return badRequest(res, e.message);
  }
});

app.post('/api/auth/resend-verification', authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const employeeNumber = normalizeEmployeeNumber(req.body.employeeNumber || '');

    if (!email && !employeeNumber) {
      return badRequest(res, 'Email or Employee Number is required.');
    }

    const employee = await queryOne(
      `
      SELECT * FROM Employee
      WHERE COALESCE(isArchived, 0) = 0
        AND (
          (? != '' AND lower(email) = ?)
          OR (? != '' AND upper(employeeNumber) = ?)
        )
      LIMIT 1
      `,
      [email, email, employeeNumber, employeeNumber],
    );

    if (!employee) {
      return res.json({ success: true, message: 'If the account exists, a verification email was sent.' });
    }

    if (Number(employee.emailVerified || 0) === 1) {
      return res.json({ success: true, message: 'Email is already verified.' });
    }

    const token = createEmailVerificationToken();
    const expiresAt = createEmailVerificationExpiry();

    await run(
      `
      UPDATE Employee
      SET emailVerificationToken = ?, emailVerificationExpiresAt = ?
      WHERE id = ?
      `,
      [token, expiresAt, String(employee.id)],
    );

    if (isMailerConfigured()) {
      const verifyUrl = buildEmailVerificationUrl(token);
      await sendEmailVerificationEmail({
        to: employee.email,
        name: employee.name || '',
        verifyUrl,
      });
    }

    return res.json({
      success: true,
      message: isMailerConfigured()
        ? 'Verification email sent.'
        : 'Verification email could not be sent because SMTP is not configured.',
    });
  } catch (e) {
    return badRequest(res, e.message);
  }
});



// Login attempt tracking
const loginAttempts = new Map();
const maxLoginAttempts = 5;
const lockoutTime = 15 * 60 * 1000; // 15 minutes

const checkLoginAttempts = (employeeNumber) => {
  const attempts = loginAttempts.get(employeeNumber);
  if (!attempts) return { allowed: true };
  
  if (attempts.count >= maxLoginAttempts) {
    if (Date.now() - attempts.lastAttempt < lockoutTime) {
      return { 
        allowed: false, 
        lockoutRemaining: Math.ceil((lockoutTime - (Date.now() - attempts.lastAttempt)) / 60000) 
      };
    }
    loginAttempts.delete(employeeNumber);
  }
  return { allowed: true };
};

const recordLoginAttempt = (employeeNumber, success) => {
  if (success) {
    loginAttempts.delete(employeeNumber);
    return;
  }
  
  const attempts = loginAttempts.get(employeeNumber) || { count: 0, lastAttempt: Date.now() };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(employeeNumber, attempts);
};

// Login route
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const employeeNumber = normalizeEmployeeNumber(requireNonEmptyString(req.body.employeeNumber, 'Employee Number'));
    const password = requireNonEmptyString(req.body.password, 'Password');

    const employee = await queryOne(
      'SELECT * FROM Employee WHERE upper(employeeNumber) = ? AND COALESCE(isArchived, 0) = 0',
      [employeeNumber],
    );
if (!employee) {
  recordLoginAttempt(employeeNumber, false);
  return res.status(401).json({ error: 'Invalid credentials.' });
}
    if (isEmailVerificationRequired() && Number(employee.emailVerified || 0) !== 1) {
      return res.status(403).json({
        error: 'Please verify your email before signing in.',
        requiresEmailVerification: true,
      });
    }

    const storedPassword = String(employee.password || '');
    let valid = false;

    if (isBcryptHash(storedPassword)) {
      valid = await bcrypt.compare(password, storedPassword);
    } else {
      valid = storedPassword === password;
      if (valid) {
        const migratedHash = await bcrypt.hash(password, 12);
        await run('UPDATE Employee SET password = ? WHERE id = ?', [migratedHash, employee.id]);
      }
    }

if (!valid) {
  recordLoginAttempt(employeeNumber, false);
  return res.status(401).json({ error: 'Invalid credentials.' });
}

// Record successful login BEFORE returning
recordLoginAttempt(employeeNumber, true);

const fresh = await queryOne('SELECT * FROM Employee WHERE id = ?', [employee.id]);
const safeUser = sanitizeEmployee(fresh);
const token = signAuthToken(safeUser);

return res.json({ success: true, token, user: safeUser });
  } catch (e) {
    return badRequest(res, e.message);
  }
});

// FORGOT PASSWORD
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const email = requireNonEmptyString(req.body.email, 'Email').trim().toLowerCase();
    const employeeNumber = normalizeEmployeeNumber(
      requireNonEmptyString(req.body.employeeNumber, 'Employee Number')
    );

    const employee = await queryOne(
      `
      SELECT * FROM Employee
      WHERE upper(employeeNumber) = ?
        AND COALESCE(isArchived, 0) = 0
      LIMIT 1
      `,
      [employeeNumber],
    );

    if (!employee) {
      return res.status(404).json({ error: 'Employee Number not found.' });
    }

    const storedEmail = String(employee.email || '').trim().toLowerCase();
    if (!storedEmail || storedEmail !== email) {
      return res.status(400).json({ error: 'Email does not match the Employee Number.' });
    }

    const rawToken = createPasswordResetToken();
    const hashedToken = hashToken(rawToken);
    const expiresAt = createPasswordResetExpiry();

    await run(
      `
      UPDATE Employee
      SET passwordResetToken = ?, passwordResetExpiresAt = ?
      WHERE id = ?
      `,
      [hashedToken, expiresAt, String(employee.id)],
    );

    if (isMailerConfigured()) {
      const resetUrl = buildPasswordResetUrl(rawToken);
      await sendPasswordResetEmail({
        to: employee.email,
        name: employee.name || '',
        resetUrl,
      });
    } else {
      console.log('Password Reset URL:', buildPasswordResetUrl(rawToken));
    }

    return res.json({
      success: true,
      message: 'Password reset link sent. Please check your email.',
    });
  } catch (e) {
    return badRequest(res, e.message);
  }
});

// RESET PASSWORD
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');

    if (!token) return badRequest(res, 'Reset token is required.');
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
    return badRequest(res, passwordValidation.errors.join('. '));
    }

    const hashedToken = hashToken(token);

    const employee = await queryOne(
      `SELECT * FROM Employee WHERE passwordResetToken = ?`,
      [hashedToken],
    );

    if (!employee)
      return badRequest(res, 'Invalid or expired reset token.');

    if (
      !employee.passwordResetExpiresAt ||
      new Date(employee.passwordResetExpiresAt).getTime() < Date.now()
    ) {
      return badRequest(res, 'Reset token has expired.');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await run(
      `UPDATE Employee
       SET password = ?,
           passwordResetToken = NULL,
           passwordResetExpiresAt = NULL
       WHERE id = ?`,
      [hashedPassword, employee.id],
    );

    return res.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (e) {
    return badRequest(res, e.message);
  }
});

// Global API auth gate
app.use('/api', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();

  const path = req.path;
  const isPublic =
    path === '/auth/login' ||
    path === '/auth/register' ||
    path === '/auth/verify-email' ||
    path === '/auth/resend-verification' ||
    path === '/auth/forgot-password' ||
    path === '/auth/reset-password' ||
    path === '/health/db';

  if (isPublic) return next();
  return requireAuth(req, res, next);
});

// ASSETS
app.get('/api/assets', requireAdmin, async (req, res) => {
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
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/assets/:id/attachments', async (req, res) => {
  try {
    const asset = await queryOne('SELECT id FROM Asset WHERE id = ?', [req.params.id]);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const components = await queryAll(
      `
      SELECT
        ca.*,
        Component.name AS itemName,
        Component.category,
        Component.model
      FROM ComponentAssignment ca
      LEFT JOIN Component ON Component.id = ca.componentId
      WHERE ca.assetId = ?
        AND ca.status = 'ACTIVE'
      ORDER BY datetime(ca.assignedAt) DESC
      `,
      [String(req.params.id)],
    );

    const accessories = await queryAll(
      `
      SELECT
        aa.*,
        Accessory.name AS itemName,
        Accessory.category,
        Accessory.modelNo,
        Accessory.location
      FROM AccessoryAssignment aa
      LEFT JOIN Accessory ON Accessory.id = aa.accessoryId
      WHERE aa.assetId = ?
        AND aa.status = 'ACTIVE'
      ORDER BY datetime(aa.assignedAt) DESC
      `,
      [String(req.params.id)],
    );

    res.json({ components, accessories });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.post('/api/assets', requireAdmin, async (req, res) => {
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

    await writeAuditLog({
      type: 'ADDED',
      entity: name,
      message: `${tag} registered in assets`,
      user: getActorMeta(req).actorName,
    });

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.put('/api/assets/:id', requireAdmin, async (req, res) => {
  try {
    const existingAsset = await getRequiredRow('Asset', req.params.id, 'Asset');
    const name = requireNonEmptyString(req.body.name, 'Asset name');
    const tag = requireNonEmptyString(req.body.tag, 'Asset tag');
    const category = requireNonEmptyString(req.body.category, 'Asset category');

    await run(
      `
      UPDATE Asset
      SET tag = ?, name = ?, category = ?, status = ?, employeeId = ?, serialNo = ?, modelNo = ?,
          manufacturer = ?, unitCost = ?, location = ?, purchaseDate = ?, notes = ?, receipt = ?, updatedAt = ?
      WHERE id = ?
      `,
      [
        tag,
        name,
        category,
        req.body.status || 'Available',
        req.body.employeeId || null,
        req.body.serialNo || '',
        req.body.modelNo || '',
        req.body.manufacturer || '',
        Number(req.body.unitCost || 0),
        req.body.location || '',
        req.body.purchaseDate || null,
        req.body.notes || null,
        req.body.receipt || null,
        nowIso(),
        String(req.params.id),
      ],
    );

    const nextEmployeeId = req.body.employeeId || null;
    const previousEmployeeId = existingAsset.employeeId || null;

    if (nextEmployeeId && String(nextEmployeeId) !== String(previousEmployeeId || '')) {
      await notifyAssetAssignment({
        employeeId: nextEmployeeId,
        assetId: req.params.id,
        req,
        checkoutDate: req.body.checkoutDate || today(),
        expectedCheckinDate: req.body.expectedCheckinDate || null,
        location: req.body.location || '',
      });
    }

    await writeAuditLog({
      type: 'UPDATED',
      entity: name,
      message: `${tag} asset record updated`,
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/assets/:id/archive', requireAdmin, async (req, res) => {
  try {
    const item = await archiveRecord(
      {
        table: 'Asset',
        id: req.params.id,
        entity: (row) => row.name || row.tag || 'Asset',
        message: (row) => `${row.tag || row.name} archived from assets`,
        label: 'Asset',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/assets/:id/restore', requireAdmin, async (req, res) => {
  try {
    const item = await restoreRecord(
      {
        table: 'Asset',
        id: req.params.id,
        entity: (row) => row.name || row.tag || 'Asset',
        message: (row) => `${row.tag || row.name} restored to assets`,
        label: 'Asset',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/assets/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await queryOne('SELECT tag, name FROM Asset WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Asset not found' });

    await run('DELETE FROM Asset WHERE id = ?', [String(req.params.id)]);

    await writeAuditLog({
      type: 'DELETED',
      entity: existing.name || 'Asset',
      message: `${existing.tag || existing.name} removed from assets`,
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// EMPLOYEES
app.get('/api/employees', requireAdmin, async (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    const rows = await queryAll(
      `
      SELECT * FROM Employee
      WHERE ${archivedPredicate(scope, 'Employee.isArchived')}
      ORDER BY datetime(createdAt) DESC, name ASC
      `,
    );
    res.json(rows.map(sanitizeEmployee));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/employees', requireAdmin, async (req, res) => {
  try {
    const name = requireNonEmptyString(req.body.name, 'Name');
    const email = requireNonEmptyString(req.body.email, 'Email');
    const employeeNumber = normalizeEmployeeNumber(requireNonEmptyString(req.body.employeeNumber, 'Employee Number'));
    const password = requireNonEmptyString(req.body.password, 'Password');

    const duplicate = await queryOne(
      'SELECT id FROM Employee WHERE upper(employeeNumber) = ?',
      [employeeNumber],
    );
    if (duplicate) return badRequest(res, 'Employee Number already exists');

    const id = uid();
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=38bdf8`;
    const hashedPassword = await bcrypt.hash(password, 12);

    const phoneEnc = encryptString(req.body.phone || '');
    const jobTitleEnc = encryptString(req.body.jobTitle || '');

    await run(
      `
      INSERT INTO Employee (
        id, name, email, employeeNumber, password, department, role, avatar, phone, jobTitle, createdAt, isArchived,
        emailVerified, emailVerificationToken, emailVerificationExpiresAt, emailVerifiedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NULL, NULL, ?)
      `,
      [
        id,
        name,
        email,
        employeeNumber,
        hashedPassword,
        req.body.department || '',
        normalizeRole(req.body.role),
        req.body.avatar || defaultAvatar,
        req.body.phone || '',
        req.body.jobTitle || '',
        today(),
        nowIso(),
      ],
    );

    await writeAuditLog({
      type: 'ADDED',
      entity: name,
      message: `${employeeNumber} onboarded`,
      user: getActorMeta(req).actorName,
    });

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.put('/api/employees/:id', requireAdmin, async (req, res) => {
  try {
    await getRequiredRow('Employee', req.params.id, 'Employee');

    const name = requireNonEmptyString(req.body.name, 'Name');
    const email = requireNonEmptyString(req.body.email, 'Email');
    const employeeNumber = normalizeEmployeeNumber(requireNonEmptyString(req.body.employeeNumber, 'Employee Number'));

    const duplicate = await queryOne(
      'SELECT id FROM Employee WHERE upper(employeeNumber) = ? AND id != ?',
      [employeeNumber, String(req.params.id)],
    );
    if (duplicate) return badRequest(res, 'Employee Number already exists');

    if (String(req.body.password || '').trim()) {
      const hashedPassword = await bcrypt.hash(String(req.body.password), 12);
      await run(
        `
        UPDATE Employee
        SET name = ?, email = ?, employeeNumber = ?, password = ?, department = ?, role = ?,
            avatar = ?, phone = ?, jobTitle = ?
        WHERE id = ?
        `,
        [
          name,
          email,
          employeeNumber,
          hashedPassword,
          req.body.department || '',
          normalizeRole(req.body.role),
          req.body.avatar || '',
          req.body.phone || '',
          req.body.jobTitle || '',
          String(req.params.id),
        ],
      );
    } else {
      const phoneEnc = encryptString(req.body.phone || '');
      const jobTitleEnc = encryptString(req.body.jobTitle || '');

      await run(
        `
        UPDATE Employee
        SET name = ?, email = ?, employeeNumber = ?, department = ?, role = ?,
            avatar = ?,
            phone = '', jobTitle = '',
            phoneEnc = ?, jobTitleEnc = ?
        WHERE id = ?
        `,
        [
          name,
          email,
          employeeNumber,
          req.body.department || '',
          normalizeRole(req.body.role),
          req.body.avatar || '',
          phoneEnc,
          jobTitleEnc,
          String(req.params.id),
        ],
      );
    }

    await writeAuditLog({
      type: 'UPDATED',
      entity: name,
      message: `${employeeNumber} employee profile updated`,
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/employees/:id/archive', requireAdmin, async (req, res) => {
  try {
    const item = await archiveRecord(
      {
        table: 'Employee',
        id: req.params.id,
        entity: (row) => row.name || 'Employee',
        message: (row) => `${row.name} employee record archived`,
        label: 'Employee',
      },
      req,
    );
    res.json({ success: true, item: sanitizeEmployee(item) });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/employees/:id/restore', requireAdmin, async (req, res) => {
  try {
    const item = await restoreRecord(
      {
        table: 'Employee',
        id: req.params.id,
        entity: (row) => row.name || 'Employee',
        message: (row) => `${row.name} employee record restored`,
        label: 'Employee',
      },
      req,
    );
    res.json({ success: true, item: sanitizeEmployee(item) });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/employees/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await queryOne('SELECT name FROM Employee WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    await run('DELETE FROM Employee WHERE id = ?', [String(req.params.id)]);

    await writeAuditLog({
      type: 'DELETED',
      entity: existing.name || 'Employee',
      message: 'Employee record deleted',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// CONSUMABLES
app.get('/api/consumables', requireAdmin, async (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    const rows = await queryAll(
      `
      SELECT * FROM Consumable
      WHERE ${archivedPredicate(scope, 'Consumable.isArchived')}
      ORDER BY datetime(createdAt) DESC
      `,
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/consumables', requireAdmin, async (req, res) => {
  try {
    const name = requireNonEmptyString(req.body.name, 'Consumable name');
    const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
    const remaining = requireNonNegativeNumber(req.body.remaining ?? total, 'Remaining');
    if (remaining > total) return badRequest(res, 'Remaining cannot exceed total.');

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

    await writeAuditLog({
      type: 'ADDED',
      entity: name,
      message: 'Consumable item added to inventory',
      user: getActorMeta(req).actorName,
    });

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.put('/api/consumables/:id', requireAdmin, async (req, res) => {
  try {
    await getRequiredRow('Consumable', req.params.id, 'Consumable');

    const name = requireNonEmptyString(req.body.name, 'Consumable name');
    const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
    const remaining = requireNonNegativeNumber(req.body.remaining ?? 0, 'Remaining');
    if (remaining > total) return badRequest(res, 'Remaining cannot exceed total.');

    await run(
      `
      UPDATE Consumable
      SET name = ?, category = ?, modelNo = ?, location = ?, itemNo = ?, orderNumber = ?,
          purchaseDate = ?, minQty = ?, total = ?, remaining = ?, unitCost = ?
      WHERE id = ?
      `,
      [
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
        String(req.params.id),
      ],
    );

    await writeAuditLog({
      type: 'UPDATED',
      entity: name,
      message: 'Consumable item updated',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/consumables/:id/checkout', requireAdmin, async (req, res) => {
  try {
    const item = await getRequiredRow('Consumable', req.params.id, 'Consumable');
    ensureNotArchived(item, 'Consumable');

    const qty = normalizeQuantity(req.body.quantity || 1);
    const remaining = Number(item.remaining || 0);
    if (remaining < qty) return badRequest(res, 'No stock available');

    await run('UPDATE Consumable SET remaining = ? WHERE id = ?', [remaining - qty, String(req.params.id)]);
    res.json({ success: true, remaining: remaining - qty });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/consumables/:id/archive', requireAdmin, async (req, res) => {
  try {
    const item = await archiveRecord(
      {
        table: 'Consumable',
        id: req.params.id,
        entity: (row) => row.name || 'Consumable',
        message: (row) => `${row.name} consumable archived`,
        label: 'Consumable',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/consumables/:id/restore', requireAdmin, async (req, res) => {
  try {
    const item = await restoreRecord(
      {
        table: 'Consumable',
        id: req.params.id,
        entity: (row) => row.name || 'Consumable',
        message: (row) => `${row.name} consumable restored`,
        label: 'Consumable',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/consumables/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await queryOne('SELECT name FROM Consumable WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Consumable not found' });

    await run('DELETE FROM Consumable WHERE id = ?', [String(req.params.id)]);

    await writeAuditLog({
      type: 'DELETED',
      entity: existing.name || 'Consumable',
      message: 'Consumable item deleted',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// ACCESSORIES
app.get('/api/accessories', requireAdmin, async (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    const rows = await queryAll(
      `
      SELECT * FROM Accessory
      WHERE ${archivedPredicate(scope, 'Accessory.isArchived')}
      ORDER BY datetime(createdAt) DESC, name ASC
      `,
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/accessories/:id/assignments', async (req, res) => {
  try {
    const item = await queryOne('SELECT id FROM Accessory WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Accessory not found' });

    const status = req.query.status || 'active';
    const rows = await queryAll(
      `
      SELECT
        aa.*,
        Asset.tag AS assetTag,
        Asset.name AS assetName
      FROM AccessoryAssignment aa
      LEFT JOIN Asset ON Asset.id = aa.assetId
      WHERE aa.accessoryId = ?
        AND ${assignmentStatusPredicate(status, 'aa.status')}
      ORDER BY datetime(aa.assignedAt) DESC
      `,
      [String(req.params.id)],
    );

    res.json(rows);
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.post('/api/accessories', requireAdmin, async (req, res) => {
  try {
    const name = requireNonEmptyString(req.body.name, 'Accessory name');
    const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
    const id = uid();

    await run(
      `
      INSERT INTO Accessory (
        id, name, category, modelNo, location, minQty, total, checkedOut, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `,
      [
        id,
        name,
        req.body.category || '',
        req.body.modelNo || '',
        req.body.location || '',
        Number(req.body.minQty || 0),
        total,
        0,
        today(),
      ],
    );

    await writeAuditLog({
      type: 'ADDED',
      entity: name,
      message: 'Accessory added to inventory',
      user: getActorMeta(req).actorName,
    });

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.put('/api/accessories/:id', requireAdmin, async (req, res) => {
  try {
    await getRequiredRow('Accessory', req.params.id, 'Accessory');

    const name = requireNonEmptyString(req.body.name, 'Accessory name');
    const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
    const checkedOut = requireNonNegativeNumber(req.body.checkedOut ?? 0, 'Checked out');
    if (checkedOut > total) return badRequest(res, 'Checked out cannot exceed total.');

    await run(
      `
      UPDATE Accessory
      SET name = ?, category = ?, modelNo = ?, location = ?, minQty = ?, total = ?, checkedOut = ?
      WHERE id = ?
      `,
      [
        name,
        req.body.category || '',
        req.body.modelNo || '',
        req.body.location || '',
        Number(req.body.minQty || 0),
        total,
        checkedOut,
        String(req.params.id),
      ],
    );

    await writeAuditLog({
      type: 'UPDATED',
      entity: name,
      message: 'Accessory updated',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/accessories/:id/checkout', requireAdmin, async (req, res) => {
  try {
    const item = await getRequiredRow('Accessory', req.params.id, 'Accessory');
    ensureNotArchived(item, 'Accessory');

    const qty = normalizeQuantity(req.body.quantity || 1);
    const available = Number(item.total || 0) - Number(item.checkedOut || 0);
    if (available < qty) return badRequest(res, 'No stock available');

    await run('UPDATE Accessory SET checkedOut = ? WHERE id = ?', [Number(item.checkedOut || 0) + qty, String(req.params.id)]);
    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/accessories/:id/archive', requireAdmin, async (req, res) => {
  try {
    const item = await archiveRecord(
      {
        table: 'Accessory',
        id: req.params.id,
        entity: (row) => row.name || 'Accessory',
        message: (row) => `${row.name} accessory archived`,
        label: 'Accessory',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/accessories/:id/restore', requireAdmin, async (req, res) => {
  try {
    const item = await restoreRecord(
      {
        table: 'Accessory',
        id: req.params.id,
        entity: (row) => row.name || 'Accessory',
        message: (row) => `${row.name} accessory restored`,
        label: 'Accessory',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/accessories/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await queryOne('SELECT name FROM Accessory WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Accessory not found' });

    await run('DELETE FROM Accessory WHERE id = ?', [String(req.params.id)]);

    await writeAuditLog({
      type: 'DELETED',
      entity: existing.name || 'Accessory',
      message: 'Accessory deleted',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// LICENSES
app.get('/api/licenses', async (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    const rows = await queryAll(
      `
      SELECT
        id, name, manufacturer, licensedEmail, expirationDate,
        minQty, total, avail, unitCost, createdAt,
        isArchived, archivedAt, archivedById, archivedByName
      FROM License
      WHERE ${archivedPredicate(scope, 'License.isArchived')}
      ORDER BY datetime(createdAt) DESC
      `,
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/licenses/:id/assignees', requireAdmin, async (req, res) => {
  try {
    const statusRaw = String(req.query.status || 'active').toLowerCase();
    const whereStatus =
      statusRaw === 'all'
        ? '1=1'
        : statusRaw === 'removed'
          ? "la.status = 'REMOVED'"
          : "la.status = 'ACTIVE'";

    const rows = await queryAll(
      `
      SELECT
        la.*,
        e.name AS employeeName,
        e.employeeNumber,
        e.department
      FROM LicenseAssignment la
      LEFT JOIN Employee e ON e.id = la.employeeId
      WHERE la.licenseId = ?
        AND ${whereStatus}
      ORDER BY datetime(COALESCE(la.assignedAt, la.returnedAt)) DESC
      `,
      [String(req.params.id)],
    );

    res.json(rows);
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.post('/api/licenses/:id/reveal-key', requireAuth, async (req, res) => {
  try {
    const actorId = String(req.user?.sub || '').trim();
    if (!actorId) return res.status(401).json({ error: 'Unauthorized.' });

    if (!canRevealLicenseKeyRole(req.user?.role || '')) {
      return res.status(403).json({ error: 'Only Admin/Superuser can reveal security keys.' });
    }

    const password = requireNonEmptyString(req.body.password, 'Password');

    const employee = await queryOne(
      `
      SELECT id, name, role, password
      FROM Employee
      WHERE id = ? AND COALESCE(isArchived, 0) = 0
      `,
      [actorId],
    );
    if (!employee) return res.status(401).json({ error: 'Authenticated user not found.' });

    const valid = await verifyStoredPassword(employee, password);
    if (!valid) return res.status(401).json({ error: 'Invalid password.' });

    const license = await queryOne(
      `
      SELECT id, name, key, isArchived
      FROM License
      WHERE id = ?
      `,
      [String(req.params.id)],
    );
    if (!license) return res.status(404).json({ error: 'License not found.' });
    if (Number(license.isArchived || 0) === 1) return res.status(400).json({ error: 'License is archived.' });

    await writeAuditLog({
      type: 'VIEWED',
      entity: license.name || 'License',
      message: `Security key revealed for ${license.name || license.id}`,
      user: getActorMeta(req).actorName,
    });

    return res.json({ success: true, key: String(license.key || '') });
  } catch (e) {
    return badRequest(res, e.message);
  }
});

app.post('/api/licenses', requireAdmin, async (req, res) => {
  try {
    const name = requireNonEmptyString(req.body.name, 'License name');
    const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
    const avail = requireNonNegativeNumber(req.body.avail ?? total, 'Available');
    if (avail > total) return badRequest(res, 'Available cannot exceed total.');

    const id = uid();

    await run(
      `
      INSERT INTO License (
        id, name, key, manufacturer, licensedEmail, expirationDate,
        minQty, total, avail, unitCost, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `,
      [
        id,
        name,
        req.body.key || '',
        req.body.manufacturer || '',
        req.body.licensedEmail || '',
        req.body.expirationDate || null,
        Number(req.body.minQty || 2),
        total,
        avail,
        Number(req.body.unitCost || 0),
        today(),
      ],
    );

    await writeAuditLog({
      type: 'ADDED',
      entity: name,
      message: 'Software license added to registry',
      user: getActorMeta(req).actorName,
    });

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.put('/api/licenses/:id', requireAdmin, async (req, res) => {
  try {
    const existingLicense = await getRequiredRow('License', req.params.id, 'License');
    const keyToStore =
      Object.prototype.hasOwnProperty.call(req.body, 'key')
        ? String(req.body.key || '')
        : String(existingLicense.key || '');

    const name = requireNonEmptyString(req.body.name, 'License name');
    const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
    const avail = requireNonNegativeNumber(req.body.avail ?? 0, 'Available');
    if (avail > total) return badRequest(res, 'Available cannot exceed total.');

    await run(
      `
      UPDATE License
      SET name = ?, key = ?, manufacturer = ?, licensedEmail = ?,
          expirationDate = ?, minQty = ?, total = ?, avail = ?, unitCost = ?
      WHERE id = ?
      `,
      [
        name,
        keyToStore,
        req.body.manufacturer || '',
        req.body.licensedEmail || '',
        req.body.expirationDate || null,
        Number(req.body.minQty || 0),
        total,
        avail,
        Number(req.body.unitCost || 0),
        String(req.params.id),
      ],
    );

    await writeAuditLog({
      type: 'UPDATED',
      entity: name,
      message: 'Software license updated',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/licenses/:id/archive', requireAdmin, async (req, res) => {
  try {
    const item = await archiveRecord(
      {
        table: 'License',
        id: req.params.id,
        entity: (row) => row.name || 'License',
        message: (row) => `${row.name} license archived`,
        label: 'License',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/licenses/:id/restore', requireAdmin, async (req, res) => {
  try {
    const item = await restoreRecord(
      {
        table: 'License',
        id: req.params.id,
        entity: (row) => row.name || 'License',
        message: (row) => `${row.name} license restored`,
        label: 'License',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/licenses/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await queryOne('SELECT name FROM License WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'License not found' });

    await run('DELETE FROM License WHERE id = ?', [String(req.params.id)]);

    await writeAuditLog({
      type: 'DELETED',
      entity: existing.name || 'License',
      message: 'Software license removed',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// REQUESTS
app.get('/api/requests', async (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    const rows = await queryAll(
      `
      SELECT * FROM Request
      WHERE ${archivedPredicate(scope, 'Request.isArchived')}
      ORDER BY datetime(createdAt) DESC
      `,
    );

    res.json(
      rows.map((row) => ({
        ...row,
        items: safeJsonParse(row.items, []),
        submittedById: row.submittedById || '',
        submittedByEmail: row.submittedByEmail || '',
      })),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const requestNumber = requireNonEmptyString(req.body.requestNumber, 'Request number');
    const requestorName = String(req.body.requestorName || req.user.name || '').trim() || req.user.name || req.user.email;
    const department = String(req.body.department || req.user.department || 'Unassigned').trim();
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
        req.user.sub,
        req.user.email || '',
        nowIso(),
      ],
    );

    await writeAuditLog({
      type: 'REQUESTED',
      entity: requestorName,
      message: `Submitted ${requestNumber}`,
      user: getActorMeta(req).actorName,
    });

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/requests/:id/status', requireAdmin, async (req, res) => {
  try {
    const existing = await getRequiredRow('Request', req.params.id, 'Request');
    ensureNotArchived(existing, 'Request');

    const statusRaw = requireNonEmptyString(req.body.status, 'Status');
    const allowed = ['Pending', 'Approved', 'Rejected', 'In Progress', 'Completed', 'Closed'];
    if (!allowed.includes(statusRaw)) {
      return badRequest(res, `Invalid status. Allowed: ${allowed.join(', ')}`);
    }

    await run('UPDATE Request SET status = ? WHERE id = ?', [statusRaw, String(req.params.id)]);

    await writeAuditLog({
      type: 'UPDATED',
      entity: existing.requestNumber || 'Request',
      message: `Request status changed to ${statusRaw}`,
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/requests/:id/archive', requireAdmin, async (req, res) => {
  try {
    const item = await archiveRecord(
      {
        table: 'Request',
        id: req.params.id,
        entity: (row) => row.requestNumber || row.requestorName || 'Request',
        message: (row) => `${row.requestNumber || 'Request'} archived`,
        label: 'Request',
      },
      req,
    );

    res.json({
      success: true,
      item: { ...item, items: safeJsonParse(item.items, []) },
    });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/requests/:id/restore', requireAdmin, async (req, res) => {
  try {
    const item = await restoreRecord(
      {
        table: 'Request',
        id: req.params.id,
        entity: (row) => row.requestNumber || row.requestorName || 'Request',
        message: (row) => `${row.requestNumber || 'Request'} restored`,
        label: 'Request',
      },
      req,
    );

    res.json({
      success: true,
      item: { ...item, items: safeJsonParse(item.items, []) },
    });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/requests/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await queryOne('SELECT requestNumber, requestorName FROM Request WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Request not found' });

    await run('DELETE FROM Request WHERE id = ?', [String(req.params.id)]);

    await writeAuditLog({
      type: 'DELETED',
      entity: existing.requestNumber || existing.requestorName || 'Request',
      message: 'Request permanently deleted',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// MAINTENANCE
app.get('/api/maintenance', async (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    const rows = await queryAll(
      `
      SELECT * FROM Maintenance
      WHERE ${archivedPredicate(scope, 'Maintenance.isArchived')}
      ORDER BY datetime(COALESCE(submittedAt, createdAt, startDate)) DESC
      `,
    );
    res.json(rows.map(serializeMaintenance));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/maintenance', async (req, res) => {
  try {
    const title = requireNonEmptyString(req.body.title, 'Title');
    const description = requireNonEmptyString(req.body.description, 'Description');
    const status = normalizeMaintenanceStatus(req.body.status || 'Open');
    const priority = normalizeMaintenancePriority(req.body.priority || 'Medium');
    const cost = requireNonNegativeNumber(req.body.cost ?? 0, 'Cost');
    const assetId = String(req.body.assetId || '').trim();
    const category = String(req.body.category || 'Other').trim() || 'Other';

    const id = uid();
    const submittedAt = nowIso();

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
        req.user.name || req.user.email || 'System',
        req.user.sub,
        submittedAt,
        assetId,
        category,
        nowIso(),
        nowIso(),
      ],
    );

    await writeAuditLog({
      type: 'ADDED',
      entity: title,
      message: 'Maintenance ticket submitted',
      user: getActorMeta(req).actorName,
    });

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.put('/api/maintenance/:id', requireAdmin, async (req, res) => {
  try {
    await getRequiredRow('Maintenance', req.params.id, 'Maintenance');

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
        String(req.params.id),
      ],
    );

    await writeAuditLog({
      type: 'UPDATED',
      entity: title,
      message: 'Maintenance ticket updated',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/maintenance/:id/archive', requireAdmin, async (req, res) => {
  try {
    const item = await archiveRecord(
      {
        table: 'Maintenance',
        id: req.params.id,
        entity: (row) => row.title || row.assetName || 'Maintenance Ticket',
        message: (row) => `${row.title || row.assetName || 'Maintenance Ticket'} archived`,
        label: 'Maintenance',
      },
      req,
    );
    res.json({ success: true, item: serializeMaintenance(item) });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/maintenance/:id/restore', requireAdmin, async (req, res) => {
  try {
    const item = await restoreRecord(
      {
        table: 'Maintenance',
        id: req.params.id,
        entity: (row) => row.title || row.assetName || 'Maintenance Ticket',
        message: (row) => `${row.title || row.assetName || 'Maintenance Ticket'} restored`,
        label: 'Maintenance',
      },
      req,
    );
    res.json({ success: true, item: serializeMaintenance(item) });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/maintenance/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await queryOne('SELECT title, assetName FROM Maintenance WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Maintenance ticket not found' });

    await run('DELETE FROM Maintenance WHERE id = ?', [String(req.params.id)]);

    await writeAuditLog({
      type: 'DELETED',
      entity: existing.title || existing.assetName || 'Maintenance Ticket',
      message: 'Maintenance ticket deleted',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// COMPONENTS
app.get('/api/components', requireAdmin, async (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    const rows = await queryAll(
      `
      SELECT * FROM Component
      WHERE ${archivedPredicate(scope, 'Component.isArchived')}
      ORDER BY id DESC
      `,
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/components/:id/assignments', async (req, res) => {
  try {
    const item = await queryOne('SELECT id FROM Component WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Component not found' });

    const status = req.query.status || 'active';
    const rows = await queryAll(
      `
      SELECT
        ca.*,
        Asset.tag AS assetTag,
        Asset.name AS assetName
      FROM ComponentAssignment ca
      LEFT JOIN Asset ON Asset.id = ca.assetId
      WHERE ca.componentId = ?
        AND ${assignmentStatusPredicate(status, 'ca.status')}
      ORDER BY datetime(ca.assignedAt) DESC
      `,
      [String(req.params.id)],
    );

    res.json(rows);
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.post('/api/components', requireAdmin, async (req, res) => {
  try {
    const name = requireNonEmptyString(req.body.name, 'Component name');
    const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
    const id = uid();

    await run(
      `
      INSERT INTO Component (
        id, name, category, model, location, total, remaining, minQty,
        status, unitCost, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `,
      [
        id,
        name,
        req.body.category || '',
        req.body.model || '',
        req.body.location || '',
        total,
        total,
        Number(req.body.minQty || 0),
        'AVAILABLE',
        Number(req.body.unitCost || 0),
        nowIso(),
      ],
    );

    await writeAuditLog({
      type: 'ADDED',
      entity: name,
      message: 'Component added to registry',
      user: getActorMeta(req).actorName,
    });

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.put('/api/components/:id', requireAdmin, async (req, res) => {
  try {
    await getRequiredRow('Component', req.params.id, 'Component');

    const name = requireNonEmptyString(req.body.name, 'Component name');
    const total = requireNonNegativeNumber(req.body.total ?? 0, 'Total');
    const remaining = requireNonNegativeNumber(req.body.remaining ?? 0, 'Remaining');
    if (remaining > total) return badRequest(res, 'Remaining cannot exceed total.');

    await run(
      `
      UPDATE Component
      SET name = ?, category = ?, model = ?, location = ?, total = ?, remaining = ?, minQty = ?,
          status = ?, assignedTo = ?, checkoutDate = ?, expectedCheckinDate = ?, notes = ?, unitCost = ?
      WHERE id = ?
      `,
      [
        name,
        req.body.category || '',
        req.body.model || '',
        req.body.location || '',
        total,
        remaining,
        Number(req.body.minQty || 0),
        req.body.status || 'AVAILABLE',
        req.body.assignedTo || null,
        req.body.checkoutDate || null,
        req.body.expectedCheckinDate || null,
        req.body.notes || null,
        Number(req.body.unitCost || 0),
        String(req.params.id),
      ],
    );

    await writeAuditLog({
      type: 'UPDATED',
      entity: name,
      message: 'Component updated',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/components/:id/archive', requireAdmin, async (req, res) => {
  try {
    const item = await archiveRecord(
      {
        table: 'Component',
        id: req.params.id,
        entity: (row) => row.name || 'Component',
        message: (row) => `${row.name} component archived`,
        label: 'Component',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/components/:id/restore', requireAdmin, async (req, res) => {
  try {
    const item = await restoreRecord(
      {
        table: 'Component',
        id: req.params.id,
        entity: (row) => row.name || 'Component',
        message: (row) => `${row.name} component restored`,
        label: 'Component',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/components/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await queryOne('SELECT name FROM Component WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Component not found' });

    await run('DELETE FROM Component WHERE id = ?', [String(req.params.id)]);

    await writeAuditLog({
      type: 'DELETED',
      entity: existing.name || 'Component',
      message: 'Component removed from registry',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/components/:id/checkin', requireAdmin, async (req, res) => {
  try {
    await getRequiredRow('Component', req.params.id, 'Component');
    await run("UPDATE Component SET status = 'AVAILABLE' WHERE id = ?", [String(req.params.id)]);
    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/components/:id/checkout', requireAdmin, async (req, res) => {
  try {
    await getRequiredRow('Component', req.params.id, 'Component');
    await run("UPDATE Component SET status = 'DEPLOYED' WHERE id = ?", [String(req.params.id)]);
    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// TRANSACTIONS (ADMIN)
app.post('/api/transactions/checkout', requireAdmin, async (req, res) => {
  try {
    const resourceType = normalizeResourceType(requireNonEmptyString(req.body.resourceType, 'Resource type'));
    const itemId = requireNonEmptyString(req.body.itemId, 'Item ID');
    const qty = normalizeQuantity(req.body.quantity);

    if (!['asset', 'component', 'accessory', 'consumable', 'license'].includes(resourceType)) {
      return badRequest(res, 'Unsupported checkout resource type');
    }

    if (resourceType === 'consumable') {
      const item = await getRequiredRow('Consumable', itemId, 'Consumable');
      ensureNotArchived(item, 'Consumable');
      if (Number(item.remaining || 0) < qty) return badRequest(res, 'Not enough consumable stock available');

      await run('UPDATE Consumable SET remaining = ? WHERE id = ?', [Number(item.remaining || 0) - qty, itemId]);

      await writeAuditLog({
        type: 'CHECKOUT',
        entity: item.name || 'Consumable',
        message: `${qty} consumable unit(s) checked out`,
        user: getActorMeta(req).actorName,
      });

      return res.json({ success: true, item: await queryOne('SELECT * FROM Consumable WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'license') {
      const item = await getRequiredRow('License', itemId, 'License');
      ensureNotArchived(item, 'License');

      const employeeId = requireNonEmptyString(req.body.employeeId, 'Employee ID');
      if (Number(item.avail || 0) < qty) return badRequest(res, 'Not enough licenses available');

      await run('UPDATE License SET avail = ? WHERE id = ?', [Number(item.avail || 0) - qty, itemId]);

      await run(
        `
        INSERT INTO LicenseAssignment (
          id, licenseId, employeeId, quantity, assignedAt, assignedById, assignedByName, status, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        `,
        [
          uid(),
          String(itemId),
          String(employeeId),
          qty,
          nowIso(),
          String(req.user?.sub || ''),
          getActorMeta(req).actorName,
          String(req.body.notes || ''),
        ],
      );

      await writeNotification({
        employeeId: String(employeeId),
        type: 'LICENSE_ASSIGNMENT',
        title: 'Software License Assigned',
        message: `${item.name || 'Software license'} has been assigned to you.`,
        metadata: {
          licenseId: String(item.id),
          licenseName: item.name || '',
          quantity: qty,
          assignedById: String(req.user?.sub || ''),
          assignedByName: getActorMeta(req).actorName,
        },
        status: 'PENDING',
      });

      await writeAuditLog({
        type: 'CHECKOUT',
        entity: item.name || 'License',
        message: `${qty} license seat(s) checked out to employee ${employeeId}`,
        user: getActorMeta(req).actorName,
      });

      return res.json({ success: true, item: await queryOne('SELECT * FROM License WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'accessory') {
      const item = await getRequiredRow('Accessory', itemId, 'Accessory');
      ensureNotArchived(item, 'Accessory');

      const available = Number(item.total || 0) - Number(item.checkedOut || 0);
      if (available < qty) return badRequest(res, 'Not enough accessory stock available');

      await run('UPDATE Accessory SET checkedOut = ? WHERE id = ?', [Number(item.checkedOut || 0) + qty, itemId]);

      await writeAuditLog({
        type: 'CHECKOUT',
        entity: item.name || 'Accessory',
        message: `${qty} accessory unit(s) checked out`,
        user: getActorMeta(req).actorName,
      });

      return res.json({ success: true, item: await queryOne('SELECT * FROM Accessory WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'component') {
      const item = await getRequiredRow('Component', itemId, 'Component');
      ensureNotArchived(item, 'Component');
      if (Number(item.remaining || 0) < qty) return badRequest(res, 'Not enough component stock available');

      await run('UPDATE Component SET remaining = ?, status = ? WHERE id = ?', [
        Number(item.remaining || 0) - qty,
        'DEPLOYED',
        itemId,
      ]);

      await writeAuditLog({
        type: 'CHECKOUT',
        entity: item.name || 'Component',
        message: `${qty} component unit(s) checked out`,
        user: getActorMeta(req).actorName,
      });

      return res.json({ success: true, item: await queryOne('SELECT * FROM Component WHERE id = ?', [itemId]) });
    }

    const assetItem = await getRequiredRow('Asset', itemId, 'Asset');
    ensureNotArchived(assetItem, 'Asset');

    const employeeId = requireNonEmptyString(req.body.employeeId, 'Employee ID');

    await run(
      `
      UPDATE Asset
      SET status = 'Deployed', employeeId = ?, location = ?, checkoutDate = ?, expectedCheckinDate = ?, updatedAt = ?
      WHERE id = ?
      `,
      [
        employeeId,
        req.body.location || assetItem.location || '',
        req.body.checkoutDate || today(),
        req.body.expectedCheckinDate || null,
        nowIso(),
        itemId,
      ],
    );

    await notifyAssetAssignment({
      employeeId,
      assetId: itemId,
      req,
      checkoutDate: req.body.checkoutDate || today(),
      expectedCheckinDate: req.body.expectedCheckinDate || null,
      location: req.body.location || assetItem.location || '',
    });

    await writeAuditLog({
      type: 'CHECKOUT',
      entity: assetItem.name || assetItem.tag || `Asset ID ${itemId}`,
      message: `${assetItem.tag || assetItem.name || `Asset ID ${itemId}`} checked out`,
      user: getActorMeta(req).actorName,
    });

    return res.json({ success: true, item: await queryOne('SELECT * FROM Asset WHERE id = ?', [itemId]) });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.post('/api/transactions/checkin', requireAdmin, async (req, res) => {
  try {
    const resourceType = normalizeResourceType(requireNonEmptyString(req.body.resourceType, 'Resource type'));
    const itemId = requireNonEmptyString(req.body.itemId, 'Item ID');
    const qty = normalizeQuantity(req.body.quantity);

    if (!['asset', 'component', 'accessory', 'consumable', 'license'].includes(resourceType)) {
      return badRequest(res, 'Unsupported checkin resource type');
    }

    if (resourceType === 'consumable') {
      const item = await getRequiredRow('Consumable', itemId, 'Consumable');
      ensureNotArchived(item, 'Consumable');

      const nextRemaining = Number(item.remaining || 0) + qty;
      if (nextRemaining > Number(item.total || 0)) return badRequest(res, 'Cannot check in more than total stock');

      await run('UPDATE Consumable SET remaining = ? WHERE id = ?', [nextRemaining, itemId]);

      await writeAuditLog({
        type: 'CHECKIN',
        entity: item.name || 'Consumable',
        message: `${qty} consumable unit(s) checked in`,
        user: getActorMeta(req).actorName,
      });

      return res.json({ success: true, item: await queryOne('SELECT * FROM Consumable WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'license') {
      const item = await getRequiredRow('License', itemId, 'License');
      ensureNotArchived(item, 'License');

      const nextAvail = Number(item.avail || 0) + qty;
      if (nextAvail > Number(item.total || 0)) return badRequest(res, 'Cannot check in more than total seats');

      await run('UPDATE License SET avail = ? WHERE id = ?', [nextAvail, itemId]);

      await writeAuditLog({
        type: 'CHECKIN',
        entity: item.name || 'License',
        message: `${qty} license seat(s) checked in`,
        user: getActorMeta(req).actorName,
      });

      return res.json({ success: true, item: await queryOne('SELECT * FROM License WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'accessory') {
      const item = await getRequiredRow('Accessory', itemId, 'Accessory');
      ensureNotArchived(item, 'Accessory');

      const nextCheckedOut = Number(item.checkedOut || 0) - qty;
      if (nextCheckedOut < 0) return badRequest(res, 'Cannot check in more than checked out');

      await run('UPDATE Accessory SET checkedOut = ? WHERE id = ?', [nextCheckedOut, itemId]);

      await writeAuditLog({
        type: 'CHECKIN',
        entity: item.name || 'Accessory',
        message: `${qty} accessory unit(s) checked in`,
        user: getActorMeta(req).actorName,
      });

      return res.json({ success: true, item: await queryOne('SELECT * FROM Accessory WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'component') {
      const item = await getRequiredRow('Component', itemId, 'Component');
      ensureNotArchived(item, 'Component');

      const nextRemaining = Number(item.remaining || 0) + qty;
      if (nextRemaining > Number(item.total || 0)) return badRequest(res, 'Cannot check in more than total stock');

      await run('UPDATE Component SET remaining = ?, status = ? WHERE id = ?', [
        nextRemaining,
        nextRemaining < Number(item.total || 0) ? 'DEPLOYED' : 'AVAILABLE',
        itemId,
      ]);

      await writeAuditLog({
        type: 'CHECKIN',
        entity: item.name || 'Component',
        message: `${qty} component unit(s) checked in`,
        user: getActorMeta(req).actorName,
      });

      return res.json({ success: true, item: await queryOne('SELECT * FROM Component WHERE id = ?', [itemId]) });
    }

    await getRequiredRow('Asset', itemId, 'Asset');

    await run(
      `
      UPDATE Asset
      SET status = ?, employeeId = NULL, checkoutDate = NULL, expectedCheckinDate = NULL, updatedAt = ?
      WHERE id = ?
      `,
      [String(req.body.status || 'Available'), nowIso(), itemId],
    );

    await writeAuditLog({
      type: 'CHECKIN',
      entity: itemId,
      message: `Asset ${itemId} checked in`,
      user: getActorMeta(req).actorName,
    });

    return res.json({ success: true, item: await queryOne('SELECT * FROM Asset WHERE id = ?', [itemId]) });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// PROFILE
app.get('/api/profile/me', async (req, res) => {
  try {
    const actorId = req.user.sub;
    const employee = await queryOne('SELECT * FROM Employee WHERE id = ?', [actorId]);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const emailLower = String(employee.email || '').toLowerCase();
    const nameLower = String(employee.name || '').toLowerCase();

    const reqCount = await queryOne(
      `
      SELECT COUNT(*) AS count
      FROM Request
      WHERE COALESCE(isArchived, 0) = 0
        AND (submittedById = ? OR (? != '' AND lower(submittedByEmail) = ?))
      `,
      [actorId, emailLower, emailLower],
    );

    const mtCount = await queryOne(
      `
      SELECT COUNT(*) AS count
      FROM Maintenance
      WHERE COALESCE(isArchived, 0) = 0
        AND (
          submittedById = ?
          OR (? != '' AND lower(submittedBy) = ?)
          OR (? != '' AND lower(submittedBy) = ?)
        )
      `,
      [actorId, emailLower, emailLower, nameLower, nameLower],
    );

    res.json({
      profile: serializeProfile(employee),
      stats: {
        submittedRequests: Number(reqCount?.count || 0),
        submittedMaintenance: Number(mtCount?.count || 0),
      },
    });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.get('/api/profile/me/requests', async (req, res) => {
  try {
    const actorId = req.user.sub;
    const scope = parseScope(req.query.scope);
    const employee = await queryOne('SELECT * FROM Employee WHERE id = ?', [actorId]);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const emailLower = String(employee.email || '').toLowerCase();

    const rows = await queryAll(
      `
      SELECT * FROM Request
      WHERE ${archivedPredicate(scope, 'Request.isArchived')}
        AND (submittedById = ? OR (? != '' AND lower(submittedByEmail) = ?))
      ORDER BY datetime(createdAt) DESC
      `,
      [actorId, emailLower, emailLower],
    );

    res.json(rows.map((row) => ({ ...row, items: safeJsonParse(row.items, []) })));
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.get('/api/profile/me/maintenance', async (req, res) => {
  try {
    const actorId = req.user.sub;
    const scope = parseScope(req.query.scope);
    const employee = await queryOne('SELECT * FROM Employee WHERE id = ?', [actorId]);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const emailLower = String(employee.email || '').toLowerCase();
    const nameLower = String(employee.name || '').toLowerCase();

    const rows = await queryAll(
      `
      SELECT * FROM Maintenance
      WHERE ${archivedPredicate(scope, 'Maintenance.isArchived')}
        AND (
          submittedById = ?
          OR (? != '' AND lower(submittedBy) = ?)
          OR (? != '' AND lower(submittedBy) = ?)
        )
      ORDER BY datetime(COALESCE(submittedAt, createdAt, startDate)) DESC
      `,
      [actorId, emailLower, emailLower, nameLower, nameLower],
    );

    res.json(rows.map(serializeMaintenance));
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.put('/api/profile/me', async (req, res) => {
  try {
    const actorId = req.user.sub;
    const actorRole = req.user.role;
    const targetEmployeeId = String(req.body.targetEmployeeId || actorId).trim();

    const actor = await queryOne('SELECT * FROM Employee WHERE id = ?', [actorId]);
    const target = await queryOne('SELECT * FROM Employee WHERE id = ?', [targetEmployeeId]);

    if (!actor || !target) return res.status(404).json({ error: 'Employee not found' });

    const editingSelf = actorId === targetEmployeeId;
    const effectiveRole = normalizeRole(actorRole || actor.role);

    if (req.body.department !== undefined || req.body.jobTitle !== undefined) {
      return res.status(403).json({
        error: 'Department and Job Title cannot be changed from profile settings.',
      });
    }

    if (!editingSelf && !isPrivilegedRole(effectiveRole)) {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    const restrictedForNonPrivileged = ['employeeNumber', 'role', 'targetEmployeeId'];
    const attemptedRestricted = restrictedForNonPrivileged.filter((field) => req.body[field] !== undefined);

    if (!isPrivilegedRole(effectiveRole) && attemptedRestricted.length > 0) {
      return res.status(403).json({
        error: `You do not have permission to edit: ${attemptedRestricted.join(', ')}`,
      });
    }

    const updates = [];
    const args = [];

    const setIfDefined = (column, value) => {
      if (value !== undefined) {
        updates.push(`${column} = ?`);
        args.push(value);
      }
    };

    setIfDefined('name', req.body.name);
    setIfDefined('email', req.body.email);
    setIfDefined('avatar', req.body.avatar);

    // phone (encrypt)
    if (req.body.phone !== undefined) {
      updates.push('phone = ?');
      args.push(''); // clear plaintext
      updates.push('phoneEnc = ?');
      args.push(encryptString(req.body.phone));
    }

    // jobTitle (encrypt)
    if (req.body.jobTitle !== undefined) {
      updates.push('jobTitle = ?');
      args.push('');
      updates.push('jobTitleEnc = ?');
      args.push(encryptString(req.body.jobTitle));
    }

    if (isPrivilegedRole(effectiveRole)) {
      if (req.body.employeeNumber !== undefined) {
        const normalizedEmployeeNumber = normalizeEmployeeNumber(req.body.employeeNumber);
        if (!normalizedEmployeeNumber) return badRequest(res, 'Employee Number is required');

        const duplicate = await queryOne(
          'SELECT id FROM Employee WHERE upper(employeeNumber) = ? AND id != ?',
          [normalizedEmployeeNumber, targetEmployeeId],
        );

        if (duplicate) return badRequest(res, 'Employee Number already exists');
        setIfDefined('employeeNumber', normalizedEmployeeNumber);
      }

      if (req.body.role !== undefined) setIfDefined('role', normalizeRole(req.body.role));
    }

    if (editingSelf && String(req.body.password || '').trim()) {
      const hashedPassword = await bcrypt.hash(String(req.body.password), 12);
      setIfDefined('password', hashedPassword);
    }

    if (!updates.length) {
      return res.json({ success: true, profile: serializeProfile(target) });
    }

    args.push(targetEmployeeId);
    await run(`UPDATE Employee SET ${updates.join(', ')} WHERE id = ?`, args);

    const refreshed = await queryOne('SELECT * FROM Employee WHERE id = ?', [targetEmployeeId]);
    res.json({ success: true, profile: serializeProfile(refreshed) });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// NOTIFICATIONS (AUTHENTICATED USER)
app.get('/api/notifications/me', async (req, res) => {
  try {
    const unreadOnly = String(req.query.unreadOnly || '').toLowerCase() === 'true';
    const rows = await queryAll(
      `
      SELECT id, employeeId, type, title, message, metadata, isRead, createdAt, status, confirmedAt, confirmedById
      FROM Notification
      WHERE employeeId = ?
        AND (? = 0 OR COALESCE(isRead, 0) = 0)
      ORDER BY datetime(createdAt) DESC
      LIMIT 200
      `,
      [String(req.user.sub), unreadOnly ? 1 : 0],
    );

    res.json(
      rows.map((row) => ({
        ...row,
        metadata: safeJsonParse(row.metadata, {}),
        isRead: Number(row.isRead || 0),
      })),
    );
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const existing = await queryOne(
      'SELECT id, employeeId FROM Notification WHERE id = ?',
      [String(req.params.id)],
    );
    if (!existing) return res.status(404).json({ error: 'Notification not found' });
    if (String(existing.employeeId) !== String(req.user.sub)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await run('UPDATE Notification SET isRead = 1 WHERE id = ?', [String(req.params.id)]);
    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    await run('UPDATE Notification SET isRead = 1 WHERE employeeId = ?', [String(req.user.sub)]);
    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// Single confirm/decline handlers (user confirms their own notification)
app.patch('/api/notifications/:id/confirm', requireAuth, async (req, res) => {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'Unauthorized.' });

    const existing = await queryOne('SELECT * FROM Notification WHERE id = ?', [String(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'Notification not found' });
    if (String(existing.employeeId) !== String(req.user.sub)) return res.status(403).json({ error: 'Forbidden' });

    await run(
      `
      UPDATE Notification
      SET status = 'CONFIRMED',
          isRead = 1,
          confirmedAt = ?,
          confirmedById = ?
      WHERE id = ?
      `,
      [nowIso(), String(req.user.sub), String(req.params.id)],
    );

    const metadata = safeJsonParse(existing.metadata, {});
    const itemLabel = metadata.assetTag
      ? `${metadata.assetTag}${metadata.assetName ? ` (${metadata.assetName})` : ''}`
      : metadata.licenseName || metadata.assetName || 'Assigned Item';

    // Notify assigning admin (if metadata has assignedById)
    const assignedById = String(metadata.assignedById || '').trim();
    if (assignedById) {
      await writeNotification({
        employeeId: assignedById,
        type: 'ASSIGNMENT_RESPONSE',
        status: 'INFO',
        title: 'Assignment Confirmed',
        message: `${req.user.name || req.user.email || req.user.sub} confirmed receipt of ${itemLabel}.`,
        metadata: {
          sourceNotificationId: existing.id,
          itemLabel,
          responderId: req.user.sub,
          responderName: req.user.name || req.user.email || '',
          response: 'CONFIRMED',
        },
      });
    }

    await writeAuditLog({
      type: 'CONFIRMED',
      entity: itemLabel,
      message: `${req.user.name || req.user.email || req.user.sub} confirmed assignment`,
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/notifications/:id/decline', requireAuth, async (req, res) => {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'Unauthorized.' });

    const existing = await queryOne('SELECT * FROM Notification WHERE id = ?', [String(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'Notification not found' });
    if (String(existing.employeeId) !== String(req.user.sub)) return res.status(403).json({ error: 'Forbidden' });

    await run(
      `
      UPDATE Notification
      SET status = 'DECLINED',
          isRead = 1,
          confirmedAt = ?,
          confirmedById = ?
      WHERE id = ?
      `,
      [nowIso(), String(req.user.sub), String(req.params.id)],
    );

    const metadata = safeJsonParse(existing.metadata, {});
    const itemLabel = metadata.assetTag
      ? `${metadata.assetTag}${metadata.assetName ? ` (${metadata.assetName})` : ''}`
      : metadata.licenseName || metadata.assetName || 'Assigned Item';

    const assignedById = String(metadata.assignedById || '').trim();
    if (assignedById) {
      await writeNotification({
        employeeId: assignedById,
        type: 'ASSIGNMENT_RESPONSE',
        status: 'INFO',
        title: 'Assignment Declined',
        message: `${req.user.name || req.user.email || req.user.sub} declined assignment of ${itemLabel}.`,
        metadata: {
          sourceNotificationId: existing.id,
          itemLabel,
          responderId: req.user.sub,
          responderName: req.user.name || req.user.email || '',
          response: 'DECLINED',
        },
      });
    }

    await writeAuditLog({
      type: 'DECLINED',
      entity: itemLabel,
      message: `${req.user.name || req.user.email || req.user.sub} declined assignment`,
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// Admin endpoint to view all asset confirmations
app.get('/api/notifications/admin/asset-confirmations', requireAdmin, async (_req, res) => {
  try {
    const rows = await queryAll(
      `
      SELECT
        n.*,
        e.name AS employeeName,
        e.employeeNumber
      FROM Notification n
      LEFT JOIN Employee e ON e.id = n.employeeId
      WHERE n.type = 'ASSET_ASSIGNMENT'
      ORDER BY datetime(n.createdAt) DESC
      LIMIT 300
      `,
    );

    res.json(
      rows.map((row) => ({
        ...row,
        metadata: safeJsonParse(row.metadata, {}),
        isRead: Number(row.isRead || 0),
      })),
    );
  } catch (e) {
    badRequest(res, e.message);
  }
});

// =============================
// SUPPLIERS (ADMIN)
// =============================

app.get('/api/suppliers', requireAdmin, async (_req, res) => {
  try {
    const scope = parseScope(_req.query.scope);
    const rows = await queryAll(
      `
      SELECT * FROM Supplier
      WHERE ${archivedPredicate(scope, 'Supplier.isArchived')}
      ORDER BY datetime(createdAt) DESC, name ASC
      `,
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/suppliers', requireAdmin, async (req, res) => {
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

    await writeAuditLog({
      type: 'ADDED',
      entity: name,
      message: `Supplier ${name} added to registry`,
      user: getActorMeta(req).actorName,
    });

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.put('/api/suppliers/:id', requireAdmin, async (req, res) => {
  try {
    await getRequiredRow('Supplier', req.params.id, 'Supplier');

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
        String(req.params.id),
      ],
    );

    await writeAuditLog({
      type: 'UPDATED',
      entity: name,
      message: `Supplier ${name} information updated`,
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/suppliers/:id/archive', requireAdmin, async (req, res) => {
  try {
    const item = await archiveRecord(
      {
        table: 'Supplier',
        id: req.params.id,
        entity: (row) => row.name || 'Supplier',
        message: (row) => `${row.name} supplier record archived`,
        label: 'Supplier',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.patch('/api/suppliers/:id/restore', requireAdmin, async (req, res) => {
  try {
    const item = await restoreRecord(
      {
        table: 'Supplier',
        id: req.params.id,
        entity: (row) => row.name || 'Supplier',
        message: (row) => `${row.name} supplier record restored`,
        label: 'Supplier',
      },
      req,
    );
    res.json({ success: true, item });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/suppliers/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await queryOne('SELECT name FROM Supplier WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Supplier not found' });

    await run('DELETE FROM Supplier WHERE id = ?', [String(req.params.id)]);

    await writeAuditLog({
      type: 'DELETED',
      entity: existing.name || 'Supplier',
      message: 'Supplier record deleted',
      user: getActorMeta(req).actorName,
    });

    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

// =============================
// REPORTS (ADMIN)
// =============================

app.get('/api/reports/unconfirmed-assignments', requireAdmin, async (_req, res) => {
  try {
    const notifications = await queryAll(
      `
      SELECT
        n.id,
        n.employeeId,
        n.type,
        n.title,
        n.message,
        n.metadata,
        n.status,
        n.createdAt,
        e.name AS employeeName,
        e.employeeNumber,
        e.email,
        e.department
      FROM Notification n
      LEFT JOIN Employee e ON e.id = n.employeeId
      WHERE n.type IN ('ASSET_ASSIGNMENT', 'LICENSE_ASSIGNMENT')
      ORDER BY n.createdAt DESC
      `,
    );

    const now = new Date();
    const report = notifications.map((n) => {
      const createdAt = n.createdAt ? new Date(n.createdAt) : null;
      const daysPending = createdAt ? Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24)) : 0;
      const metadata = n.metadata ? JSON.parse(n.metadata) : {};

      let isOverdue = false;
      let urgency = 'normal';

      if (daysPending > 7) {
        isOverdue = true;
        urgency = 'critical';
      } else if (daysPending > 3) {
        urgency = 'high';
      } else if (daysPending > 1) {
        urgency = 'medium';
      }

      return {
        id: n.id,
        employeeId: n.employeeId,
        employeeName: n.employeeName,
        employeeNumber: n.employeeNumber,
        employeeEmail: n.email,
        department: n.department,
        type: n.type,
        title: n.title,
        message: n.message,
        status: n.status,
        createdAt: n.createdAt,
        daysPending,
        isOverdue,
        urgency,
        metadata: {
          assetId: metadata.assetId,
          assetTag: metadata.assetTag,
          assetName: metadata.assetName,
          licenseId: metadata.licenseId,
          licenseName: metadata.licenseName,
          quantity: metadata.quantity,
          assignedById: metadata.assignedById,
          assignedByName: metadata.assignedByName,
        },
      };
    });

    const pending = report.filter((n) => n.status === 'PENDING');
    const confirmed = report.filter((n) => n.status === 'CONFIRMED');
    const declined = report.filter((n) => n.status === 'DECLINED');
    const overdue = pending.filter((n) => n.daysPending > 7);

    const byEmployee = {};
    pending.forEach((n) => {
      const key = n.employeeId;
      if (!byEmployee[key]) {
        byEmployee[key] = {
          employeeId: n.employeeId,
          employeeName: n.employeeName,
          employeeNumber: n.employeeNumber,
          email: n.email,
          department: n.department,
          pendingCount: 0,
          overdueCount: 0,
          notifications: [],
        };
      }
      byEmployee[key].pendingCount += 1;
      if (n.isOverdue) byEmployee[key].overdueCount += 1;
      byEmployee[key].notifications.push(n);
    });

    const byDepartment = {};
    pending.forEach((n) => {
      const dept = n.department || 'Unassigned';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { pendingCount: 0, overdueCount: 0 };
      }
      byDepartment[dept].pendingCount += 1;
      if (n.isOverdue) byDepartment[dept].overdueCount += 1;
    });

    const byType = {
      ASSET_ASSIGNMENT: { count: pending.filter((n) => n.type === 'ASSET_ASSIGNMENT').length },
      LICENSE_ASSIGNMENT: { count: pending.filter((n) => n.type === 'LICENSE_ASSIGNMENT').length },
    };

    const byUrgency = {
      critical: pending.filter((n) => n.urgency === 'critical').length,
      high: pending.filter((n) => n.urgency === 'high').length,
      medium: pending.filter((n) => n.urgency === 'medium').length,
      normal: pending.filter((n) => n.urgency === 'normal').length,
    };

    const summary = {
      totalNotifications: report.length,
      pendingCount: pending.length,
      confirmedCount: confirmed.length,
      declinedCount: declined.length,
      overdueCount: overdue.length,
      confirmationRate: report.length > 0 ? Math.round((confirmed.length / report.length) * 100) : 0,
      byEmployee: Object.values(byEmployee),
      byDepartment,
      byType,
      byUrgency,
      topOverdueEmployees: Object.values(byEmployee)
        .filter((e) => e.overdueCount > 0)
        .sort((a, b) => b.overdueCount - a.overdueCount)
        .slice(0, 5),
    };

    res.json({ report, pending, confirmed, declined, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============================
// REPORTS (ADMIN)
// =============================

app.get('/api/reports/employee-asset-history', requireAdmin, async (_req, res) => {
  try {
    // Get all employees
    const employees = await queryAll(
      `
      SELECT
        id,
        name,
        employeeNumber,
        email,
        department,
        role,
        createdAt
      FROM Employee
      WHERE COALESCE(isArchived, 0) = 0
      ORDER BY department, name
      `,
    );

    // Get all assets with assignment info
    const assets = await queryAll(
      `
      SELECT
        a.id,
        a.tag,
        a.name,
        a.category,
        a.unitCost,
        a.status,
        a.employeeId,
        a.checkoutDate,
        a.expectedCheckinDate,
        e.name AS assignedTo,
        e.department
      FROM Asset a
      LEFT JOIN Employee e ON e.id = a.employeeId
      WHERE COALESCE(a.isArchived, 0) = 0
      `,
    );

    // Get all license assignments
    const licenseAssignments = await queryAll(
      `
      SELECT
        la.id,
        la.licenseId,
        la.employeeId,
        la.quantity,
        la.assignedAt,
        la.status,
        l.name AS licenseName,
        l.unitCost,
        e.name AS employeeName,
        e.department
      FROM LicenseAssignment la
      LEFT JOIN License l ON l.id = la.licenseId
      LEFT JOIN Employee e ON e.id = la.employeeId
      WHERE la.status = 'ACTIVE'
      `,
    );

    // Get notification confirmations for assets
    const notifications = await queryAll(
      `
      SELECT
        n.id,
        n.employeeId,
        n.type,
        n.status AS confirmationStatus,
        n.confirmedAt,
        n.createdAt,
        n.metadata
      FROM Notification n
      WHERE n.type IN ('ASSET_ASSIGNMENT', 'LICENSE_ASSIGNMENT')
      ORDER BY n.createdAt DESC
      `,
    );

    // Build employee report
    const report = employees.map((emp) => {
      // Find assigned assets
      const assignedAssets = assets.filter((a) => a.employeeId === emp.id);
      const totalAssetValue = assignedAssets.reduce((sum, a) => sum + Number(a.unitCost || 0), 0);

      // Find license assignments
      const assignedLicenses = licenseAssignments.filter((la) => la.employeeId === emp.id);
      const totalLicenseValue = assignedLicenses.reduce((sum, la) => sum + Number(la.unitCost || 0) * Number(la.quantity || 1), 0);

      // Find notifications/confirmations for this employee
      const empNotifications = notifications.filter((n) => n.employeeId === emp.id);
      const pendingConfirmations = empNotifications.filter((n) => n.status === 'PENDING').length;
      const confirmedCount = empNotifications.filter((n) => n.status === 'CONFIRMED').length;
      const declinedCount = empNotifications.filter((n) => n.status === 'DECLINED').length;

      return {
        id: emp.id,
        name: emp.name,
        employeeNumber: emp.employeeNumber,
        email: emp.email,
        department: emp.department,
        role: emp.role,
        assetCount: assignedAssets.length,
        totalAssetValue,
        licenseCount: assignedLicenses.length,
        totalLicenseValue,
        totalValue: totalAssetValue + totalLicenseValue,
        pendingConfirmations,
        confirmedCount,
        declinedCount,
        assets: assignedAssets.map((a) => ({
          id: a.id,
          tag: a.tag,
          name: a.name,
          category: a.category,
          unitCost: Number(a.unitCost || 0),
          status: a.status,
          checkoutDate: a.checkoutDate,
          expectedCheckinDate: a.expectedCheckinDate,
          confirmationStatus: 'PENDING', // Would need to join with notifications
        })),
        licenses: assignedLicenses.map((la) => ({
          id: la.id,
          licenseName: la.licenseName,
          quantity: Number(la.quantity || 1),
          unitCost: Number(la.unitCost || 0),
          assignedAt: la.assignedAt,
          status: la.status,
        })),
      };
    });

    // Sort by total value (descending)
    report.sort((a, b) => b.totalValue - a.totalValue);

    // Summary statistics
    const totalEmployees = employees.length;
    const totalAssetsAssigned = assets.filter((a) => a.employeeId).length;
    const totalLicensesAssigned = licenseAssignments.length;
    const totalValueAssigned = report.reduce((sum, e) => sum + e.totalValue, 0);
    const employeesWithPendingConfirmations = report.filter((e) => e.pendingConfirmations > 0).length;

    const summary = {
      totalEmployees,
      totalAssetsAssigned,
      totalLicensesAssigned,
      totalValueAssigned,
      averageValuePerEmployee: totalEmployees > 0 ? totalValueAssigned / totalEmployees : 0,
      employeesWithPendingConfirmations,
      topEmployees: report.slice(0, 5),
      byDepartment: (() => {
        const deptStats = {};
        report.forEach((emp) => {
          const dept = emp.department || 'Unassigned';
          if (!deptStats[dept]) {
            deptStats[dept] = { employeeCount: 0, totalValue: 0, assetCount: 0, licenseCount: 0 };
          }
          deptStats[dept].employeeCount += 1;
          deptStats[dept].totalValue += emp.totalValue;
          deptStats[dept].assetCount += emp.assetCount;
          deptStats[dept].licenseCount += emp.licenseCount;
        });
        return deptStats;
      })(),
    };

    res.json({ report, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============================
// REPORTS (ADMIN)
// =============================

app.get('/api/reports/maintenance-cost', requireAdmin, async (_req, res) => {
  try {
    // Get all maintenance records
    const maintenance = await queryAll(
      `
      SELECT
        m.id,
        m.title,
        m.description,
        m.status,
        m.priority,
        m.cost,
        m.submittedAt,
        m.assetId,
        m.category,
        a.tag AS assetTag,
        a.name AS assetName,
        a.unitCost AS assetValue,
        a.category AS assetCategory
      FROM Maintenance m
      LEFT JOIN Asset a ON a.id = m.assetId
      WHERE COALESCE(m.isArchived, 0) = 0
      ORDER BY m.submittedAt DESC
      `,
    );

    // Get current year and calculate date ranges
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Process maintenance records
    const report = maintenance.map((m) => {
      const submittedAt = m.submittedAt ? new Date(m.submittedAt) : null;
      const month = submittedAt ? submittedAt.getMonth() : null;
      const year = submittedAt ? submittedAt.getFullYear() : null;
      const costVsValue = m.assetValue > 0 ? (m.cost / m.assetValue) * 100 : 0;

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        priority: m.priority,
        cost: Number(m.cost || 0),
        submittedAt: m.submittedAt,
        month,
        year,
        assetId: m.assetId,
        assetTag: m.assetTag,
        assetName: m.assetName,
        assetValue: Number(m.assetValue || 0),
        assetCategory: m.assetCategory,
        category: m.category,
        costVsValue: Math.round(costVsValue * 100) / 100,
        isHighCost: costVsValue > 50, // Flag if maintenance > 50% of asset value
      };
    });

    // Calculate totals
    const totalCost = report.reduce((sum, m) => sum + m.cost, 0);
    const totalRecords = report.length;

    // By Asset (group maintenance by asset)
    const byAsset = {};
    report.forEach((m) => {
      const key = m.assetId || 'unassigned';
      if (!byAsset[key]) {
        byAsset[key] = {
          assetId: m.assetId,
          assetTag: m.assetTag,
          assetName: m.assetName,
          assetValue: m.assetValue,
          assetCategory: m.assetCategory,
          maintenanceCount: 0,
          totalCost: 0,
          tickets: [],
        };
      }
      byAsset[key].maintenanceCount += 1;
      byAsset[key].totalCost += m.cost;
      byAsset[key].tickets.push({
        id: m.id,
        title: m.title,
        cost: m.cost,
        status: m.status,
        priority: m.priority,
        submittedAt: m.submittedAt,
      });
    });

    // Calculate cost vs value ratio for each asset
    Object.values(byAsset).forEach((asset) => {
      asset.costVsValue = asset.assetValue > 0
        ? Math.round((asset.totalCost / asset.assetValue) * 100 * 100) / 100
        : 0;
      asset.isHighCost = asset.costVsValue > 50;
      asset.shouldReplace = asset.costVsValue > 100; // Maintenance costs exceed asset value
    });

    // Convert to array and sort by total cost
    const assetsReport = Object.values(byAsset).sort((a, b) => b.totalCost - a.totalCost);

    // By Month (for trend analysis - last 12 months)
    const monthlyTrends = {};
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrends[key] = {
        month: date.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        year: date.getFullYear(),
        monthNum: date.getMonth(),
        count: 0,
        cost: 0,
      };
    }

    report.forEach((m) => {
      if (m.year !== null && m.month !== null) {
        const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
        if (monthlyTrends[key]) {
          monthlyTrends[key].count += 1;
          monthlyTrends[key].cost += m.cost;
        }
      }
    });

    const trendsArray = Object.values(monthlyTrends);

    // By Priority
    const byPriority = {
      'Critical': { count: 0, cost: 0 },
      'High': { count: 0, cost: 0 },
      'Medium': { count: 0, cost: 0 },
      'Low': { count: 0, cost: 0 },
    };

    report.forEach((m) => {
      const priority = m.priority || 'Medium';
      if (byPriority[priority]) {
        byPriority[priority].count += 1;
        byPriority[priority].cost += m.cost;
      }
    });

    // By Status
    const byStatus = {
      'Open': { count: 0, cost: 0 },
      'In Progress': { count: 0, cost: 0 },
      'Resolved': { count: 0, cost: 0 },
      'Closed': { count: 0, cost: 0 },
    };

    report.forEach((m) => {
      const status = m.status || 'Open';
      if (byStatus[status]) {
        byStatus[status].count += 1;
        byStatus[status].cost += m.cost;
      }
    });

    // By Category
    const byCategory = {};
    report.forEach((m) => {
      const cat = m.category || 'Other';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, cost: 0 };
      }
      byCategory[cat].count += 1;
      byCategory[cat].cost += m.cost;
    });

    // High cost alerts (maintenance > 50% of asset value)
    const highCostAssets = assetsReport.filter((a) => a.isHighCost);
    const shouldReplaceAssets = assetsReport.filter((a) => a.shouldReplace);

    // Current year vs previous year
    const currentYearCost = report.filter((m) => m.year === currentYear).reduce((sum, m) => sum + m.cost, 0);
    const previousYearCost = report.filter((m) => m.year === currentYear - 1).reduce((sum, m) => sum + m.cost, 0);

    const summary = {
      totalRecords,
      totalCost,
      averageCostPerTicket: totalRecords > 0 ? totalCost / totalRecords : 0,
      assetsWithMaintenance: assetsReport.length,
      highCostAssetsCount: highCostAssets.length,
      shouldReplaceCount: shouldReplaceAssets.length,
      byPriority,
      byStatus,
      byCategory,
      trends: trendsArray,
      currentYearCost,
      previousYearCost,
      yearOverYearChange: previousYearCost > 0
        ? Math.round(((currentYearCost - previousYearCost) / previousYearCost) * 100)
        : 0,
      topCostlyAssets: assetsReport.slice(0, 5),
    };

    res.json({ report, assetsReport, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============================
// REPORTS (ADMIN)
// =============================

app.get('/api/reports/department-allocation', requireAdmin, async (_req, res) => {
  try {
    // Get all employees with their department
    const employees = await queryAll(
      `
      SELECT id, name, department, employeeNumber, role
      FROM Employee
      WHERE COALESCE(isArchived, 0) = 0
      `,
    );

    // Get all assets with employee info
    const assets = await queryAll(
      `
      SELECT
        a.id,
        a.tag,
        a.name,
        a.category,
        a.unitCost,
        a.status,
        a.employeeId,
        e.department
      FROM Asset a
      LEFT JOIN Employee e ON e.id = a.employeeId
      WHERE COALESCE(a.isArchived, 0) = 0
      `,
    );

    // Get all license assignments with employee info
    const licenseAssignments = await queryAll(
      `
      SELECT
        la.id,
        la.licenseId,
        la.employeeId,
        la.quantity,
        la.status,
        l.name AS licenseName,
        l.unitCost,
        e.department
      FROM LicenseAssignment la
      LEFT JOIN License l ON l.id = la.licenseId
      LEFT JOIN Employee e ON e.id = la.employeeId
      WHERE la.status = 'ACTIVE'
      `,
    );

    // Build department stats
    const departmentStats = {};

    // Initialize from employees
    employees.forEach((emp) => {
      const dept = emp.department || 'Unassigned';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          employeeCount: 0,
          employees: [],
          assetCount: 0,
          assetValue: 0,
          licenseSeats: 0,
          licenseValue: 0,
          assets: [],
          licenses: [],
        };
      }
      departmentStats[dept].employeeCount += 1;
      departmentStats[dept].employees.push({
        id: emp.id,
        name: emp.name,
        employeeNumber: emp.employeeNumber,
      });
    });

    // Add asset data
    assets.forEach((asset) => {
      const dept = asset.department || 'Unassigned';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          employeeCount: 0,
          employees: [],
          assetCount: 0,
          assetValue: 0,
          licenseSeats: 0,
          licenseValue: 0,
          assets: [],
          licenses: [],
        };
      }
      departmentStats[dept].assetCount += 1;
      departmentStats[dept].assetValue += Number(asset.unitCost || 0);
      departmentStats[dept].assets.push({
        id: asset.id,
        tag: asset.tag,
        name: asset.name,
        category: asset.category,
        unitCost: Number(asset.unitCost || 0),
        status: asset.status,
      });
    });

    // Add license data
    licenseAssignments.forEach((assignment) => {
      const dept = assignment.department || 'Unassigned';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          department: dept,
          employeeCount: 0,
          employees: [],
          assetCount: 0,
          assetValue: 0,
          licenseSeats: 0,
          licenseValue: 0,
          assets: [],
          licenses: [],
        };
      }
      departmentStats[dept].licenseSeats += Number(assignment.quantity || 1);
      departmentStats[dept].licenseValue += Number(assignment.unitCost || 0);
      departmentStats[dept].licenses.push({
        id: assignment.id,
        licenseName: assignment.licenseName,
        quantity: Number(assignment.quantity || 1),
        unitCost: Number(assignment.unitCost || 0),
      });
    });

    // Calculate totals and per-employee averages
    const report = Object.values(departmentStats).map((dept) => {
      const totalValue = dept.assetValue + dept.licenseValue;
      const perEmployeeValue = dept.employeeCount > 0 ? totalValue / dept.employeeCount : 0;
      const perEmployeeAssets = dept.employeeCount > 0 ? dept.assetCount / dept.employeeCount : 0;
      const perEmployeeLicenses = dept.employeeCount > 0 ? dept.licenseSeats / dept.employeeCount : 0;

      return {
        ...dept,
        totalValue,
        perEmployeeValue: Math.round(perEmployeeValue * 100) / 100,
        perEmployeeAssets: Math.round(perEmployeeAssets * 100) / 100,
        perEmployeeLicenses: Math.round(perEmployeeLicenses * 100) / 100,
      };
    });

    // Sort by total value (descending)
    report.sort((a, b) => b.totalValue - a.totalValue);

    // Summary statistics
    const totalEmployees = employees.length;
    const totalAssets = assets.length;
    const totalAssetValue = assets.reduce((sum, a) => sum + Number(a.unitCost || 0), 0);
    const totalLicenseSeats = licenseAssignments.reduce((sum, l) => sum + Number(l.quantity || 1), 0);
    const totalLicenseValue = licenseAssignments.reduce((sum, l) => sum + Number(l.unitCost || 0), 0);

    const summary = {
      totalDepartments: report.length,
      totalEmployees,
      totalAssets,
      totalAssetValue,
      totalLicenseSeats,
      totalLicenseValue,
      totalValue: totalAssetValue + totalLicenseValue,
      averageValuePerDepartment: report.length > 0 ? (totalAssetValue + totalLicenseValue) / report.length : 0,
      averageValuePerEmployee: totalEmployees > 0 ? (totalAssetValue + totalLicenseValue) / totalEmployees : 0,
      topDepartment: report.length > 0 ? report[0] : null,
    };

    res.json({ report, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============================
// REPORTS (ADMIN)
// =============================

app.get('/api/reports/asset-valuation', requireAdmin, async (_req, res) => {
  try {
    const assets = await queryAll(
      `
      SELECT
        a.id,
        a.tag,
        a.name,
        a.category,
        a.status,
        a.unitCost,
        a.location,
        a.purchaseDate,
        a.employeeId,
        e.name AS assignedTo,
        e.department,
        a.createdAt,
        a.isArchived
      FROM Asset a
      LEFT JOIN Employee e ON e.id = a.employeeId
      WHERE COALESCE(a.isArchived, 0) = 0
      ORDER BY a.unitCost DESC, a.purchaseDate DESC
      `,
    );

    const today = new Date();
    const currentYear = today.getFullYear();

    const report = assets.map((asset) => {
      const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
      const ageInDays = purchaseDate ? Math.ceil((today - purchaseDate) / (1000 * 60 * 60 * 24)) : null;
      const ageInYears = ageInDays !== null ? Math.floor(ageInDays / 365) : null;
      const purchaseYear = purchaseDate ? purchaseDate.getFullYear() : null;

      return {
        id: asset.id,
        tag: asset.tag,
        name: asset.name,
        category: asset.category,
        status: asset.status,
        unitCost: Number(asset.unitCost || 0),
        location: asset.location,
        purchaseDate: asset.purchaseDate,
        ageInDays,
        ageInYears,
        purchaseYear,
        assignedTo: asset.assignedTo,
        department: asset.department,
        isArchived: Number(asset.isArchived || 0),
      };
    });

    // Summary statistics
    const totalValue = report.reduce((sum, a) => sum + a.unitCost, 0);
    const totalAssets = report.length;

    // By Category
    const byCategory = {};
    report.forEach((asset) => {
      const cat = asset.category || 'Uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, value: 0 };
      }
      byCategory[cat].count += 1;
      byCategory[cat].value += asset.unitCost;
    });

    // By Department
    const byDepartment = {};
    report.forEach((asset) => {
      const dept = asset.department || 'Unassigned';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { count: 0, value: 0 };
      }
      byDepartment[dept].count += 1;
      byDepartment[dept].value += asset.unitCost;
    });

    // By Status
    const byStatus = {};
    report.forEach((asset) => {
      const status = asset.status || 'Unknown';
      if (!byStatus[status]) {
        byStatus[status] = { count: 0, value: 0 };
      }
      byStatus[status].count += 1;
      byStatus[status].value += asset.unitCost;
    });

    // By Purchase Year
    const byPurchaseYear = {};
    report.forEach((asset) => {
      const year = asset.purchaseYear || 'Unknown';
      if (!byPurchaseYear[year]) {
        byPurchaseYear[year] = { count: 0, value: 0 };
      }
      byPurchaseYear[year].count += 1;
      byPurchaseYear[year].value += asset.unitCost;
    });

    // Age Analysis
    const ageBrackets = {
      '0-1 years': { count: 0, value: 0 },
      '1-3 years': { count: 0, value: 0 },
      '3-5 years': { count: 0, value: 0 },
      '5+ years': { count: 0, value: 0 },
      'Unknown': { count: 0, value: 0 },
    };

    report.forEach((asset) => {
      if (asset.ageInYears === null) {
        ageBrackets['Unknown'].count += 1;
        ageBrackets['Unknown'].value += asset.unitCost;
      } else if (asset.ageInYears < 1) {
        ageBrackets['0-1 years'].count += 1;
        ageBrackets['0-1 years'].value += asset.unitCost;
      } else if (asset.ageInYears < 3) {
        ageBrackets['1-3 years'].count += 1;
        ageBrackets['1-3 years'].value += asset.unitCost;
      } else if (asset.ageInYears < 5) {
        ageBrackets['3-5 years'].count += 1;
        ageBrackets['3-5 years'].value += asset.unitCost;
      } else {
        ageBrackets['5+ years'].count += 1;
        ageBrackets['5+ years'].value += asset.unitCost;
      }
    });

    // Current year purchases
    const currentYearPurchases = report.filter((a) => a.purchaseYear === currentYear);
    const previousYearPurchases = report.filter((a) => a.purchaseYear === currentYear - 1);

    const summary = {
      totalAssets,
      totalValue,
      averageAssetValue: totalAssets > 0 ? totalValue / totalAssets : 0,
      byCategory,
      byDepartment,
      byStatus,
      byPurchaseYear,
      ageBrackets,
      currentYearPurchases: {
        count: currentYearPurchases.length,
        value: currentYearPurchases.reduce((sum, a) => sum + a.unitCost, 0),
      },
      previousYearPurchases: {
        count: previousYearPurchases.length,
        value: previousYearPurchases.reduce((sum, a) => sum + a.unitCost, 0),
      },
      unassignedAssets: report.filter((a) => !a.assignedTo).length,
      deployedAssets: report.filter((a) => a.assignedTo).length,
    };

    res.json({ report, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reports/asset-valuation', requireAdmin, async (_req, res) => {
  try {
    const assets = await queryAll(
      `
      SELECT
        a.id,
        a.tag,
        a.name,
        a.category,
        a.status,
        a.unitCost,
        a.location,
        a.purchaseDate,
        a.employeeId,
        e.name AS assignedTo,
        e.department,
        a.createdAt,
        a.isArchived
      FROM Asset a
      LEFT JOIN Employee e ON e.id = a.employeeId
      WHERE COALESCE(a.isArchived, 0) = 0
      ORDER BY a.unitCost DESC, a.purchaseDate DESC
      `,
    );

    const today = new Date();
    const currentYear = today.getFullYear();

    const report = assets.map((asset) => {
      const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
      const ageInDays = purchaseDate ? Math.ceil((today - purchaseDate) / (1000 * 60 * 60 * 24)) : null;
      const ageInYears = ageInDays !== null ? Math.floor(ageInDays / 365) : null;
      const purchaseYear = purchaseDate ? purchaseDate.getFullYear() : null;

      return {
        id: asset.id,
        tag: asset.tag,
        name: asset.name,
        category: asset.category,
        status: asset.status,
        unitCost: Number(asset.unitCost || 0),
        location: asset.location,
        purchaseDate: asset.purchaseDate,
        ageInDays,
        ageInYears,
        purchaseYear,
        assignedTo: asset.assignedTo,
        department: asset.department,
        isArchived: Number(asset.isArchived || 0),
      };
    });

    const totalValue = report.reduce((sum, a) => sum + a.unitCost, 0);
    const totalAssets = report.length;

    const byCategory = {};
    report.forEach((asset) => {
      const cat = asset.category || 'Uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, value: 0 };
      }
      byCategory[cat].count += 1;
      byCategory[cat].value += asset.unitCost;
    });

    const byDepartment = {};
    report.forEach((asset) => {
      const dept = asset.department || 'Unassigned';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { count: 0, value: 0 };
      }
      byDepartment[dept].count += 1;
      byDepartment[dept].value += asset.unitCost;
    });

    const byStatus = {};
    report.forEach((asset) => {
      const status = asset.status || 'Unknown';
      if (!byStatus[status]) {
        byStatus[status] = { count: 0, value: 0 };
      }
      byStatus[status].count += 1;
      byStatus[status].value += asset.unitCost;
    });

    const byPurchaseYear = {};
    report.forEach((asset) => {
      const year = asset.purchaseYear || 'Unknown';
      if (!byPurchaseYear[year]) {
        byPurchaseYear[year] = { count: 0, value: 0 };
      }
      byPurchaseYear[year].count += 1;
      byPurchaseYear[year].value += asset.unitCost;
    });

    const ageBrackets = {
      '0-1 years': { count: 0, value: 0 },
      '1-3 years': { count: 0, value: 0 },
      '3-5 years': { count: 0, value: 0 },
      '5+ years': { count: 0, value: 0 },
      'Unknown': { count: 0, value: 0 },
    };

    report.forEach((asset) => {
      if (asset.ageInYears === null) {
        ageBrackets['Unknown'].count += 1;
        ageBrackets['Unknown'].value += asset.unitCost;
      } else if (asset.ageInYears < 1) {
        ageBrackets['0-1 years'].count += 1;
        ageBrackets['0-1 years'].value += asset.unitCost;
      } else if (asset.ageInYears < 3) {
        ageBrackets['1-3 years'].count += 1;
        ageBrackets['1-3 years'].value += asset.unitCost;
      } else if (asset.ageInYears < 5) {
        ageBrackets['3-5 years'].count += 1;
        ageBrackets['3-5 years'].value += asset.unitCost;
      } else {
        ageBrackets['5+ years'].count += 1;
        ageBrackets['5+ years'].value += asset.unitCost;
      }
    });

    const currentYearPurchases = report.filter((a) => a.purchaseYear === currentYear);
    const previousYearPurchases = report.filter((a) => a.purchaseYear === currentYear - 1);

    const summary = {
      totalAssets,
      totalValue,
      averageAssetValue: totalAssets > 0 ? totalValue / totalAssets : 0,
      byCategory,
      byDepartment,
      byStatus,
      byPurchaseYear,
      ageBrackets,
      currentYearPurchases: {
        count: currentYearPurchases.length,
        value: currentYearPurchases.reduce((sum, a) => sum + a.unitCost, 0),
      },
      previousYearPurchases: {
        count: previousYearPurchases.length,
        value: previousYearPurchases.reduce((sum, a) => sum + a.unitCost, 0),
      },
      unassignedAssets: report.filter((a) => !a.assignedTo).length,
      deployedAssets: report.filter((a) => a.assignedTo).length,
    };

    res.json({ report, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============================
// REPORTS (ADMIN)
// =============================

app.get('/api/reports/license-compliance', requireAdmin, async (_req, res) => {
  try {
    const licenses = await queryAll(
      `
      SELECT
        l.id,
        l.name,
        l.manufacturer,
        l.key,
        l.licensedEmail,
        l.expirationDate,
        l.total,
        l.avail,
        l.unitCost,
        l.createdAt,
        l.isArchived
      FROM License l
      WHERE COALESCE(l.isArchived, 0) = 0
      ORDER BY l.expirationDate ASC, l.name ASC
      `,
    );

    const report = licenses.map((license) => {
      const total = Number(license.total || 0);
      const avail = Number(license.avail || 0);
      const assigned = total - avail;
      const unitCost = Number(license.unitCost || 0);
      const expirationDate = license.expirationDate ? new Date(license.expirationDate) : null;
      const today = new Date();
      
      let daysUntilExpiration = null;
      let expirationStatus = 'valid';
      
      if (expirationDate) {
        daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiration < 0) {
          expirationStatus = 'expired';
        } else if (daysUntilExpiration <= 30) {
          expirationStatus = 'expiring_soon';
        } else if (daysUntilExpiration <= 90) {
          expirationStatus = 'expiring_90';
        }
      }

      const utilization = total > 0 ? (assigned / total) * 100 : 0;
      const isOverAllocated = assigned > total;
      const totalValue = total * unitCost;
      const assignedValue = assigned * unitCost;

      return {
        id: license.id,
        name: license.name,
        manufacturer: license.manufacturer,
        licensedEmail: license.licensedEmail,
        expirationDate: license.expirationDate,
        daysUntilExpiration,
        expirationStatus,
        total,
        assigned,
        avail,
        utilization: Math.round(utilization * 100) / 100,
        unitCost,
        totalValue,
        assignedValue,
        isOverAllocated,
        isArchived: Number(license.isArchived || 0),
      };
    });

    // Summary statistics
    const summary = {
      totalLicenses: report.length,
      expiredCount: report.filter((r) => r.expirationStatus === 'expired').length,
      expiringSoonCount: report.filter((r) => r.expirationStatus === 'expiring_soon').length,
      expiring90Count: report.filter((r) => r.expirationStatus === 'expiring_90').length,
      overAllocatedCount: report.filter((r) => r.isOverAllocated).length,
      totalValue: report.reduce((sum, r) => sum + r.totalValue, 0),
      assignedValue: report.reduce((sum, r) => sum + r.assignedValue, 0),
      averageUtilization: report.length > 0
        ? Math.round((report.reduce((sum, r) => sum + r.utilization, 0) / report.length) * 100) / 100
        : 0,
    };

    res.json({ report, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// AUDIT (ADMIN)
app.get('/api/audit', requireAdmin, async (_req, res) => {
  try {
    const rows = await queryAll(
      `
      SELECT * FROM AuditLog
      ORDER BY datetime(createdAt) DESC
      LIMIT 500
      `,
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/audit', requireAdmin, async (req, res) => {
  try {
    const type = requireNonEmptyString(req.body.type, 'Audit type');
    const entity = requireNonEmptyString(req.body.entity, 'Audit entity');
    const message = requireNonEmptyString(req.body.message, 'Audit message');
    const id = uid();

    await run(
      `
      INSERT INTO AuditLog (id, timestamp, type, entity, message, user, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        new Date().toLocaleString(),
        type,
        entity,
        message,
        getActorMeta(req).actorName,
        nowIso(),
      ],
    );

    res.status(201).json({ id });
  } catch (e) {
    badRequest(res, e.message);
  }
});

app.delete('/api/audit', requireAdmin, async (_req, res) => {
  try {
    await run('DELETE FROM AuditLog');
    res.json({ success: true });
  } catch (e) {
    badRequest(res, e.message);
  }
});

const ensureEmployeeEncryptedColumns = async () => {
  const columns = await queryAll('PRAGMA table_info(Employee)');
  const names = new Set(columns.map((c) => String(c.name)));

  if (!names.has('phoneEnc')) {
    await run('ALTER TABLE Employee ADD COLUMN phoneEnc TEXT');
  }

  if (!names.has('jobTitleEnc')) {
    await run('ALTER TABLE Employee ADD COLUMN jobTitleEnc TEXT');
  }
};

const start = async () => {
  await ensureNotificationTable();
  await ensureLicenseAssignmentTable();
  await ensureEmployeeVerificationColumns();
  await ensurePasswordResetColumns();
  await ensureEmployeeEncryptedColumns();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`AssetFlow Turso API -> http://localhost:${PORT}`);
  });
};

// Production error handler
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});