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

    // Create index on customer.ma_nha_phan_phoi for faster JOIN
    console.log('Creating index on customer.ma_nha_phan_phoi...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_customer_nhapp ON customer(ma_nha_phan_phoi)');
    console.log('✅ Index created');

    // Create index on product.ma_san_pham
    console.log('Creating index on product.ma_san_pham...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_product_masp ON product(ma_san_pham)');

    // Create a pre-aggregated region mapping table for faster JOIN
    console.log('Creating region mapping helper...');
    await client.query(`
      DROP TABLE IF EXISTS customer_region_map;
      CREATE TABLE customer_region_map AS
      SELECT DISTINCT
        c.ma_nha_phan_phoi,
        COALESCE(c.mien, 'Khác') AS mien,
        COALESCE(c.ten_vung, 'Khác') AS vung
      FROM customer c
      WHERE c.ma_nha_phan_phoi IS NOT NULL
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_crm_nhapp ON customer_region_map(ma_nha_phan_phoi)');
    console.log('✅ Region mapping table created');

    console.log('Dropping all_sales_data if exists...');
    await client.query('DROP TABLE IF EXISTS all_sales_data CASCADE');

    console.log('Creating all_sales_data table...');
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
          office AS office,
          ma_npp AS ma_npp,
          ten_npp AS ten_npp,
          ten_nhan_vien AS nvbh,
          ten_gsbh AS gsbh,
          ma_san_pham AS ma_san_pham,
          ten_san_pham AS san_pham,
          nhom_hang_cat AS nganh_hang,
          ph1 AS nhom_sp,
          ph2 AS phan_nhom_sp,
          CAST(doanh_so_sau_ck_vat AS NUMERIC) AS doanh_so,
          CAST(sl_giao AS NUMERIC) AS sl_giao
      FROM sellout

      UNION ALL

      -- 2. Sellin records with optimized region mapping
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
          p.ph1 AS nhom_sp,
          p.ph2 AS phan_nhom_sp,
          CAST(s.sum_of_billing_net_amt AS NUMERIC) AS doanh_so,
          0 AS sl_giao
      FROM sellin s
      LEFT JOIN customer_region_map crm ON s.sold_to_party = crm.ma_nha_phan_phoi
      LEFT JOIN (
        SELECT ma_san_pham,
               MAX(nganh_hang_import_inhouse) AS nganh_hang_cat,
               MAX(ph1) AS ph1,
               MAX(ph2) AS ph2
        FROM product
        GROUP BY ma_san_pham
      ) p ON s.material = p.ma_san_pham
      WHERE s.material IS NOT NULL
        AND s.material <> ''
        AND s.material <> 'Grand Total'
        AND s.billing_date IS NOT NULL
    `;

    await client.query(queryStr);
    console.log('✅ Table all_sales_data created successfully!');

    const res = await client.query('SELECT COUNT(*) FROM all_sales_data');
    console.log(`Total rows in all_sales_data: ${res.rows[0].count}`);

    // Check region distribution
    const regionCheck = await client.query(`
      SELECT type, mien, COUNT(*) as cnt
      FROM all_sales_data
      GROUP BY type, mien
      ORDER BY type, cnt DESC
    `);
    console.log('\n=== Region Distribution ===');
    console.table(regionCheck.rows);

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await client.end();
  }
}

run();
