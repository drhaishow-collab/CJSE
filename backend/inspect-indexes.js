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
      SELECT MIN(ngay_thang) as min_date, MAX(ngay_thang) as max_date, COUNT(*) as total_rows 
      FROM fact_kpi;
    `);
    console.log('fact_kpi date range:', res.rows);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

inspect();
