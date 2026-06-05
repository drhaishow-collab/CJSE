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

    // Check fact_sellin structure
    const factCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'fact_sellin'
      ORDER BY ordinal_position
    `);
    console.log('fact_sellin columns:', factCols.rows.map(r => r.column_name).join(', '));

    // Sample fact_sellin rows
    const factSample = await client.query(`SELECT * FROM fact_sellin LIMIT 3`);
    console.log(JSON.stringify(factSample.rows, null, 2));

    // Check fact_sellout structure
    const factOutCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'fact_sellout'
      ORDER BY ordinal_position
    `);
    console.log('\nfact_sellout columns:', factOutCols.rows.map(r => r.column_name).join(', '));

    const factOutSample = await client.query(`SELECT * FROM fact_sellout LIMIT 3`);
    console.log(JSON.stringify(factOutSample.rows, null, 2));

    // Check dim_npp structure
    const dimNppCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'dim_npp'
      ORDER BY ordinal_position
    `);
    console.log('\ndim_npp columns:', dimNppCols.rows.map(r => r.column_name).join(', '));

    const dimNppSample = await client.query(`SELECT * FROM dim_npp LIMIT 3`);
    console.log(JSON.stringify(dimNppSample.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
