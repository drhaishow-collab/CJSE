require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'sales_db',
  password: process.env.DB_PASSWORD || '123456',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function check() {
  try {
    // Check distinct nam values in agg_monthly_sales
    const r1 = await pool.query("SELECT DISTINCT nam FROM agg_monthly_sales ORDER BY nam");
    console.log("=== agg_monthly_sales - distinct nam ===");
    console.log(r1.rows.map(r => r.nam));

    // Check distinct nam values in agg_sellout_monthly
    const r2 = await pool.query("SELECT DISTINCT nam FROM agg_sellout_monthly ORDER BY nam");
    console.log("\n=== agg_sellout_monthly - distinct nam ===");
    console.log(r2.rows.map(r => r.nam));

    // Check data types of nam column
    const r3 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('agg_monthly_sales', 'agg_sellout_monthly') 
        AND column_name IN ('nam', 'thang')
      ORDER BY table_name, column_name
    `);
    console.log("\n=== Column types for nam/thang ===");
    r3.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

    // Check ten_vung distinct values in agg_sellout_monthly
    const r4 = await pool.query("SELECT DISTINCT ten_vung FROM agg_sellout_monthly ORDER BY ten_vung LIMIT 20");
    console.log("\n=== agg_sellout_monthly - distinct ten_vung ===");
    console.log(r4.rows.map(r => r.ten_vung));

    // Check ten_mien distinct values
    const r5 = await pool.query("SELECT DISTINCT ten_mien FROM agg_sellout_monthly ORDER BY ten_mien");
    console.log("\n=== agg_sellout_monthly - distinct ten_mien ===");
    console.log(r5.rows.map(r => r.ten_mien));

    // Check stores table region values
    const r6 = await pool.query("SELECT DISTINCT region FROM stores ORDER BY region");
    console.log("\n=== stores - distinct region ===");
    console.log(r6.rows.map(r => r.region));

    // Check sample sellout data with revenue
    const r7 = await pool.query("SELECT ten_vung, ten_mien, SUM(tong_doanh_so) as rev FROM agg_sellout_monthly GROUP BY ten_vung, ten_mien ORDER BY rev DESC LIMIT 10");
    console.log("\n=== agg_sellout_monthly - top 10 by revenue ===");
    r7.rows.forEach(r => console.log(`${r.ten_vung} | ${r.ten_mien} | ${Number(r.rev).toLocaleString()}`));

    // Check if reportYear=2026 and month=6 returns data
    const r8 = await pool.query("SELECT COUNT(*) as cnt, SUM(revenue) as rev FROM agg_monthly_sales WHERE nam = '2026'");
    console.log("\n=== agg_monthly_sales where nam='2026' ===");
    console.log(`count: ${r8.rows[0].cnt}, revenue: ${Number(r8.rows[0].rev || 0).toLocaleString()}`);

    const r8b = await pool.query("SELECT COUNT(*) as cnt, SUM(revenue) as rev FROM agg_monthly_sales WHERE nam = '2025'");
    console.log("\n=== agg_monthly_sales where nam='2025' ===");
    console.log(`count: ${r8b.rows[0].cnt}, revenue: ${Number(r8b.rows[0].rev || 0).toLocaleString()}`);

    // Check if product report returns data
    const r9 = await pool.query("SELECT COUNT(*) as cnt FROM agg_monthly_sales WHERE nam = $1 AND thang <= $2", [2025, 5]);
    console.log("\n=== product report query (nam=2025, thang<=5) ===");
    console.log(`Matching rows with INTEGER params: ${r9.rows[0].cnt}`);

    const r9b = await pool.query("SELECT COUNT(*) as cnt FROM agg_monthly_sales WHERE nam = $1 AND thang <= $2", ['2025', '5']);
    console.log(`Matching rows with STRING params: ${r9b.rows[0].cnt}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
