import sys
from sqlalchemy import create_engine
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
engine = create_engine('postgresql://postgres:123456@localhost:5432/sales_db')

def get_trend_data(year, max_month):
    print(f"Fetching trend data for {year} up to month {max_month}...")
    
    # 1. Fetch Sell-In from agg_monthly_sales
    sellin_df = pd.read_sql(f"""
        SELECT thang::integer as month, COALESCE(ten_mien, 'MIỀN NAM') as region, SUM(revenue) as revenue
        FROM agg_monthly_sales
        WHERE nam = {year} AND thang::integer <= {max_month}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY thang, ten_mien
        ORDER BY thang, ten_mien
    """, engine)
    
    # 2. Fetch Sell-Out from agg_sellout_monthly
    sellout_df = pd.read_sql(f"""
        SELECT thang::integer as month, COALESCE(ten_mien, 'MIỀN NAM') as region, 
               SUM(tong_doanh_so) as sales,
               COUNT(DISTINCT ma_khach_hang) as aso
        FROM agg_sellout_monthly
        WHERE nam = {year} AND thang::integer <= {max_month}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY thang, ten_mien
        ORDER BY thang, ten_mien
    """, engine)
    
    # 3. Fetch MCP and Visits from visit table
    visits_df = pd.read_sql(f"""
        SELECT EXTRACT(MONTH FROM ngay)::integer as month, COALESCE(ten_mien, 'MIỀN NAM') as region,
               SUM(tong_khach_hang) as mcp,
               SUM(tong_kh_vieng_tham_trong_tuyen + tong_kh_vieng_tham_ngoai_tuyen) as total_visits
        FROM visit
        WHERE EXTRACT(YEAR FROM ngay) = {year} AND EXTRACT(MONTH FROM ngay) <= {max_month}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY EXTRACT(MONTH FROM ngay), ten_mien
        ORDER BY month, ten_mien
    """, engine)
    
    # 4. Fetch Targets from kpitonghop
    targets_df = pd.read_sql(f"""
        SELECT SUBSTRING(thang_nam, 5, 2)::integer as month, COALESCE(ten_mien, 'MIỀN NAM') as region,
               SUM(CASE WHEN ten_kpi ILIKE '%%sell%%in%%' THEN tong_chi_tieu ELSE 0 END) as sellin_target,
               SUM(CASE WHEN ten_kpi ILIKE '%%sell%%out%%' THEN tong_chi_tieu ELSE 0 END) as sellout_target
        FROM kpitonghop
        WHERE SUBSTRING(thang_nam, 1, 4)::integer = {year} AND SUBSTRING(thang_nam, 5, 2)::integer <= {max_month}
          AND ten_mien IN ('MIỀN NAM', 'MIỀN BẮC')
        GROUP BY SUBSTRING(thang_nam, 5, 2)::integer, ten_mien
        ORDER BY month, ten_mien
    """, engine)
    
    print("\nSell-In:")
    print(sellin_df.head(5))
    print("\nSell-Out:")
    print(sellout_df.head(5))
    print("\nVisits:")
    print(visits_df.head(5))
    print("\nTargets:")
    print(targets_df.head(5))

get_trend_data(2026, 5)
