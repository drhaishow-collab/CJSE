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

    // 1. Inspect sellin columns
    const sellinCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sellin'
    `);
    console.log('sellin columns:', sellinCols.rows.map(r => r.column_name));

    // Sample from sellin
    const sellinSample = await client.query('SELECT * FROM sellin LIMIT 1');
    console.log('sellin sample row:', sellinSample.rows[0]);

    // 2. Inspect sellout columns
    const selloutCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sellout'
    `);
    console.log('sellout columns:', selloutCols.rows.map(r => r.column_name));

    // Sample from sellout
    const selloutSample = await client.query('SELECT * FROM sellout LIMIT 1');
    console.log('sellout sample row:', selloutSample.rows[0]);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

inspect();
