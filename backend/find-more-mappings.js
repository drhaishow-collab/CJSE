const { Client } = require('pg');

async function findMoreMappings() {
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

    // Check if we can use ten_npp name patterns to determine region
    console.log('=== 📋 Analyzing ten_npp patterns ===\n');
    
    // Sample ten_npp names to see if they contain region hints
    const nppSamples = await client.query(`
      SELECT DISTINCT ma_npp, ten_npp, ten_mien
      FROM agg_monthly_sales
      WHERE ten_mien = 'CHƯA PHÂN LOẠI'
        AND ten_npp IS NOT NULL
      LIMIT 20
    `);
    console.log('Sample "CHƯA PHÂN LOẠI" NPP names:');
    console.table(nppSamples.rows);

    // Check if we can derive region from product category patterns
    console.log('\n=== 📋 Checking product category patterns ===\n');
    const prodByRegion = await client.query(`
      SELECT ten_mien, nganh_hang, COUNT(*) as cnt
      FROM agg_monthly_sales
      WHERE nganh_hang IS NOT NULL
      GROUP BY ten_mien, nganh_hang
      ORDER BY ten_mien, cnt DESC
      LIMIT 30
    `);
    console.table(prodByRegion.rows);

    // Check sellout for region patterns (sellout has correct region)
    console.log('\n=== 📋 Checking sellout region mapping ===\n');
    const selloutRegion = await client.query(`
      SELECT DISTINCT ten_mien, ten_vung, COUNT(*) as cnt
      FROM sellout
      WHERE ten_mien IS NOT NULL
      GROUP BY ten_mien, ten_vung
      ORDER BY cnt DESC
      LIMIT 20
    `);
    console.table(selloutRegion.rows);

    // Check if there's a pattern in ma_npp that indicates region
    console.log('\n=== 📋 Checking ma_npp range patterns ===\n');
    const nppRangeByRegion = await client.query(`
      SELECT 
        ten_mien,
        MIN(CAST(ma_npp AS BIGINT)) as min_val,
        MAX(CAST(ma_npp AS BIGINT)) as max_val,
        COUNT(DISTINCT ma_npp) as unique_npp
      FROM agg_monthly_sales
      WHERE ten_mien NOT IN ('CHƯA PHÂN LOẠI', 'ĐẶC BIỆT')
        AND ma_npp ~ '^[0-9]+$'
      GROUP BY ten_mien
      ORDER BY min_val
    `);
    console.table(nppRangeByRegion.rows);

    // Check agg_sellout_monthly for region patterns
    console.log('\n=== 📋 Checking agg_sellout_monthly ===\n');
    const asmSample = await client.query(`SELECT * FROM agg_sellout_monthly LIMIT 5`);
    console.log(JSON.stringify(asmSample.rows, null, 2));

    const asmRegion = await client.query(`
      SELECT ten_mien, COUNT(*) as cnt
      FROM agg_sellout_monthly
      GROUP BY ten_mien
    `);
    console.table(asmRegion.rows);

    await client.end();
    console.log('\n✅ Analysis complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

findMoreMappings();
