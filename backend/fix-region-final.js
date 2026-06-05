const { Client } = require('pg');

async function fixRegion() {
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

    // Create comprehensive region mapping from customer table
    console.log('=== 📋 Creating comprehensive region mapping ===\n');
    
    // Check customer table for ma_nha_phan_phoi
    console.log('1. Customer ma_nha_phan_phoi sample:');
    const custSample = await client.query(`
      SELECT DISTINCT ma_nha_phan_phoi, ten_nha_phan_phoi, mien, ten_vung
      FROM customer
      WHERE ma_nha_phan_phoi IS NOT NULL AND mien IS NOT NULL
      LIMIT 10
    `);
    console.table(custSample.rows);

    // Check overlap between customer.ma_nha_phan_phoi and agg_monthly_sales.ma_npp
    console.log('\n2. Checking overlap with agg_monthly_sales:');
    const overlap = await client.query(`
      SELECT
        (SELECT COUNT(DISTINCT ma_nha_phan_phoi) FROM customer WHERE ma_nha_phan_phoi IS NOT NULL) as customer_npp,
        (SELECT COUNT(DISTINCT ma_npp) FROM agg_monthly_sales WHERE ma_npp IS NOT NULL) as agg_npp,
        (SELECT COUNT(*) FROM (
          SELECT DISTINCT ma_nha_phan_phoi FROM customer
          INTERSECT
          SELECT DISTINCT ma_npp FROM agg_monthly_sales
        ) t) as overlap
    `);
    console.table(overlap.rows);

    // Create comprehensive mapping using customer
    console.log('\n3. Creating npp_region_map from customer table...');
    await client.query('DROP TABLE IF EXISTS npp_region_map');
    await client.query(`
      CREATE TABLE npp_region_map AS
      SELECT DISTINCT ON (ma_npp_key)
        ma_nha_phan_phoi::text as ma_npp_key,
        COALESCE(NULLIF(TRIM(mien), ''), 'CHƯA PHÂN LOẠI') as ten_mien,
        COALESCE(NULLIF(TRIM(ten_vung), ''), 'CHƯA PHÂN LOẠI') as ten_vung
      FROM customer
      WHERE ma_nha_phan_phoi IS NOT NULL
        AND mien IS NOT NULL
        AND mien <> ''
      ORDER BY ma_nha_phan_phoi, 
        CASE WHEN mien IN ('MIỀN NAM', 'MIỀN BẮC') THEN 0 ELSE 1 END
    `);
    await client.query('CREATE INDEX idx_npp_region ON npp_region_map(ma_npp_key)');
    
    const mapStats = await client.query(`
      SELECT ten_mien, COUNT(*) as cnt FROM npp_region_map GROUP BY ten_mien
    `);
    console.log('npp_region_map distribution:', mapStats.rows);

    // Update agg_monthly_sales with proper region
    console.log('\n4. Updating agg_monthly_sales with region...');
    const updateResult = await client.query(`
      UPDATE agg_monthly_sales a
      SET 
        ten_mien = COALESCE(m.ten_mien, a.ten_mien),
        ten_vung = COALESCE(m.ten_vung, a.ten_vung)
      FROM npp_region_map m
      WHERE a.ma_npp = m.ma_npp_key
        AND a.ten_mien = 'CHƯA PHÂN LOẠI'
    `);
    console.log(`Updated ${updateResult.rowCount} rows`);

    // Check new distribution
    console.log('\n5. NEW region distribution:');
    const newDist = await client.query(`
      SELECT ten_mien, COUNT(*) as cnt, SUM(revenue) as total_revenue
      FROM agg_monthly_sales
      GROUP BY ten_mien
      ORDER BY total_revenue DESC
    `);
    console.table(newDist.rows);

    // Also update agg_npp_performance
    console.log('\n6. Updating agg_npp_performance...');
    await client.query(`
      UPDATE agg_npp_performance a
      SET 
        ten_mien = COALESCE(m.ten_mien, a.ten_mien),
        ten_vung = COALESCE(m.ten_vung, a.ten_vung)
      FROM npp_region_map m
      WHERE a.ma_npp = m.ma_npp_key
        AND a.ten_mien = 'CHƯA PHÂN LOẠI'
    `);

    console.log('\n✅ Region mapping fixed!');
    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

fixRegion();
