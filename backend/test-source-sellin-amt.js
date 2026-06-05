const { Client } = require('pg');
(async () => {
  const c = new Client({ user: 'postgres', password: '123456', host: 'localhost', port: 5432, database: 'sales_db' });
  await c.connect();

  const cols = await c.query(`
    SELECT column_name, data_type
    FROM information_schema.columns WHERE table_name = 'sellin'
  `);
  console.log('sellin columns:', cols.rows);

  const stats = await c.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(sum_of_billing_net_amt)::int AS non_null,
      COUNT(*) FILTER (WHERE sum_of_billing_net_amt::text ~ '^-?[0-9.]+$')::int AS numeric_like
    FROM sellin
    WHERE material IS NOT NULL AND TRIM(material) <> '' AND TRIM(material) <> 'Grand Total'
  `);
  console.log('Amount stats:', stats.rows[0]);

  const castTest = await c.query(`
    SELECT
      COUNT(*) FILTER (WHERE CAST(sum_of_billing_net_amt AS NUMERIC) IS NULL)::int AS cast_null,
      COUNT(*) FILTER (WHERE CAST(sum_of_billing_net_amt AS NUMERIC) IS NOT NULL)::int AS cast_ok
    FROM sellin
    WHERE material IS NOT NULL AND TRIM(material) <> '' AND TRIM(material) <> 'Grand Total'
  `);
  console.log('CAST to numeric:', castTest.rows[0]);

  const bad = await c.query(`
    SELECT sum_of_billing_net_amt, billing_date, material
    FROM sellin
    WHERE material IS NOT NULL AND TRIM(material) <> 'Grand Total'
      AND CAST(sum_of_billing_net_amt AS NUMERIC) IS NULL
    LIMIT 8
  `);
  console.log('CAST fails samples:', bad.rows);

  const good = await c.query(`
    SELECT sum_of_billing_net_amt, billing_date, material
    FROM sellin
    WHERE CAST(sum_of_billing_net_amt AS NUMERIC) IS NOT NULL
    LIMIT 3
  `);
  console.log('CAST ok samples:', good.rows);

  await c.end();
})();
