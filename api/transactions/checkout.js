import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const uid = () => randomUUID();
const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
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
const requireNonEmptyString = (value, label) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
const getRequiredRow = async (db, table, id, label = 'Record') => {
  const result = await db.execute({ 
    sql: `SELECT * FROM ${table} WHERE id = ?`, 
    args: [String(id)] 
  });
  const row = result.rows[0];
  if (!row) throw new Error(`${label} not found`);
  return row;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const queryOne = async (sql, args = []) => {
    const result = await db.execute({ sql, args });
    return result.rows[0] || null;
  };

  const run = async (sql, args = []) => {
    return await db.execute({ sql, args });
  };

  try {
    const resourceType = normalizeResourceType(requireNonEmptyString(req.body.resourceType, 'Resource type'));
    const itemId = requireNonEmptyString(req.body.itemId, 'Item ID');
    const qty = normalizeQuantity(req.body.quantity);

    if (!['asset', 'component', 'accessory', 'consumable', 'license'].includes(resourceType)) {
      return res.status(400).json({ error: 'Unsupported checkout resource type' });
    }

    if (resourceType === 'consumable') {
      const item = await getRequiredRow(db, 'Consumable', itemId, 'Consumable');
      if (Number(item.remaining || 0) < qty) {
        return res.status(400).json({ error: 'Not enough consumable stock available' });
      }

      await run('UPDATE Consumable SET remaining = ? WHERE id = ?', [Number(item.remaining || 0) - qty, itemId]);

      return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM Consumable WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'license') {
      const item = await getRequiredRow(db, 'License', itemId, 'License');
      const employeeId = requireNonEmptyString(req.body.employeeId, 'Employee ID');
      
      if (Number(item.avail || 0) < qty) {
        return res.status(400).json({ error: 'Not enough licenses available' });
      }

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
          String(req.body.assignedById || ''),
          req.body.assignedByName || '',
          String(req.body.notes || ''),
        ],
      );

      return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM License WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'accessory') {
      const item = await getRequiredRow(db, 'Accessory', itemId, 'Accessory');
      const available = Number(item.total || 0) - Number(item.checkedOut || 0);
      
      if (available < qty) {
        return res.status(400).json({ error: 'Not enough accessory stock available' });
      }

      await run('UPDATE Accessory SET checkedOut = ? WHERE id = ?', [Number(item.checkedOut || 0) + qty, itemId]);

      return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM Accessory WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'component') {
      const item = await getRequiredRow(db, 'Component', itemId, 'Component');
      
      if (Number(item.remaining || 0) < qty) {
        return res.status(400).json({ error: 'Not enough component stock available' });
      }

      await run('UPDATE Component SET remaining = ?, status = ? WHERE id = ?', [
        Number(item.remaining || 0) - qty,
        'DEPLOYED',
        itemId,
      ]);

      return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM Component WHERE id = ?', [itemId]) });
    }

    // Asset checkout
    const assetItem = await getRequiredRow(db, 'Asset', itemId, 'Asset');
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

    return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM Asset WHERE id = ?', [itemId]) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}