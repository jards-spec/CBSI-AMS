import { createClient } from '@libsql/client';

const nowIso = () => new Date().toISOString();
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
      return res.status(400).json({ error: 'Unsupported checkin resource type' });
    }

    if (resourceType === 'consumable') {
      const item = await getRequiredRow(db, 'Consumable', itemId, 'Consumable');
      const nextRemaining = Number(item.remaining || 0) + qty;
      
      if (nextRemaining > Number(item.total || 0)) {
        return res.status(400).json({ error: 'Cannot check in more than total stock' });
      }

      await run('UPDATE Consumable SET remaining = ? WHERE id = ?', [nextRemaining, itemId]);

      return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM Consumable WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'license') {
      const item = await getRequiredRow(db, 'License', itemId, 'License');
      const nextAvail = Number(item.avail || 0) + qty;
      
      if (nextAvail > Number(item.total || 0)) {
        return res.status(400).json({ error: 'Cannot check in more than total seats' });
      }

      await run('UPDATE License SET avail = ? WHERE id = ?', [nextAvail, itemId]);

      return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM License WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'accessory') {
      const item = await getRequiredRow(db, 'Accessory', itemId, 'Accessory');
      const nextCheckedOut = Number(item.checkedOut || 0) - qty;
      
      if (nextCheckedOut < 0) {
        return res.status(400).json({ error: 'Cannot check in more than checked out' });
      }

      await run('UPDATE Accessory SET checkedOut = ? WHERE id = ?', [nextCheckedOut, itemId]);

      return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM Accessory WHERE id = ?', [itemId]) });
    }

    if (resourceType === 'component') {
      const item = await getRequiredRow(db, 'Component', itemId, 'Component');
      const nextRemaining = Number(item.remaining || 0) + qty;
      
      if (nextRemaining > Number(item.total || 0)) {
        return res.status(400).json({ error: 'Cannot check in more than total stock' });
      }

      await run('UPDATE Component SET remaining = ?, status = ? WHERE id = ?', [
        nextRemaining,
        nextRemaining < Number(item.total || 0) ? 'DEPLOYED' : 'AVAILABLE',
        itemId,
      ]);

      return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM Component WHERE id = ?', [itemId]) });
    }

    // Asset checkin
    await getRequiredRow(db, 'Asset', itemId, 'Asset');

    await run(
      `
      UPDATE Asset
      SET status = ?, employeeId = NULL, checkoutDate = NULL, expectedCheckinDate = NULL, updatedAt = ?
      WHERE id = ?
      `,
      [String(req.body.status || 'Available'), nowIso(), itemId],
    );

    return res.status(200).json({ success: true, item: await queryOne('SELECT * FROM Asset WHERE id = ?', [itemId]) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}