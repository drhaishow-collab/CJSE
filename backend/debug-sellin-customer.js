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

    // Check customer table structure
    console.log('=== customer columns ===');
    const custCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'customer'
      ORDER BY ordinal_position
    `);
    console.log(custCols.rows.map(r => r.column_name).join(', '));

    const custSample = await client.query(`SELECT * FROM customer LIMIT 3`);
    console.log(JSON.stringify(custSample.rows, null, 2));

    // Check customer ma_khach_hang range
    console.log('\n=== customer ma_khach_hang range ===');
    const custRange = await client.query(`
      SELECT
        MIN(CAST(ma_khach_hang AS TEXT)) as min_val,
        MAX(CAST(ma_khach_hang AS TEXT)) as max_val,
        COUNT(DISTINCT ma_khach_hang) as unique_count
      FROM customer
    `);
    console.table(custRange.rows);

    // Check customer region info
    console.log('\n=== customer table - any region info? ===');
    const custRegion = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'customer'
        AND column_name ILIKE '%mien%'
    `);
    console.log('Region columns:', custRegion.rows.map(r => r.column_name).join(', '));

    // Check: what if we just use fact_sellin as the sellin source instead?
    // fact_sellin has ngay, ma_khach_hang, ma_san_pham, doanh_thu
    console.log('\n=== fact_sellin row count ===');
    const fsCount = await client.query(`SELECT COUNT(*) FROM fact_sellin`);
    console.log('fact_sellin rows:', fsCount.rows[0].count);

    // Can we join fact_sellin to dim_customer for region?
    console.log('\n=== fact_sellin vs dim_customer match ===');
    const fsMatch = await client.query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE dc.mien IS NOT NULL) as matched
      FROM fact_sellin fs
      LEFT JOIN dim_customer dc ON fs.ma_khach_hang = dc.ma_khach_hang
    `);
    console.table(fsMatch.rows);

    // Check: can we use dim_customer.ma_nha_phan_phoi to get region?
    console.log('\n=== dim_customer ma_nha_phan_phoi range ===');
    const nhappRange = await client.query(`
      SELECT
        MIN(CAST(ma_nha_phan_phoi AS TEXT)) as min_val,
        MAX(CAST(ma_nha_phan_phoi AS TEXT)) as max_val,
        COUNT(DISTINCT ma_nha_phan_phoi) as unique_count
      FROM dim_customer
      WHERE ma_nha_phan_phoi IS NOT NULL
    `);
    console.table(nhappRange.rows);

    // Check: what's in dim_customer for region mapping?
    console.log('\n=== dim_customer mien distribution ===');
    const dcMien = await client.query(`
      SELECT mien, COUNT(*) as cnt
      FROM dim_customer
      GROUP BY mien
    `);
    console.table(dcMien.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
