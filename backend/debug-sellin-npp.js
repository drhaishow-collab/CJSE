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

    // Check sellin vs npp match
    const matchCheck = await client.query(`
      SELECT
        COUNT(*) as total_sellin_rows,
        COUNT(*) FILTER (WHERE sold_to_party IS NULL) as null_party,
        COUNT(*) FILTER (WHERE TRIM(sold_to_party) IN (SELECT TRIM(ma_npp::text) FROM npp)) as matched_npp
      FROM sellin
      WHERE material IS NOT NULL
        AND TRIM(material) <> ''
        AND TRIM(material) <> 'Grand Total'
        AND billing_date IS NOT NULL
    `);
    console.log('=== Sellin NPP Matching ===');
    console.table(matchCheck.rows);

    // Check sample sellin records that are 'Khác'
    console.log('\n=== Sample sellin with NULL/Different sold_to_party ===');
    const sampleBad = await client.query(`
      SELECT s.sold_to_party, s.sold_to_name, COUNT(*) as cnt
      FROM sellin s
      WHERE material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND TRIM(s.material) <> 'Grand Total'
        AND s.billing_date IS NOT NULL
        AND TRIM(s.sold_to_party) NOT IN (SELECT TRIM(ma_npp::text) FROM npp)
      GROUP BY s.sold_to_party, s.sold_to_name
      ORDER BY cnt DESC
      LIMIT 20
    `);
    console.table(sampleBad.rows);

    // Check if sold_to_party exists in saleteam
    console.log('\n=== Sample sold_to_party in sellin ===');
    const sampleParty = await client.query(`
      SELECT DISTINCT sold_to_party, sold_to_name
      FROM sellin
      WHERE material IS NOT NULL
        AND TRIM(material) <> ''
        AND billing_date IS NOT NULL
      LIMIT 20
    `);
    console.table(sampleParty.rows);

    // Check npp ma_npp values
    console.log('\n=== Sample NPP ma_npp values ===');
    const nppSamples = await client.query(`
      SELECT ma_npp, ten_npp, ten_mien
      FROM npp
      LIMIT 20
    `);
    console.table(nppSamples.rows);

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

check();
