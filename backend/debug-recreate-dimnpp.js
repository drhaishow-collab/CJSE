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
    console.log('Connected\n');

    // List all tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('Current tables:', tables.rows.map(r => r.table_name).join(', '));

    // Check what dim_npp originally looked like - from saleteam/npp data
    // We can recreate dim_npp from the saleteam data
    console.log('\n=== Can we create dim_npp from saleteam? ===');
    const dimNppRecreate = await client.query(`
      SELECT DISTINCT
        n.ma_npp::int as npp_id,
        n.ten_npp as npp_name,
        COALESCE(n.ten_mien, st.ten_mien) as region,
        COALESCE(n.ten_vung, st.ten_vung) as area,
        COALESCE(n.tinh_npp, st.tinh_npp) as province,
        COALESCE(n.dia_chi_npp, '') as address,
        COALESCE(st.ten_ql_vung, '') as asm_name,
        COALESCE(st.ten_gsbh, '') as sup_name
      FROM npp n
      LEFT JOIN saleteam st ON n.ma_npp::text = st.ma_npp::text
      WHERE n.ma_npp IS NOT NULL
      LIMIT 5
    `);
    console.log(JSON.stringify(dimNppRecreate.rows, null, 2));

    // Check saleteam for distinct npp -> region mapping
    console.log('\n=== saleteam npp -> region ===');
    const stNppRegion = await client.query(`
      SELECT DISTINCT ma_npp, ten_npp, ten_mien, ten_vung
      FROM saleteam
      WHERE ma_npp IS NOT NULL AND ten_npp IS NOT NULL AND ten_npp <> ''
      ORDER BY ten_mien, ten_npp
      LIMIT 20
    `);
    console.table(stNpp.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

check();
