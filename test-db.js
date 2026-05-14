import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Initialize database
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...\n');

    // Test connection
    const test = await db.execute('SELECT 1 as ok');
    console.log('✅ Database connected!\n');

    // Check all employees
    console.log('📋 All Employees:');
    const employees = await db.execute('SELECT id, name, email, employeeNumber, role, createdAt FROM Employee');
    console.table(employees.rows);

    // Check specific test user
    console.log('\n🔍 Looking for TEST-001:');
    const testUser = await db.execute(
      "SELECT id, name, email, employeeNumber, role, createdAt FROM Employee WHERE employeeNumber = 'TEST-001'"
    );
    if (testUser.rows.length > 0) {
      console.log('✅ Test user found!');
      console.table(testUser.rows);
    } else {
      console.log('❌ Test user NOT found in database!');
    }

    // Check total count
    const count = await db.execute('SELECT COUNT(*) as total FROM Employee');
    console.log(`\n📊 Total employees in database: ${count.rows[0].total}`);

    await db.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.close();
  }
}

checkDatabase();