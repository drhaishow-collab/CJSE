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

    // Check dim_customer columns for mapping
    console.log('=== dim_customer columns ===');
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'dim_customer'
      ORDER BY ordinal_position
    `);
    console.log(cols.rows.map(r => r.column_name).join('\n'));

    // Sample dim_customer data
    console.log('\n=== dim_customer sample ===');
    const sample = await client.query(`
      SELECT * FROM dim_customer LIMIT 5
    `);
    console.log(JSON.stringify(sample.rows, null, 2));

    // Check: is there a way to map sellin.sold_to_party to dim_customer for region?
    // Maybe sold_to_party = customer_id?
    console.log('\n=== Check sellin vs dim_customer.customer_id match ===');
    const matchTest = await client.query(`
      SELECT
        COUNT(DISTINCT s.sold_to_party) as sellin_parties,
        COUNT(DISTINCT s.sold_to_party) FILTER (
          WHERE TRIM(s.sold_to_party) IN (SELECT DISTINCT customer_id FROM dim_customer)
        ) as matched_to_customer
      FROM sellin s
      WHERE s.material IS NOT NULL
        AND TRIM(s.material) <> ''
        AND s.billing_date IS NOT NULL
        AND TRIM(s.sold_to_party) ~ '^[0-9]+$'
      LIMIT 1
    `);
    console.table(matchTest.rows);

    // Try: check if there are any other tables that link NPP codes to region
    console.log('\n=== Check saleteam npp info ===');
    const stNpp = await client.query(`
      SELECT DISTINCT ten_npp, ten_mien FROM saleteam
      WHERE ten_npp IS NOT NULL AND ten_npp <> ''
      LIMIT 20
    `);
    console.table(stNpp.rows);

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

check();
