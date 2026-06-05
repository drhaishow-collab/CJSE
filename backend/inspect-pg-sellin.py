from sqlalchemy import create_engine
import pandas as pd

engine = create_engine('postgresql://postgres:123456@localhost:5432/sales_db')
df = pd.read_sql('SELECT * FROM sellin LIMIT 1', engine)
print("Columns in PostgreSQL sellin table:", list(df.columns))
print("Sample row:", df.iloc[0].to_dict() if not df.empty else "Empty")
