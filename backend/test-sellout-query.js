const { Client } = require('pg');

async function test() {
  const client = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });

  try {
    await client.connect();
    console.log('✅ Connected to sales_db');

    console.log('1. Testing original query using fact_sellout view...');
    console.time('original');
    try {
      const res = await client.query(`
        SELECT 
          staff_id, 
          SUM(revenue) as sales, 
          COUNT(DISTINCT ma_kh) as buying_outlets, 
          COUNT(DISTINCT (date_key, ma_kh)) as transactions, 
          SUM(sku_count) as sku_sum
        FROM (
          SELECT date_key, ma_kh, staff_id, SUM(revenue) as revenue, COUNT(DISTINCT product_id) as sku_count
          FROM fact_sellout
          WHERE EXTRACT(YEAR FROM date_key) = $1 AND EXTRACT(MONTH FROM date_key) = $2
          GROUP BY date_key, ma_kh, staff_id
        ) sub
        GROUP BY staff_id
      `, [2026, 5]);
      console.log(`Original: found ${res.rows.length} rows.`);
    } catch (e) {
      console.error('Original failed:', e.message);
    }
    console.timeEnd('original');

    console.log('\n2. Testing optimized query using sellout table directly...');
    console.time('optimized');
    try {
      const res = await client.query(`
        SELECT 
          staff_id, 
          SUM(revenue) as sales, 
          COUNT(DISTINCT ma_kh) as buying_outlets, 
          COUNT(*) as transactions, 
          SUM(sku_sum) as sku_sum
        FROM (
          SELECT 
            ngay_dat_hang, 
            ma_kh, 
            ma_nv as staff_id, 
            SUM(doanh_so_sau_ck_vat) as revenue, 
            COUNT(DISTINCT ma_san_pham) as sku_sum
          FROM sellout
          WHERE nam = $1::text AND thang = $2::text
          GROUP BY ngay_dat_hang, ma_kh, ma_nv
        ) sub
        GROUP BY staff_id
      `, ['2026', '26-05']);
      console.log(`Optimized query rows: ${res.rows.length}. First row transactions: ${res.rows[0]?.transactions}, sales: ${res.rows[0]?.sales}`);
    } catch (e) {
      console.error('Optimized failed:', e.message);
    }
    console.timeEnd('optimized');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

test();
