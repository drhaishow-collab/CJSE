import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2

conn = psycopg2.connect(host='localhost', database='sales_db', user='postgres', password='123456', port=5432)
cur = conn.cursor()

# 1. Check agg_sellout_monthly structure
print("=== agg_sellout_monthly columns ===")
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'agg_sellout_monthly'
    ORDER BY ordinal_position
""")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

# 2. Check sellout raw table structure
print("\n=== sellout raw table columns ===")
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'sellout'
    ORDER BY ordinal_position
""")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

# 3. Sample data from agg_sellout_monthly
print("\n=== agg_sellout_monthly sample (1 row) ===")
cur.execute("SELECT * FROM agg_sellout_monthly LIMIT 1")
cols = [desc[0] for desc in cur.description]
row = cur.fetchone()
if row:
    for c, v in zip(cols, row):
        print(f"  {c}: {v}")

# 4. Sample data from sellout raw for 2025
print("\n=== sellout raw sample for 2025 (1 row) ===")
cur.execute("SELECT * FROM sellout WHERE ngay_dat_hang LIKE '%/2025' LIMIT 1")
cols = [desc[0] for desc in cur.description]
row = cur.fetchone()
if row:
    for c, v in zip(cols, row):
        print(f"  {c}: {v}")

# 5. Check kpitonghop table - used for % Dat Sell-in
print("\n=== kpitonghop - sample for sell-in KPI ===")
cur.execute("SELECT * FROM kpitonghop WHERE ten_kpi ILIKE '%sell%in%' LIMIT 3")
cols = [desc[0] for desc in cur.description]
rows = cur.fetchall()
for row in rows:
    print("  ---")
    for c, v in zip(cols, row):
        print(f"  {c}: {v}")

# 6. Check kpitonghop distinct ten_kpi values
print("\n=== kpitonghop - distinct ten_kpi ===")
cur.execute("SELECT DISTINCT ten_kpi FROM kpitonghop ORDER BY ten_kpi")
for r in cur.fetchall():
    print(f"  {r[0]}")

# 7. Check kpitonghop data availability
print("\n=== kpitonghop - data by thang_nam ===")
cur.execute("""
    SELECT thang_nam, COUNT(*), 
           SUM(tong_chi_tieu) as total_target, 
           SUM(thuc_hien) as total_actual
    FROM kpitonghop 
    GROUP BY thang_nam 
    ORDER BY thang_nam
""")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} rows, target={float(r[2] or 0):,.0f}, actual={float(r[3] or 0):,.0f}")

# 8. Check sellin achievement calculation
print("\n=== Biz Report: sellin_achievement logic ===")
print("  In server.js line 800: sellin_achievement: 100 (HARDCODED!)")
print("  sellout_achievement: 100 (HARDCODED!)")

cur.close()
conn.close()
