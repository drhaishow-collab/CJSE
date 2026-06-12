import sys
from sqlalchemy import create_engine
import pandas as pd

# Set sys.stdout to handle UTF-8
sys.stdout.reconfigure(encoding='utf-8')

engine = create_engine('postgresql://postgres:123456@localhost:5432/sales_db')

for table in ['agg_monthly_sales', 'agg_sellout_monthly']:
    print(f"=== Table: {table} ===")
    try:
        # Schema info
        schema_df = pd.read_sql(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{table}';
        """, engine)
        print("Schema:")
        print(schema_df.to_string())
        
        # Sample data
        df = pd.read_sql(f"SELECT * FROM {table} LIMIT 3", engine)
        print("Sample data:")
        for idx, row in df.iterrows():
            print(f"Row {idx}: {row.to_dict()}")
            
        # Distinct years and months
        distinct_df = pd.read_sql(f"SELECT DISTINCT nam, thang FROM {table} ORDER BY nam, thang", engine)
        print("Distinct years and months in data:")
        print(distinct_df.to_string())
        
    except Exception as e:
        print("Error:", e)
    print()
