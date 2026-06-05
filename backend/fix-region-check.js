const { Client } = require('pg');

async function fixRegionMapping() {
  const client = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });

  try {
    await client.connect();
    console.log('✅ Connected to sales_db\n');

    // Check how to map NPP to region
    console.log('=== 📋 CHECKING NPP REGION MAPPING ===');
    
    // Check npp table for region info
    console.log('\n1. NPP table columns:');
    const nppCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'npp' ORDER BY ordinal_position
    `);
    console.log(nppCols.rows.map(r => r.column_name).join(', '));

    // Check npp region data
    const nppRegion = await client.query(`
      SELECT ten_mien, COUNT(*) as cnt
      FROM npp
      WHERE ma_npp IS NOT NULL
      GROUP BY ten_mien
      ORDER BY cnt DESC
    `);
    console.log('\n2. NPP region distribution:');
    console.table(nppRegion.rows);

    // Check if ma_npp can link agg tables to npp
    console.log('\n3. Check ma_npp overlap:');
    const overlap = await client.query(`
      SELECT
        (SELECT COUNT(DISTINCT ma_npp) FROM agg_monthly_sales WHERE ma_npp IS NOT NULL) as agg_npp_count,
        (SELECT COUNT(DISTINCT ma_npp::text) FROM npp WHERE ma_npp IS NOT NULL) as npp_count,
        (SELECT COUNT(*) FROM (
          SELECT DISTINCT ma_npp FROM agg_monthly_sales
          INTERSECT
          SELECT DISTINCT ma_npp::text FROM npp
        ) t) as overlap_count
    `);
    console.table(overlap.rows);

    // Check saleteam for region mapping
    console.log('\n4. Saleteam region mapping:');
    const stRegion = await client.query(`
      SELECT DISTINCT ten_mien, ten_vung, COUNT(*) as cnt
      FROM saleteam
      WHERE ten_mien IS NOT NULL
      GROUP BY ten_mien, ten_vung
      ORDER BY cnt DESC
    `);
    console.table(stRegion.rows);

    // Check customer table for region
    console.log('\n5. Customer region distribution:');
    const custRegion = await client.query(`
      SELECT mien, COUNT(*) as cnt
      FROM customer
      WHERE mien IS NOT NULL AND mien <> ''
      GROUP BY mien
      ORDER BY cnt DESC
    `);
    console.table(custRegion.rows);

    // Create proper region mapping table
    console.log('\n\n=== 🔧 CREATING REGION MAPPING TABLE ===');
    
    // Create mapping from saleteam
    await client.query('DROP TABLE IF EXISTS npp_region_map');
    
    // First check if we can use saleteam.ma_npp
    console.log('\n6. Saleteam ma_npp sample:');
    const stSample = await client.query(`SELECT DISTINCT ma_npp, ten_npp, ten_mien FROM saleteam WHERE ma_npp IS NOT NULL LIMIT 10`);
    console.table(stSample.rows);

    // Create proper mapping using saleteam data
    console.log('\n7. Creating npp_region_map from saleteam...');
    await client.query(`
      CREATE TABLE npp_region_map AS
      SELECT DISTINCT ON (ma_npp_key)
        ma_npp::text as ma_npp_key,
        COALESCE(ten_mien, 'CHƯA PHÂN LOẠI') as ten_mien,
        COALESCE(ten_vung, 'CHƯA PHÂN LOẠI') as ten_vung
      FROM saleteam
      WHERE ma_npp IS NOT NULL
      ORDER BY ma_npp, ten_mien
    `);
    await client.query('CREATE INDEX idx_npp_region ON npp_region_map(ma_npp_key)');
    console.log('✅ npp_region_map created');

    // Check mapping result
    const mapCheck = await client.query(`
      SELECT ten_mien, COUNT(*) as cnt
      FROM npp_region_map
      GROUP BY ten_mien
    `);
    console.log('\n8. npp_region_map distribution:');
    console.table(mapCheck.rows);

    // Check how many agg_monthly_sales can be mapped
    console.log('\n9. Mapping coverage:');
    const coverage = await client.query(`
      SELECT
        COUNT(*) as total_rows,
        COUNT(*) FILTER (WHERE m.ten_mien IS NOT NULL AND m.ten_mien <> 'CHƯA PHÂN LOẠI') as mapped_rows
      FROM agg_monthly_sales a
      LEFT JOIN npp_region_map m ON a.ma_npp = m.ma_npp_key
    `);
    console.table(coverage.rows);

    await client.end();
    console.log('\n\n✅ Check completed! Ready for fix script.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

fixRegionMapping();
