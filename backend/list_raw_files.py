import os

def run():
    path = r'D:\Dashboard\Raw'
    print(f"Listing {path}:")
    try:
        for item in os.listdir(path):
            print(f"- {item}")
    except Exception as e:
        print(f"Error: {e}")

    path_xlsb = r'D:\Dashboard\Raw\xlsb'
    print(f"\nListing {path_xlsb}:")
    try:
        for item in os.listdir(path_xlsb):
            print(f"- {item}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    run()
