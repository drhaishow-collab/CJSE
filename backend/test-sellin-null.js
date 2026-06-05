const { Client } = require('pg');
(async () => {
  const c = new Client({ user: 'postgres', password: '123456', host: 'localhost', port: 5432, database: 'sales_db' });
  await c.connect();

  const r = await c.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(doanh_so)::int AS has_doanh_so,
      COUNT(*) FILTER (WHERE doanh_so > 0)::int AS positive,
      COUNT(*) FILTER (WHERE doanh_so < 0)::int AS negative,
      COUNT(*) FILTER (WHERE doanh_so = 0)::int AS zero
    FROM all_sales_data WHERE type = 'Sellin'
  `);
  console.log('Sellin doanh_so stats:', r.rows[0]);

  const sample = await c.query(`
    SELECT nam, thang, doanh_so, ma_npp, ma_san_pham
    FROM all_sales_data WHERE type = 'Sellin' AND doanh_so IS NOT NULL
    LIMIT 5
  `);
  console.log('Samples with doanh_so:', sample.rows);

  const src = await c.query(`
    SELECT COUNT(*)::int AS total,
           COUNT(sum_of_billing_net_amt)::int AS has_amt,
           pg_typeof(sum_of_billing_net_amt) AS col_type
    FROM sellin
    WHERE material IS NOT NULL AND TRIM(material) <> '' AND TRIM(material) <> 'Grand Total'
  `);
  console.log('Source sellin table:', src.rows[0]);

  const srcSample = await c.query(`
    SELECT billing_date, sum_of_billing_net_amt, material
    FROM sellin WHERE sum_of_billing_net_amt IS NOT NULL LIMIT 3
  `);
  console.log('Source samples:', srcSample.rows);

  await c.end();
})();
