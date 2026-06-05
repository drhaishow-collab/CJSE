const { Client } = require('pg');

async function test() {
  const client = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });

  try {
    await client.connect();
    console.log('✅ Connected to sales_db');

    const res = await client.query(`
      SELECT nganh_hang, nhom_sp, phan_nhom_sp, count(*), sum(doanh_so) as sales
      FROM all_sales_data
      GROUP BY nganh_hang, nhom_sp, phan_nhom_sp
      ORDER BY sales DESC
      LIMIT 10
    `);
    console.log('Sample hierarchy groups:');
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

test();
