const { Client } = require('pg');

async function check() {
  const client = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });

  try {
    await client.connect();
    const r = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'product'
      ORDER BY ordinal_position
    `);
    console.log('product columns:', r.rows.map(r => r.column_name).join(', '));
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
