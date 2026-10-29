import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Remove the geo tab from data_analyst roleTabs (line 3438, has emoji)
for i, l in enumerate(lines):
    if i >= 3433 and i <= 3440 and "Geographic Intelligence" in l and "id: 'geo'" in l:
        lines[i] = ''
        break

new_t = '\n'.join(lines)
if new_t != t:
    pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').write_text(new_t, encoding='utf-8')
    print('Removed geo tab from roleTabs')
else:
    print('Geo tab not found in roleTabs')