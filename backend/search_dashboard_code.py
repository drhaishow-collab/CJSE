import os

def search_files(folder, query):
    print(f"Searching for '{query}' in {folder}:")
    for root, dirs, files in os.walk(folder):
        for f in files:
            if f.endswith('.py') or f.endswith('.sql') or f.endswith('.js'):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        for line_no, line in enumerate(file, 1):
                            if query.lower() in line.lower():
                                print(f"- {os.path.relpath(path, folder)}: L{line_no}: {line.strip()}")
                except Exception:
                    pass

if __name__ == '__main__':
    search_files(r"d:\Dashboard", "dim_customer")
