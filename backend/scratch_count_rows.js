const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: 'postgres',
    password: '123456',
    host: 'localhost',
    port: 5432,
    database: 'sales_db',
  });
  await client.connect();

  console.log('Querying visit columns...');
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'visit' AND column_name LIKE '%doanh%'
  `);
  console.log('Visit Columns matching "doanh":', cols.rows);

  await client.end();
}

run().catch(console.error);
