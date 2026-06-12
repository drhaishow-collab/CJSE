import os
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:SZQGiSAfvrxP1LYh@db.ibtturbotiqydypojvne.supabase.co:5432/postgres')

schema_path = r'd:\marketboard\backend\schema.sql'
with open(schema_path, 'r', encoding='utf-8') as f:
    schema_sql = f.read()

try:
    with engine.begin() as conn:
        for stmt in schema_sql.split(';'):
            if stmt.strip():
                conn.execute(text(stmt))
    print("Schema created successfully!")
except Exception as e:
    print(f"Error creating schema: {e}")
