import os

directory = r"c:\Users\Rajesh k\Desktop\studenttechprojects"

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".html"):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            new_lines = []
            skip_index_ads = False
            
            if file == "index.html":
                # Special handling for index.html delay script
                # We want to remove lines 223 to 239 (roughly)
                # But let's be more precise by looking for the loadAds pattern
                i = 0
                while i < len(lines):
                    line = lines[i]
                    if "var loadAds = function () {" in line:
                        # Find the end of the script tag
                        while i < len(lines) and "</script>" not in lines[i]:
                            i += 1
                        i += 1 # skip the </script> tag as well? No, let's see where the script tag started.
                        # Wait, the script tag starts before loadAds
                        # Let's find the <script> before loadAds
                        start_script = -1
                        for j in range(len(new_lines)-1, -1, -1):
                            if "<script>" in new_lines[j]:
                                start_script = j
                                break
                        if start_script != -1:
                            # Check if it's the right script
                            # This is a bit risky, let's just look for the specific lines
                            pass
                
                # Safer approach for index.html:
                content = "".join(lines)
                import re
                # remove the script block containing adsbygoogle
                pattern = r"<script>\s+// Delay ad script.*?window\.addEventListener\('load'.*?adsbygoogle.*?\}\);\s+</script>"
                new_content = re.sub(pattern, "", content, flags=re.DOTALL)
                
                # Also remove the line 12 style simple script if it exists there too
                new_content = re.sub(r'\s+<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js\?client=ca-pub-2919350397675296"></script>', "", new_content)

                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Cleaned Adsense from {file_path}")
            else:
                # Regular files
                for line in lines:
                    if 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js' in line:
                        continue
                    new_lines.append(line)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)
                print(f"Cleaned Adsense from {file_path}")
