import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Find and fix the handleNavigate function (around line 5105)
# Current function resets isDatasetExplorerOpen and selectedDatasetDetails
# Need to add reset of section-specific state based on navigation target

# Let me first find the exact location of handleNavigate
for i in range(5100, 5120):
    if 'const handleNavigate' in lines[i]:
        print(f'handleNavigate at line {i+1}: {lines[i][:100]}')
    if 'setIsDatasetExplorerOpen' in lines[i]:
        print(f'setIsDatasetExplorerOpen at line {i+1}: {lines[i][:100]}')
    if 'setSelectedDatasetDetails' in lines[i]:
        print(f'setSelectedDatasetDetails at line {i+1}: {lines[i][:100]}')

# The handleNavigate function is at lines 5105-5110 (1-indexed)
# 0-indexed: 5104-5109

# Let me read the exact current content
print('Current handleNavigate function:')
for i in range(5103, 5112):
    print(f'{i+1}: {lines[i][:150]}')