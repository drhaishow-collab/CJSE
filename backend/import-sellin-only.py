import os
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
TABLE_NAME = 'sellin'

STANDARD_COLS = [
    'material',
    'material_description',
    'sold_to_party',
    'sold_to_name',
    'billing_date',
    'sum_of_billing_net_amt',
]

HEADER_KEYWORDS = [
    'ma', 'ten', 'ngay', 'stt', 'mien', 'vung', 'npp', 'khach hang',
    'material', 'party', 'sold', 'billing', 'description', 'customer',
    'sales', 'invoice', 'document', 'date', 'code', 'name', 'delivery', 'order',
]


def fix_datetime(val):
    if val is None:
        return None
    if hasattr(val, 'year'):
        try:
            return datetime.datetime(val.year, val.month, val.day, val.hour, val.minute, val.second)
        except Exception:
            return str(val)
    return val


def remove_accents(input_str):
    if not isinstance(input_str, str):
        return str(input_str)
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return ''.join([c for c in nfkd_form if not unicodedata.combining(c)])


def clean_column_name(col):
    if pd.isna(col) or col == '':
        return 'unnamed'
    col_ascii = remove_accents(str(col).strip())
    col_ascii = col_ascii.replace('đ', 'd').replace('Đ', 'd').lower()
    col_ascii = re.sub(r'[^a-z0-9_]', '_', col_ascii)
    col_ascii = re.sub(r'_+', '_', col_ascii)
    return col_ascii.strip('_')


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


def read_excel_isolated_com(file_path):
    print('  Opening Excel (isolated COM)...')
    excel = win32.Dispatch('Excel.Application')
    excel.Visible = False
    excel.DisplayAlerts = False
    data = None
    try:
        wb = excel.Workbooks.Open(os.path.abspath(file_path), ReadOnly=True)
        try:
            data = wb.ActiveSheet.UsedRange.Value
        finally:
            wb.Close(False)
    finally:
        try:
            excel.Quit()
        except Exception:
            pass
    return data


def list_sellin_files():
    files = []
    for name in os.listdir(FOLDER_PATH):
        lower = name.lower()
        if not lower.endswith('.xlsx') or name.startswith('~$'):
            continue
        if 'sellout' in lower:
            continue
        if re.search(r'sellin', lower):
            files.append(name)
  # Pivot summary first, then numbered detail files
    files.sort(key=lambda n: (0 if n.lower() == 'sellin.xlsx' else 1, n.lower()))
    return files


def normalize_dataframe(df):
    """Map detail or pivot columns to STANDARD_COLS."""
    col_map = {c: c for c in df.columns}

    # Amount column: detail export uses billing_net_amt
    if 'sum_of_billing_net_amt' not in df.columns:
        for candidate in ('billing_net_amt', 'sum_of_billing_net_a', 'billing_net_amount'):
            if candidate in df.columns:
                df['sum_of_billing_net_amt'] = df[candidate]
                break

    for col in STANDARD_COLS:
        if col not in df.columns:
            df[col] = None

    out = df[STANDARD_COLS].copy()
    out['material'] = out['material'].astype(str).str.strip()
    out['sold_to_party'] = out['sold_to_party'].astype(str).str.strip()
    out['sum_of_billing_net_amt'] = pd.to_numeric(out['sum_of_billing_net_amt'], errors='coerce')
    out['billing_date'] = pd.to_datetime(out['billing_date'], errors='coerce')

    out = out[
        out['material'].notna()
        & (out['material'] != '')
        & (out['material'].str.lower() != 'nan')
        & (~out['material'].str.lower().isin(['grand total', 'total', '(blank)']))
        & out['billing_date'].notna()
        & out['sum_of_billing_net_amt'].notna()
    ]
    return out


def parse_sellin_file(file_path):
    data = read_excel_isolated_com(file_path)
    if not data:
        return pd.DataFrame(columns=STANDARD_COLS)

    raw_df = pd.DataFrame([tuple(fix_datetime(cell) for cell in row) for row in data])
    h_idx = find_header_index(raw_df)
    print(f'  Header row index: {h_idx}')

    new_header = [clean_column_name(x) for x in raw_df.iloc[h_idx].tolist()]
    df = raw_df.iloc[h_idx + 1:].copy()
    df.columns = new_header[: len(df.columns)]

    # Deduplicate column names
    seen = {}
    final_cols = []
    for col in df.columns:
        if col in seen:
            seen[col] += 1
            final_cols.append(f'{col}_{seen[col]}')
        else:
            seen[col] = 0
            final_cols.append(col)
    df.columns = final_cols

    df = df.dropna(axis=1, how='all').dropna(axis=0, how='all')
    df = df.map(lambda x: x.strip() if isinstance(x, str) else x)

    return normalize_dataframe(df)


def rebuild_all_sales_data(conn):
    print('\n[INFO] Rebuilding all_sales_data...')
    conn.execute(text('DROP TABLE IF EXISTS all_sales_data CASCADE'))
    conn.execute(text("""
        CREATE TABLE all_sales_data AS
        SELECT
            'Sellout'::text AS type,
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
        SELECT
            'Sellin'::text AS type,
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
          AND s.sum_of_billing_net_amt IS NOT NULL
    """))
    conn.commit()

    stats = conn.execute(text("""
        SELECT type, COUNT(*)::bigint AS cnt, ROUND(SUM(doanh_so))::bigint AS total
        FROM all_sales_data GROUP BY type
    """)).fetchall()
    for row in stats:
        print(f'  {row[0]}: {row[1]} rows, total={row[2]}')


def main():
    print('[INFO] Connecting to PostgreSQL...')
    engine = create_engine(f'postgresql://postgres:{DB_PASS}@localhost:5432/{DB_NAME}')

    files = list_sellin_files()
    print(f'[INFO] Found {len(files)} sell-in Excel files')

    frames = []
    for file_name in files:
        file_path = os.path.join(FOLDER_PATH, file_name)
        print(f'\n[FILE] {file_name}')
        try:
            part = parse_sellin_file(file_path)
            print(f'  -> {len(part)} rows with billing amount')
            if len(part) > 0:
                frames.append(part)
        except Exception as e:
            print(f'  ERROR: {e}')

    if not frames:
        print('[ERROR] No sell-in data parsed from any file.')
        return

    combined = pd.concat(frames, ignore_index=True)
    print(f'\n[INFO] Combined total: {len(combined)} rows')
    print(f'  With amount: {combined["sum_of_billing_net_amt"].notna().sum()}')
    print(f'  Amount sum: {combined["sum_of_billing_net_amt"].sum():,.0f}')

    print(f'\n[INFO] Writing table {TABLE_NAME}...')
    combined.to_sql(TABLE_NAME, engine, if_exists='replace', index=False)

    with engine.connect() as conn:
        rebuild_all_sales_data(conn)

    print('\n[INFO] ALL DONE!')


if __name__ == '__main__':
    main()
