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
    console.log('✅ Connected');

    const res = await client.query(`
      SELECT EXTRACT(YEAR FROM ngay) as yr, EXTRACT(MONTH FROM ngay) as mo, COUNT(*) 
      FROM visit 
      GROUP BY yr, mo 
      ORDER BY yr DESC, mo DESC
    `);
    console.log('Years and Months in visit:');
    console.log(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
