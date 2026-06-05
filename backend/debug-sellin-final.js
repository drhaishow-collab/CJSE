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

    // Check if sellin records use different npp codes (maybe ma_kh = customer code?)
    console.log('=== Checking customer table ===');
    const customerCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'customer'
      ORDER BY ordinal_position
    `);
    console.log('Customer columns:', customerCols.rows.map(r => r.column_name).join(', '));

    // Check ma_kh vs ma_npp overlap
    const overlap = await client.query(`
      SELECT
        (SELECT COUNT(DISTINCT ma_kh::text) FROM customer) as customer_codes,
        (SELECT COUNT(DISTINCT ma_npp::text) FROM npp) as npp_codes,
        (SELECT COUNT(*) FROM (
          SELECT DISTINCT TRIM(sold_to_party) as code FROM sellin LIMIT 100000
        ) s WHERE s.code IN (SELECT DISTINCT ma_kh::text FROM customer)) as matched_to_customer
    `);
    console.table(overlap.rows);

    // Try: check if sold_to_party in sellin might actually be customer codes
    console.log('\n=== Sample customer codes ===');
    const custSample = await client.query(`
      SELECT customer_id, customer_name, province, channel, staff_id
      FROM dim_customer
      LIMIT 20
    `);
    console.table(custSample.rows);

    // Check if npp codes appear in customer
    console.log('\n=== Check NPP vs Customer overlap ===');
    const nppVsCust = await client.query(`
      SELECT
        (SELECT COUNT(DISTINCT ma_npp::text) FROM npp) as total_npp,
        (SELECT COUNT(DISTINCT TRIM(sold_to_party)) FROM sellin s
         WHERE TRIM(s.sold_to_party) IN (SELECT DISTINCT ma_npp::text FROM npp)) as sellin_matching_npp
    `);
    console.table(nppVsCust.rows);

    // Check: what % of all_sales_data rows are 'Khác' broken by type
    console.log('\n=== all_sales_data breakdown by type and mien ===');
    const breakdown = await client.query(`
      SELECT type, mien, COUNT(*) as cnt
      FROM all_sales_data
      GROUP BY type, mien
      ORDER BY type, cnt DESC
    `);
    console.table(breakdown.rows);

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

check();
