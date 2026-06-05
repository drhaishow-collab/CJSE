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

    // 1. Get list of tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', tables.rows.map(r => r.table_name));

    // 2. Inspect 'all_sales_data' structure
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'all_sales_data'
    `);
    console.log('Columns in all_sales_data:');
    cols.rows.forEach(r => {
      console.log(`- ${r.column_name}: ${r.data_type}`);
    });

    // 3. Query top 3 rows to see sample data
    const sample = await client.query('SELECT * FROM all_sales_data LIMIT 1');
    console.log('Sample rows:', JSON.stringify(sample.rows, null, 2));

  } catch (err) {
    console.error('❌ Error inspecting sales_db:', err.message);
  } finally {
    await client.end();
  }
}

inspect();
