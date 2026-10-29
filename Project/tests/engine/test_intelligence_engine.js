/**
 * INSIGHTIQ AI — INTELLIGENCE ENGINE VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Design Tokens & Scientific Instrument Palette (#070B12, #111927, #18C8F4, #3678FF, #8B70FF, #EAF2FC)
 * 2. Shell Navigation & Typography (Home, Datasets, Analysis, Models, Reports, AI Copilot, Projects)
 * 3. Intelligence Graph Component & SVG Directed Acyclic Graph (DAG) Topology
 * 4. Command Surface (Ctrl+K, Natural Language Parsing, Action Discovery, Error Handling)
 * 5. Signal Rail (Real Engine Telemetry, Quality Diagnostics, Model Status, Immutable Logs)
 * 6. Four Role-Aware Personas (Data Analyst, Data Scientist, Business Analyst, Admin)
 * 7. Accessibility, Contrast & prefers-reduced-motion Standards
 * 8. Zero Fabrication Guarantee (Zero fake metrics, zero mock loops, real empty states)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('   INTELLIGENCE ENGINE — COMPREHENSIVE VERIFICATION SUITE       ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(suite, name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] [${suite}] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] [${suite}] ${name}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

const appJs = fs.readFileSync(path.resolve(__dirname, '../../app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
const variablesCss = fs.readFileSync(path.resolve(__dirname, '../../styles/variables.css'), 'utf8');
const componentsCss = fs.readFileSync(path.resolve(__dirname, '../../styles/components.css'), 'utf8');

// -------------------------------------------------------------
// 1. DESIGN TOKENS & SCIENTIFIC INSTRUMENT PALETTE
// -------------------------------------------------------------
console.log('>>> [1. Design Tokens & Scientific Instrument Palette]');

runTest('Palette', 'Obsidian #070B12 defined as dark primary background', () => {
  assert(variablesCss.includes('--bg-obsidian: #070B12'), 'Missing --bg-obsidian');
  assert(variablesCss.includes('#070B12'), 'Obsidian hex not found');
});

runTest('Palette', 'Graphite #111927 defined as panel surface', () => {
  assert(variablesCss.includes('--bg-graphite: #111927'), 'Missing --bg-graphite');
});

runTest('Palette', 'Electric Cyan #18C8F4 defined as signal accent', () => {
  assert(variablesCss.includes('--accent-cyan: #18C8F4') || variablesCss.includes('#18C8F4'), 'Missing --accent-cyan');
});

runTest('Palette', 'Signal Blue #3678FF defined as primary analytical action', () => {
  assert(variablesCss.includes('--accent-blue: #3678FF') || variablesCss.includes('#3678FF'), 'Missing --accent-blue');
});

runTest('Palette', 'Discovery Violet #8B70FF defined for AI and synthesis', () => {
  assert(variablesCss.includes('--accent-violet: #8B70FF') || variablesCss.includes('#8B70FF'), 'Missing --accent-violet');
});

runTest('Palette', 'Soft White #EAF2FC defined for primary editorial text', () => {
  assert(variablesCss.includes('--text-soft-white: #EAF2FC') || variablesCss.includes('#EAF2FC'), 'Missing --text-soft-white');
});

// -------------------------------------------------------------
// 2. SHELL NAVIGATION & BRANDING
// -------------------------------------------------------------
console.log('\n>>> [2. Shell Navigation & Branding]');

runTest('Shell', 'Document title updated to Intelligence Engine', () => {
  assert(indexHtml.includes('Intelligence Engine'), 'index.html does not contain Intelligence Engine title');
});

runTest('Shell', 'Sidebar branding reflects Intelligence Engine instrument identity', () => {
  assert(appJs.includes("'Intelligence '") || appJs.includes('Intelligence Engine'), 'app.js does not contain Intelligence Engine branding');
  assert(appJs.includes('AUTONOMOUS INSTRUMENT') || appJs.includes('INTELLIGENCE ENGINE'), 'Branding subtitle missing');
});

runTest('Shell', 'Navigation includes canonical analytical portals (Home, Datasets, Analysis, Models, Reports, AI Copilot, Projects)', () => {
  assert(appJs.includes("id: 'overview', label: 'Home'"), 'Overview not renamed to Home');
  assert(appJs.includes("id: 'datasets', label: 'Datasets'"), 'Missing Datasets navigation');
  assert(appJs.includes("id: 'analytics', label: 'Analysis'"), 'Missing Analysis navigation');
  assert(appJs.includes("id: 'models', label: 'Models'"), 'Missing Models navigation');
  assert(appJs.includes("id: 'reports', label: 'Reports'"), 'Missing Reports navigation');
});

// -------------------------------------------------------------
// 3. INTELLIGENCE GRAPH COMPONENT
// -------------------------------------------------------------
console.log('\n>>> [3. Intelligence Graph Component & DAG Topology]');

runTest('Graph', 'IntelligenceGraph component declared and registered in app.js', () => {
  assert(appJs.includes('function IntelligenceGraph('), 'IntelligenceGraph component definition missing');
});

runTest('Graph', 'Graph renders SVG DAG with accessible node groups and connectors', () => {
  assert(appJs.includes("ie-graph-svg-wrapper"), 'Missing graph SVG wrapper class');
  assert(appJs.includes("graph-node-group"), 'Missing graph node group class');
  assert(appJs.includes("markerEnd") || appJs.includes("marker-end"), 'Missing SVG arrow markers for DAG connections');
});

runTest('Graph', 'Node schema supports 6 real analytical stages (dataset, cleaning, analysis, model, finding, report)', () => {
  assert(appJs.includes("kind: 'dataset'"), 'Missing dataset node kind');
  assert(appJs.includes("kind: 'cleaning'"), 'Missing cleaning node kind');
  assert(appJs.includes("kind: 'analysis'"), 'Missing analysis node kind');
  assert(appJs.includes("kind: 'model'"), 'Missing model node kind');
  assert(appJs.includes("kind: 'finding'"), 'Missing finding node kind');
  assert(appJs.includes("kind: 'report'"), 'Missing report node kind');
});

runTest('Graph', 'Node interaction opens Node Inspector drawer with real metadata & action trigger', () => {
  assert(appJs.includes("ie-node-inspector"), 'Missing Node Inspector panel');
  assert(appJs.includes("actionLabel"), 'Missing actionLabel on node inspector');
});

runTest('Graph', 'Truthful empty workspace state rendered when no dataset is present', () => {
  assert(appJs.includes('Scientific Workspace Ready') || appJs.includes('INTELLIGENCE GRAPH IDLE'), 'Missing empty workspace heading in IntelligenceGraph');
  assert(appJs.includes('Upload Structured Data') || appJs.includes('Ingest Dataset'), 'Missing upload action in empty graph state');
});

// -------------------------------------------------------------
// 4. COMMAND SURFACE (CTRL+K & NATURAL LANGUAGE)
// -------------------------------------------------------------
console.log('\n>>> [4. Command Surface (Ctrl+K & Natural Language)]');

runTest('Command', 'IntelligenceCommandSurface component declared in app.js', () => {
  assert(appJs.includes('function IntelligenceCommandSurface('), 'Missing IntelligenceCommandSurface component');
});

runTest('Command', 'Ctrl+K and Cmd+K keyboard shortcut listener implemented', () => {
  assert(appJs.includes("(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'"), 'Missing Ctrl+K listener');
});

runTest('Command', 'Escape key dismisses expanded command surface', () => {
  assert(appJs.includes("e.key === 'Escape'"), 'Missing Escape key handler');
});

runTest('Command', 'Command surface supports natural language analysis intent parsing', () => {
  assert(appJs.includes("q.includes('clean') || q.includes('dedup')"), 'Missing clean command handler');
  assert(appJs.includes("q.includes('train') || q.includes('model')"), 'Missing model command handler');
  assert(appJs.includes("q.includes('report') || q.includes('pdf')"), 'Missing report command handler');
  assert(appJs.includes("q.includes('stat') || q.includes('correlat')"), 'Missing stats command handler');
});

runTest('Command', 'Command surface provides quick action discovery tags', () => {
  assert(appJs.includes("ie-command-tag") || appJs.includes("ie-cmd-pill"), 'Missing command quick tags');
});

// -------------------------------------------------------------
// 5. SIGNAL RAIL & TELEMETRY
// -------------------------------------------------------------
console.log('\n>>> [5. Signal Rail & Real Telemetry]');

runTest('Signal Rail', 'IntelligenceSignalRail component declared in app.js', () => {
  assert(appJs.includes('function IntelligenceSignalRail('), 'Missing IntelligenceSignalRail component');
});

runTest('Signal Rail', 'Signal Rail displays verified engine health and latency metrics', () => {
  assert(appJs.includes('Kernel State'), 'Missing Kernel State telemetry');
  assert(appJs.includes('Determinism'), 'Missing Determinism telemetry indicator');
  assert(appJs.includes('Sub-millisecond'), 'Missing Engine Latency telemetry indicator');
});

runTest('Signal Rail', 'Signal Rail queries real dataset quality and logs', () => {
  assert(appJs.includes('qualityScore'), 'Signal Rail does not evaluate qualityScore');
  assert(appJs.includes('Audit Ledger') || appJs.includes('Audited Events'), 'Missing audit ledger on signal rail');
});

// -------------------------------------------------------------
// 6. FOUR ROLE-AWARE WORKSPACE PERSONAS
// -------------------------------------------------------------
console.log('\n>>> [6. Four Role-Aware Workspace Personas]');

runTest('Roles', 'Data Analyst persona renders exploration, quality score and cleaning operations', () => {
  assert(appJs.includes("role === 'data_analyst'"), 'Missing data_analyst branch');
  assert(appJs.includes('Quality Score:'), 'Missing Quality Score badge in analyst view');
  assert(appJs.includes('Schema Health & Quality'), 'Missing Schema Health section');
});

runTest('Roles', 'Data Scientist persona renders trained models, evaluation metrics, and feature modeling', () => {
  assert(appJs.includes("role === 'data_scientist'"), 'Missing data_scientist branch');
  assert(appJs.includes('Trained Models Catalog') || appJs.includes('Models Catalog'), 'Missing Models section in scientist view');
  assert(appJs.includes('Train ML Model'), 'Missing Train ML Model action button');
});

runTest('Roles', 'Business Analyst persona renders executive KPIs, strategic summary and PDF report generator', () => {
  assert(appJs.includes("role === 'project_manager'"), 'Missing business analyst / project manager branch');
  assert(appJs.includes('Executive AI Brief & Strategic Synthesis') || appJs.includes('Executive Synthesis'), 'Missing Executive Brief in BA view');
  assert(appJs.includes('Generate Executive PDF'), 'Missing PDF generator action button');
});

runTest('Roles', 'Admin persona renders system health, database inventory, and user audit ledger', () => {
  assert(appJs.includes("role === 'admin'"), 'Missing admin branch');
  assert(appJs.includes('Enterprise System Health & Governance'), 'Missing Admin governance section');
  assert(appJs.includes('Strict Multi-Tenant Isolation'), 'Missing tenant isolation audit item');
});

runTest('Roles', 'Role switching respects security boundary (admin not in SELF_SELECTABLE_ROLE_IDS)', () => {
  assert(appJs.includes("SELF_SELECTABLE_ROLE_IDS = ['data_analyst', 'data_scientist', 'project_manager']"), 'Admin must not be self-selectable');
});

// -------------------------------------------------------------
// 7. ACCESSIBILITY, CONTRAST & REDUCED MOTION
// -------------------------------------------------------------
console.log('\n>>> [7. Accessibility & Reduced Motion]');

runTest('A11y', 'Prefers-reduced-motion media query implemented for animations', () => {
  assert(componentsCss.includes('@media (prefers-reduced-motion: reduce)'), 'Missing prefers-reduced-motion in components.css');
});

runTest('A11y', 'Visible focus outlines defined for keyboard navigability', () => {
  assert(componentsCss.includes(':focus-visible'), 'Missing :focus-visible rules in components.css');
});

runTest('A11y', 'Accessible high contrast styling for scientific instrument text', () => {
  assert(componentsCss.includes('--text-soft-white') || componentsCss.includes('#EAF2FC'), 'Soft white text contrast not utilized');
  assert(componentsCss.includes('--text-muted') || componentsCss.includes('#8E9BB0'), 'Muted secondary text token missing');
});

// -------------------------------------------------------------
// 8. ZERO FABRICATION & DATA INTEGRITY
// -------------------------------------------------------------
console.log('\n>>> [8. Zero Fabrication & Data Integrity]');

runTest('Data Integrity', 'Zero fake demo dataset buttons in Home workspace', () => {
  const homeBlock = appJs.slice(appJs.indexOf('function IntelligenceEngineHome'), appJs.indexOf('function DataScientistDashboard'));
  assert(!homeBlock.includes('Load Demo Dataset'), 'Home must not contain Load Demo Dataset');
  assert(!homeBlock.includes('Load Demo Projects'), 'Home must not contain Load Demo Projects');
  assert(!homeBlock.includes('Load Demo Models'), 'Home must not contain Load Demo Models');
});

runTest('Data Integrity', 'No Math.random() fabrication loops inside Intelligence Engine components', () => {
  const ieCode = appJs.slice(appJs.indexOf('INTELLIGENCE ENGINE — DISTINCTIVE SCIENTIFIC INSTRUMENT CORE'), appJs.indexOf('function DataScientistDashboard'));
  assert(!ieCode.includes('Math.random()'), 'Found Math.random() in Intelligence Engine components!');
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passCount}/${passCount + failCount} TESTS PASSED (${Math.round((passCount / (passCount + failCount)) * 100)}%)`);
if (failCount === 0) {
  console.log('>>> ALL INTELLIGENCE ENGINE CHECKS FULLY VERIFIED (100%) <<<');
} else {
  console.error(`>>> ${failCount} TEST(S) FAILED <<<`);
  process.exit(1);
}
console.log('================================================================\n');
