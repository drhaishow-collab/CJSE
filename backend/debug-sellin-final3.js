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

    // Check if there's a way to link sellin to saleteam via staff/product info
    // Maybe using material (product) or some other field
    console.log('=== dim_salesforce columns ===');
    const sfCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'dim_salesforce'
      ORDER BY ordinal_position
    `);
    console.log(sfCols.rows.map(r => r.column_name).join(', '));

    const sfSample = await client.query(`SELECT * FROM dim_salesforce LIMIT 5`);
    console.log(JSON.stringify(sfSample.rows, null, 2));

    // Check saleteam structure for NPP mapping
    console.log('\n=== saleteam columns ===');
    const stCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'saleteam'
      ORDER BY ordinal_position
    `);
    console.log(stCols.rows.map(r => r.column_name).join(', '));

    const stSample = await client.query(`SELECT * FROM saleteam LIMIT 3`);
    console.log(JSON.stringify(stSample.rows, null, 2));

    // Check if sellin has any staff info that maps to saleteam
    console.log('\n=== sellin columns (all) ===');
    const sellinCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sellin'
      ORDER BY ordinal_position
    `);
    console.log(sellinCols.rows.map(r => r.column_name).join(', '));

    // Check fact_sellin vs dim_npp match
    console.log('\n=== fact_sellin vs dim_npp match ===');
    const fsMatch = await client.query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE dn.region IS NOT NULL) as matched
      FROM fact_sellin fs
      LEFT JOIN dim_npp dn ON fs.ma_khach_hang = CAST(dn.npp_id AS TEXT)
      LIMIT 1
    `);
    console.table(fsMatch.rows);

    // Check fact_sellin ma_khach_hang range
    console.log('\n=== fact_sellin ma_khach_hang range ===');
    const fsRange = await client.query(`
      SELECT
        MIN(ma_khach_hang) as min_val,
        MAX(ma_khach_hang) as max_val,
        COUNT(DISTINCT ma_khach_hang) as unique_count
      FROM fact_sellin
    `);
    console.table(fsRange.rows);

    // Check: can we use fact_sellin as the source instead of sellin raw table?
    // fact_sellin has: ngay, ma_khach_hang, ma_san_pham, doanh_thu
    console.log('\n=== fact_sellin sample ===');
    const fsSample = await client.query(`SELECT * FROM fact_sellin LIMIT 5`);
    console.log(JSON.stringify(fsSample.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
