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

    // The key question: do the unmatched 7-digit sold_to_party codes exist in dim_customer?
    console.log('=== Check: Do sellin sold_to_party codes exist in dim_customer? ===');
    const custMatch = await client.query(`
      SELECT
        COUNT(DISTINCT TRIM(s.sold_to_party)) as sellin_party_codes,
        COUNT(DISTINCT TRIM(s.sold_to_party)) FILTER (
          WHERE TRIM(s.sold_to_party) IN (SELECT DISTINCT ma_khach_hang FROM dim_customer)
        ) as matched_to_customer
      FROM sellin s
      WHERE s.sold_to_party IS NOT NULL
        AND s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND s.billing_date IS NOT NULL
    `);
    console.table(custMatch.rows);

    // Check ALL npp columns that might have numeric codes
    console.log('\n=== Check: What unique numeric codes exist in npp table ===');
    const nppCodes = await client.query(`
      SELECT DISTINCT ma_npp::text as code, ten_npp, ten_mien
      FROM npp
      WHERE ma_npp IS NOT NULL
      ORDER BY (ma_npp::text)
      LIMIT 20
    `);
    console.table(nppCodes.rows);

    // Check the SELLIN sold_to_party codes that are 7 digits but NOT in NPP
    // What DO they match?
    console.log('\n=== Check: Unmatched sellin codes - what tables have these numbers? ===');
    const unmatchedCheck = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM (
          SELECT DISTINCT TRIM(s.sold_to_party) as code
          FROM sellin s
          WHERE s.sold_to_party IS NOT NULL
            AND s.material IS NOT NULL
            AND TRIM(s.material) <> ''
            AND s.billing_date IS NOT NULL
            AND LENGTH(TRIM(s.sold_to_party)) = 7
            AND TRIM(s.sold_to_party) NOT IN (SELECT DISTINCT ma_npp::text FROM npp)
          LIMIT 50000
        ) u
        WHERE u.code IN (SELECT DISTINCT ma_khach_hang FROM dim_customer)) as matched_customer
    `);
    console.table(unmatchedCheck.rows);

    // Let's try: check if dim_customer has any numeric columns that match
    console.log('\n=== dim_customer numeric code columns ===');
    const custCodes = await client.query(`
      SELECT ma_khach_hang, ten_khach_hang, mien, ten_vung, ten_tinh
      FROM dim_customer
      WHERE ma_khach_hang ~ '^[0-9]+$'
      LIMIT 20
    `);
    console.table(custCodes.rows);

    // Most important: check if there's a BRANCH or WAREHOUSE table
    console.log('\n=== All tables in sales_db ===');
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log(tables.rows.map(r => r.table_name).join('\n'));

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

check();
