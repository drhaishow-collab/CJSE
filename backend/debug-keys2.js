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
    console.log('Connected\n');

    // List all tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

    // Check sellin.ship_to vs sold_to
    console.log('\n=== sellin columns ===');
    const sellinCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sellin' ORDER BY ordinal_position
    `);
    console.log(sellinCols.rows.map(r => r.column_name).join(', '));

    // Sample a sellin row
    console.log('\n=== sellin sample row ===');
    const sample = await client.query(`SELECT * FROM sellin WHERE billing_date IS NOT NULL AND material IS NOT NULL AND TRIM(material) <> '' LIMIT 1`);
    console.log(JSON.stringify(sample.rows[0], null, 2));

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
