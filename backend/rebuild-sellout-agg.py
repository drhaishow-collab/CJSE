"""
Rebuild agg_sellout_monthly to include BOTH 2025 and 2026 data from sellout raw table.
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2
import time

conn = psycopg2.connect(host='localhost', database='sales_db', user='postgres', password='123456', port=5432)
conn.autocommit = False
cur = conn.cursor()

try:
    # Step 1: Check current state
    cur.execute("SELECT COUNT(*) FROM agg_sellout_monthly")
    old_count = cur.fetchone()[0]
    print(f"Current agg_sellout_monthly: {old_count} rows (only 2026)")

    cur.execute("SELECT COUNT(*) FROM sellout WHERE ngay_dat_hang LIKE '%/2025'")
    raw_2025 = cur.fetchone()[0]
    print(f"Raw sellout 2025: {raw_2025} rows")

    # Step 2: Insert 2025 data into agg_sellout_monthly
    # Match the same aggregation logic as existing 2026 data
    print("\nRebuilding agg_sellout_monthly with 2025 data...")
    start = time.time()

    cur.execute("""
        INSERT INTO agg_sellout_monthly (nam, quy, thang, ma_npp, ten_vung, ten_mien, ma_san_pham, ma_khach_hang, tong_doanh_so, tong_so_luong, so_don_hang)
        SELECT
            EXTRACT(YEAR FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY'))::numeric AS nam,
            EXTRACT(QUARTER FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY'))::numeric AS quy,
            EXTRACT(MONTH FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY'))::numeric AS thang,
            ma_npp,
            ten_vung,
            ten_mien,
            ma_san_pham,
            ma_kh AS ma_khach_hang,
            COALESCE(SUM(doanh_so_sau_ck_vat), 0) AS tong_doanh_so,
            COALESCE(SUM(sl_giao), 0) AS tong_so_luong,
            COUNT(DISTINCT so_don_hang) AS so_don_hang
        FROM sellout
        WHERE ngay_dat_hang IS NOT NULL 
          AND ngay_dat_hang != ''
          AND ngay_dat_hang LIKE '%/2025'
        GROUP BY 
            EXTRACT(YEAR FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY')),
            EXTRACT(QUARTER FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY')),
            EXTRACT(MONTH FROM TO_DATE(ngay_dat_hang, 'DD/MM/YYYY')),
            ma_npp, ten_vung, ten_mien, ma_san_pham, ma_kh
    """)

    inserted = cur.rowcount
    elapsed = time.time() - start
    print(f"Inserted {inserted} rows for 2025 in {elapsed:.1f}s")

    conn.commit()

    # Step 3: Verify
    cur.execute("SELECT nam, COUNT(*), SUM(tong_doanh_so) FROM agg_sellout_monthly GROUP BY nam ORDER BY nam")
    print("\n=== Final agg_sellout_monthly state ===")
    for r in cur.fetchall():
        print(f"  nam={r[0]}: {r[1]} rows, revenue={float(r[2] or 0):,.0f}")

    print("\n✅ Done! agg_sellout_monthly now includes 2025 data.")

except Exception as e:
    conn.rollback()
    print(f"❌ Error: {e}")
finally:
    cur.close()
    conn.close()
