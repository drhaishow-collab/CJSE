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

  const byType = await c.query(`
    SELECT type, COUNT(*)::int AS cnt, ROUND(SUM(doanh_so))::bigint AS total
    FROM all_sales_data GROUP BY type
  `);
  console.log('all_sales_data:', byType.rows);

  const may2026 = await c.query(`
    SELECT type, COUNT(*)::int AS cnt, ROUND(SUM(doanh_so))::bigint AS total
    FROM all_sales_data WHERE nam = 2026 AND thang = 5 GROUP BY type
  `);
  console.log('2026-05 filter:', may2026.rows);

  const feb2026 = await c.query(`
    SELECT type, COUNT(*)::int AS cnt, ROUND(SUM(doanh_so))::bigint AS total
    FROM all_sales_data WHERE nam = 2026 AND thang = 2 GROUP BY type
  `);
  console.log('2026-02 filter:', feb2026.rows);

  await c.end();
}

run().catch((e) => console.error('DB error:', e.message));
