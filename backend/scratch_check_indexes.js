const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });

  try {
    await client.connect();
    console.log('✅ Connected');

    const res = await client.query(`
      SELECT
          t.relname as table_name,
          i.relname as index_name,
          a.attname as column_name
      FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
      WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relname = 'all_sales_data'
      ORDER BY
          t.relname,
          i.relname
    `);
    console.log('Indexes on all_sales_data:');
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
