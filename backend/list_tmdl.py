import os

def search_tmdl(folder, query):
    print(f"Searching for '{query}' in {folder}:")
    if not os.path.exists(folder):
        print("Folder does not exist.")
        return
    for root, dirs, files in os.walk(folder):
        for f in files:
            if f.endswith('.tmdl'):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        content = file.read()
                        if query.lower() in content.lower():
                            print(f"- Match in: {os.path.relpath(path, folder)}")
                except Exception as e:
                    pass

if __name__ == '__main__':
    search_tmdl(r"d:\Dashboard\reviewbiz2.SemanticModel", "all_sales_data")
    search_tmdl(r"d:\Dashboard\reviewbiz2.SemanticModel", "sellin")
