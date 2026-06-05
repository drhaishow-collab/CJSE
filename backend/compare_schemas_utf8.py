import psycopg2

DB_PASS = '123456'
DB_NAME = 'sales_db'

pbi_expectations = {
    'dim_customer': ['customer_id', 'customer_name', 'customer_group', 'channel', 'province', 'staff_id'],
    'dim_date': ['date_key', 'full_date', 'nam', 'quy', 'thang', 'ten_thang', 'tuan_trong_nam', 'ngay', 'thu_trong_tuan', 'ten_thu', 'loai_ngay', 'thang_nam', 'quy_nam'],
    'dim_npp': ['npp_id', 'npp_name', 'region', 'area', 'province', 'address', 'asm_name', 'sup_name'],
    'dim_product': ['ma_nganh_hang', 'nganh_hang_import_inhouse', 'nhan_hang_d_m_k', 'ma_nhom_hang_cat', 'nhom_hang_cat', 'ma_ph1', 'ph1', 'ma_ph2', 'ph2', 'ma_san_pham', 'dien_giai', 'ten_viet_tat', 'don_vi_luu_kho', 'so_luong_thung', 'trang_thai'],
    'dim_salesforce': ['staff_id', 'staff_name', 'sup_id', 'sup_name', 'asm_id', 'asm_name'],
    'dim_territory': ['ma_tinh', 'ten_tinh', 'ten_quan_huyen', 'ten_phuong_xa', 'dia_chi_day_du', 'ma_dat_nuoc', 'ten_dat_nuoc', 'ma_mien', 'ten_mien', 'ma_vung', 'ten_vung', 'location_key'],
    'fact_kpi': ['staff_id', 'npp_id', 'kpi_name', 'target', 'actual', 'ngay_thang', 'category', 'staff_name', 'npp_name', 'ten_mien', 'ten_vung', 'tinh_npp', 'ten_ql_vung', 'ten_gsbh', 'ma_kpi', 'db_pct_rate'],
    'fact_sellin': ['date_key', 'npp_id', 'product_id', 'revenue_in'],
    'fact_sellout': ['ma_kh', 'product_id', 'staff_id', 'npp_id', 'date_key', 'qty', 'revenue']
}

def main():
    conn = psycopg2.connect(dbname=DB_NAME, user='postgres', password=DB_PASS, host='localhost', port=5432)
    cur = conn.cursor()
    
    with open('schema_comparison.txt', 'w', encoding='utf-8') as f:
        f.write("=== SCHEMA COMPARISON: POSTGRESQL VS POWER BI EXPECTATIONS ===\n")
        
        for table_name, pbi_cols in pbi_expectations.items():
            f.write(f"\nTable: {table_name}\n")
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table_name,))
            db_cols = [r[0] for r in cur.fetchall()]
            
            if not db_cols:
                f.write(f"  ❌ Table does not exist in PostgreSQL!\n")
                continue
                
            f.write(f"  PostgreSQL Columns: {db_cols}\n")
            f.write(f"  Power BI Expects:   {pbi_cols}\n")
            
            missing_in_db = [c for c in pbi_cols if c not in db_cols]
            extra_in_db = [c for c in db_cols if c not in pbi_cols]
            
            if missing_in_db:
                f.write(f"  ⚠️ Missing in PG (needed by PBI): {missing_in_db}\n")
            if extra_in_db:
                f.write(f"  ℹ️ Extra in PG (not expected by PBI): {extra_in_db}\n")
            
            if not missing_in_db:
                f.write("  ✅ Schema matches perfectly!\n")
                
    cur.close()
    conn.close()
    print("Comparison saved to schema_comparison.txt successfully.")

if __name__ == '__main__':
    main()
