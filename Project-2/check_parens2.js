const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');
const lines = code.split('\n');

// Focus: count parens on each line (outside strings/templates)
function countLine(line) {
  let opens = 0, closes = 0;
  let inS = false, inD = false, inT = false;
  let esc = false;
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (inS) { if (ch === "'") inS = false; continue; }
    if (inD) { if (ch === '"') inD = false; continue; }
    if (inT) { if (ch === '`') inT = false; continue; }
    if (ch === "'") { inS = true; continue; }
    if (ch === '"') { inD = true; continue; }
    if (ch === '`') { inT = true; continue; }
    if (ch === '(') opens++;
    if (ch === ')') closes++;
  }
  return { opens, closes };
}

// Build cumulative depth from line 1
let depth = 0;
const depths = [];
for (let i = 0; i < lines.length; i++) {
  depths.push(depth);
  const { opens, closes } = countLine(lines[i]);
  depth += opens - closes;
}

// Show around the error
for (let i = 20735; i < 20965; i++) {
  const { opens, closes } = countLine(lines[i]);
  const d = depths[i];
  const nd = d + opens - closes;
  if (opens > 0 || closes > 0) {
    console.log(`L${String(i+1).padStart(5)}: ${String(d).padStart(3)}->${String(nd).padStart(3)} (${opens > 0 ? '+' + opens : ''} ${closes > 0 ? '-' + closes : ''})  ${lines[i].trim().substring(0, 90)}`);
  }
}
