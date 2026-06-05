import pandas as pd
import win32com.client as win32
import os

file_path = 'D:\\Dashboard\\Raw\\xlsb\\sellin.XLSX'
if not os.path.exists(file_path):
    print("File does not exist")
    exit(1)

excel = win32.gencache.EnsureDispatch('Excel.Application')
excel.Visible = False
excel.DisplayAlerts = False

try:
    wb = excel.Workbooks.Open(os.path.abspath(file_path), ReadOnly=True)
    ws = wb.Sheets(1)
    data = ws.UsedRange.Value
    wb.Close(False)
    
    if data:
        df = pd.DataFrame(list(data))
        print("Raw shape of sellin:", df.shape)
        print("Top 10 rows:")
        for idx in range(min(15, len(df))):
            row_vals = [str(val)[:20] for val in df.iloc[idx].tolist() if val is not None]
            print(f"Row {idx}: {row_vals[:8]}")
    else:
        print("No data found")
except Exception as e:
    print("Error:", e)
finally:
    excel.Quit()
