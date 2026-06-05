import os

def list_recursive(path, depth=2):
    if depth < 0:
        return
    print(f"\nListing: {path}")
    try:
        for item in os.listdir(path):
            full_path = os.path.join(path, item)
            is_dir = os.path.isdir(full_path)
            print(f"{'[DIR]' if is_dir else '[FILE]'} {item}")
            if is_dir and depth > 0:
                list_recursive(full_path, depth - 1)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    list_recursive(r"d:\Dashboard", 2)
