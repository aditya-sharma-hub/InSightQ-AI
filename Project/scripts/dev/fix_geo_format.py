import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Fix the formatting - the comment got separated from the can condition
# Current (broken):
# 12591: /* 0.3 GEOGRAPHIC INTELLIGENCE WORKSPACE */
# 12592:                 can(effectiveRole, 'geographic.view') && activeNav === 'geo' && React.createElement(GeoIntelligenceWorkspace, {

# Fix: Move the comment to be on the line before the can condition
# I need to replace lines 12591-12592 with just the comment, and shift the can condition down

# Actually, let me just fix it by replacing the two lines
# Line 12591 (0-indexed 12590): /* 0.3 GEOGRAPHIC INTELLIGENCE WORKSPACE */
# Line 12592 (0-indexed 12591):                 can(effectiveRole, 'geographic.view') ...

# I'll combine them: the comment should precede the can condition
# Replace lines at 0-indexed 12590 and 12591 with properly formatted version

# The current state after the geo insertion:
# Line 12591 (1-indexed): /* 0.3 GEOGRAPHIC INTELLIGENCE WORKSPACE */
# Line 12592 (1-indexed):                 can(effectiveRole, 'geographic.view') && activeNav === 'geo' && React.createElement(GeoIntelligenceWorkspace, {

# I want:
# Line 12591 (1-indexed): /* 0.3 GEOGRAPHIC INTELLIGENCE WORKSPACE */
# Line 12592 (1-indexed):                 can(effectiveRole, 'geographic.view') && activeNav === 'geo' && React.createElement(GeoIntelligenceWorkspace, {
#                   userProfile,

# Actually the formatting is already there, just the comment position is fine. 
# Let me check if the structure is valid by just verifying the lines.

# Actually the issue is the comment is on line 12591 but the can starts on 12592 - that's fine for JS.
# Let me just verify the structure compiles by checking syntax.

print('Checking current state...')
print(f'Line 12591: {lines[12590][:80]}')
print(f'Line 12592: {lines[12591][:80]}')

# The structure looks correct - comment on 12591, can condition on 12592
# This is valid JS. Let me verify.