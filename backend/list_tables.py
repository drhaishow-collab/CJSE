import sys
from sqlalchemy import create_engine
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
engine = create_engine('postgresql://postgres:123456@localhost:5432/sales_db')

try:
    tables = pd.read_sql("""
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_type, table_name;
    """, engine)
    print("Tables & Views in Database:")
    print(tables.to_string())
except Exception as e:
    print("Error:", e)
