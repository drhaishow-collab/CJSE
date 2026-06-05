import os
import pandas as pd

def inspect_file(path):
    print(f"\n================ Inspecting File: {os.path.basename(path)} ================")
    if not os.path.exists(path):
        print("File does not exist.")
        return
    try:
        xls = pd.ExcelFile(path)
        print("Sheets:", xls.sheet_names)
        for sheet in xls.sheet_names[:3]:
            df = pd.read_excel(path, sheet_name=sheet, nrows=5)
            print(f"Sheet: {sheet} - Columns: {list(df.columns)}")
            print("Sample data:")
            print(df.head(2))
    except Exception as e:
        print(f"Error inspecting file: {e}")

def main():
    folder = r"D:\Dashboard\Raw"
    files = ["npp.xlsx", "customer.xlsx", "diaban.xlsx", "saleteam.xlsx"]
    for f in files:
        inspect_file(os.path.join(folder, f))

if __name__ == '__main__':
    main()
