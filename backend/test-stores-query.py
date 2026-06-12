import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2

conn = psycopg2.connect(host='localhost', database='sales_db', user='postgres', password='123456', port=5432)
cur = conn.cursor()

# Test exact query used by stores endpoint
print("=== Stores query: nam = '2026' (string literal) ===")
cur.execute("SELECT ten_vung as zone, SUM(tong_doanh_so) as rev FROM agg_sellout_monthly WHERE nam = '2026' AND thang <= 5 GROUP BY ten_vung ORDER BY rev DESC")
for r in cur.fetchall():
    print(f"  {r[0]}: {float(r[1]):,.0f}")

print("\n=== Stores query: nam = 2026 (integer) ===")
cur.execute("SELECT ten_vung as zone, SUM(tong_doanh_so) as rev FROM agg_sellout_monthly WHERE nam = 2026 AND thang <= 5 GROUP BY ten_vung ORDER BY rev DESC")
for r in cur.fetchall():
    print(f"  {r[0]}: {float(r[1]):,.0f}")

# Check default frontend month - currently is June 2026
print("\n=== Frontend default: year=2026, month=6 ===")
cur.execute("SELECT thang, COUNT(*) FROM agg_sellout_monthly WHERE nam = 2026 GROUP BY thang ORDER BY thang")
for r in cur.fetchall():
    print(f"  month {int(r[0])}: {r[1]} rows")

# Check agg_monthly_sales thang <= 5
print("\n=== agg_monthly_sales: nam=2026, thang<=5 ===")
cur.execute("SELECT COUNT(*), SUM(revenue) FROM agg_monthly_sales WHERE nam = 2026 AND thang <= 5")
r = cur.fetchone()
print(f"  {r[0]} rows, revenue: {float(r[1] or 0):,.0f}")

cur.close()
conn.close()
