const { Client } = require('pg');

async function run() {
  const c = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });
  await c.connect();

  const regions = await c.query(`
    SELECT COALESCE(mien, 'NULL') AS region, type, COUNT(*)::int AS cnt,
           ROUND(SUM(doanh_so))::bigint AS total
    FROM all_sales_data
    WHERE type = 'Sellin' AND nam = 2026 AND thang = 5
    GROUP BY mien, type
    ORDER BY cnt DESC
    LIMIT 10
  `);
  console.log('Sellin May 2026 by region:', regions.rows);

  const allReg = await c.query(`
    SELECT COALESCE(mien, 'NULL') AS region, COUNT(*)::int AS cnt
    FROM all_sales_data WHERE type = 'Sellin'
    GROUP BY mien ORDER BY cnt DESC LIMIT 10
  `);
  console.log('All sellin by region:', allReg.rows);

  const months = await c.query(`
    SELECT nam, thang, COUNT(*)::int AS cnt, ROUND(SUM(doanh_so))::bigint AS total
    FROM all_sales_data WHERE type = 'Sellin'
    GROUP BY nam, thang ORDER BY nam, thang
  `);
  console.log('Sellin by month:', months.rows);

  await c.end();
}

run().catch(console.error);
