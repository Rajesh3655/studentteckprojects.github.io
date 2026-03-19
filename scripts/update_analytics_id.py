import os

old_id = "G-2HSYQXDYS7"
new_id = "G-XNBLYDFG48"

files = [
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\about.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\contact.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\disclaimer.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\index.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\opportunity.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\privacy-policy.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\terms-and-conditions.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\hackathons\index.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\internships\index.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\jobs\index.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\projects\index.html",
    r"C:\Users\Rajesh k\Desktop\studenttechprojects\templates\content-display-template.html"
]

for file_path in files:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} - Not found")
        continue

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        if old_id in content:
            new_content = content.replace(old_id, new_id)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file_path}")
        else:
            print(f"Skipping {file_path} - ID not found")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
