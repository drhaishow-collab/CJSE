-- Redefining database views for CJ MarketBoard to support both English (for Power BI and React backend) and Vietnamese (for legacy pipelines) columns.

-- Drop existing views first to allow column redefinitions
DROP VIEW IF EXISTS dim_customer CASCADE;
DROP VIEW IF EXISTS dim_npp CASCADE;
DROP VIEW IF EXISTS dim_product CASCADE;
DROP VIEW IF EXISTS dim_salesforce CASCADE;
DROP VIEW IF EXISTS fact_sellin CASCADE;
DROP VIEW IF EXISTS fact_sellout CASCADE;

-- 1. Redefine dim_customer
CREATE OR REPLACE VIEW dim_customer AS
WITH customer_staff AS (
  SELECT DISTINCT ON (ma_kh)
    ma_kh AS ma_khach_hang,
    ma_nv AS staff_id
  FROM sellout
  WHERE ma_kh IS NOT NULL AND ma_nv IS NOT NULL AND ma_nv <> ''
  GROUP BY ma_kh, ma_nv
  ORDER BY ma_kh, COUNT(*) DESC
),
npp_staff AS (
  SELECT DISTINCT ON (ma_npp)
    CAST(ma_npp AS bigint)::text AS ma_npp,
    ma_nv AS staff_id
  FROM saleteam
  WHERE ma_npp IS NOT NULL AND ma_nv IS NOT NULL AND ma_nv <> ''
)
SELECT DISTINCT ON (TRIM(BOTH FROM upper(c.ma_khach_hang)))
    TRIM(BOTH FROM upper(c.ma_khach_hang)) AS ma_khach_hang,
    TRIM(BOTH FROM upper(c.ma_khach_hang)) AS customer_id,
    c.ten_khach_hang,
    c.ten_khach_hang AS customer_name,
    c.nhom_khach_hang,
    c.nhom_khach_hang AS customer_group,
    c.kenh_khach_hang,
    c.kenh_khach_hang AS channel,
    c.ten_tinh,
    c.ten_tinh AS province,
    c.ten_vung,
    c.mien,
    COALESCE(s.staff_id, ns.staff_id) AS staff_id
FROM customer c
LEFT JOIN customer_staff s ON TRIM(BOTH FROM c.ma_khach_hang) = TRIM(BOTH FROM s.ma_khach_hang)
LEFT JOIN npp_staff ns ON TRIM(BOTH FROM c.ma_nha_phan_phoi) = ns.ma_npp
ORDER BY TRIM(BOTH FROM upper(c.ma_khach_hang));

-- 2. Redefine dim_npp
CREATE OR REPLACE VIEW dim_npp AS
SELECT DISTINCT ON (TRIM(BOTH FROM upper(ma_npp::text)))
    TRIM(BOTH FROM upper(ma_npp::text)) AS ma_npp,
    TRIM(BOTH FROM upper(ma_npp::text)) AS npp_id,
    ten_npp,
    ten_npp AS npp_name,
    ma_phu_npp,
    dia_chi_npp,
    dia_chi_npp AS address,
    ten_mien,
    ten_mien AS region,
    ten_vung,
    ten_vung AS area,
    tinh_npp,
    tinh_npp AS province,
    ten_phuong_xa_npp AS phuong_xa,
    office,
    ten_ql_vung AS asm_phu_trach,
    ten_ql_vung AS asm_name,
    ten_gsbh AS ss_phu_trach,
    ten_gsbh AS sup_name,
    ten_nhan_vien AS sr_phu_trach,
    code_phu_nv AS ma_phu_nhan_vien
FROM npp
WHERE ma_npp IS NOT NULL AND TRIM(BOTH FROM ma_npp::text) <> ''
ORDER BY TRIM(BOTH FROM upper(ma_npp::text));

-- 3. Redefine dim_product
CREATE OR REPLACE VIEW dim_product AS
SELECT DISTINCT ON (TRIM(BOTH FROM upper(ma_san_pham)))
    TRIM(BOTH FROM upper(ma_san_pham)) AS ma_san_pham,
    dien_giai AS ten_san_pham,
    dien_giai,
    ten_viet_tat,
    ma_nganh_hang,
    nganh_hang_import_inhouse,
    nganh_hang_import_inhouse AS nganh_hang,
    nhan_hang_d_m_k,
    nhan_hang_d_m_k AS nhan_hang,
    ma_nhom_hang_cat,
    nhom_hang_cat,
    nhom_hang_cat AS nhom_hang,
    ma_ph1,
    ph1,
    ph1 AS phan_loai_1,
    ma_ph2,
    ph2,
    ph2 AS phan_loai_2,
    don_vi_luu_kho,
    so_luong_thung,
    trang_thai
FROM product
WHERE ma_san_pham IS NOT NULL AND TRIM(BOTH FROM ma_san_pham) <> ''
ORDER BY TRIM(BOTH FROM upper(ma_san_pham));

-- 4. Redefine dim_salesforce
CREATE OR REPLACE VIEW dim_salesforce AS
SELECT DISTINCT ON (regexp_replace(upper(ma_nv), '[^a-zA-Z0-9]', '', 'g'))
    regexp_replace(upper(ma_nv), '[^a-zA-Z0-9]', '', 'g') AS ma_nv,
    regexp_replace(upper(ma_nv), '[^a-zA-Z0-9]', '', 'g') AS staff_id,
    ten_nhan_vien,
    ten_nhan_vien AS staff_name,
    ma_gsbh AS sup_id,
    ten_gsbh,
    ten_gsbh AS sup_name,
    ma_quan_ly_vung AS asm_id,
    ten_ql_vung,
    ten_ql_vung AS asm_name,
    ten_mien,
    ten_vung
FROM saleteam
WHERE ma_nv IS NOT NULL AND ma_nv <> '' AND ma_nv <> 'nan'
ORDER BY regexp_replace(upper(ma_nv), '[^a-zA-Z0-9]', '', 'g');

-- 4.5. Redefine fact_kpi (Correction: Align date to May 2026 to match transaction period)
DROP VIEW IF EXISTS fact_kpi CASCADE;
CREATE OR REPLACE VIEW fact_kpi AS
 SELECT '2026-05-01'::date AS ngay_thang,
    ma_nhan_vien AS staff_id,
    ten_nhan_vien AS staff_name,
    ma_nha_phan_phoi AS npp_id,
    ten_nha_phan_phoi AS npp_name,
    ten_mien,
    ten_vung,
    tinh_npp,
    ten_ql_vung,
    ten_gsbh,
    ma_kpi,
    ten_kpi AS kpi_name,
    COALESCE(NULLIF(nhom_san_pham, ''::text), 'Chung'::text) AS category,
    (tong_chi_tieu)::numeric AS target,
    (thuc_hien)::numeric AS actual,
    (thuc_dat)::numeric AS db_pct_rate
   FROM kpitonghop;

-- 5. Redefine fact_sellin
CREATE OR REPLACE VIEW fact_sellin AS
SELECT 
    billing_date AS ngay,
    billing_date::date AS date_key,
    TRIM(BOTH FROM upper(sold_to_party)) AS ma_npp,
    TRIM(BOTH FROM upper(sold_to_party)) AS npp_id,
    TRIM(BOTH FROM upper(material)) AS ma_san_pham,
    TRIM(BOTH FROM upper(material)) AS product_id,
    sum_of_billing_net_amt AS doanh_thu,
    sum_of_billing_net_amt AS revenue_in
FROM sellin
WHERE sold_to_party IS NOT NULL;

-- 6. Redefine fact_sellout
CREATE OR REPLACE VIEW fact_sellout AS
SELECT 
    ngay_dat_hang AS ngay,
    TO_DATE(ngay_dat_hang, 'DD/MM/YYYY') AS date_key,
    TRIM(BOTH FROM upper(ma_npp)) AS ma_npp,
    TRIM(BOTH FROM upper(ma_npp)) AS npp_id,
    TRIM(BOTH FROM upper(ma_kh)) AS ma_khach_hang,
    TRIM(BOTH FROM upper(ma_kh)) AS ma_kh,
    TRIM(BOTH FROM upper(ma_san_pham)) AS ma_san_pham,
    TRIM(BOTH FROM upper(ma_san_pham)) AS product_id,
    TRIM(BOTH FROM upper(ma_nv)) AS ma_nhan_vien,
    TRIM(BOTH FROM upper(ma_nv)) AS staff_id,
    ten_nhan_vien AS nhan_vien,
    ten_gsbh AS giam_sat,
    sl_giao AS so_luong,
    sl_giao AS qty,
    doanh_so,
    doanh_so_sau_ck_vat AS doanh_thu_thuan,
    doanh_so_sau_ck_vat AS revenue,
    ten_vung,
    ten_mien
FROM sellout
WHERE ma_kh IS NOT NULL;
