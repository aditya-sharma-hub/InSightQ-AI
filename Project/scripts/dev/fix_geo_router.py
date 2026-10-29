import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Insert geo render case after line 12590 (the SharedProjectsView closing)
# Line 12590 in 1-indexed is at 0-indexed position 12589
# The line at 12590 ends with '}),'
# Line 12591 is blank
# Line 12592 starts the overview/data_analyst section

# I need to insert the geo case between line 12590 and line 12592
# Specifically, after the SharedProjectsView closing '});' at line 12590

# The geo case should be inserted after line 12590 (the SharedProjectsView)
# and before line 12591 (blank) and line 12592 (the data_analyst overview)

geo_case = '''                /* 0.3 GEOGRAPHIC INTELLIGENCE WORKSPACE */
                can(effectiveRole, 'geographic.view') && activeNav === 'geo' && React.createElement(GeoIntelligenceWorkspace, {
                  userProfile,
                  activeProject: userProjects.find(p => p.id === activeProjectId) || userProjects[0],
                  activeDatasetDetails,
                  onNavigate: handleNavigate,
                  userDatasets,
                  userReportsList,
                  onUpdateProjectStage: handleUpdateProjectStage
                }),'''

# Insert after line 12590
# 0-indexed: line 12590 is at index 12589
insert_after = 12589  # This is the index of line 12590

# Find the exact insertion point - after the SharedProjectsView closing
# Let me search for the pattern
found_idx = None
for i in range(12585, 12595):
    if 'SharedProjectsView' in lines[i] and '}),' in lines[i]:
        found_idx = i + 1  # Insert after this line
        break

print(f'Found insertion point at 0-indexed: {found_idx} (line {found_idx + 1})')

if found_idx is not None:
    lines.insert(found_idx, geo_case.strip())
    print(f'Inserted geo case, now {len(lines)} lines')
    
    # Write the modified file
    new_t = '\n'.join(lines)
    pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').write_text(new_t, encoding='utf-8')
    print('File updated')
else:
    print('Could not find insertion point')