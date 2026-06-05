import os

def list_tables_definition():
    folder = r"d:\Dashboard\reviewbiz2.SemanticModel\definition\tables"
    print(f"Inspecting table definitions in: {folder}")
    if not os.path.exists(folder):
        print("Folder does not exist.")
        return
    for f in os.listdir(folder):
        if f.endswith('.tmdl'):
            path = os.path.join(folder, f)
            print(f"\n--- {f} ---")
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    lines = file.readlines()
                    # Print partition source and columns
                    columns = []
                    source = []
                    in_source = False
                    for line in lines:
                        if 'column ' in line:
                            columns.append(line.strip())
                        if 'source =' in line or in_source:
                            in_source = True
                            source.append(line)
                            if 'in' in line and len(source) > 2:
                                in_source = False
                    print("Mapped Columns in PBI:", columns)
                    print("Source block:")
                    print("".join(source[-5:]))
            except Exception as e:
                print("Error:", e)

if __name__ == '__main__':
    list_tables_definition()
