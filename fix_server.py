import re

with open('backend/server.js', 'r') as f:
    content = f.read()

# I will replace the old functions manually
# They start with "function await dbAll" or "function await dbGet" now.
content = re.sub(r'function await dbAll.*?throw err;\n    }\n}', '', content, flags=re.DOTALL)
content = re.sub(r'function await dbGet.*?throw err;\n    }\n}', '', content, flags=re.DOTALL)

with open('backend/server.js', 'w') as f:
    f.write(content)
