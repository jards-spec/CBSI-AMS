/**
 * index.js - AssetFlow AMS Backend
 * Soft-archive enabled backend for:
 * Assets, Employees, Consumables, Accessories, Licenses,
 * Maintenance, Requests, Audit, Components
 *
 * Updated with Profile persistence: phone, jobTitle
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

const db = new Database('./prisma/dev.db');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (_req, res) => res.send('AssetFlow API Active'));

const uid = () => randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();
const normalizeEmployeeNumber = (value = '') => String(value).trim().toUpperCase();

const normalizeRole = (value = '') => {
  const raw = String(value).trim();
  if (!raw) return 'User';
  if (raw === 'Viewer') return 'User';
  return raw;
};

const getActorFromRequest = (req) => ({
  actorId: String(
    req.headers['x-user-id']
      || req.body?.actorId
      || req.query?.actorId
      || '',
  ).trim(),
  actorRole: normalizeRole(
    req.headers['x-user-role']
      || req.body?.actorRole
      || req.query?.actorRole
      || 'User',
  ),
});

const isPrivilegedRole = (role = '') => {
  const normalized = String(role).trim().toLowerCase();
  return ['admin', 'super admin', 'it admin', 'manager'].includes(normalized);
};

const serializeProfile = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  employeeNumber: row.employeeNumber || '',
  department: row.department || '',
  role: row.role || 'User',
  avatar: row.avatar || '',
  phone: row.phone || '',
  jobTitle: row.jobTitle || '',
  createdAt: row.createdAt || '',
});

const ensureColumn = (table, column, definition) => {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((entry) => entry.name === column);
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
};

const safeJsonParse = (value, fallback = []) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

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

const writeAuditLog = ({ type, entity, message, user = 'ADMIN' }) => {
  db.prepare(`
    INSERT INTO AuditLog (id, timestamp, type, entity, message, user, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uid(), new Date().toLocaleString(), type, entity, message, user, nowIso());
};

const requireRow = (table, id, label = 'Record') => {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!row) throw new Error(`${label} not found`);
  return row;
};

const ensureNotArchived = (row, label = 'Record') => {
  if (Number(row.isArchived || 0) === 1) {
    throw new Error(`${label} is archived`);
  }
};

const archiveRecord = ({ table, id, entity, message, userLabel }, meta = {}) => {
  const row = requireRow(table, id, userLabel || table);
  db.prepare(`
    UPDATE ${table}
    SET isArchived = 1,
        archivedAt = ?,
        archivedById = ?,
        archivedByName = ?
    WHERE id = ?
  `).run(
    nowIso(),
    meta.archivedById || '',
    meta.archivedByName || 'ADMIN',
    id,
  );

  writeAuditLog({
    type: 'ARCHIVED',
    entity: typeof entity === 'function' ? entity(row) : entity,
    message: typeof message === 'function' ? message(row) : message,
    user: meta.archivedByName || 'ADMIN',
  });

  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
};

const restoreRecord = ({ table, id, entity, message, userLabel }, meta = {}) => {
  const row = requireRow(table, id, userLabel || table);
  db.prepare(`
    UPDATE ${table}
    SET isArchived = 0,
        archivedAt = NULL,
        archivedById = NULL,
        archivedByName = NULL
    WHERE id = ?
  `).run(id);

  writeAuditLog({
    type: 'RESTORED',
    entity: typeof entity === 'function' ? entity(row) : entity,
    message: typeof message === 'function' ? message(row) : message,
    user: meta.archivedByName || 'ADMIN',
  });

  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
};

const bootstrapSchema = () => {
  // Asset
  ensureColumn('Asset', 'purchaseDate', 'TEXT');
  ensureColumn('Asset', 'notes', 'TEXT');
  ensureColumn('Asset', 'receipt', 'TEXT');
  ensureColumn('Asset', 'checkoutDate', 'TEXT');
  ensureColumn('Asset', 'expectedCheckinDate', 'TEXT');
  ensureColumn('Asset', 'createdAt', 'TEXT');
  ensureColumn('Asset', 'updatedAt', 'TEXT');
  ensureColumn('Asset', 'isArchived', 'INTEGER DEFAULT 0');
  ensureColumn('Asset', 'archivedAt', 'TEXT');
  ensureColumn('Asset', 'archivedById', 'TEXT');
  ensureColumn('Asset', 'archivedByName', 'TEXT');

  // Employee
  ensureColumn('Employee', 'department', 'TEXT');
  ensureColumn('Employee', 'role', 'TEXT');
  ensureColumn('Employee', 'avatar', 'TEXT');
  ensureColumn('Employee', 'employeeNumber', 'TEXT');
  ensureColumn('Employee', 'password', 'TEXT');
  ensureColumn('Employee', 'createdAt', 'TEXT');
  ensureColumn('Employee', 'isArchived', 'INTEGER DEFAULT 0');
  ensureColumn('Employee', 'archivedAt', 'TEXT');
  ensureColumn('Employee', 'archivedById', 'TEXT');
  ensureColumn('Employee', 'archivedByName', 'TEXT');
  ensureColumn('Employee', 'phone', 'TEXT');
  ensureColumn('Employee', 'jobTitle', 'TEXT');

  // Consumable
  ensureColumn('Consumable', 'createdAt', 'TEXT');
  ensureColumn('Consumable', 'isArchived', 'INTEGER DEFAULT 0');
  ensureColumn('Consumable', 'archivedAt', 'TEXT');
  ensureColumn('Consumable', 'archivedById', 'TEXT');
  ensureColumn('Consumable', 'archivedByName', 'TEXT');

  // Accessory
  ensureColumn('Accessory', 'createdAt', 'TEXT');
  ensureColumn('Accessory', 'isArchived', 'INTEGER DEFAULT 0');
  ensureColumn('Accessory', 'archivedAt', 'TEXT');
  ensureColumn('Accessory', 'archivedById', 'TEXT');
  ensureColumn('Accessory', 'archivedByName', 'TEXT');

  // License
  ensureColumn('License', 'unitCost', 'REAL DEFAULT 0');
  ensureColumn('License', 'createdAt', 'TEXT');
  ensureColumn('License', 'isArchived', 'INTEGER DEFAULT 0');
  ensureColumn('License', 'archivedAt', 'TEXT');
  ensureColumn('License', 'archivedById', 'TEXT');
  ensureColumn('License', 'archivedByName', 'TEXT');

  // Request
  ensureColumn('Request', 'submittedById', 'TEXT');
  ensureColumn('Request', 'submittedByEmail', 'TEXT');
  ensureColumn('Request', 'createdAt', 'TEXT');
  ensureColumn('Request', 'isArchived', 'INTEGER DEFAULT 0');
  ensureColumn('Request', 'archivedAt', 'TEXT');
  ensureColumn('Request', 'archivedById', 'TEXT');
  ensureColumn('Request', 'archivedByName', 'TEXT');

  // Maintenance
  ensureColumn('Maintenance', 'title', 'TEXT');
  ensureColumn('Maintenance', 'description', 'TEXT');
  ensureColumn('Maintenance', 'submittedBy', 'TEXT');
  ensureColumn('Maintenance', 'submittedById', 'TEXT');
  ensureColumn('Maintenance', 'submittedAt', 'TEXT');
  ensureColumn('Maintenance', 'assetId', 'TEXT');
  ensureColumn('Maintenance', 'category', 'TEXT');
  ensureColumn('Maintenance', 'updatedAt', 'TEXT');
  ensureColumn('Maintenance', 'createdAt', 'TEXT');
  ensureColumn('Maintenance', 'isArchived', 'INTEGER DEFAULT 0');
  ensureColumn('Maintenance', 'archivedAt', 'TEXT');
  ensureColumn('Maintenance', 'archivedById', 'TEXT');
  ensureColumn('Maintenance', 'archivedByName', 'TEXT');

  // Component
  ensureColumn('Component', 'status', 'TEXT');
  ensureColumn('Component', 'assignedTo', 'TEXT');
  ensureColumn('Component', 'checkoutDate', 'TEXT');
  ensureColumn('Component', 'expectedCheckinDate', 'TEXT');
  ensureColumn('Component', 'notes', 'TEXT');
  ensureColumn('Component', 'unitCost', 'REAL DEFAULT 0');
  ensureColumn('Component', 'createdAt', 'TEXT');
  ensureColumn('Component', 'isArchived', 'INTEGER DEFAULT 0');
  ensureColumn('Component', 'archivedAt', 'TEXT');
  ensureColumn('Component', 'archivedById', 'TEXT');
  ensureColumn('Component', 'archivedByName', 'TEXT');

  // Audit
  ensureColumn('AuditLog', 'createdAt', 'TEXT');

  // Assignment tables
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ComponentAssignment (
      id TEXT PRIMARY KEY,
      componentId TEXT NOT NULL,
      assetId TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      assignedAt TEXT NOT NULL,
      checkoutDate TEXT,
      expectedCheckinDate TEXT,
      assignedById TEXT,
      assignedByName TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      removedAt TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS AccessoryAssignment (
      id TEXT PRIMARY KEY,
      accessoryId TEXT NOT NULL,
      assetId TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      assignedAt TEXT NOT NULL,
      assignedById TEXT,
      assignedByName TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      removedAt TEXT
    )
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_component_assignment_component
    ON ComponentAssignment(componentId, status)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_component_assignment_asset
    ON ComponentAssignment(assetId, status)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_accessory_assignment_accessory
    ON AccessoryAssignment(accessoryId, status)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_accessory_assignment_asset
    ON AccessoryAssignment(assetId, status)
  `).run();

  db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_employeeNumber_unique
    ON Employee(employeeNumber)
    WHERE employeeNumber IS NOT NULL AND trim(employeeNumber) != ''
  `).run();

  // Defaults / backfills
  db.prepare("UPDATE Asset SET createdAt = COALESCE(createdAt, updatedAt, ?) WHERE createdAt IS NULL OR trim(createdAt) = ''").run(nowIso());
  db.prepare("UPDATE Asset SET updatedAt = COALESCE(updatedAt, createdAt, ?) WHERE updatedAt IS NULL OR trim(updatedAt) = ''").run(nowIso());

  db.prepare("UPDATE Employee SET role = 'User' WHERE role IS NULL OR trim(role) = '' OR role = 'Viewer'").run();
  db.prepare("UPDATE Employee SET employeeNumber = '' WHERE employeeNumber IS NULL").run();
  db.prepare("UPDATE Employee SET password = '' WHERE password IS NULL").run();
  db.prepare("UPDATE Employee SET phone = '' WHERE phone IS NULL").run();
  db.prepare("UPDATE Employee SET jobTitle = '' WHERE jobTitle IS NULL").run();
  db.prepare("UPDATE Employee SET createdAt = ? WHERE createdAt IS NULL OR trim(createdAt) = ''").run(today());

  db.prepare("UPDATE Consumable SET createdAt = ? WHERE createdAt IS NULL OR trim(createdAt) = ''").run(today());
  db.prepare("UPDATE Accessory SET createdAt = ? WHERE createdAt IS NULL OR trim(createdAt) = ''").run(today());
  db.prepare("UPDATE License SET createdAt = ? WHERE createdAt IS NULL OR trim(createdAt) = ''").run(today());
  db.prepare("UPDATE Request SET createdAt = ? WHERE createdAt IS NULL OR trim(createdAt) = ''").run(nowIso());
  db.prepare("UPDATE Component SET createdAt = ? WHERE createdAt IS NULL OR trim(createdAt) = ''").run(nowIso());
  db.prepare("UPDATE Maintenance SET createdAt = COALESCE(createdAt, submittedAt, startDate, ?) WHERE createdAt IS NULL OR trim(createdAt) = ''").run(nowIso());

  db.prepare("UPDATE Component SET status = 'AVAILABLE' WHERE status IS NULL OR trim(status) = ''").run();
  db.prepare("UPDATE Component SET unitCost = 0 WHERE unitCost IS NULL").run();
  db.prepare("UPDATE License SET unitCost = 0 WHERE unitCost IS NULL").run();

  db.prepare("UPDATE Maintenance SET title = assetName WHERE (title IS NULL OR trim(title) = '') AND assetName IS NOT NULL AND trim(assetName) != ''").run();
  db.prepare("UPDATE Maintenance SET description = issue WHERE (description IS NULL OR trim(description) = '') AND issue IS NOT NULL AND trim(issue) != ''").run();
  db.prepare("UPDATE Maintenance SET submittedAt = COALESCE(createdAt, startDate, ?) WHERE submittedAt IS NULL OR trim(submittedAt) = ''").run(nowIso());
  db.prepare("UPDATE Maintenance SET category = 'Other' WHERE category IS NULL OR trim(category) = ''").run();
  db.prepare("UPDATE Maintenance SET status = 'Open' WHERE status IS NULL OR trim(status) = '' OR status = 'Pending'").run();

  db.prepare("UPDATE AuditLog SET createdAt = ? WHERE createdAt IS NULL OR trim(createdAt) = ''").run(nowIso());

  ['Asset', 'Employee', 'Consumable', 'Accessory', 'License', 'Request', 'Maintenance', 'Component'].forEach((table) => {
    db.prepare(`UPDATE ${table} SET isArchived = 0 WHERE isArchived IS NULL`).run();
  });
};

const assetSelect = `
  SELECT
    Asset.*,
    Employee.name AS assignedTo,
    Employee.employeeNumber AS assignedEmployeeNumber
  FROM Asset
  LEFT JOIN Employee ON Employee.id = Asset.employeeId
`;

const getAssetById = (id) => db.prepare(`${assetSelect} WHERE Asset.id = ?`).get(id);

const normalizeMaintenanceStatus = (value = '') => {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'pending') return 'Open';
  if (raw === 'in progress') return 'In Progress';
  if (raw === 'resolved') return 'Resolved';
  if (raw === 'closed') return 'Closed';
  return 'Open';
};

const serializeMaintenance = (row) => ({
  id: row.id,
  title: row.title || row.assetName || 'Untitled Ticket',
  description: row.description || row.issue || '',
  priority: row.priority || 'Medium',
  status: normalizeMaintenanceStatus(row.status),
  submittedBy: row.submittedBy || 'System',
  submittedById: row.submittedById || '',
  submittedAt: row.submittedAt || row.createdAt || row.startDate || nowIso(),
  assetId: row.assetId || '',
  category: row.category || 'Other',
  cost: Number(row.cost || 0),
  isArchived: Number(row.isArchived || 0),
  archivedAt: row.archivedAt || null,
  archivedById: row.archivedById || null,
  archivedByName: row.archivedByName || null,
});

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

const readAssetLabel = (row) => {
  if (!row) return 'Unknown Asset';
  if (row.assetTag) return `${row.assetTag} - ${row.assetName || 'Unnamed Asset'}`;
  if (row.tag) return `${row.tag} - ${row.name || 'Unnamed Asset'}`;
  return row.assetName || row.name || row.assetId || row.id || 'Unknown Asset';
};

const getComponentAssignments = (componentId, status = 'active') =>
  db.prepare(`
    SELECT
      ca.*,
      Asset.tag AS assetTag,
      Asset.name AS assetName
    FROM ComponentAssignment ca
    LEFT JOIN Asset ON Asset.id = ca.assetId
    WHERE ca.componentId = ?
      AND ${assignmentStatusPredicate(status, 'ca.status')}
    ORDER BY datetime(ca.assignedAt) DESC
  `).all(String(componentId));

const getAccessoryAssignments = (accessoryId, status = 'active') =>
  db.prepare(`
    SELECT
      aa.*,
      Asset.tag AS assetTag,
      Asset.name AS assetName
    FROM AccessoryAssignment aa
    LEFT JOIN Asset ON Asset.id = aa.assetId
    WHERE aa.accessoryId = ?
      AND ${assignmentStatusPredicate(status, 'aa.status')}
    ORDER BY datetime(aa.assignedAt) DESC
  `).all(String(accessoryId));

const getSingleComponentAssignment = ({ assignmentId, componentId, assetId }) => {
  if (assignmentId) {
    return db.prepare(`
      SELECT
        ca.*,
        Asset.tag AS assetTag,
        Asset.name AS assetName
      FROM ComponentAssignment ca
      LEFT JOIN Asset ON Asset.id = ca.assetId
      WHERE ca.id = ?
        AND ca.componentId = ?
        AND ca.status = 'ACTIVE'
    `).get(String(assignmentId), String(componentId));
  }

  if (assetId) {
    return db.prepare(`
      SELECT
        ca.*,
        Asset.tag AS assetTag,
        Asset.name AS assetName
      FROM ComponentAssignment ca
      LEFT JOIN Asset ON Asset.id = ca.assetId
      WHERE ca.componentId = ?
        AND ca.assetId = ?
        AND ca.status = 'ACTIVE'
      ORDER BY datetime(ca.assignedAt) DESC
      LIMIT 1
    `).get(String(componentId), String(assetId));
  }

  return null;
};

const getSingleAccessoryAssignment = ({ assignmentId, accessoryId, assetId }) => {
  if (assignmentId) {
    return db.prepare(`
      SELECT
        aa.*,
        Asset.tag AS assetTag,
        Asset.name AS assetName
      FROM AccessoryAssignment aa
      LEFT JOIN Asset ON Asset.id = aa.assetId
      WHERE aa.id = ?
        AND aa.accessoryId = ?
        AND aa.status = 'ACTIVE'
    `).get(String(assignmentId), String(accessoryId));
  }

  if (assetId) {
    return db.prepare(`
      SELECT
        aa.*,
        Asset.tag AS assetTag,
        Asset.name AS assetName
      FROM AccessoryAssignment aa
      LEFT JOIN Asset ON Asset.id = aa.assetId
      WHERE aa.accessoryId = ?
        AND aa.assetId = ?
        AND aa.status = 'ACTIVE'
      ORDER BY datetime(aa.assignedAt) DESC
      LIMIT 1
    `).get(String(accessoryId), String(assetId));
  }

  return null;
};

const syncComponentAssignmentState = (componentId, fallbackCheckoutDate = null, fallbackExpectedCheckinDate = null) => {
  const item = requireRow('Component', componentId, 'Component');
  const activeAssignments = getComponentAssignments(componentId, 'active');

  const assignedTo =
    activeAssignments.length === 0
      ? null
      : activeAssignments.length === 1
        ? readAssetLabel(activeAssignments[0])
        : 'MULTIPLE ASSETS';

  db.prepare(`
    UPDATE Component
    SET status = ?, assignedTo = ?, checkoutDate = ?, expectedCheckinDate = ?
    WHERE id = ?
  `).run(
    Number(item.remaining ?? item.total ?? 0) < Number(item.total || 0) ? 'DEPLOYED' : 'AVAILABLE',
    assignedTo,
    activeAssignments.length > 0
      ? activeAssignments[0].checkoutDate || fallbackCheckoutDate || item.checkoutDate || today()
      : null,
    activeAssignments.length > 0
      ? activeAssignments[0].expectedCheckinDate || fallbackExpectedCheckinDate || item.expectedCheckinDate || null
      : null,
    componentId,
  );

  return db.prepare('SELECT * FROM Component WHERE id = ?').get(componentId);
};

const getAssetAttachments = (assetId) => ({
  components: db.prepare(`
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
  `).all(String(assetId)),
  accessories: db.prepare(`
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
  `).all(String(assetId)),
});

const checkoutHandlers = {
  asset: ({ itemId, employeeId, location, checkoutDate, expectedCheckinDate, notes }) => {
    const item = db.prepare('SELECT * FROM Asset WHERE id = ?').get(itemId);
    if (!item) throw new Error('Asset not found');
    ensureNotArchived(item, 'Asset');
    if (!employeeId) throw new Error('Employee is required for asset checkout');

    const employee = db.prepare('SELECT * FROM Employee WHERE id = ?').get(employeeId);
    if (!employee) throw new Error('Employee not found');
    ensureNotArchived(employee, 'Employee');

    db.prepare(`
      UPDATE Asset
      SET status = ?, employeeId = ?, location = ?, checkoutDate = ?, expectedCheckinDate = ?, notes = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      'Deployed',
      employeeId,
      location || item.location || '',
      checkoutDate || today(),
      expectedCheckinDate || null,
      notes || null,
      nowIso(),
      itemId,
    );

    writeAuditLog({
      type: 'CHECKOUT',
      entity: item.name,
      message: `${item.tag} checked out to ${employee.name} (${employee.employeeNumber || 'NO EMPLOYEE NUMBER'})`,
    });

    return getAssetById(itemId);
  },

  component: ({ itemId, assetId, checkoutDate, expectedCheckinDate, notes, quantity, assignedById, assignedByName }) => {
    const item = db.prepare('SELECT * FROM Component WHERE id = ?').get(itemId);
    if (!item) throw new Error('Component not found');
    ensureNotArchived(item, 'Component');

    if (!assetId) throw new Error('Asset is required for component install');
    const asset = requireRow('Asset', assetId, 'Asset');
    ensureNotArchived(asset, 'Asset');

    const qty = normalizeQuantity(quantity);
    const currentRemaining = Number(item.remaining ?? item.total ?? 0);
    if (currentRemaining < qty) throw new Error('Not enough component stock available');

    const nextRemaining = currentRemaining - qty;
    const assignmentId = uid();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO ComponentAssignment (
          id, componentId, assetId, quantity, assignedAt, checkoutDate,
          expectedCheckinDate, assignedById, assignedByName, notes, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `).run(
        assignmentId,
        String(itemId),
        String(assetId),
        qty,
        nowIso(),
        checkoutDate || today(),
        expectedCheckinDate || null,
        assignedById || '',
        assignedByName || 'ADMIN',
        notes || null,
      );

      db.prepare(`
        UPDATE Component
        SET remaining = ?, notes = ?
        WHERE id = ?
      `).run(nextRemaining, notes || item.notes || null, itemId);

      syncComponentAssignmentState(itemId, checkoutDate || today(), expectedCheckinDate || null);
    })();

    writeAuditLog({
      type: 'CHECKOUT',
      entity: item.name,
      message: `${qty} component unit(s) installed on ${readAssetLabel(asset)}`,
      user: assignedByName || 'ADMIN',
    });

    return {
      ...db.prepare('SELECT * FROM Component WHERE id = ?').get(itemId),
      activeAssignments: getComponentAssignments(itemId, 'active'),
    };
  },

  accessory: ({ itemId, assetId, quantity, notes, assignedById, assignedByName }) => {
    const item = db.prepare('SELECT * FROM Accessory WHERE id = ?').get(itemId);
    if (!item) throw new Error('Accessory not found');
    ensureNotArchived(item, 'Accessory');

    if (!assetId) throw new Error('Asset is required for accessory attachment');
    const asset = requireRow('Asset', assetId, 'Asset');
    ensureNotArchived(asset, 'Asset');

    const qty = normalizeQuantity(quantity);
    const available = Number(item.total || 0) - Number(item.checkedOut || 0);
    if (available < qty) throw new Error('Not enough accessory stock available');

    const assignmentId = uid();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO AccessoryAssignment (
          id, accessoryId, assetId, quantity, assignedAt,
          assignedById, assignedByName, notes, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `).run(
        assignmentId,
        String(itemId),
        String(assetId),
        qty,
        nowIso(),
        assignedById || '',
        assignedByName || 'ADMIN',
        notes || null,
      );

      db.prepare('UPDATE Accessory SET checkedOut = ? WHERE id = ?')
        .run(Number(item.checkedOut || 0) + qty, itemId);
    })();

    writeAuditLog({
      type: 'CHECKOUT',
      entity: item.name,
      message: `${qty} accessory unit(s) attached to ${readAssetLabel(asset)}${notes ? ` | ${notes}` : ''}`,
      user: assignedByName || 'ADMIN',
    });

    return {
      ...db.prepare('SELECT * FROM Accessory WHERE id = ?').get(itemId),
      activeAssignments: getAccessoryAssignments(itemId, 'active'),
    };
  },

  consumable: ({ itemId, quantity, notes }) => {
    const item = db.prepare('SELECT * FROM Consumable WHERE id = ?').get(itemId);
    if (!item) throw new Error('Consumable not found');
    ensureNotArchived(item, 'Consumable');

    const qty = normalizeQuantity(quantity);
    if (Number(item.remaining || 0) < qty) throw new Error('Not enough consumable stock available');

    db.prepare('UPDATE Consumable SET remaining = ? WHERE id = ?').run(Number(item.remaining || 0) - qty, itemId);

    writeAuditLog({
      type: 'CHECKOUT',
      entity: item.name,
      message: `${qty} consumable unit(s) checked out${notes ? ` | ${notes}` : ''}`,
    });

    return db.prepare('SELECT * FROM Consumable WHERE id = ?').get(itemId);
  },

  license: ({ itemId, quantity, notes }) => {
    const item = db.prepare('SELECT * FROM License WHERE id = ?').get(itemId);
    if (!item) throw new Error('License not found');
    ensureNotArchived(item, 'License');

    const qty = normalizeQuantity(quantity);
    if (Number(item.avail || 0) < qty) throw new Error('Not enough licenses available');

    db.prepare('UPDATE License SET avail = ? WHERE id = ?').run(Number(item.avail || 0) - qty, itemId);

    writeAuditLog({
      type: 'CHECKOUT',
      entity: item.name,
      message: `${qty} license seat(s) checked out${notes ? ` | ${notes}` : ''}`,
    });

    return db.prepare('SELECT * FROM License WHERE id = ?').get(itemId);
  },
};

const checkinHandlers = {
  asset: ({ itemId, status, location, notes }) => {
    const item = db.prepare('SELECT * FROM Asset WHERE id = ?').get(itemId);
    if (!item) throw new Error('Asset not found');
    ensureNotArchived(item, 'Asset');

    db.prepare(`
      UPDATE Asset
      SET status = ?, employeeId = NULL, location = ?, checkoutDate = NULL, expectedCheckinDate = NULL, notes = ?, updatedAt = ?
      WHERE id = ?
    `).run(status || 'Available', location || item.location || '', notes || null, nowIso(), itemId);

    writeAuditLog({
      type: 'CHECKIN',
      entity: item.name,
      message: `${item.tag} checked in${location ? ` to ${location}` : ''}`,
    });

    return getAssetById(itemId);
  },

  component: ({ itemId, assignmentId, assetId, notes, quantity }) => {
    const item = db.prepare('SELECT * FROM Component WHERE id = ?').get(itemId);
    if (!item) throw new Error('Component not found');
    ensureNotArchived(item, 'Component');

    const assignment = getSingleComponentAssignment({ assignmentId, componentId: itemId, assetId });
    if (!assignment) throw new Error('Active component assignment not found');

    const qty = normalizeQuantity(quantity);
    if (qty > Number(assignment.quantity || 0)) {
      throw new Error('Cannot remove more components than assigned to this asset');
    }

    db.transaction(() => {
      const nextRemaining = Number(item.remaining ?? item.total ?? 0) + qty;
      if (nextRemaining > Number(item.total || 0)) {
        throw new Error('Cannot check in more components than the recorded total');
      }

      if (qty === Number(assignment.quantity || 0)) {
        db.prepare(`
          UPDATE ComponentAssignment
          SET status = 'REMOVED', removedAt = ?, notes = COALESCE(?, notes)
          WHERE id = ?
        `).run(nowIso(), notes || null, assignment.id);
      } else {
        db.prepare(`
          UPDATE ComponentAssignment
          SET quantity = ?, notes = COALESCE(?, notes)
          WHERE id = ?
        `).run(Number(assignment.quantity || 0) - qty, notes || null, assignment.id);
      }

      db.prepare(`
        UPDATE Component
        SET remaining = ?, notes = ?
        WHERE id = ?
      `).run(nextRemaining, notes || item.notes || null, itemId);

      syncComponentAssignmentState(itemId);
    })();

    writeAuditLog({
      type: 'CHECKIN',
      entity: item.name,
      message: `${qty} component unit(s) removed from ${readAssetLabel(assignment)}`,
    });

    return {
      ...db.prepare('SELECT * FROM Component WHERE id = ?').get(itemId),
      activeAssignments: getComponentAssignments(itemId, 'active'),
    };
  },

  accessory: ({ itemId, assignmentId, assetId, quantity, notes }) => {
    const item = db.prepare('SELECT * FROM Accessory WHERE id = ?').get(itemId);
    if (!item) throw new Error('Accessory not found');
    ensureNotArchived(item, 'Accessory');

    const assignment = getSingleAccessoryAssignment({ assignmentId, accessoryId: itemId, assetId });
    if (!assignment) throw new Error('Active accessory assignment not found');

    const qty = normalizeQuantity(quantity);
    if (qty > Number(assignment.quantity || 0)) {
      throw new Error('Cannot remove more accessories than assigned to this asset');
    }

    db.transaction(() => {
      if (Number(item.checkedOut || 0) < qty) {
        throw new Error('Cannot check in more accessories than are currently checked out');
      }

      if (qty === Number(assignment.quantity || 0)) {
        db.prepare(`
          UPDATE AccessoryAssignment
          SET status = 'REMOVED', removedAt = ?, notes = COALESCE(?, notes)
          WHERE id = ?
        `).run(nowIso(), notes || null, assignment.id);
      } else {
        db.prepare(`
          UPDATE AccessoryAssignment
          SET quantity = ?, notes = COALESCE(?, notes)
          WHERE id = ?
        `).run(Number(assignment.quantity || 0) - qty, notes || null, assignment.id);
      }

      db.prepare('UPDATE Accessory SET checkedOut = ? WHERE id = ?')
        .run(Number(item.checkedOut || 0) - qty, itemId);
    })();

    writeAuditLog({
      type: 'CHECKIN',
      entity: item.name,
      message: `${qty} accessory unit(s) removed from ${readAssetLabel(assignment)}${notes ? ` | ${notes}` : ''}`,
    });

    return {
      ...db.prepare('SELECT * FROM Accessory WHERE id = ?').get(itemId),
      activeAssignments: getAccessoryAssignments(itemId, 'active'),
    };
  },

  consumable: ({ itemId, quantity, notes }) => {
    const item = db.prepare('SELECT * FROM Consumable WHERE id = ?').get(itemId);
    if (!item) throw new Error('Consumable not found');
    ensureNotArchived(item, 'Consumable');

    const qty = normalizeQuantity(quantity);
    const nextRemaining = Number(item.remaining || 0) + qty;
    if (nextRemaining > Number(item.total || 0)) throw new Error('Cannot check in more stock than the recorded total');

    db.prepare('UPDATE Consumable SET remaining = ? WHERE id = ?').run(nextRemaining, itemId);

    writeAuditLog({
      type: 'CHECKIN',
      entity: item.name,
      message: `${qty} consumable unit(s) checked in${notes ? ` | ${notes}` : ''}`,
    });

    return db.prepare('SELECT * FROM Consumable WHERE id = ?').get(itemId);
  },

  license: ({ itemId, quantity, notes }) => {
    const item = db.prepare('SELECT * FROM License WHERE id = ?').get(itemId);
    if (!item) throw new Error('License not found');
    ensureNotArchived(item, 'License');

    const qty = normalizeQuantity(quantity);
    const nextAvailable = Number(item.avail || 0) + qty;
    if (nextAvailable > Number(item.total || 0)) throw new Error('Cannot check in more license seats than the recorded total');

    db.prepare('UPDATE License SET avail = ? WHERE id = ?').run(nextAvailable, itemId);

    writeAuditLog({
      type: 'CHECKIN',
      entity: item.name,
      message: `${qty} license seat(s) checked in${notes ? ` | ${notes}` : ''}`,
    });

    return db.prepare('SELECT * FROM License WHERE id = ?').get(itemId);
  },
};

bootstrapSchema();

// ASSETS
app.get('/api/assets', (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    res.json(
      db.prepare(`
        ${assetSelect}
        WHERE ${archivedPredicate(scope, 'Asset.isArchived')}
        ORDER BY datetime(COALESCE(Asset.createdAt, Asset.updatedAt)) DESC
      `).all(),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/assets/:id/attachments', (req, res) => {
  try {
    requireRow('Asset', req.params.id, 'Asset');
    res.json(getAssetAttachments(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/assets', (req, res) => {
  try {
    const {
      tag,
      name,
      category,
      status,
      serialNo,
      modelNo,
      manufacturer,
      unitCost,
      location,
      purchaseDate,
      notes,
      receipt,
    } = req.body;

    const id = uid();
    db.prepare(`
      INSERT INTO Asset (
        id, tag, name, category, status, serialNo, modelNo, manufacturer,
        unitCost, location, purchaseDate, notes, receipt, createdAt, updatedAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      tag,
      name,
      category,
      status ?? 'Available',
      serialNo,
      modelNo,
      manufacturer,
      unitCost ?? 0,
      location,
      purchaseDate,
      notes,
      receipt,
      nowIso(),
      nowIso(),
    );

    writeAuditLog({ type: 'ADDED', entity: name, message: `${tag} registered in assets` });
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/assets/:id', (req, res) => {
  try {
    const {
      tag,
      name,
      category,
      status,
      employeeId,
      serialNo,
      modelNo,
      manufacturer,
      unitCost,
      location,
      purchaseDate,
      notes,
      receipt,
    } = req.body;

    db.prepare(`
      UPDATE Asset
      SET tag = ?, name = ?, category = ?, status = ?, employeeId = ?, serialNo = ?, modelNo = ?,
          manufacturer = ?, unitCost = ?, location = ?, purchaseDate = ?, notes = ?, receipt = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      tag,
      name,
      category,
      status,
      employeeId ?? null,
      serialNo,
      modelNo,
      manufacturer,
      unitCost,
      location,
      purchaseDate,
      notes,
      receipt,
      nowIso(),
      req.params.id,
    );

    writeAuditLog({ type: 'UPDATED', entity: name, message: `${tag} asset record updated` });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/assets/:id/archive', (req, res) => {
  try {
    const item = archiveRecord(
      {
        table: 'Asset',
        id: req.params.id,
        entity: (row) => row.name || row.tag || 'Asset',
        message: (row) => `${row.tag || row.name} archived from assets`,
        userLabel: 'Asset',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/assets/:id/restore', (req, res) => {
  try {
    const item = restoreRecord(
      {
        table: 'Asset',
        id: req.params.id,
        entity: (row) => row.name || row.tag || 'Asset',
        message: (row) => `${row.tag || row.name} restored to assets`,
        userLabel: 'Asset',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/assets/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT tag, name FROM Asset WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM Asset WHERE id = ?').run(req.params.id);
    if (existing) {
      writeAuditLog({ type: 'DELETED', entity: existing.name, message: `${existing.tag} removed from assets` });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// EMPLOYEES
app.get('/api/employees', (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    res.json(
      db.prepare(`
        SELECT * FROM Employee
        WHERE ${archivedPredicate(scope, 'Employee.isArchived')}
        ORDER BY datetime(createdAt) DESC, name ASC
      `).all(),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/employees', (req, res) => {
  try {
    const {
      name, email, employeeNumber, password, department, role, avatar, phone, jobTitle,
    } = req.body;

    const normalizedEmployeeNumber = normalizeEmployeeNumber(employeeNumber);
    if (!normalizedEmployeeNumber) {
      return res.status(400).json({ error: 'Employee Number is required' });
    }

    if (!String(password || '').trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const existingEmployeeNumber = db
      .prepare('SELECT id FROM Employee WHERE upper(employeeNumber) = ?')
      .get(normalizedEmployeeNumber);

    if (existingEmployeeNumber) {
      return res.status(400).json({ error: 'Employee Number already exists' });
    }

    const id = uid();
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=38bdf8`;
    const resolvedAvatar = String(avatar || defaultAvatar);
    const normalizedRole = normalizeRole(role);

    db.prepare(`
      INSERT INTO Employee (
        id, name, email, employeeNumber, password, department, role, avatar, phone, jobTitle, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      name,
      email,
      normalizedEmployeeNumber,
      String(password),
      department,
      normalizedRole,
      resolvedAvatar,
      phone || '',
      jobTitle || '',
      today(),
    );

    writeAuditLog({
      type: 'ADDED',
      entity: name,
      message: `${normalizedEmployeeNumber} onboarded to ${department || 'unassigned department'}`,
    });

    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/employees/:id', (req, res) => {
  try {
    const {
      name, email, employeeNumber, password, department, role, avatar, phone, jobTitle,
    } = req.body;

    const normalizedEmployeeNumber = normalizeEmployeeNumber(employeeNumber);
    if (!normalizedEmployeeNumber) {
      return res.status(400).json({ error: 'Employee Number is required' });
    }

    const existingEmployeeNumber = db
      .prepare('SELECT id FROM Employee WHERE upper(employeeNumber) = ? AND id != ?')
      .get(normalizedEmployeeNumber, req.params.id);

    if (existingEmployeeNumber) {
      return res.status(400).json({ error: 'Employee Number already exists' });
    }

    const normalizedRole = normalizeRole(role);

    if (String(password || '').trim()) {
      db.prepare(`
        UPDATE Employee
        SET name = ?, email = ?, employeeNumber = ?, password = ?, department = ?, role = ?,
            avatar = ?, phone = ?, jobTitle = ?
        WHERE id = ?
      `).run(
        name,
        email,
        normalizedEmployeeNumber,
        String(password),
        department,
        normalizedRole,
        avatar ?? '',
        phone ?? '',
        jobTitle ?? '',
        req.params.id,
      );
    } else {
      db.prepare(`
        UPDATE Employee
        SET name = ?, email = ?, employeeNumber = ?, department = ?, role = ?,
            avatar = ?, phone = ?, jobTitle = ?
        WHERE id = ?
      `).run(
        name,
        email,
        normalizedEmployeeNumber,
        department,
        normalizedRole,
        avatar ?? '',
        phone ?? '',
        jobTitle ?? '',
        req.params.id,
      );
    }

    writeAuditLog({
      type: 'UPDATED',
      entity: name,
      message: `${normalizedEmployeeNumber} employee profile updated`,
    });

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/employees/:id/archive', (req, res) => {
  try {
    const item = archiveRecord(
      {
        table: 'Employee',
        id: req.params.id,
        entity: (row) => row.name || 'Employee',
        message: (row) => `${row.name} employee record archived`,
        userLabel: 'Employee',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/employees/:id/restore', (req, res) => {
  try {
    const item = restoreRecord(
      {
        table: 'Employee',
        id: req.params.id,
        entity: (row) => row.name || 'Employee',
        message: (row) => `${row.name} employee record restored`,
        userLabel: 'Employee',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/employees/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT name FROM Employee WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM Employee WHERE id = ?').run(req.params.id);
    if (existing) {
      writeAuditLog({ type: 'DELETED', entity: existing.name, message: 'Employee record deleted' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// CONSUMABLES
app.get('/api/consumables', (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    res.json(
      db.prepare(`
        SELECT * FROM Consumable
        WHERE ${archivedPredicate(scope, 'Consumable.isArchived')}
        ORDER BY datetime(createdAt) DESC
      `).all(),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/consumables', (req, res) => {
  try {
    const {
      name,
      category,
      modelNo,
      location,
      itemNo,
      orderNumber,
      purchaseDate,
      minQty,
      total,
      remaining,
      unitCost,
    } = req.body;

    const id = uid();
    db.prepare(`
      INSERT INTO Consumable (
        id, name, category, modelNo, location, itemNo, orderNumber, purchaseDate,
        minQty, total, remaining, unitCost, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      name,
      category,
      modelNo,
      location,
      itemNo,
      orderNumber,
      purchaseDate,
      minQty ?? 0,
      total ?? 0,
      remaining ?? total ?? 0,
      unitCost ?? 0,
      today(),
    );

    writeAuditLog({ type: 'ADDED', entity: name, message: 'Consumable item added to inventory' });
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/consumables/:id', (req, res) => {
  try {
    const {
      name,
      category,
      modelNo,
      location,
      itemNo,
      orderNumber,
      purchaseDate,
      minQty,
      total,
      remaining,
      unitCost,
    } = req.body;

    db.prepare(`
      UPDATE Consumable
      SET name = ?, category = ?, modelNo = ?, location = ?, itemNo = ?, orderNumber = ?,
          purchaseDate = ?, minQty = ?, total = ?, remaining = ?, unitCost = ?
      WHERE id = ?
    `).run(
      name,
      category,
      modelNo,
      location,
      itemNo,
      orderNumber,
      purchaseDate,
      minQty,
      total,
      remaining,
      unitCost,
      req.params.id,
    );

    writeAuditLog({ type: 'UPDATED', entity: name, message: 'Consumable item updated' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/consumables/:id/checkout', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM Consumable WHERE id = ?').get(req.params.id);
    if (!item) return res.status(400).json({ error: 'Consumable not found' });
    ensureNotArchived(item, 'Consumable');
    if (Number(item.remaining || 0) <= 0) return res.status(400).json({ error: 'No stock available' });

    db.prepare('UPDATE Consumable SET remaining = ? WHERE id = ?').run(Number(item.remaining || 0) - 1, req.params.id);
    res.json({ success: true, remaining: Number(item.remaining || 0) - 1 });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/consumables/:id/archive', (req, res) => {
  try {
    const item = archiveRecord(
      {
        table: 'Consumable',
        id: req.params.id,
        entity: (row) => row.name || 'Consumable',
        message: (row) => `${row.name} consumable archived`,
        userLabel: 'Consumable',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/consumables/:id/restore', (req, res) => {
  try {
    const item = restoreRecord(
      {
        table: 'Consumable',
        id: req.params.id,
        entity: (row) => row.name || 'Consumable',
        message: (row) => `${row.name} consumable restored`,
        userLabel: 'Consumable',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/consumables/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT name FROM Consumable WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM Consumable WHERE id = ?').run(req.params.id);
    if (existing) {
      writeAuditLog({ type: 'DELETED', entity: existing.name, message: 'Consumable item deleted' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ACCESSORIES
app.get('/api/accessories', (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    res.json(
      db.prepare(`
        SELECT * FROM Accessory
        WHERE ${archivedPredicate(scope, 'Accessory.isArchived')}
        ORDER BY datetime(createdAt) DESC, name ASC
      `).all(),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/accessories/:id/assignments', (req, res) => {
  try {
    requireRow('Accessory', req.params.id, 'Accessory');
    res.json(getAccessoryAssignments(req.params.id, req.query.status || 'active'));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/accessories', (req, res) => {
  try {
    const { name, category, modelNo, location, minQty, total } = req.body;
    const id = uid();

    db.prepare(`
      INSERT INTO Accessory (
        id, name, category, modelNo, location, minQty, total, checkedOut, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(id, name, category, modelNo, location, minQty ?? 0, total ?? 0, 0, today());

    writeAuditLog({ type: 'ADDED', entity: name, message: 'Accessory added to inventory' });
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/accessories/:id', (req, res) => {
  try {
    const { name, category, modelNo, location, minQty, total, checkedOut } = req.body;
    db.prepare(`
      UPDATE Accessory
      SET name = ?, category = ?, modelNo = ?, location = ?, minQty = ?, total = ?, checkedOut = ?
      WHERE id = ?
    `).run(name, category, modelNo, location, minQty, total, checkedOut, req.params.id);

    writeAuditLog({ type: 'UPDATED', entity: name, message: 'Accessory updated' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/accessories/:id/checkout', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM Accessory WHERE id = ?').get(req.params.id);
    if (!item) return res.status(400).json({ error: 'Accessory not found' });
    ensureNotArchived(item, 'Accessory');
    if ((Number(item.total || 0) - Number(item.checkedOut || 0)) <= 0) {
      return res.status(400).json({ error: 'No stock available' });
    }

    db.prepare('UPDATE Accessory SET checkedOut = ? WHERE id = ?').run(Number(item.checkedOut || 0) + 1, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/accessories/:id/archive', (req, res) => {
  try {
    const item = archiveRecord(
      {
        table: 'Accessory',
        id: req.params.id,
        entity: (row) => row.name || 'Accessory',
        message: (row) => `${row.name} accessory archived`,
        userLabel: 'Accessory',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/accessories/:id/restore', (req, res) => {
  try {
    const item = restoreRecord(
      {
        table: 'Accessory',
        id: req.params.id,
        entity: (row) => row.name || 'Accessory',
        message: (row) => `${row.name} accessory restored`,
        userLabel: 'Accessory',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/accessories/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT name FROM Accessory WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM Accessory WHERE id = ?').run(req.params.id);
    if (existing) {
      writeAuditLog({ type: 'DELETED', entity: existing.name, message: 'Accessory deleted' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// TRANSACTIONS
app.post('/api/transactions/checkout', (req, res) => {
  try {
    const resourceType = normalizeResourceType(req.body.resourceType);
    const handler = checkoutHandlers[resourceType];
    if (!handler) return res.status(400).json({ error: 'Unsupported checkout resource type' });
    res.json({ success: true, item: handler(req.body) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/transactions/checkin', (req, res) => {
  try {
    const resourceType = normalizeResourceType(req.body.resourceType);
    const handler = checkinHandlers[resourceType];
    if (!handler) return res.status(400).json({ error: 'Unsupported checkin resource type' });
    res.json({ success: true, item: handler(req.body) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// LICENSES
app.get('/api/licenses', (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    res.json(
      db.prepare(`
        SELECT * FROM License
        WHERE ${archivedPredicate(scope, 'License.isArchived')}
        ORDER BY datetime(createdAt) DESC
      `).all(),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/licenses', (req, res) => {
  try {
    const { name, key, manufacturer, licensedEmail, expirationDate, minQty, total, avail, unitCost } = req.body;
    const id = uid();

    db.prepare(`
      INSERT INTO License (
        id, name, key, manufacturer, licensedEmail, expirationDate,
        minQty, total, avail, unitCost, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      name,
      key,
      manufacturer,
      licensedEmail,
      expirationDate,
      minQty ?? 2,
      total ?? 0,
      avail ?? total ?? 0,
      unitCost ?? 0,
      today(),
    );

    writeAuditLog({ type: 'ADDED', entity: name, message: 'Software license added to registry' });
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/licenses/:id', (req, res) => {
  try {
    const { name, key, manufacturer, licensedEmail, expirationDate, minQty, total, avail, unitCost } = req.body;
    db.prepare(`
      UPDATE License
      SET name = ?, key = ?, manufacturer = ?, licensedEmail = ?,
          expirationDate = ?, minQty = ?, total = ?, avail = ?, unitCost = ?
      WHERE id = ?
    `).run(
      name,
      key,
      manufacturer,
      licensedEmail,
      expirationDate,
      minQty,
      total,
      avail,
      unitCost ?? 0,
      req.params.id,
    );

    writeAuditLog({ type: 'UPDATED', entity: name, message: 'Software license updated' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/licenses/:id/archive', (req, res) => {
  try {
    const item = archiveRecord(
      {
        table: 'License',
        id: req.params.id,
        entity: (row) => row.name || 'License',
        message: (row) => `${row.name} license archived`,
        userLabel: 'License',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/licenses/:id/restore', (req, res) => {
  try {
    const item = restoreRecord(
      {
        table: 'License',
        id: req.params.id,
        entity: (row) => row.name || 'License',
        message: (row) => `${row.name} license restored`,
        userLabel: 'License',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/licenses/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT name FROM License WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM License WHERE id = ?').run(req.params.id);
    if (existing) {
      writeAuditLog({ type: 'DELETED', entity: existing.name, message: 'Software license removed' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// MAINTENANCE
app.get('/api/maintenance', (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    const rows = db.prepare(`
      SELECT * FROM Maintenance
      WHERE ${archivedPredicate(scope, 'Maintenance.isArchived')}
      ORDER BY datetime(COALESCE(submittedAt, createdAt, startDate)) DESC
    `).all();
    res.json(rows.map(serializeMaintenance));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/maintenance', (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      cost,
      submittedBy,
      submittedById,
      submittedAt,
      assetId,
      category,
    } = req.body;

    const id = uid();
    db.prepare(`
      INSERT INTO Maintenance (
        id, assetName, issue, status, priority, cost, startDate,
        title, description, submittedBy, submittedById, submittedAt,
        assetId, category, updatedAt, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      assetId || title,
      description,
      normalizeMaintenanceStatus(status),
      priority ?? 'Medium',
      cost ?? 0,
      submittedAt ?? nowIso(),
      title,
      description,
      submittedBy,
      submittedById,
      submittedAt ?? nowIso(),
      assetId ?? '',
      category ?? 'Other',
      nowIso(),
      nowIso(),
    );

    writeAuditLog({ type: 'ADDED', entity: title || 'Maintenance Ticket', message: 'Maintenance ticket submitted' });
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/maintenance/:id', (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      cost,
      submittedBy,
      submittedById,
      submittedAt,
      assetId,
      category,
    } = req.body;

    db.prepare(`
      UPDATE Maintenance
      SET assetName = ?, issue = ?, status = ?, priority = ?, cost = ?, startDate = ?,
          title = ?, description = ?, submittedBy = ?, submittedById = ?, submittedAt = ?,
          assetId = ?, category = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      assetId || title,
      description,
      normalizeMaintenanceStatus(status),
      priority,
      cost ?? 0,
      submittedAt ?? nowIso(),
      title,
      description,
      submittedBy,
      submittedById,
      submittedAt ?? nowIso(),
      assetId ?? '',
      category ?? 'Other',
      nowIso(),
      req.params.id,
    );

    writeAuditLog({ type: 'UPDATED', entity: title || 'Maintenance Ticket', message: 'Maintenance ticket updated' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/maintenance/:id/archive', (req, res) => {
  try {
    const item = archiveRecord(
      {
        table: 'Maintenance',
        id: req.params.id,
        entity: (row) => row.title || row.assetName || 'Maintenance Ticket',
        message: (row) => `${row.title || row.assetName || 'Maintenance Ticket'} archived`,
        userLabel: 'Maintenance',
      },
      req.body,
    );
    res.json({ success: true, item: serializeMaintenance(item) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/maintenance/:id/restore', (req, res) => {
  try {
    const item = restoreRecord(
      {
        table: 'Maintenance',
        id: req.params.id,
        entity: (row) => row.title || row.assetName || 'Maintenance Ticket',
        message: (row) => `${row.title || row.assetName || 'Maintenance Ticket'} restored`,
        userLabel: 'Maintenance',
      },
      req.body,
    );
    res.json({ success: true, item: serializeMaintenance(item) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/maintenance/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT title, assetName FROM Maintenance WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM Maintenance WHERE id = ?').run(req.params.id);
    if (existing) {
      writeAuditLog({
        type: 'DELETED',
        entity: existing.title || existing.assetName || 'Maintenance Ticket',
        message: 'Maintenance ticket deleted',
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// REQUESTS
app.get('/api/requests', (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    const rows = db.prepare(`
      SELECT * FROM Request
      WHERE ${archivedPredicate(scope, 'Request.isArchived')}
      ORDER BY datetime(createdAt) DESC
    `).all();

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

app.post('/api/requests', (req, res) => {
  try {
    const {
      requestNumber,
      requestorName,
      department,
      managerName,
      dateSubmitted,
      items,
      submittedById,
      submittedByEmail,
    } = req.body;

    const id = uid();
    db.prepare(`
      INSERT INTO Request (
        id, requestNumber, requestorName, department, managerName, dateSubmitted,
        items, status, submittedById, submittedByEmail, createdAt, isArchived
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      requestNumber,
      requestorName,
      department,
      managerName,
      dateSubmitted,
      JSON.stringify(items ?? []),
      'Pending',
      submittedById ?? '',
      submittedByEmail ?? '',
      nowIso(),
    );

    writeAuditLog({ type: 'REQUESTED', entity: requestorName, message: `Submitted ${requestNumber}` });
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/requests/:id/status', (req, res) => {
  try {
    const existing = requireRow('Request', req.params.id, 'Request');
    ensureNotArchived(existing, 'Request');

    const { status } = req.body;
    db.prepare('UPDATE Request SET status = ? WHERE id = ?').run(status, req.params.id);

    writeAuditLog({
      type: 'UPDATED',
      entity: existing.requestNumber || 'Request',
      message: `Request status changed to ${status}`,
    });

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/requests/:id/archive', (req, res) => {
  try {
    const item = archiveRecord(
      {
        table: 'Request',
        id: req.params.id,
        entity: (row) => row.requestNumber || row.requestorName || 'Request',
        message: (row) => `${row.requestNumber || 'Request'} archived`,
        userLabel: 'Request',
      },
      req.body,
    );

    res.json({
      success: true,
      item: {
        ...item,
        items: safeJsonParse(item.items, []),
      },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/requests/:id/restore', (req, res) => {
  try {
    const item = restoreRecord(
      {
        table: 'Request',
        id: req.params.id,
        entity: (row) => row.requestNumber || row.requestorName || 'Request',
        message: (row) => `${row.requestNumber || 'Request'} restored`,
        userLabel: 'Request',
      },
      req.body,
    );

    res.json({
      success: true,
      item: {
        ...item,
        items: safeJsonParse(item.items, []),
      },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/requests/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT requestNumber, requestorName FROM Request WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM Request WHERE id = ?').run(req.params.id);
    if (existing) {
      writeAuditLog({
        type: 'DELETED',
        entity: existing.requestNumber || existing.requestorName || 'Request',
        message: 'Request permanently deleted',
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PROFILE
app.get('/api/profile/me', (req, res) => {
  try {
    const { actorId } = getActorFromRequest(req);
    if (!actorId) return res.status(401).json({ error: 'Missing actorId' });

    const employee = requireRow('Employee', actorId, 'Employee');
    ensureNotArchived(employee, 'Employee');

    const emailLower = String(employee.email || '').toLowerCase();
    const nameLower = String(employee.name || '').toLowerCase();

    const requestCount = db.prepare(`
      SELECT COUNT(*) AS count FROM Request
      WHERE COALESCE(isArchived, 0) = 0
        AND (submittedById = ? OR (? != '' AND lower(submittedByEmail) = ?))
    `).get(actorId, emailLower, emailLower)?.count || 0;

    const maintenanceCount = db.prepare(`
      SELECT COUNT(*) AS count FROM Maintenance
      WHERE COALESCE(isArchived, 0) = 0
        AND (
          submittedById = ?
          OR (? != '' AND lower(submittedBy) = ?)
          OR (? != '' AND lower(submittedBy) = ?)
        )
    `).get(actorId, emailLower, emailLower, nameLower, nameLower)?.count || 0;

    res.json({
      profile: serializeProfile(employee),
      stats: {
        submittedRequests: Number(requestCount || 0),
        submittedMaintenance: Number(maintenanceCount || 0),
      },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/profile/me', (req, res) => {
  try {
    const { actorId, actorRole } = getActorFromRequest(req);
    if (!actorId) return res.status(401).json({ error: 'Missing actorId' });

    const targetEmployeeId = String(req.body.targetEmployeeId || actorId).trim();
    const actor = requireRow('Employee', actorId, 'Employee');
    ensureNotArchived(actor, 'Employee');

    const target = requireRow('Employee', targetEmployeeId, 'Employee');
    ensureNotArchived(target, 'Employee');

    const editingSelf = actorId === targetEmployeeId;
    const effectiveRole = normalizeRole(actorRole || actor.role);

    if (!editingSelf && !isPrivilegedRole(effectiveRole)) {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    const updates = [];
    const values = [];

    const setIfDefined = (column, value) => {
      if (value !== undefined) {
        updates.push(`${column} = ?`);
        values.push(value);
      }
    };

    const {
      name,
      email,
      employeeNumber,
      department,
      role,
      avatar,
      phone,
      jobTitle,
      password,
    } = req.body;

    if (isPrivilegedRole(effectiveRole)) {
      if (employeeNumber !== undefined) {
        const normalizedEmployeeNumber = normalizeEmployeeNumber(employeeNumber);
        if (!normalizedEmployeeNumber) return res.status(400).json({ error: 'Employee Number is required' });

        const duplicate = db
          .prepare('SELECT id FROM Employee WHERE upper(employeeNumber) = ? AND id != ?')
          .get(normalizedEmployeeNumber, targetEmployeeId);

        if (duplicate) return res.status(400).json({ error: 'Employee Number already exists' });
        setIfDefined('employeeNumber', normalizedEmployeeNumber);
      }

      setIfDefined('name', name);
      setIfDefined('email', email);
      setIfDefined('department', department);
      if (role !== undefined) setIfDefined('role', normalizeRole(role));
      setIfDefined('avatar', avatar);
      setIfDefined('phone', phone);
      setIfDefined('jobTitle', jobTitle);
    } else {
      // User-level self-edit restriction
      setIfDefined('avatar', avatar);
      setIfDefined('phone', phone);
      setIfDefined('jobTitle', jobTitle);
    }

    if (editingSelf && String(password || '').trim()) {
      setIfDefined('password', String(password));
    }

    if (!updates.length) {
      return res.json({ success: true, profile: serializeProfile(target) });
    }

    db.prepare(`
      UPDATE Employee
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values, targetEmployeeId);

    const refreshed = requireRow('Employee', targetEmployeeId, 'Employee');

    writeAuditLog({
      type: 'UPDATED',
      entity: refreshed.name || 'Employee',
      message: editingSelf
        ? 'Profile updated'
        : `Profile updated by ${actor.name || 'ADMIN'}`,
      user: actor.name || actor.role || 'ADMIN',
    });

    res.json({ success: true, profile: serializeProfile(refreshed) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/profile/me/requests', (req, res) => {
  try {
    const { actorId } = getActorFromRequest(req);
    if (!actorId) return res.status(401).json({ error: 'Missing actorId' });

    const scope = parseScope(req.query.scope);
    const employee = requireRow('Employee', actorId, 'Employee');
    ensureNotArchived(employee, 'Employee');

    const emailLower = String(employee.email || '').toLowerCase();

    const rows = db.prepare(`
      SELECT * FROM Request
      WHERE ${archivedPredicate(scope, 'Request.isArchived')}
        AND (submittedById = ? OR (? != '' AND lower(submittedByEmail) = ?))
      ORDER BY datetime(createdAt) DESC
    `).all(actorId, emailLower, emailLower);

    res.json(rows.map((row) => ({
      ...row,
      items: safeJsonParse(row.items, []),
    })));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/profile/me/maintenance', (req, res) => {
  try {
    const { actorId } = getActorFromRequest(req);
    if (!actorId) return res.status(401).json({ error: 'Missing actorId' });

    const scope = parseScope(req.query.scope);
    const employee = requireRow('Employee', actorId, 'Employee');
    ensureNotArchived(employee, 'Employee');

    const emailLower = String(employee.email || '').toLowerCase();
    const nameLower = String(employee.name || '').toLowerCase();

    const rows = db.prepare(`
      SELECT * FROM Maintenance
      WHERE ${archivedPredicate(scope, 'Maintenance.isArchived')}
        AND (
          submittedById = ?
          OR (? != '' AND lower(submittedBy) = ?)
          OR (? != '' AND lower(submittedBy) = ?)
        )
      ORDER BY datetime(COALESCE(submittedAt, createdAt, startDate)) DESC
    `).all(actorId, emailLower, emailLower, nameLower, nameLower);

    res.json(rows.map(serializeMaintenance));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// AUDIT
app.get('/api/audit', (_req, res) => {
  try {
    res.json(
      db.prepare(`
        SELECT * FROM AuditLog
        ORDER BY datetime(createdAt) DESC
        LIMIT 500
      `).all(),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/audit', (req, res) => {
  try {
    const { type, entity, message, user } = req.body;
    const id = uid();
    db.prepare(`
      INSERT INTO AuditLog (id, timestamp, type, entity, message, user, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, new Date().toLocaleString(), type, entity, message, user ?? 'ADMIN', nowIso());
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/audit', (_req, res) => {
  try {
    db.prepare('DELETE FROM AuditLog').run();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// COMPONENTS
app.get('/api/components', (req, res) => {
  try {
    const scope = parseScope(req.query.scope);
    res.json(
      db.prepare(`
        SELECT * FROM Component
        WHERE ${archivedPredicate(scope, 'Component.isArchived')}
        ORDER BY id DESC
      `).all(),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/components/:id/assignments', (req, res) => {
  try {
    requireRow('Component', req.params.id, 'Component');
    res.json(getComponentAssignments(req.params.id, req.query.status || 'active'));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/components', (req, res) => {
  try {
    const { name, category, model, location, total, minQty, unitCost } = req.body;
    const result = db.prepare(`
      INSERT INTO Component (name, category, model, location, total, remaining, minQty, status, unitCost, createdAt, isArchived)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      name,
      category,
      model,
      location,
      parseInt(total),
      parseInt(total),
      parseInt(minQty ?? 0),
      'AVAILABLE',
      unitCost ?? 0,
      nowIso(),
    );

    writeAuditLog({ type: 'ADDED', entity: name, message: 'Component added to registry' });
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/components/:id', (req, res) => {
  try {
    const {
      name,
      category,
      model,
      location,
      total,
      remaining,
      minQty,
      status,
      assignedTo,
      checkoutDate,
      expectedCheckinDate,
      notes,
      unitCost,
    } = req.body;

    db.prepare(`
      UPDATE Component
      SET name = ?, category = ?, model = ?, location = ?, total = ?, remaining = ?, minQty = ?,
          status = ?, assignedTo = ?, checkoutDate = ?, expectedCheckinDate = ?, notes = ?, unitCost = ?
      WHERE id = ?
    `).run(
      name,
      category,
      model,
      location,
      total,
      remaining,
      minQty,
      status ?? 'AVAILABLE',
      assignedTo ?? null,
      checkoutDate ?? null,
      expectedCheckinDate ?? null,
      notes ?? null,
      unitCost ?? 0,
      req.params.id,
    );

    writeAuditLog({ type: 'UPDATED', entity: name, message: 'Component updated' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/components/:id/archive', (req, res) => {
  try {
    const item = archiveRecord(
      {
        table: 'Component',
        id: req.params.id,
        entity: (row) => row.name || 'Component',
        message: (row) => `${row.name} component archived`,
        userLabel: 'Component',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/components/:id/restore', (req, res) => {
  try {
    const item = restoreRecord(
      {
        table: 'Component',
        id: req.params.id,
        entity: (row) => row.name || 'Component',
        message: (row) => `${row.name} component restored`,
        userLabel: 'Component',
      },
      req.body,
    );
    res.json({ success: true, item });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/components/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT name FROM Component WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM Component WHERE id = ?').run(req.params.id);
    if (existing) {
      writeAuditLog({ type: 'DELETED', entity: existing.name, message: 'Component removed from registry' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/components/:id/checkin', (req, res) => {
  try {
    const existing = requireRow('Component', req.params.id, 'Component');
    ensureNotArchived(existing, 'Component');
    db.prepare("UPDATE Component SET status = 'AVAILABLE' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/components/:id/checkout', (req, res) => {
  try {
    const existing = requireRow('Component', req.params.id, 'Component');
    ensureNotArchived(existing, 'Component');
    db.prepare("UPDATE Component SET status = 'DEPLOYED' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AssetFlow API running -> http://localhost:${PORT}`));