require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query, pool, isConnected, syncConnectionState, connectionReady } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// DB state management
let isDbConnected = false;

// Wait for DB connection, then start the server
connectionReady.then((connected) => {
  isDbConnected = connected;
  console.log(connected ? '✅ Database connected!' : '❌ Database NOT connected!');
  
  // Sync DB state every 5 seconds
  setInterval(async () => {
    await syncConnectionState();
    isDbConnected = isConnected();
  }, 5000);
  
  if (isDbConnected) {
    startServer();
  } else {
    console.error('Cannot start server: Database not connected');
    process.exit(1);
  }
}).catch((err) => {
  console.error('DB connection error:', err.message);
  process.exit(1);
});

function startServer() {
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
      // Summary from agg_monthly_sales - ALL TIME (no year/month filter for overview)
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

      // Region breakdown - ALL TIME
      const regionRes = await query(`
        SELECT ten_mien, COALESCE(SUM(revenue), 0) as revenue
        FROM agg_monthly_sales
        WHERE ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY ten_mien
      `);

      const regionBreakdown = {};
      regionRes.rows.forEach(r => { regionBreakdown[r.ten_mien] = parseFloat(r.revenue) || 0; });

      // Recent visits from visit table
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
      // Return org chart data from saleteam (manager -> sup -> rep hierarchy)
      // Get distinct rows per rep so we don't duplicate
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
        // Fallback: return users table data if saleteam is empty
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

      // Basic stores master data
      const storesData = await query(`
        SELECT id, code, name, address, latitude, longitude, channel, region, phone
        FROM stores ORDER BY name
      `);

      // Revenue per store from sellout aggregated by vung (zone)
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

      // Monthly revenue trend per zone
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

      // Build zone -> revenue map
      const revenueMap = {};
      revenueData.rows.forEach((r) => {
        revenueMap[r.zone] = {
          total_revenue: parseFloat(r.total_revenue) || 0,
          npp_count: parseInt(r.npp_count) || 0,
          customer_count: parseInt(r.customer_count) || 0,
          total_qty: parseInt(r.total_qty) || 0,
        };
      });

      // Build monthly trend per zone
      const trendMap = {};
      monthlyTrend.rows.forEach((r) => {
        const thang = parseInt(r.thang);
        if (!trendMap[r.zone]) trendMap[r.zone] = {};
        trendMap[r.zone][thang] = parseFloat(r.monthly_revenue) || 0;
      });

      // Merge: enrich stores with zone revenue
      const enriched = storesData.rows.map((s) => {
        const zone = s.region || 'HCM';
        const rev = revenueMap[zone] || { total_revenue: 0, npp_count: 0, customer_count: 0, total_qty: 0 };
        return {
          ...s,
          total_revenue: rev.total_revenue,
          npp_count: rev.npp_count,
          customer_count: rev.customer_count,
          total_qty: rev.total_qty,
          monthly_trend: trendMap[zone] || {},
        };
      });

      // Also add zone-level aggregates (for the KPI cards)
      const zonesData = revenueData.rows.map((r) => ({
        zone: r.zone,
        region: r.region,
        total_revenue: parseFloat(r.total_revenue) || 0,
        npp_count: parseInt(r.npp_count) || 0,
        customer_count: parseInt(r.customer_count) || 0,
        total_qty: parseInt(r.total_qty) || 0,
        monthly_trend: trendMap[r.zone] || {},
      }));

      res.json({ stores: enriched, zones: zonesData });
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
        LIMIT 100
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
    const regionFilter = region ? ` AND ten_mien = '${region}'` : '';

    console.log(`GET /api/reports/product?year=${filterYear}&month=${filterMonth}`);

    try {
      // Summary
      const summaryRes = await query(`
        SELECT 
          COALESCE(SUM(revenue), 0) as total_sales,
          COALESCE(SUM(so_don_hang), 0) as total_qty
        FROM agg_monthly_sales
        WHERE nam = ${filterYear} AND thang <= ${filterMonth} ${regionFilter}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      `);

      const summary = {
        totalSales: parseFloat(summaryRes.rows[0].total_sales) || 0,
        totalQty: parseInt(summaryRes.rows[0].total_qty, 10) || 0,
      };

      // Product hierarchy
      const dataRes = await query(`
        SELECT 
          COALESCE(nganh_hang, 'Other') as category,
          COALESCE(nhan_hang, 'Other') as "group",
          ma_san_pham as code,
          ten_san_pham as name,
          SUM(revenue) as sales,
          SUM(so_don_hang) as qty
        FROM agg_monthly_sales
        WHERE nam = ${filterYear} AND thang <= ${filterMonth} ${regionFilter}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY nganh_hang, nhan_hang, ma_san_pham, ten_san_pham
        ORDER BY sales DESC
        LIMIT 100
      `);

      const hierarchicalData = dataRes.rows.map(r => ({
        category: r.category,
        group: r.group || 'Other',
        subgroup: '',
        code: r.code,
        name: r.name,
        sales: parseFloat(r.sales || 0),
        qty: parseInt(r.qty || 0, 10)
      }));

      // Region breakdown - sellin
      const sellinRegionRes = await query(`
        SELECT COALESCE(ten_mien, 'Khác') as region, SUM(revenue) as sellin
        FROM agg_monthly_sales
        WHERE nam = ${filterYear} AND thang <= ${filterMonth} ${regionFilter}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY ten_mien
      `);

      // Region breakdown - sellout
      const selloutRegionRes = await query(`
        SELECT COALESCE(ten_mien, 'Khác') as region, SUM(tong_doanh_so) as sellout
        FROM agg_sellout_monthly
        WHERE nam = ${filterYear} AND thang <= ${filterMonth} ${regionFilter}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY ten_mien
      `);

      const regionMap = {};
      ['MIỀN NAM', 'MIỀN BẮC'].forEach(r => { regionMap[r] = { sellin: 0, sellout: 0 }; });
      sellinRegionRes.rows.forEach(r => { regionMap[r.region] = regionMap[r.region] || { sellin: 0, sellout: 0 }; regionMap[r.region].sellin = parseFloat(r.sellin) || 0; });
      selloutRegionRes.rows.forEach(r => { regionMap[r.region] = regionMap[r.region] || { sellin: 0, sellout: 0 }; regionMap[r.region].sellout = parseFloat(r.sellout) || 0; });
      const regionBreakdown = Object.entries(regionMap).map(([region, v]) => ({ region, ...v }));

      // Category by type
      const catRes = await query(`
        SELECT COALESCE(nganh_hang, 'Other') as category, SUM(revenue) as sellin
        FROM agg_monthly_sales
        WHERE nam = ${filterYear} AND thang <= ${filterMonth} ${regionFilter}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY nganh_hang
        ORDER BY sellin DESC
      `);
      const catSelloutRes = await query(`
        SELECT 'Other' as category, SUM(tong_doanh_so) as sellout
        FROM agg_sellout_monthly
        WHERE nam = ${filterYear} AND thang <= ${filterMonth} ${regionFilter}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      `);
      const catMap = {};
      catRes.rows.forEach(r => { catMap[r.category] = { sellin: parseFloat(r.sellin) || 0, sellout: 0 }; });
      catSelloutRes.rows.forEach(r => { catMap[r.category] = catMap[r.category] || { sellin: 0, sellout: 0 }; catMap[r.category].sellout = parseFloat(r.sellout) || 0; });
      const categoryByType = Object.entries(catMap).map(([category, v]) => ({ category, ...v })).sort((a, b) => (b.sellin + b.sellout) - (a.sellin + a.sellout));

      // Top sellers & slow movers
      const topSellers = hierarchicalData.slice(0, 10).map(r => ({ code: r.code, name: r.name, sales: r.sales }));
      const slowMovers = [...hierarchicalData].sort((a, b) => a.sales - b.sales).slice(0, 5).map(r => ({ code: r.code, name: r.name, sales: r.sales }));

      const totalSellout = regionBreakdown.reduce((s, r) => s + r.sellout, 0);

      console.log(`Product report: ${hierarchicalData.length} products`);

      res.json({
        summary,
        hierarchicalData,
        detailData: {
          detailSummary: { totalSellin: summary.totalSales, totalSellout, skuCount: hierarchicalData.length, nppCount: 0 },
          regionBreakdown,
          categoryByType,
          topSellers,
          slowMovers
        }
      });
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
    const regionFilter = region ? ` AND mien = '${region}'` : '';

    console.log(`GET /api/reports/sf-performance?year=${filterYear}&month=${filterMonth}`);

    try {
      // 1. SELL-IN KPIs from fact_kpi
      const siaRes = await query(`
        SELECT ma_npp, ten_npp, mien as region, vung as area,
               ma_gsbh as sup_code, ten_gsbh as sup_name,
               chi_tieu as sellin_target, thuc_hien as sellin_actual,
               ty_le_dat as sellin_pct
        FROM fact_kpi
        WHERE ma_kpi = 'SIA' AND mien IN ('MIỀN NAM', 'MIỀN BẮC') ${regionFilter}
      `);

      // 2. SELL-OUT KPIs from fact_kpi
      const soaRes = await query(`
        SELECT ma_npp, chi_tieu as sellout_target,
               thuc_hien as sellout_actual, ty_le_dat as sellout_pct
        FROM fact_kpi
        WHERE ma_kpi = 'SOA' AND mien IN ('MIỀN NAM', 'MIỀN BẮC') ${regionFilter}
      `);

      // 3. ASO from kpitonghop (thuc_hien = buying_outlets)
      const asoRes = await query(`
        SELECT ma_nha_phan_phoi as ma_npp,
               SUM(thuc_hien) as buying_outlets,
               SUM(tong_chi_tieu) as mcp_count
        FROM kpitonghop
        WHERE ma_kpi = 'ASO' AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY ma_nha_phan_phoi
      `);

      // 4. SOAG sell-out hàng đông + mát
      const soagRes = await query(`
        SELECT ma_npp, thuc_hien as soag_actual, chi_tieu as soag_target
        FROM fact_kpi
        WHERE ma_kpi = 'SOAG' AND mien IN ('MIỀN NAM', 'MIỀN BẮC') ${regionFilter}
      `);

      // 5. SDO-PH1 sell-out hàng khô
      const sdoRes = await query(`
        SELECT ma_npp, thuc_hien as sdo_actual, chi_tieu as sdo_target
        FROM fact_kpi
        WHERE ma_kpi = 'SDO-PH1' AND mien IN ('MIỀN NAM', 'MIỀN BẮC') ${regionFilter}
      `);

      // Build lookup maps
      const soaMap = {};
      soaRes.rows.forEach(r => { soaMap[r.ma_npp] = { sellout_target: parseFloat(r.sellout_target)||0, sellout_actual: parseFloat(r.sellout_actual)||0, sellout_pct: Math.round(parseFloat(r.sellout_pct)||0) }; });

      const asoMap = {};
      asoRes.rows.forEach(r => { asoMap[r.ma_npp] = { buying_outlets: parseInt(r.buying_outlets,10)||0, mcp_count: parseInt(r.mcp_count,10)||0 }; });

      const soagMap = {};
      soagRes.rows.forEach(r => { soagMap[r.ma_npp] = { soag_actual: parseFloat(r.soag_actual)||0, soag_target: parseFloat(r.soag_target)||0 }; });

      const sdoMap = {};
      sdoRes.rows.forEach(r => { sdoMap[r.ma_npp] = { sdo_actual: parseFloat(r.sdo_actual)||0, sdo_target: parseFloat(r.sdo_target)||0 }; });

      // Build repsData - use fact_kpi SIA rows as base, enrich with all other KPIs
      const repsData = siaRes.rows.map(r => {
        const npp = r.ma_npp;
        const soa = soaMap[npp] || { sellout_target: 0, sellout_actual: 0, sellout_pct: 0 };
        const aso = asoMap[npp] || { buying_outlets: 0, mcp_count: 0 };
        const soag = soagMap[npp] || { soag_actual: 0, soag_target: 0 };
        const sdo = sdoMap[npp] || { sdo_actual: 0, sdo_target: 0 };

        const sellinActual = parseFloat(r.sellin_actual) || 0;
        const sellinTarget = parseFloat(r.sellin_target) || 0;
        const selloutActual = soa.sellout_actual;
        const selloutTarget = soa.sellout_target;
        const totalVisits = selloutActual > 0 ? Math.round(selloutActual / 100000) : 0; // approximate from revenue
        const transactions = Math.max(1, Math.round(totalVisits * 1.2));

        return {
          staff_id: npp,
          staff_name: r.ten_npp || 'N/A',
          sup_name: r.sup_name || r.area || 'N/A',
          sup_code: r.sup_code || '',
          area: r.area || 'N/A',
          distributor: r.ten_npp || 'N/A',
          region: r.region || 'N/A',
          asm_name: r.region === 'MIỀN NAM' ? 'ASM Miền Nam' : r.region === 'MIỀN BẮC' ? 'ASM Miền Bắc' : 'N/A',
          total_orders: 0,
          sales: sellinActual,
          sellin_target: sellinTarget,
          sellin_actual: sellinActual,
          sellin_pct: Math.round(parseFloat(r.sellin_pct) || 0),
          sellout_target: selloutTarget,
          sellout_actual: selloutActual,
          sellout_pct: soa.sellout_pct,
          mcp_count: aso.mcp_count || 0,
          buying_outlets: aso.buying_outlets || 0,
          total_visits: totalVisits,
          transactions: transactions,
          sku_sum: 0,
          // Extra KPIs for detail view
          soag_actual: soag.soag_actual,
          soag_target: soag.soag_target,
          sdo_actual: sdo.sdo_actual,
          sdo_target: sdo.sdo_target
        };
      });

      // Product sales
      const productRes = await query(`
        SELECT ma_san_pham as "product_code", ten_san_pham as "product_name",
               nganh_hang as "category", nhan_hang as "brand",
               SUM(revenue) as "revenue"
        FROM agg_monthly_sales
        WHERE nam = ${filterYear} AND thang <= ${filterMonth}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY ma_san_pham, ten_san_pham, nganh_hang, nhan_hang
        ORDER BY revenue DESC LIMIT 50
      `);

      const productSales = productRes.rows.map(r => ({ ...r, revenue: parseFloat(r.revenue)||0 }));

      // KPI sales by region
      const kpiRes = await query(`
        SELECT mien as "region",
               SUM(CASE WHEN ma_kpi = 'SIA' THEN thuc_hien ELSE 0 END) as "sellin",
               SUM(CASE WHEN ma_kpi = 'SOA' THEN thuc_hien ELSE 0 END) as "sellout",
               SUM(CASE WHEN ma_kpi = 'SIA' THEN chi_tieu ELSE 0 END) as "sellin_target",
               SUM(CASE WHEN ma_kpi = 'SOA' THEN chi_tieu ELSE 0 END) as "sellout_target"
        FROM fact_kpi
        WHERE ma_kpi IN ('SIA','SOA') AND mien IN ('MIỀN NAM','MIỀN BẮC') ${regionFilter}
        GROUP BY mien
      `);

      const kpiSales = kpiRes.rows.map(r => ({
        region: r.region || 'N/A',
        revenue: parseFloat(r.sellin) || 0,
        orders: 0,
        sellin_target: parseFloat(r.sellin_target) || 0,
        sellout_target: parseFloat(r.sellout_target) || 0
      }));

      console.log(`SF Performance: ${repsData.length} NPPs with full KPIs`);
      res.json({ repsData, productSales, kpiSales });
    } catch (err) {
      console.error('SF Performance error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // SF MONTHLY TREND
  app.get('/api/reports/sf-trend', async (req, res) => {
    const { year, month } = req.query;
    const filterYear = year ? parseInt(year, 10) : 2026;
    const filterMonth = month ? parseInt(month, 10) : 5;

    try {
      // Monthly sell-in by region from agg_monthly_sales
      const sellinRes = await query(`
        SELECT
          thang,
          COALESCE(ten_mien, 'Khác') as region,
          SUM(revenue) as sellin
        FROM agg_monthly_sales
        WHERE nam = ${filterYear} AND thang <= ${filterMonth}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY thang, COALESCE(ten_mien, 'Khác')
        ORDER BY thang, COALESCE(ten_mien, 'Khác')
      `);

      // Monthly sell-out by region from agg_sellout_monthly
      const selloutRes = await query(`
        SELECT
          thang,
          COALESCE(ten_mien, 'Khác') as region,
          SUM(tong_doanh_so) as sellout
        FROM agg_sellout_monthly
        WHERE nam = ${filterYear} AND thang <= ${filterMonth}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY thang, COALESCE(ten_mien, 'Khác')
        ORDER BY thang, COALESCE(ten_mien, 'Khác')
      `);

      // Monthly MCP (total customers visited) by region from visit
      const mcpRes = await query(`
        SELECT
          EXTRACT(MONTH FROM ngay::date)::int as thang,
          COALESCE(ten_mien, 'Khác') as region,
          SUM(tong_khach_hang)::bigint as mcp
        FROM visit
        WHERE ngay >= '${filterYear}-01-01' AND ngay <= '${filterYear}-${String(filterMonth).padStart(2, '0')}-31'
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY 1, COALESCE(ten_mien, 'Khác')
        ORDER BY 1, COALESCE(ten_mien, 'Khác')
      `);

      // Monthly KPI targets per region per month from fact_kpi (optional - graceful fallback)
      let kpiTargetRows = [];
      try {
        const kpiTargetRes = await query(`
          SELECT
            EXTRACT(MONTH FROM ngay::date)::int as thang,
            COALESCE(mien, 'Khác') as region,
            SUM(CASE WHEN ma_kpi = 'SIA' THEN chi_tieu ELSE 0 END) as sellin_target,
            SUM(CASE WHEN ma_kpi = 'SOA' THEN chi_tieu ELSE 0 END) as sellout_target,
            SUM(CASE WHEN ma_kpi = 'MCP' THEN chi_tieu ELSE 0 END) as mcp_target,
            SUM(CASE WHEN ma_kpi = 'ASO' THEN chi_tieu ELSE 0 END) as aso_target
          FROM fact_kpi
          WHERE EXTRACT(YEAR FROM ngay::date) = ${filterYear}
            AND EXTRACT(MONTH FROM ngay::date)::int <= ${filterMonth}
            AND mien IN ('MIỀN NAM', 'MIỀN BẮC')
          GROUP BY 1, COALESCE(mien, 'Khác')
          ORDER BY 1, COALESCE(mien, 'Khác')
        `);
        kpiTargetRows = kpiTargetRes.rows;
      } catch (e) {
        console.warn('KPI targets query skipped (no date column in fact_kpi):', e.message);
      }

      // Monthly ASO (distinct buying outlets) by region from visit
      const asoRes = await query(`
        SELECT
          EXTRACT(MONTH FROM ngay::date)::int as thang,
          COALESCE(ten_mien, 'Khác') as region,
          COUNT(DISTINCT CASE WHEN tong_khach_hang > 0 THEN ma_npp END)::bigint as aso
        FROM visit
        WHERE ngay >= '${filterYear}-01-01' AND ngay <= '${filterYear}-${String(filterMonth).padStart(2, '0')}-31'
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY 1, COALESCE(ten_mien, 'Khác')
        ORDER BY 1, COALESCE(ten_mien, 'Khác')
      `);

      // Build monthly data per region
      const months = Array.from({ length: filterMonth }, (_, i) => i + 1);
      const regions = ['MIỀN BẮC', 'MIỀN NAM'];

      const sellinMap = {};
      const selloutMap = {};
      const mcpMap = {};
      const asoMap = {};
      const sellinTargetMap = {};
      const selloutTargetMap = {};
      const mcpTargetMap = {};
      const asoTargetMap = {};

      regions.forEach(r => {
        sellinMap[r] = {};
        selloutMap[r] = {};
        mcpMap[r] = {};
        asoMap[r] = {};
        sellinTargetMap[r] = {};
        selloutTargetMap[r] = {};
        mcpTargetMap[r] = {};
        asoTargetMap[r] = {};
        months.forEach(m => {
          sellinMap[r][m] = 0;
          selloutMap[r][m] = 0;
          mcpMap[r][m] = 0;
          asoMap[r][m] = 0;
          sellinTargetMap[r][m] = 0;
          selloutTargetMap[r][m] = 0;
          mcpTargetMap[r][m] = 0;
          asoTargetMap[r][m] = 0;
        });
      });

      kpiTargetRows.forEach(r => {
        sellinTargetMap[r.region][parseInt(r.thang)] = parseFloat(r.sellin_target) || 0;
        selloutTargetMap[r.region][parseInt(r.thang)] = parseFloat(r.sellout_target) || 0;
        mcpTargetMap[r.region][parseInt(r.thang)] = parseFloat(r.mcp_target) || 0;
        asoTargetMap[r.region][parseInt(r.thang)] = parseFloat(r.aso_target) || 0;
      });
      sellinRes.rows.forEach(r => {
        sellinMap[r.region][parseInt(r.thang)] = parseFloat(r.sellin) || 0;
      });
      selloutRes.rows.forEach(r => {
        selloutMap[r.region][parseInt(r.thang)] = parseFloat(r.sellout) || 0;
      });
      mcpRes.rows.forEach(r => {
        mcpMap[r.region][r.thang] = parseInt(r.mcp) || 0;
      });
      asoRes.rows.forEach(r => {
        asoMap[r.region][r.thang] = parseInt(r.aso) || 0;
      });

      res.json({
        months,
        regions,
        sellin: sellinMap,
        sellout: selloutMap,
        mcp: mcpMap,
        aso: asoMap,
        targets: {
          sellin: sellinTargetMap,
          sellout: selloutTargetMap,
          mcp: mcpTargetMap,
          aso: asoTargetMap,
        }
      });
    } catch (err) {
      console.error('SF Trend error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // BIZ REPORT - REAL DATA
  app.get('/api/reports/biz', async (req, res) => {
    const { year, month, region, area } = req.query;
    const filterYear = year ? parseInt(year, 10) : 2026;
    const filterMonth = month ? parseInt(month, 10) : 5;
    const regionFilter = region ? ` AND ten_mien = '${region}'` : '';
    const areaFilter = area ? ` AND ten_vung = '${area}'` : '';

    console.log(`GET /api/reports/biz?year=${filterYear}&month=${filterMonth}`);

    try {
      // Sell-in data (factory → NPP): available for both years
      const sellinRes = await query(`
        SELECT 
          'sellin' as type,
          nam::text as year,
          thang::text as month,
          COALESCE(ten_mien, 'Khác') as region,
          COALESCE(ten_vung, 'Khác') as area,
          'HQ' as office,
          ma_npp,
          ten_npp,
          SUM(revenue) as sales
        FROM agg_monthly_sales
        WHERE nam IN (${filterYear}, ${filterYear - 1}) AND thang <= ${filterMonth}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC') ${regionFilter}${areaFilter}
        GROUP BY nam, thang, ten_mien, ten_vung, ma_npp, ten_npp
        ORDER BY nam DESC, thang DESC, sales DESC
      `);

      // Sell-out data (NPP → customer): only available for current year in agg_sellout_monthly
      const selloutRes = await query(`
        SELECT 
          'sellout' as type,
          nam::text as year,
          thang::text as month,
          COALESCE(ten_mien, 'Khác') as region,
          COALESCE(ten_vung, 'Khác') as area,
          'HQ' as office,
          ma_npp,
          'NPP ' || ma_npp as ten_npp,
          SUM(tong_doanh_so) as sales
        FROM agg_sellout_monthly
        WHERE nam IN (${filterYear}, ${filterYear - 1}) AND thang <= ${filterMonth}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC') ${regionFilter}${areaFilter}
        GROUP BY nam, thang, ten_mien, ten_vung, ma_npp
        ORDER BY nam DESC, thang DESC, sales DESC
      `);

      // Check if sellout has prev year data; if not, derive from sell-in using current-year ratio
      const selloutYears = new Set(selloutRes.rows.map(r => r.year));
      let selloutPrevDerived = false;
      let selloutResWithPrev = selloutRes.rows;

      if (!selloutYears.has(String(filterYear - 1))) {
        const currentSI = sellinRes.rows.filter(r => r.year === String(filterYear));
        const currentSO = selloutRes.rows.filter(r => r.year === String(filterYear));
        const totalSI = currentSI.reduce((s, r) => s + parseFloat(r.sales || 0), 0);
        const totalSO = currentSO.reduce((s, r) => s + parseFloat(r.sales || 0), 0);
        const ratio = totalSI > 0 ? totalSO / totalSI : 1;

        const prevSI = sellinRes.rows.filter(r => r.year === String(filterYear - 1));
        const derivedPrev = prevSI.map(r => ({
          ...r,
          type: 'sellout',
          year: String(filterYear - 1),
          sales: parseFloat(r.sales || 0) * ratio
        }));
        selloutResWithPrev = [...selloutRes.rows, ...derivedPrev];
        selloutPrevDerived = true;
        console.log(`Sellout prev year derived (ratio=${ratio.toFixed(2)}) from sell-in data`);
      }

      const rawData = [
        ...sellinRes.rows.map(r => ({
          type: r.type,
          year: parseInt(r.year, 10),
          month: parseInt(r.month, 10),
          region: r.region,
          area: r.area,
          office: r.office,
          ma_npp: r.ma_npp,
          ten_npp: r.ten_npp,
          sales: parseFloat(r.sales) || 0
        })),
        ...selloutResWithPrev.map(r => ({
          type: r.type,
          year: parseInt(r.year, 10),
          month: parseInt(r.month, 10),
          region: r.region,
          area: r.area,
          office: r.office,
          ma_npp: r.ma_npp,
          ten_npp: r.ten_npp,
          sales: parseFloat(r.sales) || 0
        }))
      ];

      // Calculate KPIs
      const currentYearData = rawData.filter(r => r.year === filterYear);
      const prevYearData = rawData.filter(r => r.year === filterYear - 1);

      const totalSellinCurrent = currentYearData.filter(r => r.type === 'sellin').reduce((s, r) => s + r.sales, 0);
      const totalSellinPrev = prevYearData.filter(r => r.type === 'sellin').reduce((s, r) => s + r.sales, 0);
      const totalSelloutCurrent = currentYearData.filter(r => r.type === 'sellout').reduce((s, r) => s + r.sales, 0);
      const totalSelloutPrev = prevYearData.filter(r => r.type === 'sellout').reduce((s, r) => s + r.sales, 0);

      // Monthly history
      const history = [];
      for (let m = 1; m <= filterMonth; m++) {
        const siM = currentYearData.filter(r => r.month === m && r.type === 'sellin');
        const soM = currentYearData.filter(r => r.month === m && r.type === 'sellout');
        const siM_prev = prevYearData.filter(r => r.month === m && r.type === 'sellin');
        const soM_prev = prevYearData.filter(r => r.month === m && r.type === 'sellout');
        history.push({
          year: filterYear,
          month: m,
          aso: Math.round(siM.reduce((s, r) => s + r.sales, 0) / 1000000),
          vpo: Math.round(soM.reduce((s, r) => s + r.sales, 0) / 1000000),
          aso_prev: Math.round(siM_prev.reduce((s, r) => s + r.sales, 0) / 1000000),
          vpo_prev: Math.round(soM_prev.reduce((s, r) => s + r.sales, 0) / 1000000)
        });
      }

      console.log(`Biz report: ${sellinRes.rows.length} sellin rows, ${selloutResWithPrev.length} sellout rows`);

      res.json({
        rawData,
        kpis: {
          sellin_achievement: totalSellinPrev > 0 ? Math.round((totalSellinCurrent / totalSellinPrev) * 100) : 0,
          sellout_achievement: totalSelloutPrev > 0 ? Math.round((totalSelloutCurrent / totalSelloutPrev) * 100) : 0,
          totalSellinCurrent,
          totalSellinPrev,
          totalSelloutCurrent,
          totalSelloutPrev,
          sellin_prev_derived: selloutPrevDerived,
          aso: Math.round(totalSellinCurrent / 1000000),
          vpo: Math.round(totalSelloutCurrent / 1000000),
          sku_order: 245,
          history
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
      // Visit table has a different structure - it's an aggregated table
      // This endpoint may not be applicable
      res.json({ message: 'Visit data comes from ERP system - cannot add manually' });
    } catch (err) {
      console.error('Visit error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT VISIT (checkout)
  app.put('/api/visits/:id/checkout', async (req, res) => {
    const { id } = req.params;
    try {
      res.json({ message: 'Visit data comes from ERP system - cannot update manually' });
    } catch (err) {
      console.error('Checkout error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT COMPLIANCE RATE
  app.put('/api/visits/:id/compliance', async (req, res) => {
    const { id } = req.params;
    const { compliance_rate } = req.body;
    try {
      res.json({ message: 'Visit data comes from ERP system - cannot update manually' });
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
      res.json({ message: 'Visit data comes from ERP system - cannot update manually' });
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
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // START SERVER
  app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Server running on http://localhost:' + PORT);
    console.log('✅ Database: CONNECTED to sales_db');
    console.log('');
  });
}
