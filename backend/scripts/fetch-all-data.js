/**
 * Build-time data snapshot script.
 * Run BEFORE frontend build to export fresh data from local DB into static JSON.
 * This script is executed on the DEVELOPER'S MACHINE (where the DB lives),
 * not on Vercel's build server.
 *
 * Usage: node fetch-all-data.js
 *
 * The script connects to the local PostgreSQL DB (localhost:5432),
 * fetches all dashboard/report data, and writes it to:
 *   frontend/src/data/snapshot.json
 *
 * Then during frontend build, this snapshot is embedded into the JS bundle.
 * No backend server needed at runtime on Vercel.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load .env from backend directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'sales_db',
  password: process.env.DB_PASSWORD || '123456',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const OUTPUT_DIR = path.join(__dirname, '..', 'frontend', 'src', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'snapshot.json');

async function query(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('\n📦 Build-time Data Snapshot');
  console.log('============================');

  // Test DB connection
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Cannot connect to DB:', err.message);
    console.log('\n💡 Make sure PostgreSQL is running on your machine.');
    console.log('   The DB must be accessible at localhost:5432');
    console.log('   Edit backend/.env to change connection settings.\n');
    process.exit(1);
  }

  const now = new Date();
  const filterYear = now.getFullYear();
  const filterMonth = now.getMonth() + 1;

  const snapshot = {
    generated_at: now.toISOString(),
    filter_year: filterYear,
    filter_month: filterMonth,

    // Dashboard summary + region breakdown
    dashboard: null,

    // Stores with revenue
    stores: [],

    // Recent visits
    visits: [],

    // Users (from saleteam)
    users: [],

    // Reports
    product_report: [],
    sf_report: [],
    sf_trend: [],
    biz_report: [],
  };

  try {
    // 1. Dashboard summary
    console.log('📊 Fetching dashboard...');
    const summaryRows = await query(`
      SELECT
        COALESCE(SUM(revenue), 0)::float8 as total_revenue,
        COUNT(DISTINCT ma_npp) as npp_count,
        COUNT(DISTINCT ma_san_pham) as product_count
      FROM agg_monthly_sales
      WHERE nam = $1 AND thang <= $2
        AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
    `, [filterYear, filterMonth]);

    const regionRows = await query(`
      SELECT ten_mien, COALESCE(SUM(revenue), 0)::float8 as revenue
      FROM agg_monthly_sales
      WHERE nam = $1 AND thang <= $2
        AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      GROUP BY ten_mien
    `, [filterYear, filterMonth]);

    const regionBreakdown = {};
    regionRows.forEach(r => { regionBreakdown[r.ten_mien] = parseFloat(r.revenue) || 0; });

    snapshot.dashboard = {
      summary: {
        totalRevenue: parseFloat(summaryRows[0]?.total_revenue) || 0,
        nppCount: parseInt(summaryRows[0]?.npp_count, 10) || 0,
        productCount: parseInt(summaryRows[0]?.product_count, 10) || 0,
        filterYear,
        filterMonth,
      },
      regionBreakdown,
    };

    // Recent visits
    const visitsRows = await query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY ngay DESC) as id,
        ngay as visit_date,
        ma_nv as user_code,
        ten_nv as user_name,
        ma_npp as store_code,
        ten_npp as store_name,
        tong_khach_hang as customer_count,
        tong_kh_vieng_tham_trong_tuyen as visits_in_route,
        tong_kh_vieng_tham_ngoai_tuyen as visits_out_route,
        tong_thoi_gian_lam_viec as work_time,
        ten_vung as area,
        ten_mien as region,
        'Khách: ' || COALESCE(tong_khach_hang,0) || ', Tuyến: ' || COALESCE(tong_kh_vieng_tham_trong_tuyen,0) || ', Ngoài: ' || COALESCE(tong_kh_vieng_tham_ngoai_tuyen,0) as notes,
        0 as compliance_rate,
        null as check_in_time,
        null as check_out_time,
        null as shelf_image_url
      FROM visit
      ORDER BY ngay DESC
      LIMIT 50
    `);

    snapshot.visits = visitsRows;

    // Stores with revenue
    const storesData = await query(`
      SELECT id, code, name, address, latitude, longitude, channel, region, phone
      FROM stores ORDER BY name
    `);

    const revenueData = await query(`
      SELECT
        ten_vung as zone,
        ten_mien as region,
        SUM(tong_doanh_so)::float8 as total_revenue,
        COUNT(DISTINCT ma_npp) as npp_count,
        COUNT(DISTINCT ma_khach_hang) as customer_count,
        SUM(tong_so_luong) as total_qty
      FROM agg_sellout_monthly
      WHERE nam = $1 AND thang <= $2
      GROUP BY ten_vung, ten_mien
    `, [filterYear, filterMonth]);

    const revenueMap = {};
    revenueData.forEach(r => {
      revenueMap[r.zone] = {
        total_revenue: parseFloat(r.total_revenue) || 0,
        npp_count: parseInt(r.npp_count) || 0,
        customer_count: parseInt(r.customer_count) || 0,
        total_qty: parseInt(r.total_qty) || 0,
      };
    });

    snapshot.stores = storesData.map(s => {
      const zone = s.region || 'HCM';
      const rev = revenueMap[zone] || { total_revenue: 0, npp_count: 0, customer_count: 0, total_qty: 0 };
      return { ...s, ...rev };
    });

    // Users from saleteam
    const usersRows = await query(`
      SELECT DISTINCT ON (st.ma_nv)
        st.ma_quan_ly_vung as manager_code,
        st.ten_ql_vung as manager_name,
        st.ma_gsbh as supervisor_code,
        st.ten_gsbh as supervisor_name,
        st.ma_nv as rep_code,
        st.ten_nhan_vien as rep_name,
        st.ten_mien as region,
        st.ten_vung as area,
        st.office,
        st.ten_npp as distributor,
        'active' as status
      FROM saleteam st
      WHERE st.ma_nv IS NOT NULL AND st.ma_nv != ''
        AND st.ten_nhan_vien IS NOT NULL AND st.ten_nhan_vien != ''
      ORDER BY st.ma_nv, st.ngay_dat_hang DESC
    `);
    snapshot.users = usersRows;

    // Product report
    snapshot.product_report = await query(`
      SELECT nhan_hang as brand, nganh_hang as category, ten_san_pham as product_name,
             SUM(revenue)::float8 as revenue, SUM(quantity)::bigint as quantity
      FROM agg_monthly_sales
      WHERE nam = $1 AND thang <= $2
      GROUP BY nhan_hang, nganh_hang, ten_san_pham
      ORDER BY revenue DESC
      LIMIT 500
    `, [filterYear, filterMonth]);

    // SF performance
    snapshot.sf_report = await query(`
      SELECT ten_nv, ma_nv, ten_vung, ten_mien,
             SUM(tong_doanh_so)::float8 as revenue,
             SUM(tong_khach_hang)::bigint as total_customers,
             SUM(tong_kh_vieng_tham_trong_tuyen)::bigint as route_visits,
             SUM(tong_kh_vieng_tham_ngoai_tuyen)::bigint as extra_visits,
             SUM(tong_thoi_gian_lam_viec)::bigint as work_time
      FROM visit
      WHERE EXTRACT(YEAR FROM ngay) = $1 AND EXTRACT(MONTH FROM ngay) <= $2
      GROUP BY ten_nv, ma_nv, ten_vung, ten_mien
      ORDER BY revenue DESC NULLS LAST
      LIMIT 500
    `, [filterYear, filterMonth]);

    // SF trend
    snapshot.sf_trend = await query(`
      SELECT EXTRACT(MONTH FROM ngay)::int as month, ten_nv, ma_nv,
             SUM(tong_khach_hang)::bigint as total_customers,
             SUM(tong_kh_vieng_tham_trong_tuyen)::bigint as route_visits,
             SUM(tong_kh_vieng_tham_ngoai_tuyen)::bigint as extra_visits
      FROM visit
      WHERE EXTRACT(YEAR FROM ngay) = $1 AND EXTRACT(MONTH FROM ngay) <= $2
      GROUP BY EXTRACT(MONTH FROM ngay), ten_nv, ma_nv
      ORDER BY month, ten_nv
    `, [filterYear, filterMonth]);

    // Biz report
    snapshot.biz_report = await query(`
      SELECT ten_mien, ten_vung, ma_npp, ten_npp,
             SUM(tong_doanh_so)::float8 as total_revenue,
             SUM(tong_so_luong)::bigint as total_qty,
             COUNT(DISTINCT ma_khach_hang)::bigint as customer_count
      FROM agg_sellout_monthly
      WHERE nam = $1 AND thang <= $2
      GROUP BY ten_mien, ten_vung, ma_npp, ten_npp
      ORDER BY total_revenue DESC
      LIMIT 500
    `, [filterYear, filterMonth]);

    console.log(`   Dashboard: ${snapshot.dashboard.summary.totalRevenue.toLocaleString()} revenue`);
    console.log(`   Visits: ${snapshot.visits.length} records`);
    console.log(`   Stores: ${snapshot.stores.length} records`);
    console.log(`   Users: ${snapshot.users.length} records`);
    console.log(`   Product report: ${snapshot.product_report.length} rows`);
    console.log(`   SF report: ${snapshot.sf_report.length} rows`);
    console.log(`   SF trend: ${snapshot.sf_trend.length} rows`);
    console.log(`   Biz report: ${snapshot.biz_report.length} rows`);

  } catch (err) {
    console.error('❌ Fetch error:', err.message);
    await pool.end();
    process.exit(1);
  }

  // Write to file
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`\n✅ Snapshot written to: ${path.relative(__dirname, OUTPUT_FILE)}`);

  await pool.end();
  console.log('\n📌 Done! Data snapshot is ready.');
  console.log('   Commit & push to trigger Vercel deployment:');
  console.log('   git add . && git commit -m "Update data snapshot $(date +%Y-%m-%d)" && git push\n');
}

main();
