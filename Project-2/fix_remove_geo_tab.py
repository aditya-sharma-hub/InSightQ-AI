import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Find and remove the geo tab from data_analyst roleTabs
for i, l in enumerate(lines):
    if "id: 'geo', label: 'Geographic Intelligence'" in l:
        print(f'Found at line {i+1}: {l[:300]}')
        lines[i] = ''
        break

new_t = '\n'.join(lines)
if new_t != t:
    pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').write_text(new_t, encoding='utf-8')
    print('Removed geo tab from roleTabs')
else:
    print('Geo tab not found in roleTabs')