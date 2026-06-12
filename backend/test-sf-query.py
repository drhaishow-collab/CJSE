import sys
from sqlalchemy import create_engine
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
engine = create_engine('postgresql://postgres:123456@localhost:5432/sales_db')

query_sql = """
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
      AND EXTRACT(YEAR FROM ngay) = 2026 AND EXTRACT(MONTH FROM ngay) <= 5
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
      AND EXTRACT(YEAR FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY')) = 2026
      AND EXTRACT(MONTH FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY')) <= 5
    GROUP BY TRIM(BOTH FROM upper(ma_nv))
),
kpi_agg AS (
    SELECT 
        TRIM(BOTH FROM upper(ma_nhan_vien)) as staff_id,
        SUM(CASE WHEN ten_kpi ILIKE '%%sell%%in%%' THEN tong_chi_tieu ELSE 0 END) as sellin_target,
        SUM(CASE WHEN ten_kpi ILIKE '%%sell%%in%%' THEN thuc_hien ELSE 0 END) as sellin_actual,
        SUM(CASE WHEN ten_kpi ILIKE '%%sell%%out%%' THEN tong_chi_tieu ELSE 0 END) as sellout_target,
        SUM(CASE WHEN ten_kpi ILIKE '%%sell%%out%%' THEN thuc_hien ELSE 0 END) as sellout_actual
    FROM kpitonghop
    GROUP BY TRIM(BOTH FROM upper(ma_nhan_vien))
)
SELECT 
    r.staff_id,
    COALESCE(
        v.staff_name, 
        (SELECT ten_nhan_vien FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 
        r.staff_id
    ) as staff_name,
    COALESCE(v.region, (SELECT ten_mien FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'MIỀN NAM') as region,
    COALESCE(v.area, (SELECT ten_vung FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'HCM') as area,
    COALESCE(v.asm_name, (SELECT ten_ql_vung FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'ASM') as asm_name,
    COALESCE(v.sup_name, (SELECT ten_gsbh FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'GSBH') as sup_name,
    COALESCE(v.distributor, (SELECT ten_npp FROM saleteam WHERE TRIM(BOTH FROM upper(ma_nv)) = r.staff_id LIMIT 1), 'N/A') as distributor,
    COALESCE(s.sales, 0) as sales,
    COALESCE(s.sku_sum, 0) as sku_sum,
    COALESCE(s.buying_outlets, 0) as buying_outlets,
    COALESCE(s.transactions, 0) as transactions,
    COALESCE(v.mcp_count, 0) as mcp_count,
    COALESCE(v.total_visits, 0) as total_visits,
    COALESCE(k.sellin_target, 0) as sellin_target,
    COALESCE(k.sellin_actual, 0) as sellin_actual,
    COALESCE(k.sellout_target, 0) as sellout_target,
    COALESCE(k.sellout_actual, 0) as sellout_actual
FROM all_reps r
LEFT JOIN visit_agg v ON r.staff_id = v.staff_id
LEFT JOIN sellout_agg s ON r.staff_id = s.staff_id
LEFT JOIN kpi_agg k ON r.staff_id = k.staff_id
WHERE (s.sales > 0 OR v.total_visits > 0 OR k.sellin_target > 0 OR k.sellout_target > 0)
ORDER BY sales DESC;
"""

try:
    df = pd.read_sql(query_sql, engine)
    print(f"Total reps in repsData: {len(df)}")
    print("Columns in result:", df.columns.tolist())
    print("\nFirst 3 rows:")
    print(df.head(3).to_string())
except Exception as e:
    print("Error:", e)
