const { Client } = require('pg');

(async () => {
  const c = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });
  await c.connect();

  const result = await c.query(`
    SELECT type, nam as year, thang as month, mien as region,
           SUM(doanh_so) as sales
    FROM all_sales_data asd
    WHERE asd.nam IN (2025, 2026) AND asd.thang <= 2
      AND type = 'Sellin'
    GROUP BY type, nam, thang, mien
    ORDER BY sales DESC NULLS LAST
    LIMIT 5
  `);
  console.log('SQL sample:', result.rows);
  console.log('Field types:', result.fields.map((f) => `${f.name}:${f.dataTypeID}`));

  const raw = await c.query(`
    SELECT doanh_so FROM all_sales_data WHERE type='Sellin' AND doanh_so > 0 LIMIT 3
  `);
  console.log('Raw doanh_so:', raw.rows);

  await c.end();
})();
