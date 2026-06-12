import pandas as pd
from sqlalchemy import create_engine, text
import time

LOCAL_URL = 'postgresql://postgres:123456@localhost:5432/sales_db'
SUPABASE_URL = 'postgresql://postgres:SZQGiSAfvrxP1LYh@db.ibtturbotiqydypojvne.supabase.co:5432/postgres'

print("="*60)
print("    DONG BO DU LIEU TU LOCAL LEN SUPABASE (CLOUD)")
print("="*60)
print("\n[INFO] Dang ket noi voi co so du lieu...")

try:
    engine_local = create_engine(LOCAL_URL)
    engine_supa = create_engine(SUPABASE_URL)
    
    # Test connections
    with engine_local.connect() as conn:
        pass
    with engine_supa.connect() as conn:
        pass
        
    print("[OK] Ket noi thanh cong ca 2 ben!")
    
    # Danh sach cac bang THUC SU CAN THIET cho Dashboard va API (Da loai bo test_staging, raw data...)
    tables = [
        'agg_monthly_sales',
        'agg_sellout_monthly',
        'agg_product_sales',
        'agg_npp_performance',
        'visit',
        'sellout',
        'npp',
        'product',
        'saleteam',
        'users',
        'stores',
        'kpitonghop'
    ]
        
    print(f"\n[INFO] Tim thay {len(tables)} bang du lieu de dong bo.")
    
    for table in tables:
        print(f"  -> Dang copy bang '{table}'... ", end="", flush=True)
        start_time = time.time()
        
        # Read from local
        df = pd.read_sql_table(table, engine_local)
        
        # Write to supabase
        # method='multi' is faster for many small rows, chunksize prevents memory issues
        df.to_sql(table, engine_supa, if_exists='replace', index=False, chunksize=1000)
        
        elapsed = time.time() - start_time
        print(f"[{len(df)} dong] - Xong trong {elapsed:.1f} giay.")
        
    print("\n" + "="*60)
    print("    HOAN TAT DONG BO! WEB DA DUOC CAP NHAT DATA MOI.")
    print("="*60)
    
except Exception as e:
    print(f"\n[LOI] Xay ra loi trong qua trinh dong bo:\n{e}")

input("\nBam Enter de thoat...")
