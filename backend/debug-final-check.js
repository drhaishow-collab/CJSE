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

    // Check: can fact_sellin.ma_npp link to dim_territory?
    // First check if dim_territory has province mapping for the warehouse codes
    console.log('=== fact_sellin.ma_npp vs dim_territory ===');
    const fsTerr = await client.query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE dt.ten_mien IS NOT NULL) as matched
      FROM fact_sellin fs
      LEFT JOIN dim_territory dt ON fs.ma_npp = dt.ma_tinh
      LIMIT 1
    `);
    console.table(fsTerr.rows);

    // Try matching via customer table's ma_nha_phan_phoi
    console.log('\n=== fact_sellin.ma_npp vs customer.ma_nha_phan_phoi ===');
    const fsCust = await client.query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE c.mien IS NOT NULL) as matched
      FROM fact_sellin fs
      LEFT JOIN customer c ON fs.ma_npp = c.ma_nha_phan_phoi
      LIMIT 1
    `);
    console.table(fsCust.rows);

    // Check if fact_sellin has same ma_npp range as customer
    console.log('\n=== customer.ma_nha_phan_phoi range ===');
    const nhappRange = await client.query(`
      SELECT
        MIN(CAST(ma_nha_phan_phoi AS INT)) as min_val,
        MAX(CAST(ma_nha_phan_phoi AS INT)) as max_val,
        COUNT(DISTINCT ma_nha_phan_phoi) as unique_count
      FROM customer
      WHERE ma_nha_phan_phoi ~ '^[0-9]+$'
    `);
    console.table(nhappRange.rows);

    // Check: fact_sellin.ma_npp range
    console.log('\n=== fact_sellin.ma_npp range ===');
    const fsRange = await client.query(`
      SELECT
        MIN(CAST(ma_npp AS INT)) as min_val,
        MAX(CAST(ma_npp AS INT)) as max_val,
        COUNT(DISTINCT ma_npp) as unique_count
      FROM fact_sellin
    `);
    console.table(fsRange.rows);

    // Sample fact_sellin.ma_npp values
    console.log('\n=== fact_sellin ma_npp sample ===');
    const fsSample = await client.query(`
      SELECT DISTINCT ma_npp, ten_npp, COUNT(*) as cnt
      FROM fact_sellin
      GROUP BY ma_npp, ten_npp
      ORDER BY cnt DESC
      LIMIT 20
    `);
    console.table(fsSample.rows);

    // Check: can we use ten_npp (warehouse name) to determine region?
    // The warehouse names contain province info like "Việt Trì" (Phú Thọ = MIỀN BẮC)
    // Or "HCM" (MIỀN NAM)
    console.log('\n=== Sample warehouse names ===');
    const warehouseSample = await client.query(`
      SELECT DISTINCT ma_npp, ten_npp
      FROM fact_sellin
      LIMIT 20
    `);
    console.table(warehouseSample.rows);

    // The KEY approach: use a REGION MAPPING based on warehouse prefix/codes
    // Or better: check dim_npp - it has warehouse codes mapped to region
    console.log('\n=== dim_npp current data ===');
    const dimNppNow = await client.query(`SELECT * FROM dim_npp LIMIT 10`);
    console.table(dimNppNow.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
