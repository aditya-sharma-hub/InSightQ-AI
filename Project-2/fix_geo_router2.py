import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Insert geo render case after line 12590 (the SharedProjectsView closing '}),')
# 0-indexed: line 12590 is at index 12589

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

# Insert after line 12590 (0-indexed: 12589)
insert_after = 12589  # This is the index of line 12590 (the '}),' line)

lines.insert(insert_after + 1, geo_case.strip())
print(f'Inserted geo case at 0-indexed {insert_after + 1}, now {len(lines)} lines')

# Write the modified file
new_t = '\n'.join(lines)
pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').write_text(new_t, encoding='utf-8')
print('File updated')