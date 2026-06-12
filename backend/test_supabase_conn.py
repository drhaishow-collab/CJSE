from sqlalchemy import create_engine
engine = create_engine('postgresql://postgres:Coke%4020152025@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres')
try:
    with engine.connect() as conn:
        print("Connection to pooler successful!")
except Exception as e:
    print(f"Pooler failed: {e}")

engine2 = create_engine('postgresql://postgres:Coke%4020152025@db.npeledlithnaolqgnuqq.supabase.co:5432/postgres')
try:
    with engine2.connect() as conn:
        print("Connection to direct DB successful!")
except Exception as e:
    print(f"Direct failed: {e}")
