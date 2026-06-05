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

    // Compare sold_to_party vs npp_id ranges
    console.log('=== sold_to_party range in sellin ===');
    const sellinRange = await client.query(`
      SELECT
        MIN(TRIM(sold_to_party)) as min_val,
        MAX(TRIM(sold_to_party)) as max_val,
        COUNT(DISTINCT TRIM(sold_to_party)) as unique_count
      FROM sellin
      WHERE sold_to_party IS NOT NULL
        AND TRIM(sold_to_party) ~ '^[0-9]+$'
    `);
    console.table(sellinRange.rows);

    console.log('\n=== npp_id range in dim_npp ===');
    const nppRange = await client.query(`
      SELECT
        MIN(npp_id) as min_val,
        MAX(npp_id) as max_val,
        COUNT(DISTINCT npp_id) as unique_count
      FROM dim_npp
    `);
    console.table(nppRange.rows);

    console.log('\n=== npp_id range in raw npp table ===');
    const nppRawRange = await client.query(`
      SELECT
        MIN(ma_npp) as min_val,
        MAX(ma_npp) as max_val,
        COUNT(DISTINCT ma_npp) as unique_count
      FROM npp
      WHERE ma_npp IS NOT NULL
    `);
    console.table(nppRawRange.rows);

    // Check overlap between sellin.sold_to_party and raw npp.ma_npp
    console.log('\n=== Match: sellin vs raw npp ===');
    const matchNpp = await client.query(`
      SELECT COUNT(DISTINCT TRIM(s.sold_to_party)) as total,
        COUNT(DISTINCT TRIM(s.sold_to_party)) FILTER (
          WHERE TRIM(s.sold_to_party)::bigint IN (SELECT ma_npp FROM npp)
        ) as matched
      FROM sellin s
      WHERE s.sold_to_party IS NOT NULL
        AND TRIM(s.sold_to_party) ~ '^[0-9]+$'
    `);
    console.table(matchNpp.rows);

    // Check: do the matched ones actually have correct region in raw npp?
    console.log('\n=== Region distribution for MATCHED sellin rows (via raw npp) ===');
    const matchedRegion = await client.query(`
      SELECT n.ten_mien, COUNT(*) as cnt
      FROM sellin s
      JOIN npp n ON TRIM(s.sold_to_party)::bigint = n.ma_npp
      WHERE s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND TRIM(s.material) <> 'Grand Total'
        AND s.billing_date IS NOT NULL
        AND n.ten_mien IS NOT NULL
      GROUP BY n.ten_mien
    `);
    console.table(matchedRegion.rows);

    // Check: dim_npp vs npp overlap
    console.log('\n=== Overlap: dim_npp.npp_id vs npp.ma_npp ===');
    const dimVsRaw = await client.query(`
      SELECT
        (SELECT COUNT(DISTINCT npp_id FROM dim_npp) + 0) as dim_npp_count,
        (SELECT COUNT(DISTINCT ma_npp FROM npp WHERE ma_npp IS NOT NULL) + 0) as raw_npp_count,
        (SELECT COUNT(*) FROM (
          SELECT DISTINCT npp_id FROM dim_npp
          INTERSECT
          SELECT DISTINCT ma_npp FROM npp WHERE ma_npp IS NOT NULL
        ) t) as overlap_count
    `);
    console.table(dimVsRaw.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
