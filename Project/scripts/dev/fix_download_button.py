import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Find and fix the multi-line createElement for the download button
# Current lines 3936-3942 are:
# 3936:                   React.createElement('button', { className: 'btn-secondary-action', onClick: () => onNavigate('reports') }, 'Generate New Report')
# 3937:                   React.createElement('button', {
# 3938:                     type: 'button',
# 3939:                     className: 'btn-primary-action',
# 3940:                     onClick: () => handleDownloadReport(selectedDatasetDetails)
# 3941:                   }, 'Download Report')
# 3942:                 )
#
# I need to replace the multi-line download button (lines 3937-3941) with a single-line version
# and adjust the closing parens accordingly.

# The target: replace lines at 0-indexed positions 3936-3941 (lines 3937-3941 in 1-indexed)
# Actually let me just work with 0-indexed.

# The multi-line download button starts at 0-indexed 3937 (line 3938 in 1-indexed? No...)

# Let me just find the exact lines to replace
for i in range(3935, 3945):
    if 'handleDownloadReport' in lines[i]:
        print(f'handleDownloadReport found at 0-indexed {i}: {lines[i][:100]}')
    if 'Download Report' in lines[i]:
        print(f'Download Report found at 0-indexed {i}: {lines[i][:100]}')

# The multi-line createElement is at 0-indexed 3937-3941
# I'll replace lines[3937:3942] (0-indexed, so lines 3937,3938,3939,3940,3941) with a single-line version

# Single-line download button:
single_download = '                  React.createElement(\"button\", { type: \"button\", className: \"btn-primary-action\", onClick: () => selectedDatasetDetails && handleDownloadReport(selectedDatasetDetails) }, \"Download Report\"),'

# Replace lines 3937-3941 (0-indexed) with the single-line version
# 0-indexed: line 3937 is at index 3936, line 3941 is at index 3940
# So lines[3937:3942] gives indices 3937,3938,3939,3940,3941 (5 lines)

replace_start = 3937  # 0-indexed start of multi-line download button
replace_end = 3942    # 0-indexed end (exclusive), so this covers indices 3937,3938,3939,3940,3941

print(f'Replacing lines {replace_start} to {replace_end - 1} (0-indexed)')

# Check what we're replacing
print('Lines being replaced:')
for i in range(replace_start, replace_end):
    print(f'  {i+1}: {lines[i][:100]}')

lines[replace_start:replace_end] = [single_download]

print(f'After replacement, {len(lines)} lines')

# Verify the fix - the closing ) on what was line 3942 should now be adjusted
# Actually, the single-line button has its own closing ), so the div closing on what was line 3942 should remain

# Write the modified file
new_t = '\n'.join(lines)
pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').write_text(new_t, encoding='utf-8')
print('File updated')