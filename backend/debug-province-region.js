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

    // Check tinh table for province to region mapping
    console.log('=== tinh table ===');
    const tinhCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tinh'
      ORDER BY ordinal_position
    `);
    console.log('tinh columns:', tinhCols.rows.map(r => r.column_name).join(', '));
    const tinhSample = await client.query(`SELECT * FROM tinh LIMIT 10`);
    console.table(tinhSample.rows);

    // Check huyen table
    console.log('\n=== huyen table ===');
    const huyenCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'huyen'
      ORDER BY ordinal_position
    `);
    console.log('huyen columns:', huyenCols.rows.map(r => r.column_name).join(', '));

    // Check: can we use the fact_sellin table? (it has the same row count as sellin: 3.85M)
    // Check fact_sellin structure and if it has any region info
    console.log('\n=== fact_sellin sample ===');
    const fsSample = await client.query(`SELECT * FROM fact_sellin LIMIT 5`);
    console.log(JSON.stringify(fsSample.rows, null, 2));

    // Check fact_sellin columns
    const fsCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'fact_sellin'
      ORDER BY ordinal_position
    `);
    console.log('\nfact_sellin columns:', fsCols.rows.map(r => r.column_name).join(', '));

    // Check: does fact_sellin link to dim_territory for region?
    console.log('\n=== dim_territory columns ===');
    const dtCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'dim_territory'
      ORDER BY ordinal_position
    `);
    console.log('dim_territory columns:', dtCols.rows.map(r => r.column_name).join(', '));
    const dtSample = await client.query(`SELECT * FROM dim_territory LIMIT 5`);
    console.log(JSON.stringify(dtSample.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
