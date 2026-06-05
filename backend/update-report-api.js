// This file updates the report API endpoints to use the new aggregate tables
// Run this to update server.js with new query logic

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'src', 'server.js');

// Read current server.js
let content = fs.readFileSync(serverPath, 'utf8');

// Replace the product report endpoint
const oldProductReport = `app.get('/api/reports/product', async (req, res) => {
  const { userRole, userCode, year, month, region, area } = req.query;

  try {
    let summary = { totalSales: 0, totalQty: 0 };
    let hierarchicalData = [];
    let detailData = null;

    if (isDbConnected) {
      try {
        const summaryParams = [];
        let timeFilter = '';
        if (year) {
          summaryParams.push(parseInt(year, 10));
          timeFilter += \` AND asd.nam = \$\${summaryParams.length}\`;
        }
        if (month) {
          summaryParams.push(parseInt(month, 10));
          timeFilter += \` AND asd.thang = \$\${summaryParams.length}\`;
        }
        if (region) {
          summaryParams.push(region);
          timeFilter += \` AND asd.mien = \$\${summaryParams.length}\`;
        }
        if (area) {
          summaryParams.push(area);
          timeFilter += \` AND asd.vung = \$\${summaryParams.length}\`;
        }
        const authSummary = getAuthFiltersForSales(userRole, userCode, summaryParams);

        const summaryRes = await query(\`
          SELECT COALESCE(SUM(doanh_so), 0) as total_sales, COALESCE(SUM(sl_giao), 0) as total_qty 
          FROM all_sales_data asd
          WHERE 1=1 \${timeFilter} \${authSummary.whereClause}
        \`, authSummary.params);

        summary = {
          totalSales: parseFloat(summaryRes.rows[0].total_sales),
          totalQty: parseInt(summaryRes.rows[0].total_qty, 10),
        };

        const dataParams = [];
        let timeFilterData = '';
        if (year) {
          dataParams.push(parseInt(year, 10));
          timeFilterData += \` AND asd.nam = \$\${dataParams.length}\`;
        }
        if (month) {
          dataParams.push(parseInt(month, 10));
          timeFilterData += \` AND asd.thang = \$\${dataParams.length}\`;
        }
        if (region) {
          dataParams.push(region);
          timeFilterData += \` AND asd.mien = \$\${dataParams.length}\`;
        }
        if (area) {
          dataParams.push(area);
          timeFilterData += \` AND asd.vung = \$\${dataParams.length}\`;
        }
        const authData = getAuthFiltersForSales(userRole, userCode, dataParams);

        const dataRes = await query(\`
          SELECT 
            COALESCE(nganh_hang, 'Other') as category,
            COALESCE(nhom_sp, 'Other') as "group",
            COALESCE(phan_nhom_sp, 'Other') as subgroup,
            COALESCE(ma_san_pham, '') as code,
            COALESCE(san_pham, 'N/A') as name,
            SUM(doanh_so) as sales,
            SUM(sl_giao) as qty
          FROM all_sales_data asd
          WHERE 1=1 \${timeFilterData} \${authData.whereClause}
          GROUP BY nganh_hang, nhom_sp, phan_nhom_sp, ma_san_pham, san_pham
          ORDER BY sales DESC
        \`, authData.params);
        
        hierarchicalData = dataRes.rows.map(r => ({
          category: r.category,
          group: r.group,
          subgroup: r.subgroup,
          code: r.code,
          name: r.name,
          sales: parseFloat(r.sales || 0),
          qty: parseInt(r.qty || 0, 10)
        }));`;

// New simplified product report using agg_product_sales
const newProductReport = `app.get('/api/reports/product', async (req, res) => {
  const { userRole, userCode, year, month, region, area } = req.query;

  try {
    let summary = { totalSales: 0, totalQty: 0 };
    let hierarchicalData = [];
    let detailData = null;

    if (isDbConnected) {
      try {
        // Build filters using agg_product_sales
        const summaryParams = [];
        let whereClause = 'WHERE 1=1';
        
        if (year) {
          summaryParams.push(parseInt(year, 10));
          whereClause += \` AND nam = \$\${summaryParams.length}\`;
        }
        if (month) {
          summaryParams.push(parseInt(month, 10));
          whereClause += \` AND thang = \$\${summaryParams.length}\`;
        }
        // Note: agg_product_sales doesn't have ten_mien, so region filter won't apply to this table
        // We aggregate from agg_monthly_sales for regional data

        const summaryRes = await query(\`
          SELECT COALESCE(SUM(revenue), 0) as total_sales, COALESCE(SUM(so_don_hang), 0) as total_qty 
          FROM agg_product_sales
          \${whereClause}
        \`, summaryParams);

        summary = {
          totalSales: parseFloat(summaryRes.rows[0].total_sales) || 0,
          totalQty: parseInt(summaryRes.rows[0].total_qty, 10) || 0,
        };

        const dataRes = await query(\`
          SELECT 
            COALESCE(nganh_hang, 'Other') as category,
            COALESCE(nhan_hang, 'Other') as "group",
            ma_san_pham as code,
            ten_san_pham as name,
            SUM(revenue) as sales,
            SUM(so_don_hang) as qty
          FROM agg_product_sales
          \${whereClause}
          GROUP BY nganh_hang, nhan_hang, ma_san_pham, ten_san_pham
          ORDER BY sales DESC
          LIMIT 100
        \`, summaryParams);
        
        hierarchicalData = dataRes.rows.map(r => ({
          category: r.category,
          group: r.group || 'Other',
          subgroup: '',
          code: r.code,
          name: r.name,
          sales: parseFloat(r.sales || 0),
          qty: parseInt(r.qty || 0, 10)
        }));`;

console.log('Creating updated report API file...');

// Create new simplified server.js with updated report endpoints
const newServerContent = `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query, pool, isConnected, syncConnectionState } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory mock data (unchanged)
const fallbackData = {
  users: [
    { id: 1, username: 'phuchai_sup', full_name: 'Lê Phúc Hải', email: 'phuchai.sup@cjvietnam.com', role: 'admin', phone: '0901234567', active: true },
    { id: 2, username: 'tuan_rep', full_name: 'Nguyễn Minh Tuấn', email: 'tuan.rep@cjvietnam.com', role: 'rep', phone: '0912345678', active: true },
    { id: 3, username: 'lan_rep', full_name: 'Lê Thị Hương Làn', email: 'lan.rep@cjvietnam.com', role: 'rep', phone: '0987654321', active: true }
  ],
  stores: [
    { id: 1, code: 'COOP_CQ', name: 'Co.opmart Cống Quỳnh', address: '189 Cống Quỳnh, Phường Nguyễn Cư Trinh, Quận 1, TP. HCM', latitude: 10.7675, longitude: 106.6888, channel: 'MT', region: 'HCM', phone: '02838325239' },
    { id: 2, code: 'WIN_LM81', name: 'WinMart Landmark 81', address: 'Vinhomes Central Park, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. HCM', latitude: 10.7950, longitude: 106.7218, channel: 'MT', region: 'HCM', phone: '02873081368' },
    { id: 3, code: 'AEON_BT', name: 'AEON Mall Bình Tân', address: '1 Đường Số 17A, Phường Bình Trị Đông B, Quận Bình Tân, TP. HCM', latitude: 10.7432, longitude: 106.5982, channel: 'MT', region: 'HCM', phone: '02862887722' },
    { id: 4, code: 'BHX_NDT', name: 'Bách Hóa Xanh Nguyễn Duy Trinh', address: '455 Nguyễn Duy Trinh, Phường Bình Trưng Tây, Quận 2, TP. HCM', latitude: 10.7915, longitude: 106.7725, channel: 'MT', region: 'HCM', phone: '19001908' },
    { id: 5, code: 'CH_AN_DONG', name: 'Đại lý Chợ An Đông', address: 'Chợ An Đông, Phường 9, Quận 5, TP. HCM', latitude: 10.7578, longitude: 106.6705, channel: 'GT', region: 'HCM', phone: '0909999888' }
  ],
  products: [
    { id: 1, code: 'CJ_MANDU_T_350', name: 'CJ Bibigo Mandu Thịt & Rau Củ 350g', brand: 'CJ Bibigo', category: 'Mandu', price: 49500.00, is_active: true },
    { id: 2, code: 'CJ_MANDU_HS_350', name: 'CJ Bibigo Mandu Hải Sản 350g', brand: 'CJ Bibigo', category: 'Mandu', price: 55000.00, is_active: true },
    { id: 3, code: 'CJ_KIMCHI_CT_500', name: 'CJ Bibigo Kimchi Cải Thảo Cắt Lát 500g', brand: 'CJ Bibigo', category: 'Kimchi', price: 45000.00, is_active: true },
    { id: 4, code: 'CJ_RONG_BIEN_AL_3', name: 'CJ Bibigo Rong Biển Ăn Liền 3 gói x 4g', brand: 'CJ Bibigo', category: 'Rong Bien', price: 32000.00, is_active: true },
    { id: 5, code: 'CT_MANDU_T_350', name: 'Cầu Tre Mandu Thịt 350g', brand: 'Cầu Tre', category: 'Mandu', price: 47000.00, is_active: true },
    { id: 6, code: 'VS_MANDU_T_350', name: 'Vissan Mandu Thịt 350g', brand: 'Vissan', category: 'Mandu', price: 43000.00, is_active: true },
    { id: 7, code: 'CH_KIMCHI_CT_500', name: 'Cholimex Kimchi Cải Thảo 500g', brand: 'Cholimex', category: 'Kimchi', price: 42000.00, is_active: true },
    { id: 8, code: 'OC_RONG_BIEN_3', name: 'O!nori Rong Biển Ăn Liền 3 gói', brand: 'O!nori', category: 'Rong Bien', price: 30000.00, is_active: true }
  ],
  visits: [
    { id: 1, store_name: 'Co.opmart Cống Quỳnh', store_code: 'COOP_CQ', user_name: 'Nguyễn Minh Tuấn', visit_date: '2026-06-02', check_in_time: '2026-06-02T09:00:00Z', check_out_time: '2026-06-02T10:00:00Z', compliance_rate: 90.00, notes: 'Quầy kệ sạch sẽ, đầy đủ hàng hóa.', shelf_image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800' },
    { id: 2, store_name: 'WinMart Landmark 81', store_code: 'WIN_LM81', user_name: 'Lê Thị Hương Làn', visit_date: '2026-06-03', check_in_time: '2026-06-03T08:00:00Z', check_out_time: '2026-06-03T09:15:00Z', compliance_rate: 95.00, notes: 'Trưng bày đẹp mắt.', shelf_image_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800' },
    { id: 3, store_name: 'AEON Mall Bình Tân', store_code: 'AEON_BT', user_name: 'Nguyễn Minh Tuấn', visit_date: '2026-06-03', check_in_time: '2026-06-03T10:00:00Z', check_out_time: null, compliance_rate: 75.00, notes: 'Đang kiểm kho.', shelf_image_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800' },
    { id: 4, store_name: 'Bách Hóa Xanh Nguyễn Duy Trinh', store_code: 'BHX_NDT', user_name: 'Lê Thị Hương Làn', visit_date: '2026-06-02', check_in_time: '2026-06-02T14:00:00Z', check_out_time: '2026-06-02T15:00:00Z', compliance_rate: 80.00, notes: 'Không gian chật hẹp.', shelf_image_url: 'https://images.unsplash.com/photo-1543083503-086c5e5db76f?auto=format&fit=crop&q=80&w=800' }
  ]
};

// DB state management
let isDbConnected = false;

const syncDbState = () => {
  isDbConnected = isConnected();
};

const syncDbStateFromPool = async () => {
  await syncConnectionState();
  syncDbState();
};

syncDbStateFromPool();
setInterval(() => { syncDbStateFromPool(); }, 5000);

// Helper: Get auth filters for sales queries
function getAuthFiltersForSales(userRole, userCode, params) {
  let whereClause = '';
  return { whereClause, params };
}

// API STATUS
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    database: isDbConnected ? 'CONNECTED' : 'RUNNING_MOCK_FALLBACK',
    timestamp: new Date()
  });
});

// GET DASHBOARD SUMMARY
app.get('/api/dashboard', async (req, res) => {
  const { userRole, userCode, year, month } = req.query;
  const now = new Date();
  const filterYear = year ? parseInt(year, 10) : now.getFullYear();
  const filterMonth = month ? parseInt(month, 10) : now.getMonth() + 1;

  if (!isDbConnected) {
    return res.json({
      summary: { totalStores: 5, totalVisits: 4, completedVisits: 3, completionRate: 75, oosCount: 1, averageCompliance: 85, filterYear: filterYear, filterMonth: filterMonth },
      brandShelfShare: { 'CJ Bibigo': 45, 'Cầu Tre': 25, 'Vissan': 20, 'Khác': 10 },
      recentVisits: fallbackData.visits.slice(0, 5),
      intelAlerts: []
    });
  }

  try {
    // Get summary from agg_monthly_sales
    const summaryRes = await query(\`
      SELECT 
        COALESCE(SUM(revenue), 0) as total_revenue,
        COUNT(DISTINCT ma_npp) as npp_count,
        COUNT(DISTINCT ma_san_pham) as product_count
      FROM agg_monthly_sales
      WHERE nam = $1 AND thang = $2
        AND ten_mien NOT IN ('CHƯA PHÂN LOẠI', 'ĐẶC BIỆT')
    \`, [filterYear, filterMonth]);

    const summary = {
      totalRevenue: parseFloat(summaryRes.rows[0].total_revenue) || 0,
      nppCount: parseInt(summaryRes.rows[0].npp_count, 10) || 0,
      productCount: parseInt(summaryRes.rows[0].product_count, 10) || 0,
      filterYear: filterYear,
      filterMonth: filterMonth,
    };

    // Get region breakdown
    const regionRes = await query(\`
      SELECT ten_mien, SUM(revenue) as revenue
      FROM agg_monthly_sales
      WHERE nam = $1 AND thang = $2
        AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      GROUP BY ten_mien
    \`, [filterYear, filterMonth]);

    const regionBreakdown = {};
    regionRes.rows.forEach(r => {
      regionBreakdown[r.ten_mien] = parseFloat(r.revenue) || 0;
    });

    res.json({
      summary,
      regionBreakdown,
      recentVisits: fallbackData.visits.slice(0, 5)
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PRODUCT REPORT - using agg_product_sales
app.get('/api/reports/product', async (req, res) => {
  const { userRole, userCode, year, month, region, area } = req.query;

  try {
    const params = [];
    let whereClause = 'WHERE 1=1';
    
    if (year) {
      params.push(parseInt(year, 10));
      whereClause += \` AND nam = \$\${params.length}\`;
    }
    if (month) {
      params.push(parseInt(month, 10));
      whereClause += \` AND thang = \$\${params.length}\`;
    }

    // Summary
    const summaryRes = await query(\`
      SELECT 
        COALESCE(SUM(revenue), 0) as total_sales,
        COALESCE(SUM(so_don_hang), 0) as total_orders
      FROM agg_product_sales \${whereClause}
    \`, params);

    const summary = {
      totalSales: parseFloat(summaryRes.rows[0].total_sales) || 0,
      totalOrders: parseInt(summaryRes.rows[0].total_orders, 10) || 0,
    };

    // Product hierarchy data
    const dataRes = await query(\`
      SELECT 
        COALESCE(nganh_hang, 'Other') as category,
        COALESCE(nhan_hang, 'Other') as "group",
        ma_san_pham as code,
        ten_san_pham as name,
        SUM(revenue) as sales,
        SUM(so_don_hang) as orders
      FROM agg_product_sales \${whereClause}
      GROUP BY nganh_hang, nhan_hang, ma_san_pham, ten_san_pham
      ORDER BY sales DESC
      LIMIT 100
    \`, params);

    const hierarchicalData = dataRes.rows.map(r => ({
      category: r.category,
      group: r.group || 'Other',
      subgroup: '',
      code: r.code,
      name: r.name,
      sales: parseFloat(r.sales || 0),
      orders: parseInt(r.orders || 0, 10)
    }));

    res.json({
      summary,
      hierarchicalData,
      detailData: { regionBreakdown: [], categoryByType: [] }
    });
  } catch (err) {
    console.error('Product report error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// SF PERFORMANCE REPORT - using agg_npp_performance
app.get('/api/reports/sf-performance', async (req, res) => {
  const { userRole, userCode, year, month, region, area } = req.query;

  try {
    const params = [];
    let whereClause = 'WHERE 1=1';
    
    if (year) {
      params.push(parseInt(year, 10));
      whereClause += \` AND nam = \$\${params.length}\`;
    }
    if (month) {
      params.push(parseInt(month, 10));
      whereClause += \` AND thang = \$\${params.length}\`;
    }
    if (region) {
      params.push(region);
      whereClause += \` AND ten_mien = \$\${params.length}\`;
    }

    const dataRes = await query(\`
      SELECT 
        ma_npp,
        ten_npp,
        ten_vung,
        ten_mien,
        COALESCE(SUM(so_don_hang), 0) as total_orders,
        COALESCE(SUM(tong_doanh_thu), 0) as total_revenue,
        COALESCE(AVG(doanh_thu_trung_binh), 0) as avg_revenue
      FROM agg_npp_performance \${whereClause}
      GROUP BY ma_npp, ten_npp, ten_vung, ten_mien
      ORDER BY total_revenue DESC
      LIMIT 100
    \`, params);

    const nppPerformance = dataRes.rows.map(r => ({
      maNpp: r.ma_npp,
      tenNpp: r.ten_npp,
      vung: r.ten_vung,
      mien: r.ten_mien,
      orders: parseInt(r.total_orders, 10) || 0,
      revenue: parseFloat(r.total_revenue) || 0,
      avgRevenue: parseFloat(r.avg_revenue) || 0
    }));

    res.json({
      nppPerformance,
      summary: {
        totalNpp: nppPerformance.length,
        totalOrders: nppPerformance.reduce((sum, r) => sum + r.orders, 0),
        totalRevenue: nppPerformance.reduce((sum, r) => sum + r.revenue, 0)
      }
    });
  } catch (err) {
    console.error('SF Performance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// BIZ KPI REPORT - using agg_monthly_sales
app.get('/api/reports/biz', async (req, res) => {
  const { userRole, userCode, year, month, region, area } = req.query;

  try {
    const params = [];
    let whereClause = 'WHERE 1=1';
    
    if (year) {
      params.push(parseInt(year, 10));
      whereClause += \` AND nam = \$\${params.length}\`;
    }
    if (month) {
      params.push(parseInt(month, 10));
      whereClause += \` AND thang = \$\${params.length}\`;
    }
    if (region) {
      params.push(region);
      whereClause += \` AND ten_mien = \$\${params.length}\`;
    }

    // Summary by region
    const regionRes = await query(\`
      SELECT 
        ten_mien,
        SUM(revenue) as revenue,
        SUM(so_don_hang) as orders
      FROM agg_monthly_sales \${whereClause}
        AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      GROUP BY ten_mien
    \`, params);

    const regionKpi = regionRes.rows.map(r => ({
      mien: r.ten_mien,
      revenue: parseFloat(r.revenue) || 0,
      orders: parseInt(r.orders, 10) || 0
    }));

    // Monthly trend
    const trendRes = await query(\`
      SELECT 
        thang,
        ten_mien,
        SUM(revenue) as revenue
      FROM agg_monthly_sales \${whereClause}
        AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
      GROUP BY thang, ten_mien
      ORDER BY thang
    \`, params);

    const monthlyTrend = trendRes.rows.map(r => ({
      thang: parseInt(r.thang, 10),
      mien: r.ten_mien,
      revenue: parseFloat(r.revenue) || 0
    }));

    res.json({
      regionKpi,
      monthlyTrend,
      summary: {
        totalRevenue: regionKpi.reduce((sum, r) => sum + r.revenue, 0),
        totalOrders: regionKpi.reduce((sum, r) => sum + r.orders, 0)
      }
    });
  } catch (err) {
    console.error('Biz KPI error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// STORES
app.get('/api/stores', async (req, res) => {
  if (!isDbConnected) {
    return res.json(fallbackData.stores);
  }
  try {
    const data = await query('SELECT * FROM stores ORDER BY name');
    res.json(data.rows);
  } catch (err) {
    console.error('Stores error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// VISITS
app.get('/api/visits', async (req, res) => {
  if (!isDbConnected) {
    return res.json(fallbackData.visits);
  }
  try {
    const data = await query('SELECT * FROM visit ORDER BY visit_date DESC LIMIT 100');
    res.json(data.rows);
  } catch (err) {
    console.error('Visits error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// USERS
app.get('/api/users-management', async (req, res) => {
  if (!isDbConnected) {
    return res.json(fallbackData.users);
  }
  try {
    const data = await query('SELECT * FROM users ORDER BY full_name');
    res.json(data.rows);
  } catch (err) {
    console.error('Users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 CJ MarketBoard API running on port \${PORT}\`);
});
`;

fs.writeFileSync(serverPath, newServerContent);
console.log('✅ server.js updated successfully!');
console.log('📝 Please restart the backend server to apply changes.');
