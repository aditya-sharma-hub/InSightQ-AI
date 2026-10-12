import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Add Download button after "Generate New Report" at line 3936
# The target is lines[3935] which contains the "Generate New Report" button

# Find the exact line with "Generate New Report" in the Reports section
for i in range(3934, 3940):
    if 'Generate New Report' in lines[i]:
        print(f'Found at line {i+1}: {lines[i][:300]}')
        # Replace this line with the button + Download button
        # Actually, let me insert AFTER this line
        insert_after = i + 1  # Insert after line i
        break

# Create the Download button JSX
download_button = '''                  React.createElement('button', {
                    type: 'button',
                    className: 'btn-primary-action',
                    onClick: () => handleDownloadReport(selectedDatasetDetails)
                  }, 'Download Report')'''

# Insert the download button after line 3936 (the "Generate New Report" button)
# Line 3936 is at 0-indexed position 3935
insert_at = 3936  # After line 3936, so at index 3936

# Actually, let me just insert the download button code after line 3936
# The lines array is 0-indexed, so line 3936 is at index 3935
# I want to insert after line 3936, so at index 3936

# Let me just replace the whole button group
button_group_start = 3934  # 'React.createElement(\"div\", { style: ... }','
button_group_end = 3938  # ')', the closing of the div

# Replace lines[3934:3939] with the new button group including Download
new_buttons = '''                React.createElement('div', { style: { marginTop: 16, display: 'flex', gap: 12 } },
                  React.createElement('button', { className: 'btn-primary-action', onClick: () => onNavigate('reports') }, 'View All Reports'),
                  React.createElement('button', { className: 'btn-secondary-action', onClick: () => onNavigate('reports') }, 'Generate New Report'),
                  React.createElement('button', {
                    type: 'button',
                    className: 'btn-primary-action',
                    onClick: () => selectedDatasetDetails && handleDownloadReport(selectedDatasetDetails)
                  }, 'Download Report')                )'''

# Replace the lines
if insert_at <= len(lines):
    # Replace lines[3934:3939] with new_buttons
    # Actually 3934 to 3939 gives 5 lines (3934,3935,3936,3937,3938)
    # But I need to be more precise
    
    # Let me just replace the specific lines
    # Line 3934 (0-indexed 3933): '                React.createElement(\"div\", { style: ...'
    # Line 3935 (0-indexed 3934): '                  React.createElement(\"button\", ...View All Reports),'
    # Line 3936 (0-indexed 3935): '                  React.createElement(\"button\", ...Generate New Report)')
    # Line 3937 (0-indexed 3936): '                )'
    # Line 3938 (0-indexed 3937): '              );'
    # Line 3939 (0-indexed 3938): '            }'
    
    # I'll replace lines 3934-3938 (5 lines) with the new button group
    replace_start = 3933  # 0-indexed line 3934
    replace_end = 3938    # 0-indexed line 3938 (inclusive)
    
    replacement = new_buttons
    
    # Actually, let me just insert the download button after line 3935
    # Line 3935 (0-indexed 3934) is '                  React.createElement("button", ...Generate New Report),'
    # I'll insert after this line
    
    insert_pos = 3935  # Insert after index 3935 (which is line 3936 in 1-indexed)
    
    # Insert the download button line after index 3935
    lines.insert(insert_pos + 1, download_button)
    print(f'Inserted download button at position {insert_pos + 1}')
    
    # Now write the modified file
    new_t = '\n'.join(lines)
    pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').write_text(new_t, encoding='utf-8')
    print('File updated')
else:
    print('Could not find insert position')