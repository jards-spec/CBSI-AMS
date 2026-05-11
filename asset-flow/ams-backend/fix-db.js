const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');

try {
    console.log("🛠️ Rebuilding Database to match UI fields...");

    db.transaction(() => {
        // Drop old tables to ensure clean schema
        db.prepare(`DROP TABLE IF EXISTS ComponentAssignments`).run();
        db.prepare(`DROP TABLE IF EXISTS Component`).run();

        // Schema strictly matching: Component Name, Category, Model Number, Storage Location, Total Stock, Min Alert
        db.prepare(`
            CREATE TABLE Component (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                model TEXT,
                location TEXT,
                total INTEGER NOT NULL,
                remaining INTEGER NOT NULL,
                minQty INTEGER DEFAULT 0
            )
        `).run();

        db.prepare(`
            CREATE TABLE ComponentAssignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                componentId INTEGER NOT NULL,
                assetId INTEGER NOT NULL,
                assignedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (componentId) REFERENCES Component(id)
            )
        `).run();
    })();

    console.log("✅ Success: Database columns now match the Register Form.");
} catch (err) {
    console.error("❌ Database Error:", err.message);
} finally {
    db.close();
}