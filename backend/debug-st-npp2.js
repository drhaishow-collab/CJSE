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

    // saleteam ma_npp range
    console.log('=== saleteam ma_npp range ===');
    const stNppRange = await client.query(`
      SELECT
        MIN(CAST(ma_npp AS TEXT)) as min_val,
        MAX(CAST(ma_npp AS TEXT)) as max_val,
        COUNT(DISTINCT ma_npp) as unique_count
      FROM saleteam
      WHERE ma_npp IS NOT NULL
    `);
    console.table(stNppRange.rows);

    // sellin vs saleteam ma_npp match
    console.log('\n=== sellin vs saleteam ma_npp match ===');
    const matchSt = await client.query(`
      SELECT COUNT(*) as total_rows,
        COUNT(*) FILTER (
          WHERE TRIM(s.sold_to_party) IN (SELECT DISTINCT CAST(ma_npp AS TEXT) FROM saleteam WHERE ma_npp IS NOT NULL)
        ) as matched_via_saleteam
      FROM sellin s
      WHERE s.sold_to_party IS NOT NULL
        AND s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND s.billing_date IS NOT NULL
    `);
    console.table(matchSt.rows);

    // Region distribution from saleteam
    console.log('\n=== Region via saleteam match ===');
    const stRegion = await client.query(`
      SELECT st.ten_mien, COUNT(*) as cnt
      FROM sellin s
      JOIN saleteam st ON TRIM(s.sold_to_party) = CAST(st.ma_npp AS TEXT)
      WHERE s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND TRIM(s.material) <> 'Grand Total'
        AND s.billing_date IS NOT NULL
        AND st.ma_npp IS NOT NULL
        AND st.ten_mien IS NOT NULL
      GROUP BY st.ten_mien
    `);
    console.table(stRegion.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
