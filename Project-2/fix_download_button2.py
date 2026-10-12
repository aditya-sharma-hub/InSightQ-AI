import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# The current broken state (from reading):
# 3934:                 React.createElement('div', { style: { marginTop: 16, display: 'flex', gap: 12 } },
# 3935:                   React.createElement('button', { className: 'btn-primary-action', onClick: () => onNavigate('reports') }, 'View All Reports'),
# 3936:                   React.createElement('button', { className: 'btn-secondary-action', onClick: () => onNavigate('reports') }, 'Generate New Report')
# 3937:                   React.createElement('button', {
# 3938:                   React.createElement("button", { type: "button", className: "btn-primary-action", onClick: () => selectedDatasetDetails && handleDownloadReport(selectedDatasetDetails) }, "Download Report"),
# 3939:               );
# 3940:             }
#
# I need to fix lines 3937-3939 to have the proper single-line download button
# and ensure the closing parens are correct.

# The correct structure should be:
# 3934:                 React.createElement('div', { style: { marginTop: 16, display: 'flex', gap: 12 } },
# 3935:                   React.createElement('button', { className: 'btn-primary-action', onClick: () => onNavigate('reports') }, 'View All Reports'),
# 3936:                   React.createElement('button', { className: 'btn-secondary-action', onClick: () => onNavigate('reports') }, 'Generate New Report'),
# 3937:                   React.createElement('button', { type: 'button', className: 'btn-primary-action', onClick: () => selectedDatasetDetails && handleDownloadReport(selectedDatasetDetails) }, 'Download Report'),
# 3938:                 )
# 3939:               );
# 3940:             }

# Replace lines 3937-3939 (0-indexed: 3936-3938) with the fixed version
# Currently:
# 0-indexed 3936 = line 3937: '                  React.createElement(\'button\', {'
# 0-indexed 3937 = line 3938: '                  React.createElement("button", { type: "button", ...}, "Download Report"),'
# 0-indexed 3938 = line 3939: '               );'

# I want to replace these 3 lines with 3 fixed lines:
fixed_lines = [
    '                  React.createElement(\"button\", { type: \"button\", className: \"btn-primary-action\", onClick: () => selectedDatasetDetails && handleDownloadReport(selectedDatasetDetails) }, \"Download Report\"),',
    '                )',
    '              );'
]

# But wait, I need to also keep the existing lines 3935 and 3936
# Let me just replace lines at 0-indexed positions 3936, 3937, 3938

# Actually, let me just replace from 3936 to 3938 (3 lines)
replace_start = 3936  # 0-indexed line 3937
replace_end = 3939    # 0-indexed, exclusive, so this covers 3936, 3937, 3938

print(f'Replacing lines {replace_start} to {replace_end - 1} (0-indexed)')

# What's currently there?
for i in range(replace_start, replace_end):
    print(f'  {i+1}: {lines[i][:100]}')

lines[replace_start:replace_end] = fixed_lines

print(f'After replacement, {len(lines)} lines')

# Write the modified file
new_t = '\n'.join(lines)
pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').write_text(new_t, encoding='utf-8')
print('File updated')