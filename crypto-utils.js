const { randomBytes, createCipheriv, createDecipheriv } = require('crypto');

const getKey = () => {
  const raw = process.env.DATA_ENCRYPTION_KEY_BASE64;
  if (!raw) throw new Error('DATA_ENCRYPTION_KEY_BASE64 is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY_BASE64 must decode to 32 bytes');
  return key;
};

// AES-256-GCM: authenticated encryption (confidentiality + integrity)
const encryptString = (plaintext) => {
  if (plaintext === null || plaintext === undefined) return null;

  const value = String(plaintext);
  if (!value) return null;

  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
};

const decryptString = (payload) => {
  if (!payload) return '';

  const [ivB64, tagB64, ctB64] = String(payload).split('.');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Invalid encrypted payload format');

  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
};

module.exports = { encryptString, decryptString };