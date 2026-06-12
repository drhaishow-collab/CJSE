import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2

conn = psycopg2.connect(
    host='localhost',
    database='sales_db',
    user='postgres',
    password='123456',
    port=5432
)
cur = conn.cursor()

print("=== agg_monthly_sales - distinct nam ===")
cur.execute("SELECT DISTINCT nam FROM agg_monthly_sales ORDER BY nam")
print([r[0] for r in cur.fetchall()])

print("\n=== agg_sellout_monthly - distinct nam ===")
cur.execute("SELECT DISTINCT nam FROM agg_sellout_monthly ORDER BY nam")
print([r[0] for r in cur.fetchall()])

print("\n=== Column types for nam/thang ===")
cur.execute("""
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('agg_monthly_sales', 'agg_sellout_monthly') 
      AND column_name IN ('nam', 'thang')
    ORDER BY table_name, column_name
""")
for r in cur.fetchall():
    print(f"  {r[0]}.{r[1]}: {r[2]}")

print("\n=== agg_sellout_monthly - distinct ten_vung ===")
cur.execute("SELECT DISTINCT ten_vung FROM agg_sellout_monthly ORDER BY ten_vung LIMIT 20")
print([r[0] for r in cur.fetchall()])

print("\n=== agg_sellout_monthly - distinct ten_mien ===")
cur.execute("SELECT DISTINCT ten_mien FROM agg_sellout_monthly ORDER BY ten_mien")
print([r[0] for r in cur.fetchall()])

print("\n=== stores - distinct region ===")
cur.execute("SELECT DISTINCT region FROM stores ORDER BY region")
print([r[0] for r in cur.fetchall()])

print("\n=== agg_sellout_monthly - top revenue by ten_vung ===")
cur.execute("SELECT ten_vung, ten_mien, SUM(tong_doanh_so) as rev FROM agg_sellout_monthly GROUP BY ten_vung, ten_mien ORDER BY rev DESC LIMIT 10")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | {float(r[2]):,.0f}")

print("\n=== agg_monthly_sales count by nam ===")
cur.execute("SELECT nam, COUNT(*), SUM(revenue) FROM agg_monthly_sales GROUP BY nam ORDER BY nam")
for r in cur.fetchall():
    print(f"  nam={r[0]}: {r[1]} rows, revenue={float(r[2] or 0):,.0f}")

print("\n=== agg_sellout_monthly count by nam ===")
cur.execute("SELECT nam, COUNT(*), SUM(tong_doanh_so) FROM agg_sellout_monthly GROUP BY nam ORDER BY nam")
for r in cur.fetchall():
    print(f"  nam={r[0]}: {r[1]} rows, revenue={float(r[2] or 0):,.0f}")

cur.close()
conn.close()
