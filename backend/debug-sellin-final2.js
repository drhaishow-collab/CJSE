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
    console.log('✅ Connected\n');

    // Direct breakdown: all_sales_data by type and mien
    console.log('=== all_sales_data breakdown ===');
    const breakdown = await client.query(`
      SELECT type, mien, COUNT(*) as cnt
      FROM all_sales_data
      GROUP BY type, mien
      ORDER BY type, cnt DESC
    `);
    console.table(breakdown.rows);

    // Check if we can use sellout's region pattern to determine sellin's region
    // First check: for the 247K matched sellin rows, verify region
    console.log('\n=== Matched sellin region distribution ===');
    const matchedRegion = await client.query(`
      SELECT n.ten_mien, COUNT(*) as cnt
      FROM sellin s
      JOIN npp n ON TRIM(s.sold_to_party) = TRIM(n.ma_npp::text)
      WHERE s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND TRIM(s.material) <> 'Grand Total'
        AND s.billing_date IS NOT NULL
        AND n.ten_mien IS NOT NULL
      GROUP BY n.ten_mien
    `);
    console.table(matchedRegion.rows);

    // The core problem: 3.5M+ sellin rows have sold_to_party codes that don't exist in npp table
    // Let's see if we can derive region from other sources
    // Check dim_customer for region info based on customer codes
    console.log('\n=== dim_customer region info ===');
    const dimCustRegion = await client.query(`
      SELECT mien, COUNT(*) as cnt
      FROM dim_customer
      GROUP BY mien
      ORDER BY cnt DESC
    `);
    console.table(dimCustRegion.rows);

    // Check if there's overlap between npp.ma_npp and dim_customer
    console.log('\n=== NPP vs dim_customer join ===');
    const nppCustJoin = await client.query(`
      SELECT COUNT(*) as matched
      FROM npp n
      JOIN dim_customer dc ON n.ma_npp::text = dc.ma_nha_phan_phoi
      WHERE n.ten_mien IS NOT NULL
    `);
    console.table(nppCustJoin.rows);

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

check();
