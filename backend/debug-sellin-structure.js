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

    // Check npp table structure
    console.log('=== NPP columns ===');
    const nppCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'npp'
      ORDER BY ordinal_position
    `);
    console.table(nppCols.rows);

    // Check all unique npp ma_npp values and their type
    console.log('\n=== NPP ma_npp sample ===');
    const nppSample = await client.query(`
      SELECT ma_npp, ten_npp, ten_mien, ten_vung
      FROM npp
      LIMIT 20
    `);
    console.table(nppSample.rows);

    // Check if there are multiple ma_npp formats
    console.log('\n=== NPP ma_npp value length distribution ===');
    const nppLen = await client.query(`
      SELECT LENGTH(CAST(ma_npp AS TEXT)) as len, COUNT(*) as cnt
      FROM npp
      GROUP BY LENGTH(CAST(ma_npp AS TEXT))
      ORDER BY len
    `);
    console.table(nppLen.rows);

    // Check sellin sold_to_party value length
    console.log('\n=== Sellin sold_to_party value length distribution ===');
    const sellinLen = await client.query(`
      SELECT LENGTH(TRIM(sold_to_party)) as len, COUNT(*) as cnt
      FROM sellin
      WHERE sold_to_party IS NOT NULL
      GROUP BY LENGTH(TRIM(sold_to_party))
      ORDER BY len
    `);
    console.table(sellinLen.rows);

    // Check if there are records where sold_to_party matches ma_kh (customer) instead
    console.log('\n=== Check if sold_to_party matches ma_kh from other tables ===');
    const matchCheck = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE TRIM(s.sold_to_party)::int IN (SELECT ma_kh FROM customer)) as in_customer,
        COUNT(*) FILTER (WHERE TRIM(s.sold_to_party)::int IN (SELECT ma_npp FROM npp)) as in_npp
      FROM sellin s
      WHERE s.sold_to_party IS NOT NULL
        AND TRIM(s.sold_to_party) ~ '^[0-9]+$'
        AND s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND s.billing_date IS NOT NULL
    `);
    console.table(matchCheck.rows);

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

check();
