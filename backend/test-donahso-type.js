const { Client } = require('pg');
(async () => {
  const c = new Client({ user: 'postgres', password: '123456', host: 'localhost', port: 5432, database: 'sales_db' });
  await c.connect();
  const t = await c.query(`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'all_sales_data' AND column_name = 'doanh_so'
  `);
  console.log('doanh_so column type:', t.rows[0]);

  const s = await c.query(`
    SELECT SUM(doanh_so) AS sm1, COUNT(doanh_so) AS cnt, MIN(doanh_so) AS minv, MAX(doanh_so) AS maxv
    FROM all_sales_data WHERE type = 'Sellin' AND nam = 2025 AND thang = 1
  `);
  console.log('Sellin sum test:', s.rows[0]);

  const s3 = await c.query(`
    SELECT SUM(doanh_so) AS sm
    FROM all_sales_data WHERE type = 'Sellout' AND nam = 2026 AND thang = 2
  `);
  console.log('Sellout sum test:', s3.rows[0]);

  const bad = await c.query(`
    SELECT COUNT(*)::int AS cnt FROM all_sales_data
    WHERE type = 'Sellin' AND doanh_so IS NULL
  `);
  const textish = await c.query(`
    SELECT doanh_so FROM all_sales_data
    WHERE type = 'Sellin' AND doanh_so::text ~ '[^0-9.]'
    LIMIT 5
  `);
  console.log('Sellin null doanh_so:', bad.rows[0].cnt);
  console.log('Non-numeric samples:', textish.rows);

  await c.end();
})();
