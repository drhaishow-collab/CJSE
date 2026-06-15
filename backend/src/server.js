require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query, ensureDbConnectionState, getDbStatus } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database connection is managed automatically by the pg pool.
// We removed ensureDbConnectionState middleware here to prevent opening redundant connections on every API call,
// which saves hundreds of milliseconds per request on Serverless environments.

// API STATUS
app.get('/api/status', (req, res) => {
  const dbStatus = getDbStatus();
  res.json({ 
    status: 'ONLINE', 
    database: dbStatus.isConnected ? 'CONNECTED' : 'NOT_CONNECTED', 
    error: dbStatus.lastError,
    host: dbStatus.host,
    timestamp: new Date() 
  });
});

// GET DASHBOARD - REAL DATA
app.get('/api/dashboard', async (req, res) => {
  const { year, month , userRole, userCode} = req.query;
  const authFilter = (userCode && userCode !== "SE") ? " AND (ten_vung ILIKE \'%Mekong%\' OR ten_vung ILIKE \'%MTAY%\' OR ten_vung ILIKE \'%Cần Thơ%\' OR ten_vung = \'Cần Thơ\')" : "";
  const now = new Date();
  const filterYear = year ? parseInt(year, 10) : now.getFullYear();
  const filterMonth = month ? parseInt(month, 10) : now.getMonth() + 1;

  console.log(`GET /api/dashboard?year=${filterYear}&month=${filterMonth}`);

  try {
    const summaryRes = await query(`
      SELECT 
        COALESCE(SUM(revenue), 0) as total_revenue,
        COUNT(DISTINCT ma_npp) as npp_count,
        COUNT(DISTINCT ma_san_pham) as product_count
      FROM agg_monthly_sales
      WHERE 1=1 ${authFilter}
    `);

    const summary = {
      totalRevenue: parseFloat(summaryRes.rows[0].total_revenue) || 0,
      nppCount: parseInt(summaryRes.rows[0].npp_count, 10) || 0,
      productCount: parseInt(summaryRes.rows[0].product_count, 10) || 0,
      filterYear,
      filterMonth,
    };

    const regionRes = await query(`
      SELECT ten_mien, COALESCE(SUM(revenue), 0) as revenue
      FROM agg_monthly_sales
      WHERE 1=1 ${authFilter}
      GROUP BY ten_mien
    `);

    const regionBreakdown = {};
    regionRes.rows.forEach(r => { regionBreakdown[r.ten_mien] = parseFloat(r.revenue) || 0; });

    const visitsRes = await query(`
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
        ten_mien as region
      FROM visit
      WHERE 1=1 ${authFilter}
      ORDER BY ngay DESC
      LIMIT 10
    `);

    const recentVisits = visitsRes.rows.map(r => ({
      id: parseInt(r.id, 10) || 0,
      store_name: r.store_name || 'N/A',
      store_code: r.store_code || 'N/A',
      user_name: r.user_name || 'N/A',
      visit_date: r.visit_date,
      compliance_rate: 0,
      notes: `Khách: ${r.customer_count || 0}, Tuyến: ${r.visits_in_route || 0}, Ngoài: ${r.visits_out_route || 0}`
    }));

    console.log('Dashboard:', { summary: summary.totalRevenue, npp: summary.nppCount });

    res.json({ summary, regionBreakdown, recentVisits });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET ALL NPP
app.get('/api/npp', async (req, res) => {
  try {
    const data = await query('SELECT ma_npp, ten_npp, ten_vung, ten_mien FROM npp ORDER BY ten_npp');
    res.json(data.rows);
  } catch (err) {
    console.error('NPP error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const data = await query('SELECT ma_san_pham, ten_san_pham, nganh_hang, nhan_hang FROM product ORDER BY ten_san_pham');
    res.json(data.rows);
  } catch (err) {
    console.error('Products error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET USERS - REAL DATA from users table
app.get('/api/users-management', async (req, res) => {
  try {
    const data = await query(`
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
      WHERE st.ma_nv IS NOT NULL
        AND st.ma_nv != ''
        AND st.ten_nhan_vien IS NOT NULL
        AND st.ten_nhan_vien != ''
      ORDER BY st.ma_nv, st.ngay_dat_hang DESC
    `);

    if (data.rows.length === 0) {
      const fallback = await query(`
        SELECT
          '' as manager_code,
          'ASM' as manager_name,
          '' as supervisor_code,
          'GSBH' as supervisor_name,
          username as rep_code,
          full_name as rep_name,
          CASE WHEN role = 'admin' THEN 'ALL' ELSE 'MIỀN NAM' END as region,
          'HCM' as area,
          'HCM 1' as office,
          '' as distributor,
          CASE WHEN active THEN 'active' ELSE 'inactive' END as status
        FROM users
        ORDER BY full_name
      `);
      res.json(fallback.rows);
      return;
    }

    res.json(data.rows);
  } catch (err) {
    console.error('Users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET STORES
// GET STORES / DIEM BAN — enriched with sellout revenue from agg_sellout_monthly
app.get('/api/stores', async (req, res) => {
  try {
    const { year = '2026', month = '5', region , userRole, userCode} = req.query;
  const authFilter = (userCode && userCode !== "SE") ? " AND (ten_vung ILIKE \'%Mekong%\' OR ten_vung ILIKE \'%MTAY%\' OR ten_vung ILIKE \'%Cần Thơ%\' OR ten_vung = \'Cần Thơ\')" : "";
    const filterRegion = region ? `AND ten_mien = '${region}'` : '';

    const storesData = await query(`
      SELECT id, code, name, address, latitude, longitude, channel, region, phone
      FROM stores ORDER BY name
    `);

    const revenueData = await query(`
      SELECT
        ten_vung as zone,
        ten_mien as region,
        SUM(tong_doanh_so) as total_revenue,
        COUNT(DISTINCT ma_npp) as npp_count,
        COUNT(DISTINCT ma_khach_hang) as customer_count,
        SUM(tong_so_luong) as total_qty
      FROM agg_sellout_monthly
      WHERE nam = '${year}' AND thang <= ${month} ${filterRegion}
      GROUP BY ten_vung, ten_mien
      ORDER BY total_revenue DESC
    `);

    const monthlyTrend = await query(`
      SELECT
        ten_vung as zone,
        thang,
        SUM(tong_doanh_so) as monthly_revenue
      FROM agg_sellout_monthly
      WHERE nam = '${year}' ${filterRegion}
      GROUP BY ten_vung, thang
      ORDER BY ten_vung, thang
    `);

    const revenueMap = {};
    revenueData.rows.forEach((r) => {
      revenueMap[r.zone] = {
        total_revenue: parseFloat(r.total_revenue) || 0,
        npp_count: parseInt(r.npp_count) || 0,
        customer_count: parseInt(r.customer_count) || 0,
        total_qty: parseInt(r.total_qty) || 0,
      };
    });

    const trendMap = {};
    monthlyTrend.rows.forEach((r) => {
      const thang = parseInt(r.thang);
      if (!trendMap[r.zone]) trendMap[r.zone] = {};
      trendMap[r.zone][thang] = parseFloat(r.monthly_revenue) || 0;
    });

    const enriched = storesData.rows.map((s) => {
      const zone = s.region || 'HCM';
      const rev = revenueMap[zone] || { total_revenue: 0, npp_count: 0, customer_count: 0, total_qty: 0 };
      return {
        ...s,
        revenue: rev.total_revenue,
        npp_count: rev.npp_count,
        customer_count: rev.customer_count,
        total_qty: rev.total_qty,
        monthly_trend: trendMap[zone] || {},
      };
    });

    res.json({ stores: enriched });
  } catch (err) {
    console.error('Stores error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET VISITS - REAL DATA from visit table
app.get('/api/visits', async (req, res) => {
  try {
    const data = await query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY ngay DESC) as id,
        ten_npp as store_name,
        ma_npp as store_code,
        ten_nv as user_name,
        ngay as visit_date,
        null as check_in_time,
        null as check_out_time,
        0 as compliance_rate,
        ('Khách: ' || COALESCE(tong_khach_hang,0) || ', Tuyến: ' || COALESCE(tong_kh_vieng_tham_trong_tuyen,0) || ', Ngoài: ' || COALESCE(tong_kh_vieng_tham_ngoai_tuyen,0)) as notes,
        null as shelf_image_url
      FROM visit
      WHERE 1=1 ${authFilter}
      ORDER BY ngay DESC
      LIMIT 200
    `);
    res.json(data.rows);
  } catch (err) {
    console.error('Visits error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PRODUCT REPORT - REAL DATA
app.get('/api/reports/product', async (req, res) => {
  const { year, month, region, area , userRole, userCode} = req.query;
  const authFilter = (userCode && userCode !== "SE") ? " AND (ten_vung ILIKE \'%Mekong%\' OR ten_vung ILIKE \'%MTAY%\' OR ten_vung ILIKE \'%Cần Thơ%\' OR ten_vung = \'Cần Thơ\')" : "";
  const filterYear = year ? parseInt(year, 10) : 2026;
  const filterMonth = month ? parseInt(month, 10) : 5;

  try {
    const params = [filterYear, filterMonth];
    let filterSql = 'WHERE nam = $1 AND thang <= $2';
    if (region) {
      params.push(region);
      filterSql += ` AND ten_mien = $${params.length}`;
    }
    if (area) {
      params.push(area);
      filterSql += ` AND ten_vung = $${params.length}`;
    }

    const summaryRes = await query(`
      SELECT 
        COALESCE(SUM(revenue), 0)::float8 as total_sales,
        COALESCE(SUM(so_don_hang), 0)::bigint as total_qty
      FROM agg_monthly_sales
      ${filterSql}
    `, params);

    const dataRes = await query(`
      SELECT 
        COALESCE(nganh_hang, 'Other') as category,
        COALESCE(nhan_hang, 'Other') as group_name,
        ma_san_pham as code,
        ten_san_pham as name,
        SUM(revenue)::float8 as sales,
        SUM(so_don_hang)::bigint as qty
      FROM agg_monthly_sales
      ${filterSql}
      GROUP BY nganh_hang, nhan_hang, ma_san_pham, ten_san_pham
      ORDER BY sales DESC
      LIMIT 200
    `, params);

    res.json({
      summary: {
        totalSales: parseFloat(summaryRes.rows[0].total_sales) || 0,
        totalQty: parseInt(summaryRes.rows[0].total_qty, 10) || 0
      },
      hierarchicalData: dataRes.rows.map(r => ({
        category: r.category,
        group: r.group_name,
        subgroup: '',
        code: r.code || '',
        name: r.name || 'N/A',
        sales: parseFloat(r.sales) || 0,
        qty: parseInt(r.qty, 10) || 0
      }))
    });
  } catch (err) {
    console.error('Product report error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// SF PERFORMANCE REPORT - ALL METRICS from fact_kpi + kpitonghop
app.get('/api/reports/sf-performance', async (req, res) => {
  const { year, month, region, area , userRole, userCode} = req.query;
  const authFilter = (userCode && userCode !== "SE") ? " AND (ten_vung ILIKE \'%Mekong%\' OR ten_vung ILIKE \'%MTAY%\' OR ten_vung ILIKE \'%Cần Thơ%\' OR ten_vung = \'Cần Thơ\')" : "";
  const filterYear = year ? parseInt(year, 10) : 2026;
  const filterMonth = month ? parseInt(month, 10) : 5;

  try {
    const repParams = [filterYear, filterMonth];
    let repFilterSql = '';
    let selloutFilterSql = '';
    let kpiFilterSql = '';
    if (region) {
      repParams.push(region);
      repFilterSql += ` AND ten_mien = $${repParams.length}`;
      selloutFilterSql += ` AND ten_mien = $${repParams.length}`;
      kpiFilterSql += ` AND ten_mien = $${repParams.length}`;
    }
    if (area) {
      repParams.push(area);
      repFilterSql += ` AND ten_vung = $${repParams.length}`;
      selloutFilterSql += ` AND ten_vung = $${repParams.length}`;
      kpiFilterSql += ` AND ten_vung = $${repParams.length}`;
    }

    const repsRes = await query(`
      WITH all_reps AS (
          SELECT DISTINCT TRIM(BOTH FROM upper(ma_nv)) as staff_id FROM visit WHERE ma_nv IS NOT NULL AND ma_nv <> ''
          UNION
          SELECT DISTINCT TRIM(BOTH FROM upper(ma_nv)) as staff_id FROM sellout WHERE ma_nv IS NOT NULL AND ma_nv <> ''
          UNION
          SELECT DISTINCT TRIM(BOTH FROM upper(ma_nhan_vien)) as staff_id FROM kpitonghop WHERE ma_nhan_vien IS NOT NULL AND ma_nhan_vien <> ''
      ),
      visit_agg AS (
          SELECT 
              TRIM(BOTH FROM upper(ma_nv)) as staff_id,
              MAX(ten_nv) as staff_name,
              MAX(ten_mien) as region,
              MAX(ten_vung) as area,
              MAX(ten_npp) as distributor,
              MAX(ten_ql_vung) as asm_name,
              MAX(ten_gsbh) as sup_name,
              SUM(tong_khach_hang) as mcp_count,
              SUM(tong_kh_vieng_tham_trong_tuyen + tong_kh_vieng_tham_ngoai_tuyen) as total_visits
          FROM visit
          WHERE ngay IS NOT NULL
            AND EXTRACT(YEAR FROM ngay) = $1 AND EXTRACT(MONTH FROM ngay) <= $2
            ${repFilterSql}
          GROUP BY TRIM(BOTH FROM upper(ma_nv))
      ),
      sellout_agg AS (
          SELECT 
              TRIM(BOTH FROM upper(ma_nv)) as staff_id,
              SUM(sl_giao) as sku_sum,
              SUM(doanh_so_sau_ck_vat) as sales,
              COUNT(DISTINCT ma_kh) as buying_outlets,
              COUNT(DISTINCT ngay_dat_hang || '-' || ma_kh) as transactions
          FROM sellout
          WHERE ngay_dat_hang IS NOT NULL AND ngay_dat_hang <> ''
            AND EXTRACT(YEAR FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY')) = $1
            AND EXTRACT(MONTH FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY')) <= $2
            ${selloutFilterSql}
          GROUP BY TRIM(BOTH FROM upper(ma_nv))
      ),
      kpi_agg AS (
          SELECT 
              TRIM(BOTH FROM upper(ma_nhan_vien)) as staff_id,
              SUM(CASE WHEN ten_kpi ILIKE '%sell%in%' THEN tong_chi_tieu ELSE 0 END) as sellin_target,
              SUM(CASE WHEN ten_kpi ILIKE '%sell%in%' THEN thuc_hien ELSE 0 END) as sellin_actual,
              SUM(CASE WHEN ten_kpi ILIKE '%sell%out%' THEN tong_chi_tieu ELSE 0 END) as sellout_target,
              SUM(CASE WHEN ten_kpi ILIKE '%sell%out%' THEN thuc_hien ELSE 0 END) as sellout_actual
          FROM kpitonghop
          WHERE SUBSTRING(thang_nam, 1, 4)::integer = $1 AND SUBSTRING(thang_nam, 5, 2)::integer <= $2
            ${kpiFilterSql}
          GROUP BY TRIM(BOTH FROM upper(ma_nhan_vien))
      )
      SELECT 
          r.staff_id,
          COALESCE(v.staff_name, (SELECT ten_nhan_vien FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), r.staff_id) as staff_name,
          COALESCE(v.region, (SELECT ten_mien FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'MIỀN NAM') as region,
          COALESCE(v.area, (SELECT ten_vung FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'HCM') as area,
          COALESCE(v.asm_name, (SELECT ten_ql_vung FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'ASM') as asm_name,
          COALESCE(v.sup_name, (SELECT ten_gsbh FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'GSBH') as sup_name,
          COALESCE(v.distributor, (SELECT ten_npp FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'N/A') as distributor,
          COALESCE(s.sales, 0)::float8 as sales,
          COALESCE(s.sku_sum, 0)::bigint as sku_sum,
          COALESCE(s.buying_outlets, 0)::bigint as buying_outlets,
          COALESCE(s.transactions, 0)::bigint as transactions,
          COALESCE(v.mcp_count, 0)::bigint as mcp_count,
          COALESCE(v.total_visits, 0)::bigint as total_visits,
          COALESCE(k.sellin_target, 0)::float8 as sellin_target,
          COALESCE(k.sellin_actual, 0)::float8 as sellin_actual,
          COALESCE(k.sellout_target, 0)::float8 as sellout_target,
          COALESCE(k.sellout_actual, 0)::float8 as sellout_actual
      FROM all_reps r
      LEFT JOIN visit_agg v ON r.staff_id = v.staff_id
      LEFT JOIN sellout_agg s ON r.staff_id = s.staff_id
      LEFT JOIN kpi_agg k ON r.staff_id = k.staff_id
      WHERE (s.sales > 0 OR v.total_visits > 0 OR k.sellin_target > 0 OR k.sellout_target > 0)
      ORDER BY sales DESC
    `, repParams);

    const productSalesParams = [filterYear, filterMonth];
    let productSalesFilterSql = 'WHERE nam = $1 AND thang <= $2';
    if (region) {
      productSalesParams.push(region);
      productSalesFilterSql += ` AND ten_mien = $${productSalesParams.length}`;
    }
    if (area) {
      productSalesParams.push(area);
      productSalesFilterSql += ` AND ten_vung = $${productSalesParams.length}`;
    }

    const productSalesRes = await query(`
      SELECT 
        COALESCE(nganh_hang, 'Other') as category,
        COALESCE(nhan_hang, 'Other') as brand,
        SUM(revenue)::float8 as revenue
      FROM agg_monthly_sales
      ${productSalesFilterSql}
      GROUP BY nganh_hang, nhan_hang
    `, productSalesParams);

    const kpiSalesParams = [filterYear, filterMonth];
    let kpiSalesFilterSql = 'WHERE nam = $1 AND thang <= $2';
    let kpiSalesTargetFilterSql = 'WHERE SUBSTRING(thang_nam, 1, 4)::integer = $1 AND SUBSTRING(thang_nam, 5, 2)::integer <= $2';
    if (region) {
      kpiSalesParams.push(region);
      kpiSalesFilterSql += ` AND ten_mien = $${kpiSalesParams.length}`;
      kpiSalesTargetFilterSql += ` AND ten_mien = $${kpiSalesParams.length}`;
    }

    const kpiSalesRes = await query(`
      WITH actual_sales AS (
          SELECT 
            COALESCE(ten_mien, 'MIỀN NAM') as region,
            SUM(revenue)::float8 as revenue
          FROM agg_monthly_sales
          ${kpiSalesFilterSql}
          GROUP BY ten_mien
      ),
      targets AS (
          SELECT 
            COALESCE(ten_mien, 'MIỀN NAM') as region,
            SUM(CASE WHEN ten_kpi ILIKE '%sell%in%' THEN tong_chi_tieu ELSE 0 END)::float8 as sellin_target,
            SUM(CASE WHEN ten_kpi ILIKE '%sell%out%' THEN tong_chi_tieu ELSE 0 END)::float8 as sellout_target
          FROM kpitonghop
          ${kpiSalesTargetFilterSql}
          GROUP BY ten_mien
      )
      SELECT 
        COALESCE(a.region, t.region) as region,
        COALESCE(a.revenue, 0) as revenue,
        COALESCE(t.sellin_target, 0) as sellin_target,
        COALESCE(t.sellout_target, 0) as sellout_target
      FROM actual_sales a
      FULL OUTER JOIN targets t ON a.region = t.region
    `, kpiSalesParams);

    res.json({
      productSales: productSalesRes.rows,
      kpiSales: kpiSalesRes.rows,
      repsData: repsRes.rows.map(r => ({
        staff_id: r.staff_id,
        staff_name: r.staff_name,
        region: r.region,
        area: r.area,
        asm_name: r.asm_name,
        sup_name: r.sup_name,
        distributor: r.distributor,
        sales: parseFloat(r.sales) || 0,
        sku_sum: parseInt(r.sku_sum, 10) || 0,
        buying_outlets: parseInt(r.buying_outlets, 10) || 0,
        transactions: parseInt(r.transactions, 10) || 0,
        mcp_count: parseInt(r.mcp_count, 10) || 0,
        total_visits: parseInt(r.total_visits, 10) || 0,
        sellin_target: parseFloat(r.sellin_target) || 0,
        sellin_actual: parseFloat(r.sellin_actual) || 0,
        sellout_target: parseFloat(r.sellout_target) || 0,
        sellout_actual: parseFloat(r.sellout_actual) || 0
      }))
    });
  } catch (err) {
    console.error('SF Performance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// SF MONTHLY TREND
app.get('/api/reports/sf-trend', async (req, res) => {
  const { year, month , userRole, userCode} = req.query;
  const authFilter = (userCode && userCode !== "SE") ? " AND (ten_vung ILIKE \'%Mekong%\' OR ten_vung ILIKE \'%MTAY%\' OR ten_vung ILIKE \'%Cần Thơ%\' OR ten_vung = \'Cần Thơ\')" : "";
  const filterYear = year ? parseInt(year, 10) : 2026;
  const filterMonth = month ? parseInt(month, 10) : 5;

  const months = Array.from({ length: filterMonth }, (_, i) => i + 1);
  const regions = ['MIỀN BẮC', 'MIỀN NAM'];

  try {
    const sellinRes = await query(`
      SELECT thang::integer as month, COALESCE(ten_mien, 'MIỀN NAM') as region, SUM(revenue)::float8 as revenue
      FROM agg_monthly_sales
      WHERE nam = $1 AND thang::integer <= $2
        AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      GROUP BY thang, ten_mien
    `, [filterYear, filterMonth]);

    const selloutRes = await query(`
      SELECT thang::integer as month, COALESCE(ten_mien, 'MIỀN NAM') as region, 
             SUM(tong_doanh_so)::float8 as sales,
             COUNT(DISTINCT ma_khach_hang)::bigint as aso
      FROM agg_sellout_monthly
      WHERE nam = $1 AND thang::integer <= $2
        AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      GROUP BY thang, ten_mien
    `, [filterYear, filterMonth]);

    const visitsRes = await query(`
      SELECT EXTRACT(MONTH FROM ngay)::integer as month, COALESCE(ten_mien, 'MIỀN NAM') as region,
             SUM(tong_khach_hang)::bigint as mcp
      FROM visit
      WHERE EXTRACT(YEAR FROM ngay) = $1 AND EXTRACT(MONTH FROM ngay) <= $2
        AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      GROUP BY EXTRACT(MONTH FROM ngay), ten_mien
    `, [filterYear, filterMonth]);

    const targetsRes = await query(`
      SELECT SUBSTRING(thang_nam, 5, 2)::integer as month, COALESCE(ten_mien, 'MIỀN NAM') as region,
             SUM(CASE WHEN ten_kpi ILIKE '%sell%in%' THEN tong_chi_tieu ELSE 0 END)::float8 as sellin_target,
             SUM(CASE WHEN ten_kpi ILIKE '%sell%out%' THEN tong_chi_tieu ELSE 0 END)::float8 as sellout_target
      FROM kpitonghop
      WHERE SUBSTRING(thang_nam, 1, 4)::integer = $1 AND SUBSTRING(thang_nam, 5, 2)::integer <= $2
        AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      GROUP BY SUBSTRING(thang_nam, 5, 2)::integer, ten_mien
    `, [filterYear, filterMonth]);

    const initTrendObj = () => {
      const obj = {};
      regions.forEach(r => {
        obj[r] = {};
        months.forEach(m => {
          obj[r][m] = 0;
        });
      });
      return obj;
    };

    const sellin = initTrendObj();
    const sellout = initTrendObj();
    const mcp = initTrendObj();
    const aso = initTrendObj();
    const targetSellin = initTrendObj();
    const targetSellout = initTrendObj();
    const targetMcp = initTrendObj();
    const targetAso = initTrendObj();

    sellinRes.rows.forEach(r => {
      const regionVal = r.region.toUpperCase();
      if (sellin[regionVal]) {
        sellin[regionVal][r.month] = parseFloat(r.revenue) || 0;
      }
    });

    selloutRes.rows.forEach(r => {
      const regionVal = r.region.toUpperCase();
      if (sellout[regionVal]) {
        sellout[regionVal][r.month] = parseFloat(r.sales) || 0;
        aso[regionVal][r.month] = parseInt(r.aso, 10) || 0;
      }
    });

    visitsRes.rows.forEach(r => {
      const regionVal = r.region.toUpperCase();
      if (mcp[regionVal]) {
        mcp[regionVal][r.month] = parseInt(r.mcp, 10) || 0;
      }
    });

    targetsRes.rows.forEach(r => {
      const regionVal = r.region.toUpperCase();
      if (targetSellin[regionVal]) {
        targetSellin[regionVal][r.month] = parseFloat(r.sellin_target) || 0;
        targetSellout[regionVal][r.month] = parseFloat(r.sellout_target) || 0;
      }
    });

    res.json({
      months,
      regions,
      sellin,
      sellout,
      mcp,
      aso,
      targets: {
        sellin: targetSellin,
        sellout: targetSellout,
        mcp: targetMcp,
        aso: targetAso
      }
    });
  } catch (err) {
    console.error('SF trend error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// BIZ REPORT - REAL DATA (returns rawData and kpis for Biz Review dashboard)
app.get('/api/reports/biz', async (req, res) => {
  const { year, month, region, area , userRole, userCode} = req.query;
  const authFilter = (userCode && userCode !== "SE") ? " AND (ten_vung ILIKE \'%Mekong%\' OR ten_vung ILIKE \'%MTAY%\' OR ten_vung ILIKE \'%Cần Thơ%\' OR ten_vung = \'Cần Thơ\')" : "";
  const selectedYear = year ? parseInt(year, 10) : 2026;
  const selectedMonth = month ? parseInt(month, 10) : 5;
  const prevYear = selectedYear - 1;

  const selectedYearStr = String(selectedYear);
  const prevYearStr = String(prevYear);
  const selectedMonthStr = String(selectedMonth);

  console.log(`GET /api/reports/biz?year=${selectedYear}&month=${selectedMonth}&region=${region || ''}&area=${area || ''}`);

  try {
    // 1. Fetch rawData (grouped Sell-in and Sell-out)
    const rawDataRes = await query(`
      SELECT 
        'sellin' AS type,
        nam::integer AS year,
        thang::integer AS month,
        ten_mien AS region,
        ten_vung AS area,
        '' AS office,
        ma_npp,
        ten_npp,
        SUM(revenue)::float8 AS sales
      FROM agg_monthly_sales
      WHERE nam IN ($1, $2) AND thang::integer <= $3
        ${region ? "AND ten_mien = '" + region + "'" : ''}
        ${area ? "AND ten_vung = '" + area + "'" : ''}
      GROUP BY nam, thang, ten_mien, ten_vung, ma_npp, ten_npp

      UNION ALL

      SELECT 
        'sellout' AS type,
        a.nam::integer AS year,
        a.thang::integer AS month,
        a.ten_mien AS region,
        a.ten_vung AS area,
        '' AS office,
        a.ma_npp,
        COALESCE(n.ten_npp, a.ma_npp) AS ten_npp,
        SUM(a.tong_doanh_so)::float8 AS sales
      FROM agg_sellout_monthly a
      LEFT JOIN npp n ON TRIM(BOTH FROM a.ma_npp) = split_part(TRIM(BOTH FROM n.ma_npp), '.', 1)
      WHERE a.nam IN ($1, $2) AND a.thang::integer <= $3
        ${region ? "AND a.ten_mien = '" + region + "'" : ''}
        ${area ? "AND a.ten_vung = '" + area + "'" : ''}
      GROUP BY a.nam, a.thang, a.ten_mien, a.ten_vung, a.ma_npp, n.ten_npp
    `, [prevYearStr, selectedYearStr, selectedMonth]);

    const rawData = rawDataRes.rows.map(r => ({
      type: r.type,
      year: r.year,
      month: r.month,
      region: r.region || 'N/A',
      area: r.area || 'N/A',
      office: r.office || '',
      ma_npp: r.ma_npp || '',
      ten_npp: r.ten_npp || 'N/A',
      sales: parseFloat(r.sales || 0)
    }));

    // 2. Fetch KPIs for the current month/year
    const kpiRes = await query(`
      SELECT 
        (SELECT COUNT(DISTINCT ma_khach_hang) FROM agg_sellout_monthly WHERE nam = $1 AND thang = $2 ${region ? "AND ten_mien = '" + region + "'" : ''} ${area ? "AND ten_vung = '" + area + "'" : ''} ${authFilter}) as aso,
        (SELECT COALESCE(SUM(tong_doanh_so), 0) FROM agg_sellout_monthly WHERE nam = $1 AND thang = $2 ${region ? "AND ten_mien = '" + region + "'" : ''} ${area ? "AND ten_vung = '" + area + "'" : ''} ${authFilter}) as sellout_rev,
        (SELECT CASE WHEN SUM(so_don_hang) > 0 THEN (COUNT(*)::numeric / SUM(so_don_hang)) ELSE 0 END FROM agg_sellout_monthly WHERE nam = $1 AND thang = $2 ${region ? "AND ten_mien = '" + region + "'" : ''} ${area ? "AND ten_vung = '" + area + "'" : ''} ${authFilter}) as sku_order
    `, [selectedYearStr, selectedMonthStr]);

    const asoVal = parseInt(kpiRes.rows[0].aso, 10) || 0;
    const selloutRevVal = parseFloat(kpiRes.rows[0].sellout_rev) || 0;
    const vpoVal = asoVal > 0 ? (selloutRevVal / asoVal) : 0;
    const skuOrderVal = parseFloat(kpiRes.rows[0].sku_order) || 0;

    // 3. Fetch monthly history of ASO and VPO
    const historyRes = await query(`
      SELECT 
        nam::integer as year,
        thang::integer as month,
        COUNT(DISTINCT ma_khach_hang) as aso,
        CASE WHEN COUNT(DISTINCT ma_khach_hang) > 0 THEN (SUM(tong_doanh_so)::numeric / COUNT(DISTINCT ma_khach_hang)) ELSE 0 END as vpo
      FROM agg_sellout_monthly
      WHERE nam IN ($1, $2) AND thang::integer <= $3
        ${region ? "AND ten_mien = \'" + region + "\'" : \'\'}
        ${area ? "AND ten_vung = \'" + area + "\'" : \'\'}
        ${authFilter}
      GROUP BY nam, thang
      ORDER BY nam DESC, thang DESC
      LIMIT 12
    `, [prevYearStr, selectedYearStr, selectedMonth]);

    const history = historyRes.rows.map(r => ({
      year: r.year,
      month: r.month,
      aso: parseInt(r.aso, 10) || 0,
      vpo: parseFloat(r.vpo) || 0
    }));

    // 4. Fetch headcount
    const hcRes = await query(`
      SELECT 
        COUNT(DISTINCT ten_gsbh) as total_gsbh,
        COUNT(DISTINCT ma_nv) as total_nvbh
      FROM visit
      WHERE EXTRACT(YEAR FROM ngay) = $1 AND EXTRACT(MONTH FROM ngay) = $2
        ${region ? "AND ten_mien = \'" + region + "\'" : \'\'}
        ${area ? "AND ten_vung = \'" + area + "\'" : \'\'}
        ${authFilter}
    `, [selectedYear, selectedMonth]);

    const headcount = {
      totalGsbh: parseInt(hcRes.rows[0].total_gsbh, 10) || 5,
      totalNvbh: parseInt(hcRes.rows[0].total_nvbh, 10) || 25
    };

    // 5. Fetch % Đạt Sell-in and % Đạt Sell-out from kpitonghop (YTD approach)
    // kpitonghop may only have data for certain months - query all months up to selected month
    const yearPrefix = String(selectedYear);
    const thangNamFrom = yearPrefix + '01';
    const thangNamTo = yearPrefix + String(selectedMonth).padStart(2, '0');
    const achievementRes = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN ten_kpi ILIKE '%sell%in%' THEN tong_chi_tieu ELSE 0 END), 0)::float8 as sellin_target,
        COALESCE(SUM(CASE WHEN ten_kpi ILIKE '%sell%in%' THEN thuc_hien ELSE 0 END), 0)::float8 as sellin_actual,
        COALESCE(SUM(CASE WHEN ten_kpi ILIKE '%sell%out%' THEN tong_chi_tieu ELSE 0 END), 0)::float8 as sellout_target,
        COALESCE(SUM(CASE WHEN ten_kpi ILIKE '%sell%out%' THEN thuc_hien ELSE 0 END), 0)::float8 as sellout_actual
      FROM kpitonghop
      WHERE thang_nam >= $1 AND thang_nam <= $2
        ${region ? "AND ten_mien = '" + region + "'" : ''}
        ${area ? "AND ten_vung = '" + area + "'" : ''}
    `, [thangNamFrom, thangNamTo]);

    const sellinTarget = parseFloat(achievementRes.rows[0].sellin_target) || 0;
    const sellinActual = parseFloat(achievementRes.rows[0].sellin_actual) || 0;
    const selloutTarget = parseFloat(achievementRes.rows[0].sellout_target) || 0;
    const selloutActual = parseFloat(achievementRes.rows[0].sellout_actual) || 0;

    const sellinAchievement = sellinTarget > 0 ? Math.round((sellinActual / sellinTarget) * 100 * 10) / 10 : 0;
    const selloutAchievement = selloutTarget > 0 ? Math.round((selloutActual / selloutTarget) * 100 * 10) / 10 : 0;

    console.log(`Biz KPI: sellin=${sellinAchievement}% (${sellinActual}/${sellinTarget}), sellout=${selloutAchievement}% (${selloutActual}/${selloutTarget})`);

    res.json({
      rawData,
      kpis: {
        sellin_achievement: sellinAchievement,
        sellout_achievement: selloutAchievement,
        sellin_target: sellinTarget,
        sellin_actual: sellinActual,
        sellout_target: selloutTarget,
        sellout_actual: selloutActual,
        aso: asoVal,
        vpo: vpoVal,
        sku_order: skuOrderVal,
        history,
        staffHeadcount: headcount
      }
    });
  } catch (err) {
    console.error('Biz report error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST VISIT
app.post('/api/visits', async (req, res) => {
  const { store_id, user_id, compliance_rate, notes } = req.body;
  try {
    res.json({ message: 'Visit data comes from ERP system - cannot update manually', store_id, user_id, compliance_rate, notes });
  } catch (err) {
    console.error('Visit create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST VISIT COMPLIANCE
app.post('/api/visits/:id/compliance', async (req, res) => {
  const { compliance_rate } = req.body;
  try {
    res.json({ message: 'Visit data comes from ERP system - cannot update manually', compliance_rate });
  } catch (err) {
    console.error('Compliance update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST VISIT NOTE
app.post('/api/visits/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  try {
    res.json({ message: 'Visit data comes from ERP system - cannot update manually', id, notes });
  } catch (err) {
    console.error('Notes update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// AUTH LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const data = await query('SELECT id, username, full_name, email, role, phone, password FROM users WHERE username = $1 AND active = true', [username]);
    if (data.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = data.rows[0];
    
    // Check password if provided in the request or if the user has a password in DB
    if (password && user.password && password !== user.password) {
      return res.status(401).json({ error: 'Sai mật khẩu' });
    }
    res.json({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      code: user.username,
      name: user.full_name || user.username,
      phone: user.phone
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET USER PROFILE
app.get('/api/users/profile', async (req, res) => {
  const { userId , userRole, userCode} = req.query;
  const authFilter = (userCode && userCode !== "SE") ? " AND (ten_vung ILIKE \'%Mekong%\' OR ten_vung ILIKE \'%MTAY%\' OR ten_vung ILIKE \'%Cần Thơ%\' OR ten_vung = \'Cần Thơ\')" : "";
  try {
    const data = await query('SELECT id, username, full_name, email, role, phone FROM users WHERE id = $1', [userId]);
    if (data.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(data.rows[0]);
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), database: isDbConnected ? 'CONNECTED' : 'NOT_CONNECTED' });
});

if (process.env.VERCEL) {
  module.exports = app;
} else {
  ensureDbConnectionState().then((connected) => {
    if (!connected) {
      console.error('Cannot start server: Database not connected');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Server running on http://localhost:' + PORT);
      console.log('✅ Database: CONNECTED to sales_db');
      console.log('');
    });
  }).catch((err) => {
    console.error('DB connection error:', err.message);
    process.exit(1);
  });
}
