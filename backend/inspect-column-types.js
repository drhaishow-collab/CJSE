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

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'all_sales_data';
    `);
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

inspect();
