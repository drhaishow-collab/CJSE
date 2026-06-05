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

    // Check why sellin length-7 doesn't match npp
    console.log('=== Sellin sold_to_party by length - with NPP match status ===');
    const byLen = await client.query(`
      SELECT
        LENGTH(TRIM(sold_to_party)) as len,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE TRIM(sold_to_party)::int IN (SELECT ma_npp FROM npp)) as matched_npp
      FROM sellin
      WHERE sold_to_party IS NOT NULL
        AND TRIM(sold_to_party) ~ '^[0-9]+$'
        AND material IS NOT NULL
        AND TRIM(material) <> ''
        AND TRIM(material) <> 'Grand Total'
        AND billing_date IS NOT NULL
      GROUP BY LENGTH(TRIM(sold_to_party))
      ORDER BY len
    `);
    console.table(byLen.rows);

    // Sample length-5 sold_to_party values
    console.log('\n=== Sample length-5 sold_to_party ===');
    const sampleLen5 = await client.query(`
      SELECT DISTINCT sold_to_party, sold_to_name, COUNT(*) as cnt
      FROM sellin
      WHERE sold_to_party IS NOT NULL
        AND LENGTH(TRIM(sold_to_party)) = 5
        AND material IS NOT NULL
        AND billing_date IS NOT NULL
      GROUP BY sold_to_party, sold_to_name
      LIMIT 20
    `);
    console.table(sampleLen5.rows);

    // Sample length-7 sold_to_party NOT in npp
    console.log('\n=== Sample length-7 sold_to_party NOT in npp ===');
    const sampleLen7Bad = await client.query(`
      SELECT DISTINCT s.sold_to_party, s.sold_to_name, COUNT(*) as cnt
      FROM sellin s
      WHERE sold_to_party IS NOT NULL
        AND LENGTH(TRIM(s.sold_to_party)) = 7
        AND TRIM(s.sold_to_party)::int NOT IN (SELECT ma_npp FROM npp)
        AND s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND s.billing_date IS NOT NULL
      GROUP BY s.sold_to_party, s.sold_to_name
      ORDER BY cnt DESC
      LIMIT 20
    `);
    console.table(sampleLen7Bad.rows);

    // Sample npp ma_npp values that ARE matched
    console.log('\n=== NPP ma_npp sample (length 7) ===');
    const nppLen7 = await client.query(`
      SELECT DISTINCT ma_npp, ten_npp, ten_mien
      FROM npp
      WHERE LENGTH(CAST(ma_npp AS TEXT)) = 7
      LIMIT 20
    `);
    console.table(nppLen7.rows);

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

check();
