import os
import sys
import re
import datetime
import unicodedata
import pandas as pd
from sqlalchemy import create_engine, text
import win32com.client as win32

# Config
DB_PASS = '123456'
DB_NAME = 'sales_db'
FOLDER_PATH = r'D:\Dashboard\Raw\xlsb'

# Date handling helper for COM Interop pywintypes.datetime objects
def fix_datetime(val):
    if val is None:
        return None
    if hasattr(val, 'year'):
        try:
            return datetime.datetime(val.year, val.month, val.day, val.hour, val.minute, val.second)
        except Exception:
            return str(val)
    return val

# Accent removal and snake_case formatting for column names
def remove_accents(input_str):
    if not isinstance(input_str, str):
        return str(input_str)
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def clean_column_name(col):
    if pd.isna(col) or col == "":
        return "unnamed"
    col_str = str(col).strip()
    col_ascii = remove_accents(col_str)
    col_ascii = col_ascii.replace('đ', 'd').replace('Đ', 'd')
    col_ascii = col_ascii.lower()
    # Replace non-alphanumeric (except underscores) with _
    col_ascii = re.sub(r'[^a-z0-9_]', '_', col_ascii)
    # Replace double underscores with single
    col_ascii = re.sub(r'_+', '_', col_ascii)
    return col_ascii.strip('_')

# Header keywords detector (expanded with English words to recognize sellin/billing files)
HEADER_KEYWORDS = ['ma', 'ten', 'ngay', 'stt', 'mien', 'vung', 'npp', 'khach hang', 
                   'check', 'loai', 'trang thai', 'dia chi', 'so dien thoai', 'kenh', 'tong',
                   'material', 'party', 'sold', 'billing', 'description', 'customer', 
                   'sales', 'invoice', 'document', 'date', 'code', 'name']

def find_header_index(df):
    max_keywords = 0
    best_row_idx = 0
    for i in range(min(len(df), 40)):
        row_values = [clean_column_name(str(val)) for val in df.iloc[i] if val is not None]
        match_count = sum(1 for word in HEADER_KEYWORDS if any(word in cell for cell in row_values))
        if match_count > max_keywords:
            max_keywords = match_count
            best_row_idx = i
    return best_row_idx

# Helper to read an excel file using a fresh, isolated Excel COM process to avoid RPC crashes
def read_excel_isolated_com(file_path):
    print(f"  Starting fresh Excel process for isolated read...")
    excel = win32.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    data = None
    try:
        abs_path = os.path.abspath(file_path)
        wb = excel.Workbooks.Open(abs_path, ReadOnly=True)
        try:
            ws = wb.ActiveSheet
            data = ws.UsedRange.Value
        finally:
            wb.Close(False)
    finally:
        try:
            excel.Quit()
        except Exception:
            pass
    return data

def main():
    print("[INFO] Connecting to PostgreSQL...")
    engine = create_engine(f'postgresql://postgres:{DB_PASS}@localhost:5432/{DB_NAME}')
    
    files = [f for f in os.listdir(FOLDER_PATH) 
             if f.lower().endswith(('.xlsb', '.xlsx', '.csv')) and not f.startswith('~$') and not f.startswith('temp_')]
    
    print(f"[INFO] Found {len(files)} files to import.")
    
    for file_name in files:
        file_path = os.path.join(FOLDER_PATH, file_name)
        raw_name = os.path.splitext(file_name)[0]
        table_name = re.sub(r'[^a-zA-Z0-9]', '_', raw_name).lower()
        
        print(f"Reading file: {file_name} -> Table: {table_name}")
        
        try:
            # Call isolated COM read
            data = read_excel_isolated_com(file_path)
            
            if not data:
                print(f"Warning: Empty file: {file_name}")
                continue
                
            # Safely process pywintypes datetime elements
            raw_df = pd.DataFrame([tuple(fix_datetime(cell) for cell in row) for row in data])
            
            # Find correct header index
            h_idx = find_header_index(raw_df)
            print(f"  Detected header at row index {h_idx}")
            
            # Realign header
            row_main = raw_df.iloc[h_idx].tolist()
            new_header = [clean_column_name(x) for x in row_main]
            
            df = raw_df.iloc[h_idx + 1:].copy()
            df.columns = new_header
            
            # Filter columns
            df = df.loc[:, df.columns.notnull()]
            # Deduplicate column names
            final_cols = []
            seen = {}
            for col in df.columns:
                if col == "" or "unnamed" in col:
                    final_cols.append("DELETE_ME")
                    continue
                if col in seen:
                    seen[col] += 1
                    final_cols.append(f"{col}_{seen[col]}")
                else:
                    seen[col] = 0
                    final_cols.append(col)
            df.columns = final_cols
            df = df.loc[:, df.columns != "DELETE_ME"]
            df = df.dropna(axis=1, how='all')
            df = df.dropna(axis=0, how='all')
            
            # Clean string values (trim spaces)
            df = df.map(lambda x: x.strip() if isinstance(x, str) else x)
            
            # Save to PostgreSQL
            print(f"  Uploading {len(df)} rows to PostgreSQL table {table_name}...")
            df.to_sql(table_name, engine, if_exists='replace', index=False)
            print(f"  Successfully loaded table {table_name}")
            
        except Exception as e:
            print(f"  Error processing file {file_name}: {e}")
            
    # ----------------- CREATE CONSOLIDATED all_sales_data TABLE -----------------
    print("\n[INFO] Constructing all_sales_data table/view...")
    with engine.connect() as conn:
        # Drop table if exists
        conn.execute(text("DROP TABLE IF EXISTS all_sales_data CASCADE"))
        
        union_query = """
        CREATE TABLE all_sales_data AS
        -- 1. Sellout records
        SELECT 
            'Sellout' AS type,
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
        
        -- 2. Sellin records (enriched by joining NPP and Product tables)
        SELECT 
            'Sellin' AS type,
            s.billing_date::date AS ngay,
            EXTRACT(MONTH FROM s.billing_date)::integer AS thang,
            EXTRACT(YEAR FROM s.billing_date)::integer AS nam,
            COALESCE(n.ten_mien, 'Khác') AS mien,
            COALESCE(n.ten_vung, 'Khác') AS vung,
            COALESCE(n.office, 'Khác') AS office,
            TRIM(s.sold_to_party) AS ma_npp,
            s.sold_to_name AS ten_npp,
            n.ten_nhan_vien AS nvbh,
            n.ten_gsbh AS gsbh,
            TRIM(s.material) AS ma_san_pham,
            s.material_description AS san_pham,
            COALESCE(p.nhom_hang_cat, 'Other') AS nganh_hang,
            p.ph1 AS nhom_sp,
            p.ph2 AS phan_nhom_sp,
            CAST(s.sum_of_billing_net_amt AS NUMERIC) AS doanh_so,
            0 AS sl_giao
        FROM sellin s
        LEFT JOIN npp n ON TRIM(s.sold_to_party) = TRIM(n.ma_npp::text)
        LEFT JOIN (
            SELECT TRIM(ma_san_pham) AS ma_san_pham,
                   MAX(nhom_hang_cat) AS nhom_hang_cat,
                   MAX(ph1) AS ph1,
                   MAX(ph2) AS ph2
            FROM product
            GROUP BY TRIM(ma_san_pham)
        ) p ON TRIM(s.material) = p.ma_san_pham
        WHERE s.material IS NOT NULL
          AND TRIM(s.material) <> ''
          AND TRIM(s.material) <> 'Grand Total'
          AND s.billing_date IS NOT NULL
        """
        conn.execute(text(union_query))
        conn.commit()
        
        # Get count
        cnt = conn.execute(text("SELECT COUNT(*) FROM all_sales_data")).fetchone()[0]
        print(f"Successfully consolidated all_sales_data table with {cnt} rows.")
        
    print("\n[INFO] ALL DONE!")

if __name__ == "__main__":
    main()
