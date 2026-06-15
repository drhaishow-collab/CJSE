from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:SZQGiSAfvrxP1LYh@db.ibtturbotiqydypojvne.supabase.co:5432/postgres')

try:
    with engine.begin() as conn:
        result = conn.execute(text("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        """))
        tables = [row[0] for row in result]
        print(f"Found {len(tables)} tables to drop.")
        for table in tables:
            print(f"Dropping table {table}...")
            conn.execute(text(f"DROP TABLE IF EXISTS \"{table}\" CASCADE"))
    print("All tables dropped successfully!")
except Exception as e:
    print(f"Error dropping tables: {e}")
