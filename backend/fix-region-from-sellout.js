const { Client } = require('pg');

async function fixRegionFromSellout() {
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

    // Create region mapping from agg_sellout_monthly
    console.log('=== 📋 Creating region mapping from agg_sellout_monthly ===\n');
    
    await client.query('DROP TABLE IF EXISTS npp_region_map_from_sellout');
    
    // Get all unique NPP -> Region mappings from sellout data
    await client.query(`
      CREATE TABLE npp_region_map_from_sellout AS
      SELECT DISTINCT ON (ma_npp)
        ma_npp,
        ten_mien,
        ten_vung
      FROM (
        SELECT DISTINCT ma_npp, ten_mien, ten_vung FROM agg_sellout_monthly
        WHERE ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        UNION
        SELECT DISTINCT ma_npp, ten_mien, ten_vung FROM sellout
        WHERE ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      ) combined
    `);
    await client.query('CREATE INDEX idx_npp_region_sellout ON npp_region_map_from_sellout(ma_npp)');
    
    const mapStats = await client.query(`
      SELECT ten_mien, COUNT(*) as cnt FROM npp_region_map_from_sellout GROUP BY ten_mien
    `);
    console.log('Sellout mapping distribution:', mapStats.rows);

    // Update agg_monthly_sales with region from sellout
    console.log('\n=== 📋 Updating agg_monthly_sales ===\n');
    
    const updateResult = await client.query(`
      UPDATE agg_monthly_sales a
      SET 
        ten_mien = m.ten_mien,
        ten_vung = m.ten_vung
      FROM npp_region_map_from_sellout m
      WHERE a.ma_npp = m.ma_npp
        AND a.ten_mien = 'CHƯA PHÂN LOẠI'
        AND m.ten_mien IS NOT NULL
    `);
    console.log(`Updated ${updateResult.rowCount} rows from sellout mapping`);

    // Check new distribution
    console.log('\n=== 📊 NEW region distribution ===');
    const newDist = await client.query(`
      SELECT ten_mien, COUNT(*) as cnt, SUM(revenue) as total_revenue
      FROM agg_monthly_sales
      GROUP BY ten_mien
      ORDER BY total_revenue DESC
    `);
    console.table(newDist.rows);

    // Update agg_npp_performance
    console.log('\n=== 📋 Updating agg_npp_performance ===');
    await client.query(`
      UPDATE agg_npp_performance a
      SET 
        ten_mien = m.ten_mien,
        ten_vung = m.ten_vung
      FROM npp_region_map_from_sellout m
      WHERE a.ma_npp = m.ma_npp
        AND a.ten_mien = 'CHƯA PHÂN LOẠI'
        AND m.ten_mien IS NOT NULL
    `);
    console.log('Updated agg_npp_performance');

    // Summary
    console.log('\n\n=== 📊 FINAL SUMMARY ===');
    const finalStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ten_mien = 'CHƯA PHÂN LOẠI') as chua_phan_loai,
        COUNT(*) FILTER (WHERE ten_mien = 'MIỀN NAM') as mien_nam,
        COUNT(*) FILTER (WHERE ten_mien = 'MIỀN BẮC') as mien_bac
      FROM agg_monthly_sales
    `);
    console.table(finalStats.rows);

    await client.end();
    console.log('\n✅ Region fix completed!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

fixRegionFromSellout();
