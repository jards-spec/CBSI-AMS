const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const sqlite = require('better-sqlite3');

const db = new sqlite('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3(db);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding data...");
  await prisma.accessory.deleteMany({});
  await prisma.accessory.create({
    data: { 
      name: 'Wireless Mouse', 
      category: 'MOUSE', 
      total: 50, 
      checkedOut: 41, 
      location: 'IT Storage Room' 
    }
  });
  console.log("✅ Seed complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());