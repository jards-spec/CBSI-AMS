const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'index.turso.js');
const backupPath = path.join(__dirname, `index.turso.backup.${Date.now()}.js`);

let src = fs.readFileSync(targetPath, 'utf8');
fs.writeFileSync(backupPath, src, 'utf8');

const ensure = (condition, msg) => {
  if (!condition) throw new Error(msg);
};

const addIfMissing = (needle, insertAfter, block) => {
  if (src.includes(needle)) return;
  ensure(src.includes(insertAfter), `Could not find insertion anchor: ${insertAfter.slice(0, 80)}...`);
  src = src.replace(insertAfter, `${insertAfter}\n${block}\n`);
};

// 1) crypto import
src = src.replace(
  "const { randomUUID, randomBytes } = require('crypto');",
  "const { randomUUID, randomBytes, createHash } = require('crypto');",
);

// 2) mailer import
src = src.replace(
  `const {
  sendAssetAssignmentEmail,
  sendEmailVerificationEmail,
  isMailerConfigured,
} = require('./mailer');`,
  `const {
  sendAssetAssignmentEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  isMailerConfigured,
} = require('./mailer');`,
);

// 3) sanitizeEmployee
src = src.replace(
  `const {
    password,
    emailVerificationToken,
    emailVerificationExpiresAt,
    ...safe
  } = row;`,
  `const {
    password,
    emailVerificationToken,
    emailVerificationExpiresAt,
    passwordResetToken,
    passwordResetExpiresAt,
    ...safe
  } = row;`,
);

// 4) add password reset helper block after buildEmailVerificationUrl
addIfMissing(
  'const passwordResetTtlMinutes = () =>',
  "const buildEmailVerificationUrl = (token) => {\n  const base =\n    process.env.API_PUBLIC_BASE_URL ||\n    process.env.BACKEND_PUBLIC_URL ||\n    'http://localhost:5000';\n  return `${String(base).replace(/\\/+$, '')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;\n};",
  `const passwordResetTtlMinutes = () =>
  Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);

const createPasswordResetToken = () => randomBytes(32).toString('hex');

const hashToken = (token) =>
  createHash('sha256').update(String(token)).digest('hex');

const createPasswordResetExpiry = () => {
  const minutes = passwordResetTtlMinutes();
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
};

const buildPasswordResetUrl = (token) => {
  const base =
    process.env.PASSWORD_RESET_URL_BASE ||
    process.env.APP_WEB_URL ||
    'http://localhost:5173/reset-password';

  const trimmed = String(base).trim();
  if (trimmed.includes('{token}')) {
    return trimmed.replace('{token}', encodeURIComponent(token));
  }

  const separator = trimmed.includes('?') ? '&' : '?';
  return \`\${trimmed}\${separator}token=\${encodeURIComponent(token)}\`;
};`,
);

// 5) add columns in ensureEmployeeVerificationColumns
if (!src.includes("ADD COLUMN passwordResetToken TEXT")) {
  src = src.replace(
    "if (!names.has('emailVerifiedAt')) {\n    await run('ALTER TABLE Employee ADD COLUMN emailVerifiedAt TEXT');\n  }",
    `if (!names.has('emailVerifiedAt')) {
    await run('ALTER TABLE Employee ADD COLUMN emailVerifiedAt TEXT');
  }
  if (!names.has('passwordResetToken')) {
    await run('ALTER TABLE Employee ADD COLUMN passwordResetToken TEXT');
  }
  if (!names.has('passwordResetExpiresAt')) {
    await run('ALTER TABLE Employee ADD COLUMN passwordResetExpiresAt TEXT');
  }`,
  );
}

// 6) insert forgot/reset routes after resend-verification
if (!src.includes("/api/auth/forgot-password")) {
  const anchor = "app.post('/api/auth/login', authLimiter, async (req, res) => {";
  ensure(src.includes(anchor), 'Could not find login route anchor.');

  const block = `app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const employeeNumber = normalizeEmployeeNumber(req.body.employeeNumber || '');

    if (!email && !employeeNumber) {
      return badRequest(res, 'Email or Employee Number is required.');
    }

    const employee = await queryOne(
      \`
      SELECT *
      FROM Employee
      WHERE COALESCE(isArchived, 0) = 0
        AND (
          (? != '' AND lower(email) = ?)
          OR (? != '' AND upper(employeeNumber) = ?)
        )
      LIMIT 1
      \`,
      [email, email, employeeNumber, employeeNumber],
    );

    if (!employee) {
      return res.json({
        success: true,
        message: 'If the account exists, a password reset email has been sent.',
      });
    }

    const rawToken = createPasswordResetToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = createPasswordResetExpiry();

    await run(
      \`
      UPDATE Employee
      SET passwordResetToken = ?, passwordResetExpiresAt = ?
      WHERE id = ?
      \`,
      [tokenHash, expiresAt, String(employee.id)],
    );

    if (isMailerConfigured()) {
      const resetUrl = buildPasswordResetUrl(rawToken);
      await sendPasswordResetEmail({
        to: employee.email,
        name: employee.name || '',
        resetUrl,
      });
    }

    return res.json({
      success: true,
      message: 'If the account exists, a password reset email has been sent.',
    });
  } catch (e) {
    return badRequest(res, e.message);
  }
});

app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const token = requireNonEmptyString(req.body.token, 'Token');
    const newPassword = String(req.body.password || '');

    if (newPassword.length < 6) {
      return badRequest(res, 'Password must be at least 6 characters.');
    }

    const tokenHash = hashToken(token);

    const employee = await queryOne(
      \`
      SELECT *
      FROM Employee
      WHERE passwordResetToken = ?
        AND COALESCE(isArchived, 0) = 0
      LIMIT 1
      \`,
      [tokenHash],
    );

    if (!employee) {
      return badRequest(res, 'Invalid or expired reset token.');
    }

    const expiresAt = String(employee.passwordResetExpiresAt || '').trim();
    if (!expiresAt || new Date(expiresAt).getTime() < Date.now()) {
      return badRequest(res, 'Invalid or expired reset token.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await run(
      \`
      UPDATE Employee
      SET password = ?,
          passwordResetToken = NULL,
          passwordResetExpiresAt = NULL
      WHERE id = ?
      \`,
      [hashedPassword, String(employee.id)],
    );

    return res.json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (e) {
    return badRequest(res, e.message);
  }
});\n\n`;

  src = src.replace(anchor, `${block}${anchor}`);
}

// 7) public whitelist
if (!src.includes("path === '/auth/forgot-password'")) {
  src = src.replace(
    "path === '/auth/resend-verification' ||",
    "path === '/auth/resend-verification' ||\n    path === '/auth/forgot-password' ||\n    path === '/auth/reset-password' ||",
  );
}

fs.writeFileSync(targetPath, src, 'utf8');
console.log('Patched successfully.');
console.log('Backup created at:', backupPath);