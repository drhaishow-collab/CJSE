/**
 * Create admin user in local PostgreSQL DB.
 * Run: node backend/scripts/create-admin.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'sales_db',
  password: process.env.DB_PASSWORD || '123456',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function main() {
  console.log('\n🔐 Create Admin User');
  console.log('====================');

  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Cannot connect to DB:', err.message);
    process.exit(1);
  }

  const username = 'SE';
  const password = 'Cj@123456';
  const fullName = 'Sales Executive';
  const email = 'se@company.com';
  const phone = '';
  const role = 'admin';

  // Check if user exists
  const existing = await pool.query(
    'SELECT id, username FROM users WHERE username = $1',
    [username]
  );

  if (existing.rows.length > 0) {
    console.log(`ℹ️  User "${username}" already exists (id=${existing.rows[0].id}). Updating...`);
    await pool.query(
      `UPDATE users SET full_name=$1, email=$2, phone=$3, role=$4, active=true WHERE username=$5`,
      [fullName, email, phone, role, username]
    );
    console.log('✅ User updated successfully.');
  } else {
    console.log(`📝 Creating user "${username}"...`);
    await pool.query(
      `INSERT INTO users (username, full_name, email, phone, role, active, created_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())`,
      [username, fullName, email, phone, role]
    );
    console.log('✅ User created successfully.');
  }

  // Show all users
  const all = await pool.query('SELECT id, username, full_name, role, active FROM users ORDER BY id');
  console.log('\n📋 All users:');
  all.rows.forEach(u => {
    console.log(`   [${u.id}] ${u.username} — ${u.full_name} — ${u.role} — ${u.active ? 'active' : 'inactive'}`);
  });

  await pool.end();
  console.log('\n💡 Note: Password is stored as-is. If your auth expects bcrypt,');
  console.log('   update the INSERT to hash the password before saving.\n');
}

main();
