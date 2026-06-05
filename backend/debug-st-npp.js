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

    // List current tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

    // Check saleteam ma_npp range
    console.log('\n=== saleteam ma_npp range ===');
    const stNppRange = await client.query(`
      SELECT
        MIN(ma_npp::int) as min_val,
        MAX(ma_npp::int) as max_val,
        COUNT(DISTINCT ma_npp) as unique_count
      FROM saleteam
      WHERE ma_npp IS NOT NULL AND ma_npp ~ '^[0-9]+$'
    `);
    console.table(stNppRange.rows);

    // Check saleteam ma_npp overlap with sellin
    console.log('\n=== sellin vs saleteam ma_npp match ===');
    const matchSt = await client.query(`
      SELECT COUNT(DISTINCT TRIM(s.sold_to_party)) as total_sellin,
        COUNT(DISTINCT TRIM(s.sold_to_party)) FILTER (
          WHERE TRIM(s.sold_to_party) IN (SELECT DISTINCT ma_npp FROM saleteam WHERE ma_npp ~ '^[0-9]+$')
        ) as matched_saleteam
      FROM sellin s
      WHERE s.sold_to_party IS NOT NULL
        AND s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND s.billing_date IS NOT NULL
    `);
    console.table(matchSt.rows);

    // Check region distribution from saleteam match
    console.log('\n=== Region from saleteam match ===');
    const stRegion = await client.query(`
      SELECT st.ten_mien, COUNT(*) as cnt
      FROM sellin s
      JOIN saleteam st ON TRIM(s.sold_to_party) = st.ma_npp
      WHERE s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND TRIM(s.material) <> 'Grand Total'
        AND s.billing_date IS NOT NULL
        AND st.ma_npp ~ '^[0-9]+$'
        AND st.ten_mien IS NOT NULL
      GROUP BY st.ten_mien
    `);
    console.table(stRegion.rows);

    // How many sellin rows can we map via saleteam?
    console.log('\n=== saleteam ma_npp vs npp table ===');
    const stVsNpp = await client.query(`
      SELECT
        (SELECT COUNT(DISTINCT ma_npp) FROM saleteam WHERE ma_npp ~ '^[0-9]+$') as st_npp_count,
        (SELECT COUNT(DISTINCT ma_npp) FROM npp WHERE ma_npp IS NOT NULL) as npp_count,
        (SELECT COUNT(*) FROM (
          SELECT DISTINCT ma_npp FROM saleteam WHERE ma_npp ~ '^[0-9]+$'
          INTERSECT
          SELECT DISTINCT ma_npp::text FROM npp WHERE ma_npp IS NOT NULL
        ) t) as overlap
    `);
    console.table(stVsNpp.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
