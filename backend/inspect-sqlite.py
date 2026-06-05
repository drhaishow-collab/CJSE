import sqlite3
import os

db_path = 'D:\\Dashboard\\Raw\\xlsb\\database_tong_hop.db'
out_path = 'inspect_sqlite_output.txt'

if not os.path.exists(db_path):
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f"SQLite database does not exist at {db_path}\n")
    exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(f"Tables in SQLite database ({len(tables)} tables):\n")
    
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM \"{table}\"")
        row_count = cursor.fetchone()[0]
        f.write(f"Table: {table} - Rows: {row_count}\n")
        
        # Get column names
        cursor.execute(f"SELECT * FROM \"{table}\" LIMIT 1")
        col_names = [description[0] for description in cursor.description]
        f.write(f"  Columns: {col_names}\n\n")

print("Done writing to file")
conn.close()
