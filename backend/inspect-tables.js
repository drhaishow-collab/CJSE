const { Client } = require('pg');

async function inspect() {
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

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    for (const table of tables) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`).catch(e => ({ rows: [{ count: 'ERROR: ' + e.message }] }));
      console.log(`Table: ${table} - Rows: ${countRes.rows[0].count}`);
      if (countRes.rows[0].count !== '0' && !countRes.rows[0].count.toString().startsWith('ERROR')) {
        const sample = await client.query(`SELECT * FROM "${table}" LIMIT 1`);
        console.log(`Sample from ${table}:`, Object.keys(sample.rows[0]));
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

inspect();
