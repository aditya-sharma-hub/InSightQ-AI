import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Revert handleNavigate to original (remove the state reset additions)
# The original handleNavigate was:
# const handleNavigate = (navId) => {
#   setIsDatasetExplorerOpen(false);
#   setSelectedDatasetDetails(null);
#   setActiveNav(navId);
#   window.location.hash = `#/${navId}`;
# };

# Find and replace the current handleNavigate (lines 5105-5140) with the original

# Current handleNavigate starts at 0-indexed 5104 (line 5105)
# and ends at 0-indexed 5139 (line 5140)

# I need to replace lines 5105-5140 (1-indexed) with the original

original_handle_navigate = '''    const handleNavigate = (navId) => {
      setIsDatasetExplorerOpen(false);
      setSelectedDatasetDetails(null);
      setActiveNav(navId);
      window.location.hash = `#/${navId}`;
    };'''

# Current handleNavigate is at 0-indexed 5104-5139 (lines 5105-5140)
# Replace lines[5104:5140] with the original

# 0-indexed: line 5105 is at index 5104, line 5140 is at index 5139
# So lines[5104:5140] covers indices 5104, 5105, ..., 5139 (36 lines, covering lines 5105-5140)

replace_start = 5104  # 0-indexed, line 5105
replace_end = 5140    # 0-indexed exclusive, so this covers up to line 5140

# Check what's currently there
for i in range(replace_start, replace_end):
    if i < len(lines):
        pass  # skip

lines[replace_start:replace_end] = [original_handle_navigate]

print(f'Reverted handleNavigate. Now {len(lines)} lines')

# Write the modified file
new_t = '\n'.join(lines)
pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').write_text(new_t, encoding='utf-8')
print('File updated')