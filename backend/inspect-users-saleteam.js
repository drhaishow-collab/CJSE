const { Client } = require('pg');

async function inspect() {
  const client = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });

  try {
    await client.connect();
    console.log('✅ Connected to sales_db');

    // Find representatives with Ngưng Hoạt Động status in visit table
    try {
      const inactiveReps = await client.query("SELECT DISTINCT ma_nv, ten_nv, trang_thai FROM visit WHERE trang_thai = 'Ngưng Hoạt Động'");
      console.log('\nRepresentatives with Ngưng Hoạt Động:');
      console.log(inactiveReps.rows);
      console.log('Total count:', inactiveReps.rows.length);
    } catch (e) {
      console.log('Query error:', e.message);
    }

    // Inspect users table active/vacant details
    try {
      const res = await client.query("SELECT username, full_name, role, active FROM users");
      console.log('\nUsers table:');
      console.log(res.rows);
    } catch (e) {
      console.log('Users query error:', e.message);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

inspect();
