const { Client } = require('pg');

async function run() {
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

    // Step 1: Create customer_region_map if not exists
    console.log('\n📋 Step 1: Creating customer_region_map...');
    await client.query('DROP TABLE IF EXISTS customer_region_map');
    await client.query(`
      CREATE TABLE customer_region_map AS
      SELECT DISTINCT ON (ma_nha_phan_phoi)
        ma_nha_phan_phoi,
        COALESCE(mien, 'Khác') AS mien,
        COALESCE(ten_vung, 'Khác') AS vung
      FROM customer
      WHERE ma_nha_phan_phoi IS NOT NULL
        AND ma_nha_phan_phoi <> ''
    `);
    await client.query('CREATE INDEX idx_crm_nhapp ON customer_region_map(ma_nha_phan_phoi)');
    console.log('✅ customer_region_map created');

    // Step 2: Create region mapping from saleteam for unmatched
    console.log('\n📋 Step 2: Creating saleteam region mapping...');
    await client.query('DROP TABLE IF EXISTS saleteam_region_map');
    await client.query(`
      CREATE TABLE saleteam_region_map AS
      SELECT DISTINCT ON (ma_nha_phan_phoi)
        ma_nha_phan_phoi,
        COALESCE(mien, 'Khác') AS mien,
        COALESCE(ten_vung, 'Khác') AS vung
      FROM customer
      WHERE ma_nha_phan_phoi IS NOT NULL
        AND mien IS NOT NULL
    `);
    await client.query('CREATE INDEX idx_strm_nhapp ON saleteam_region_map(ma_nha_phan_phoi)');

    // Step 3: Drop existing all_sales_data
    console.log('\n📋 Step 3: Dropping old all_sales_data...');
    await client.query('DROP TABLE IF EXISTS all_sales_data');

    // Step 4: Create indexes for performance
    console.log('\n📋 Step 4: Creating indexes...');
    await client.query('CREATE INDEX idx_sellout_mien ON sellout(ten_mien)');
    await client.query('CREATE INDEX idx_sellin_soldto ON sellin(sold_to_party)');
    await client.query('CREATE INDEX idx_sellin_date ON sellin(billing_date)');
    await client.query('CREATE INDEX idx_sellin_material ON sellin(material)');

    // Step 5: Create all_sales_data with optimized query
    console.log('\n📋 Step 5: Creating all_sales_data (this may take a few minutes)...');
    
    // Use COPY approach for faster insert
    const queryStr = `
      CREATE TABLE all_sales_data AS
      -- 1. Sellout records
      SELECT
          'Sellout'::text AS type,
          TO_DATE(ngay_dat_hang, 'DD/MM/YYYY') AS ngay,
          CAST(RIGHT(thang, 2) AS INTEGER) AS thang,
          CAST(nam AS INTEGER) AS nam,
          ten_mien AS mien,
          ten_vung AS vung,
          COALESCE(office, '') AS office,
          ma_npp,
          ten_npp,
          COALESCE(ten_nhan_vien, '') AS nvbh,
          COALESCE(ten_gsbh, '') AS gsbh,
          ma_san_pham,
          ten_san_pham,
          COALESCE(nhom_hang_cat, 'Other') AS nganh_hang,
          COALESCE(ph1, '') AS nhom_sp,
          COALESCE(ph2, '') AS phan_nhom_sp,
          CAST(doanh_so_sau_ck_vat AS NUMERIC) AS doanh_so,
          CAST(sl_giao AS NUMERIC) AS sl_giao
      FROM sellout

      UNION ALL

      -- 2. Sellin records with region mapping
      SELECT
          'Sellin'::text AS type,
          s.billing_date::date AS ngay,
          EXTRACT(MONTH FROM s.billing_date)::integer AS thang,
          EXTRACT(YEAR FROM s.billing_date)::integer AS nam,
          COALESCE(crm.mien, 'Khác') AS mien,
          COALESCE(crm.vung, 'Khác') AS vung,
          COALESCE(crm.vung, 'Khác') AS office,
          s.sold_to_party AS ma_npp,
          s.sold_to_name AS ten_npp,
          '' AS nvbh,
          '' AS gsbh,
          s.material AS ma_san_pham,
          s.material_description AS san_pham,
          COALESCE(p.nganh_hang_cat, 'Other') AS nganh_hang,
          COALESCE(p.ph1, '') AS nhom_sp,
          COALESCE(p.ph2, '') AS phan_nhom_sp,
          CAST(s.sum_of_billing_net_amt AS NUMERIC) AS doanh_so,
          0 AS sl_giao
      FROM sellin s
      LEFT JOIN customer_region_map crm ON s.sold_to_party = crm.ma_nha_phan_phoi
      LEFT JOIN (
        SELECT DISTINCT ON (ma_san_pham)
          TRIM(ma_san_pham) AS ma_san_pham,
          nganh_hang_import_inhouse AS nganh_hang_cat,
          ph1, ph2
        FROM product
        WHERE ma_san_pham IS NOT NULL
      ) p ON TRIM(s.material) = p.ma_san_pham
      WHERE s.material IS NOT NULL
        AND s.material <> ''
        AND s.material <> 'Grand Total'
        AND s.billing_date IS NOT NULL
    `;

    const startTime = Date.now();
    await client.query(queryStr);
    console.log(`✅ all_sales_data created in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    // Step 6: Create indexes on all_sales_data
    console.log('\n📋 Step 6: Creating indexes on all_sales_data...');
    await client.query('CREATE INDEX idx_asd_mien ON all_sales_data(mien)');
    await client.query('CREATE INDEX idx_asd_vung ON all_sales_data(vung)');
    await client.query('CREATE INDEX idx_asd_nam_thang ON all_sales_data(nam, thang)');
    await client.query('CREATE INDEX idx_asd_type ON all_sales_data(type)');
    await client.query('CREATE INDEX idx_asd_nganh ON all_sales_data(nganh_hang)');
    await client.query('CLUSTER all_sales_data USING idx_asd_mien');

    // Check results
    console.log('\n📊 Results:');
    const count = await client.query('SELECT COUNT(*) FROM all_sales_data');
    console.log(`Total rows: ${count.rows[0].count}`);

    const regionDist = await client.query(`
      SELECT type, mien, COUNT(*) as cnt
      FROM all_sales_data
      GROUP BY type, mien
      ORDER BY type, cnt DESC
    `);
    console.log('\nRegion Distribution:');
    console.table(regionDist.rows);

    console.log('\n🎉 Fix completed successfully!');

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

run();
