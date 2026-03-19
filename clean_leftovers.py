import os
import re

directory = r"c:\Users\Rajesh k\Desktop\studenttechprojects"

# This pattern targets:
# 1. The full AdSense script tag
# 2. Mangle remains like 'crossorigin="anonymous"></script>' which often follow it
ads_pattern = re.compile(r'\s*<script async src="https://pagead2\.googlesyndication\.com/.*?</script>', re.DOTALL)
mangled_pattern = re.compile(r'\s*crossorigin="anonymous"></script>', re.DOTALL)

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".html"):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            content = ads_pattern.sub('', content)
            content = mangled_pattern.sub('', content)
            
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Cleaned {file_path}")
