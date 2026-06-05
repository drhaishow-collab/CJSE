const { Client } = require('pg');

async function run() {
  const c = new Client({ user: 'postgres', password: '123456', host: 'localhost', port: 5432, database: 'sales_db' });
  await c.connect();
  
  // 1. Check sellout table - what fields does it have for KPIs
  console.log('=== SELLOUT COLUMNS ===');
  const selloutCols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sellout' ORDER BY ordinal_position`);
  selloutCols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
  
  // 2. Check sellout sample
  console.log('\n=== SELLOUT SAMPLE (key fields) ===');
  const sample = await c.query(`SELECT DISTINCT ten_mien, ten_vung, ten_ql_vung, ten_gsbh, ten_nhan_vien, ma_nv, ma_kh, ten_khach_hang, kenh_kh FROM sellout LIMIT 5`);
  console.log(JSON.stringify(sample.rows, null, 2));

  // 3. Check visit table - rich attendance / visit data
  console.log('\n=== VISIT TABLE SAMPLE (key fields) ===');
  const visitSample = await c.query(`SELECT ten_mien, ten_vung, ten_ql_vung, ten_gsbh, ten_nv, ma_nv, tong_khach_hang, tong_kh_vieng_tham_trong_tuyen, tong_kh_vieng_tham_ngoai_tuyen, tong_thoi_gian_lam_viec FROM visit LIMIT 5`);
  console.log(JSON.stringify(visitSample.rows, null, 2));
  
  // 4. Check visit distinct ma_nv count
  console.log('\n=== VISIT STATS ===');
  const visitStats = await c.query(`SELECT COUNT(DISTINCT ma_nv) as reps, COUNT(*) as total_rows, COUNT(DISTINCT ten_gsbh) as sups FROM visit`);
  console.log('Reps:', visitStats.rows[0].reps, 'Total rows:', visitStats.rows[0].total_rows, 'Sups:', visitStats.rows[0].sups);
  
  // 5. Check sellout - unique customer count (ASO = Active Selling Outlet)
  console.log('\n=== SELLOUT CUSTOMER STATS ===');
  const custStats = await c.query(`
    SELECT 
      COUNT(DISTINCT ma_nv) as reps,
      COUNT(DISTINCT ma_kh) as unique_customers,
      COUNT(DISTINCT so_don_hang) as orders,
      COUNT(*) as total_lines
    FROM sellout
  `);
  console.log(JSON.stringify(custStats.rows[0]));
  
  // 6. Check what KPIs we can derive from sellout - per rep
  console.log('\n=== KPI DERIVATION SAMPLE (per rep, top 5) ===');
  const kpiSample = await c.query(`
    SELECT 
      ten_nhan_vien,
      ten_gsbh,
      ten_ql_vung,
      ten_mien,
      COUNT(DISTINCT ma_kh) as mcp_total_customers,
      COUNT(DISTINCT CASE WHEN doanh_so_sau_ck_vat > 0 THEN ma_kh END) as aso_buying_outlets,
      COUNT(DISTINCT so_don_hang) as total_orders,
      SUM(doanh_so_sau_ck_vat) as total_sales,
      SUM(sl_giao) as total_qty,
      COUNT(DISTINCT ma_san_pham) as unique_skus
    FROM sellout
    GROUP BY ten_nhan_vien, ten_gsbh, ten_ql_vung, ten_mien
    ORDER BY total_sales DESC
    LIMIT 5
  `);
  console.log(JSON.stringify(kpiSample.rows, null, 2));

  // 7. Check temp_checkin_checkout for attendance KPI
  console.log('\n=== CHECK-IN/CHECK-OUT SAMPLE ===');
  const checkinSample = await c.query(`SELECT * FROM temp_checkin_checkout LIMIT 2`);
  console.log(JSON.stringify(checkinSample.rows, null, 2));
  
  // 8. Check npp table 
  console.log('\n=== NPP TABLE ===');
  const nppCols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'npp' ORDER BY ordinal_position`);
  console.log('Columns:', nppCols.rows.map(r => r.column_name).join(', '));
  
  const nppSample = await c.query(`SELECT * FROM npp LIMIT 2`);
  console.log(JSON.stringify(nppSample.rows, null, 2));
  
  await c.end();
}

run().catch(e => console.error(e));
