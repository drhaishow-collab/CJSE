import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2

conn = psycopg2.connect(host='localhost', database='sales_db', user='postgres', password='123456', port=5432)
cur = conn.cursor()

# Check raw sellout table years
print("=== sellout raw - distinct years (from ngay_dat_hang DD/MM/YYYY) ===")
cur.execute("""
    SELECT SUBSTRING(ngay_dat_hang,7,4) as yr, COUNT(*) 
    FROM sellout 
    WHERE ngay_dat_hang IS NOT NULL AND ngay_dat_hang != '' 
    GROUP BY SUBSTRING(ngay_dat_hang,7,4) 
    ORDER BY yr
""")
for r in cur.fetchall():
    print(f"  year={r[0]}: {r[1]} rows")

# Check how agg_sellout_monthly was created - is it a view or table?
print("\n=== Is agg_sellout_monthly a VIEW or TABLE? ===")
cur.execute("""
    SELECT table_type FROM information_schema.tables 
    WHERE table_name = 'agg_sellout_monthly'
""")
rows = cur.fetchall()
for r in rows:
    print(f"  type: {r[0]}")

# Check if there's a materialized view
cur.execute("""
    SELECT matviewname FROM pg_matviews WHERE matviewname = 'agg_sellout_monthly'
""")
rows = cur.fetchall()
if rows:
    print(f"  materialized view: {rows[0][0]}")
    # Get the definition
    cur.execute("SELECT definition FROM pg_matviews WHERE matviewname = 'agg_sellout_monthly'")
    defn = cur.fetchone()
    if defn:
        print(f"\n=== agg_sellout_monthly VIEW definition ===")
        print(defn[0][:1000])

# Also check if it's a regular view
cur.execute("""
    SELECT view_definition FROM information_schema.views 
    WHERE table_name = 'agg_sellout_monthly'
""")
rows = cur.fetchall()
if rows:
    print(f"\n=== agg_sellout_monthly VIEW definition ===")
    print(rows[0][0][:1000])

# Check the biz report query for sellout 2025
print("\n=== Biz report: sellout for 2025 ===")
cur.execute("""
    SELECT COUNT(*), COALESCE(SUM(tong_doanh_so), 0) 
    FROM agg_sellout_monthly 
    WHERE nam = 2025
""")
r = cur.fetchone()
print(f"  rows: {r[0]}, revenue: {float(r[1]):,.0f}")

print("\n=== Biz report: sellout for 2026 ===")
cur.execute("""
    SELECT COUNT(*), COALESCE(SUM(tong_doanh_so), 0) 
    FROM agg_sellout_monthly 
    WHERE nam = 2026
""")
r = cur.fetchone()
print(f"  rows: {r[0]}, revenue: {float(r[1]):,.0f}")

cur.close()
conn.close()
