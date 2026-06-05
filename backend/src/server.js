require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query, isConnected, syncConnectionState, connectionReady } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let isDbConnected = false;
let connectionInitialized = false;
let connectionInitPromise = null;

async function ensureDbConnectionState() {
  if (!connectionInitPromise) {
    connectionInitPromise = connectionReady
      .then(async (connected) => {
        isDbConnected = connected;
        if (connected) {
          await syncConnectionState();
          isDbConnected = isConnected();
          console.log('✅ Database connected!');
        } else {
          console.error('❌ Database NOT connected!');
        }
        connectionInitialized = true;
        return isDbConnected;
      })
      .catch((err) => {
        connectionInitialized = true;
        isDbConnected = false;
        console.error('DB connection error:', err.message);
        return false;
      });
  }

  const connected = await connectionInitPromise;

  if (connectionInitialized) {
    await syncConnectionState();
    isDbConnected = isConnected();
  }

  return connected && isDbConnected;
}

app.use(async (req, res, next) => {
  const connected = await ensureDbConnectionState();

  if (!connected && req.path !== '/api/health') {
    return res.status(503).json({
      error: 'Database not connected',
    });
  }

  return next();
});

// API STATUS
app.get('/api/status', (req, res) => {
  res.json({ status: 'ONLINE', database: isDbConnected ? 'CONNECTED' : 'NOT_CONNECTED', timestamp: new Date() });
});

// GET DASHBOARD - REAL DATA
app.get('/api/dashboard', async (req, res) => {
  const { year, month } = req.query;
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
      WHERE ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
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
      WHERE ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
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
    const { year = '2026', month = '5', region } = req.query;
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
  const { year, month, region } = req.query;
  const filterYear = year ? parseInt(year, 10) : 2026;
  const filterMonth = month ? parseInt(month, 10) : 5;

  try {
    const data = await query(`
      SELECT nhan_hang as brand, nganh_hang as category, ten_san_pham as product_name,
             SUM(revenue) as revenue, SUM(quantity) as quantity
      FROM agg_monthly_sales
      WHERE nam = $1 AND thang <= $2
        ${region ? "AND ten_mien = '" + region + "'" : ''}
      GROUP BY nhan_hang, nganh_hang, ten_san_pham
      ORDER BY revenue DESC
      LIMIT 200
    `, [filterYear, filterMonth]);
    res.json(data.rows);
  } catch (err) {
    console.error('Product report error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// SF PERFORMANCE REPORT - ALL METRICS from fact_kpi + kpitonghop
app.get('/api/reports/sf-performance', async (req, res) => {
  const { year, month, region } = req.query;
  const filterYear = year ? parseInt(year, 10) : 2026;
  const filterMonth = month ? parseInt(month, 10) : 5;

  try {
    const data = await query(`
      SELECT ten_nv, ma_nv, ten_vung, ten_mien,
             SUM(tong_doanh_so) as revenue,
             SUM(tong_khach_hang) as total_customers,
             SUM(tong_kh_vieng_tham_trong_tuyen) as route_visits,
             SUM(tong_kh_vieng_tham_ngoai_tuyen) as extra_visits,
             SUM(tong_thoi_gian_lam_viec) as work_time
      FROM visit
      WHERE EXTRACT(YEAR FROM ngay) = $1 AND EXTRACT(MONTH FROM ngay) <= $2
        ${region ? "AND ten_mien = '" + region + "'" : ''}
      GROUP BY ten_nv, ma_nv, ten_vung, ten_mien
      ORDER BY revenue DESC NULLS LAST
      LIMIT 500
    `, [filterYear, filterMonth]);
    res.json(data.rows);
  } catch (err) {
    console.error('SF performance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// SF MONTHLY TREND
app.get('/api/reports/sf-trend', async (req, res) => {
  const { year, month } = req.query;
  const filterYear = year ? parseInt(year, 10) : 2026;
  const filterMonth = month ? parseInt(month, 10) : 5;

  try {
    const data = await query(`
      SELECT EXTRACT(MONTH FROM ngay) as month, ten_nv, ma_nv,
             SUM(tong_khach_hang) as total_customers,
             SUM(tong_kh_vieng_tham_trong_tuyen) as route_visits,
             SUM(tong_kh_vieng_tham_ngoai_tuyen) as extra_visits
      FROM visit
      WHERE EXTRACT(YEAR FROM ngay) = $1 AND EXTRACT(MONTH FROM ngay) <= $2
      GROUP BY EXTRACT(MONTH FROM ngay), ten_nv, ma_nv
      ORDER BY month, ten_nv
    `, [filterYear, filterMonth]);
    res.json(data.rows);
  } catch (err) {
    console.error('SF trend error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// BIZ REPORT - REAL DATA
app.get('/api/reports/biz', async (req, res) => {
  const { year, month, region, area } = req.query;
  const filterYear = year ? parseInt(year, 10) : 2026;
  const filterMonth = month ? parseInt(month, 10) : 5;

  try {
    const data = await query(`
      SELECT ten_mien, ten_vung, ma_npp, ten_npp,
             SUM(tong_doanh_so) as total_revenue,
             SUM(tong_so_luong) as total_qty,
             COUNT(DISTINCT ma_khach_hang) as customer_count
      FROM agg_sellout_monthly
      WHERE nam = $1 AND thang <= $2
        ${region ? "AND ten_mien = '" + region + "'" : ''}
        ${area ? "AND ten_vung = '" + area + "'" : ''}
      GROUP BY ten_mien, ten_vung, ma_npp, ten_npp
      ORDER BY total_revenue DESC
      LIMIT 500
    `, [filterYear, filterMonth]);
    res.json(data.rows);
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
  const { username } = req.body;
  try {
    const data = await query('SELECT id, username, full_name, email, role, phone FROM users WHERE username = $1 AND active = true', [username]);
    if (data.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = data.rows[0];
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
  const { userId } = req.query;
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
