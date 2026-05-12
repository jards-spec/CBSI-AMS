require('dotenv').config();
const nodemailer = require('nodemailer');

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
};

const isMailerConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM,
  );
};

let transporter = null;

const getTransporter = () => {
  if (!isMailerConfigured()) {
    throw new Error('SMTP env vars are not fully configured.');
  }

  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: toBool(process.env.SMTP_SECURE, false),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const sendAssetAssignmentEmail = async ({
  to,
  employeeName,
  assetTag,
  assetName,
  assignedByName,
  checkoutDate,
  expectedCheckinDate,
  location,
}) => {
  if (!to) return { skipped: true, reason: 'Missing recipient email' };
  if (!isMailerConfigured()) return { skipped: true, reason: 'SMTP not configured' };

  const transport = getTransporter();

  const subject = `Asset Assignment Notice: ${assetTag || 'N/A'}${assetName ? ` - ${assetName}` : ''}`.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">Asset Assigned</h2>
      <p>Hello ${employeeName || 'Employee'},</p>
      <p>An asset has been assigned to you.</p>

      <table style="border-collapse: collapse; margin-top: 12px;">
        <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Asset Tag</strong></td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${assetTag || 'N/A'}</td></tr>
        <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Asset Name</strong></td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${assetName || 'N/A'}</td></tr>
        <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Assigned By</strong></td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${assignedByName || 'System'}</td></tr>
        <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Checkout Date</strong></td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${checkoutDate || 'N/A'}</td></tr>
        <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Expected Check-In</strong></td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${expectedCheckinDate || 'N/A'}</td></tr>
        <tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Location</strong></td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${location || 'N/A'}</td></tr>
      </table>

      <p style="margin-top: 16px;">If this assignment is incorrect, please contact your administrator.</p>
      <p>CentralBooks Vantage AMS</p>
    </div>
  `;

  const result = await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });

  return { success: true, messageId: result.messageId };
};

const sendEmailVerificationEmail = async ({ to, name, verifyUrl }) => {
  if (!to) return { skipped: true, reason: 'Missing recipient email' };
  if (!isMailerConfigured()) return { skipped: true, reason: 'SMTP not configured' };

  const transport = getTransporter();

  const subject = 'Verify your AssetFlow account email';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">Verify Your Email</h2>
      <p>Hello ${name || 'User'},</p>
      <p>Thanks for creating your AssetFlow account.</p>
      <p>Please verify your email by clicking the button below:</p>

      <p style="margin: 20px 0;">
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;">
          Verify Email
        </a>
      </p>

      <p>If the button does not work, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; font-size: 12px;">${verifyUrl}</p>

      <p>This link will expire automatically.</p>
      <p>CentralBooks Vantage AMS</p>
    </div>
  `;

  const result = await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });

  return { success: true, messageId: result.messageId };
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  if (!to) return { skipped: true, reason: 'Missing recipient email' };
  if (!isMailerConfigured()) return { skipped: true, reason: 'SMTP not configured' };

  const transport = getTransporter();

  const subject = 'Reset your AssetFlow password';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">Password Reset Request</h2>
      <p>Hello ${name || 'User'},</p>
      <p>We received a request to reset your password.</p>
      <p>If this was you, click the button below:</p>

      <p style="margin: 20px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;">
          Reset Password
        </a>
      </p>

      <p>If the button does not work, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; font-size: 12px;">${resetUrl}</p>

      <p>If you did not request this, you can ignore this email.</p>
      <p>CentralBooks Vantage AMS</p>
    </div>
  `;

  const result = await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });

  return { success: true, messageId: result.messageId };
};

module.exports = {
  isMailerConfigured,
  sendAssetAssignmentEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
};