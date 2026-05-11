/**
 * setup-db.js
 * Run ONCE to create all tables: node setup-db.js
 */
const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');

db.transaction(() => {
  // ── ASSETS ──────────────────────────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS Asset (
      id           TEXT PRIMARY KEY,
      tag          TEXT UNIQUE,
      name         TEXT,
      category     TEXT,
      status       TEXT DEFAULT 'Available',
      assignedTo   TEXT,
      serialNo     TEXT,
      modelNo      TEXT,
      manufacturer TEXT,
      unitCost     REAL DEFAULT 0,
      location     TEXT,
      purchaseDate TEXT,
      notes        TEXT,
      receipt      TEXT,
      createdAt    TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // ── EMPLOYEES ───────────────────────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS Employee (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      email          TEXT UNIQUE NOT NULL,
      department     TEXT,
      role           TEXT DEFAULT 'User',
      assetsAssigned INTEGER DEFAULT 0,
      avatar         TEXT,
      createdAt      TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // ── CONSUMABLES ─────────────────────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS Consumable (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      category     TEXT,
      modelNo      TEXT,
      location     TEXT,
      itemNo       TEXT,
      orderNumber  TEXT,
      purchaseDate TEXT,
      minQty       INTEGER DEFAULT 0,
      total        INTEGER DEFAULT 0,
      remaining    INTEGER DEFAULT 0,
      unitCost     REAL DEFAULT 0,
      createdAt    TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // ── ACCESSORIES ─────────────────────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS Accessory (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      category   TEXT,
      modelNo    TEXT,
      location   TEXT,
      minQty     INTEGER DEFAULT 0,
      total      INTEGER DEFAULT 0,
      checkedOut INTEGER DEFAULT 0,
      createdAt  TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // ── LICENSES ────────────────────────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS License (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      key            TEXT,
      manufacturer   TEXT,
      licensedEmail  TEXT,
      expirationDate TEXT,
      minQty         INTEGER DEFAULT 2,
      total          INTEGER DEFAULT 0,
      avail          INTEGER DEFAULT 0,
      createdAt      TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // ── MAINTENANCE ─────────────────────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS Maintenance (
      id        TEXT PRIMARY KEY,
      assetName TEXT,
      issue     TEXT,
      status    TEXT DEFAULT 'Pending',
      priority  TEXT DEFAULT 'Medium',
      cost      REAL DEFAULT 0,
      startDate TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // ── REQUESTS ────────────────────────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS Request (
      id            TEXT PRIMARY KEY,
      requestNumber TEXT,
      requestorName TEXT,
      department    TEXT,
      managerName   TEXT,
      dateSubmitted TEXT,
      items         TEXT DEFAULT '[]',
      status        TEXT DEFAULT 'Pending',
      createdAt     TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // ── AUDIT LOGS ──────────────────────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS AuditLog (
      id        TEXT PRIMARY KEY,
      timestamp TEXT,
      type      TEXT,
      entity    TEXT,
      message   TEXT,
      user      TEXT DEFAULT 'ADMIN',
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // ── COMPONENTS (keep existing) ───────────────────────────
  db.prepare(`
    CREATE TABLE IF NOT EXISTS Component (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      category  TEXT NOT NULL,
      model     TEXT,
      location  TEXT,
      total     INTEGER NOT NULL DEFAULT 0,
      remaining INTEGER NOT NULL DEFAULT 0,
      minQty    INTEGER DEFAULT 0,
      status    TEXT DEFAULT 'AVAILABLE',
      checkedOut INTEGER DEFAULT 0
    )
  `).run();

})();

console.log('✅ All tables created successfully!');
db.close();