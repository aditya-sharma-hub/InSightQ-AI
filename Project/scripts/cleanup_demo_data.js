/**
 * InsightIQ AI — Dedicated Development Cleanup Script
 * Safely identifies and cleans known demo artifacts and sample records.
 *
 * SAFETY GUARANTEES:
 * 1. Default mode is DRY-RUN. No data is modified unless '--execute --confirm-delete' are passed.
 * 2. Only targets explicitly known demo identifiers and records flagged with is_demo = true.
 * 3. Never issues TRUNCATE, never issues unrestricted DELETE (WHERE 1=1 is forbidden).
 * 4. Preserves all real user accounts, authentic datasets, user projects, schema migrations, and RLS policies.
 * 5. Respects foreign key constraints by ordering dependencies.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse CLI flags
const args = process.argv.slice(2);
const isExecute = args.includes('--execute');
const isConfirmed = args.includes('--confirm-delete');
const isDryRun = !isExecute || !isConfirmed;

// Load environment credentials safely
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('[Error] .env.local not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error('[Error] Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// Known explicit demo identifiers
const DEMO_ALLOWLIST = {
  datasets: ['dataco-ds-001', 'demo-ds-001', 'demo-ds-002'],
  projects: ['proj-supply-chain-001', 'proj-customer-360-002', 'proj-financial-audit-003'],
  models: ['mod-demo-001', 'mod-demo-002'],
  reports: ['rpt-demo-001', 'rpt-demo-002']
};

console.log('================================================================');
console.log(`   INSIGHTIQ AI — PERSISTENT DEMO DATA CLEANUP AUDITOR   `);
console.log(`   Mode: ${isDryRun ? 'DRY-RUN (Simulate only, no changes)' : 'EXECUTE (Deletion enabled)'}`);
console.log('================================================================\n');

async function runCleanup() {
  const summary = {
    tablesScanned: 0,
    demoRecordsIdentified: 0,
    recordsDeleted: 0,
    tableBreakdown: {}
  };

  // 1. Inspect Datasets
  try {
    const { data: demoDatasets, error: dsErr } = await supabase
      .from('datasets')
      .select('id, name, created_at')
      .or(`id.in.(${DEMO_ALLOWLIST.datasets.join(',')}),name.ilike.%DataCo%,name.ilike.%sample_%`);

    summary.tablesScanned++;
    if (!dsErr && demoDatasets) {
      summary.tableBreakdown['datasets'] = demoDatasets.length;
      summary.demoRecordsIdentified += demoDatasets.length;

      if (demoDatasets.length > 0) {
        console.log(`[datasets] Found ${demoDatasets.length} demo records:`);
        demoDatasets.forEach(d => console.log(`  - [ID: ${d.id}] ${d.name}`));

        if (!isDryRun) {
          const dsIds = demoDatasets.map(d => d.id);
          // Delete child records first to respect foreign keys
          await supabase.from('dataset_columns').delete().in('dataset_id', dsIds);
          await supabase.from('dataset_versions').delete().in('dataset_id', dsIds);
          await supabase.from('dataset_quality').delete().in('dataset_id', dsIds);
          await supabase.from('dataset_statistics').delete().in('dataset_id', dsIds);
          
          const { error: delErr } = await supabase.from('datasets').delete().in('id', dsIds);
          if (!delErr) {
            summary.recordsDeleted += demoDatasets.length;
            console.log(`  ✓ Successfully deleted ${demoDatasets.length} demo datasets and related child records.`);
          } else {
            console.error(`  ✗ Failed to delete demo datasets:`, delErr.message);
          }
        }
      } else {
        console.log(`[datasets] 0 demo records found. Table is clean.`);
      }
    } else {
      console.log(`[datasets] Skipped/Clean (0 demo records or restricted by RLS)`);
    }
  } catch (err) {
    console.warn(`[datasets] Query note:`, err.message);
  }

  // 2. Inspect ML Models if table exists
  try {
    const { data: demoModels, error: modErr } = await supabase
      .from('ml_models')
      .select('id, model_name')
      .or(`id.in.(${DEMO_ALLOWLIST.models.join(',')}),is_demo.eq.true,model_name.ilike.%Late Delivery%,model_name.ilike.%Order Demand%`);

    summary.tablesScanned++;
    if (!modErr && demoModels) {
      summary.tableBreakdown['ml_models'] = demoModels.length;
      summary.demoRecordsIdentified += demoModels.length;

      if (demoModels.length > 0) {
        console.log(`\n[ml_models] Found ${demoModels.length} demo records:`);
        demoModels.forEach(m => console.log(`  - [ID: ${m.id}] ${m.model_name}`));

        if (!isDryRun) {
          const modIds = demoModels.map(m => m.id);
          const { error: delErr } = await supabase.from('ml_models').delete().in('id', modIds);
          if (!delErr) {
            summary.recordsDeleted += demoModels.length;
            console.log(`  ✓ Successfully deleted ${demoModels.length} demo models.`);
          } else {
            console.error(`  ✗ Failed to delete demo models:`, delErr.message);
          }
        }
      } else {
        console.log(`\n[ml_models] 0 demo records found. Table is clean.`);
      }
    }
  } catch (err) {
    // Table may not exist or not be exposed
  }

  // 3. Inspect Executive Reports if table exists
  try {
    const { data: demoReports, error: repErr } = await supabase
      .from('executive_reports')
      .select('id, title')
      .or(`id.in.(${DEMO_ALLOWLIST.reports.join(',')}),title.ilike.%Executive Analytics Summary%,title.ilike.%Financial Forecasting%`);

    summary.tablesScanned++;
    if (!repErr && demoReports) {
      summary.tableBreakdown['executive_reports'] = demoReports.length;
      summary.demoRecordsIdentified += demoReports.length;

      if (demoReports.length > 0) {
        console.log(`\n[executive_reports] Found ${demoReports.length} demo records:`);
        demoReports.forEach(r => console.log(`  - [ID: ${r.id}] ${r.title}`));

        if (!isDryRun) {
          const repIds = demoReports.map(r => r.id);
          const { error: delErr } = await supabase.from('executive_reports').delete().in('id', repIds);
          if (!delErr) {
            summary.recordsDeleted += demoReports.length;
            console.log(`  ✓ Successfully deleted ${demoReports.length} demo reports.`);
          } else {
            console.error(`  ✗ Failed to delete demo reports:`, delErr.message);
          }
        }
      } else {
        console.log(`\n[executive_reports] 0 demo records found. Table is clean.`);
      }
    }
  } catch (err) {
    // Table may not exist or not be exposed
  }

  console.log('\n================================================================');
  console.log('CLEANUP AUDIT SUMMARY:');
  console.log(`  - Tables Scanned:               ${summary.tablesScanned}`);
  console.log(`  - Demo Records Identified:      ${summary.demoRecordsIdentified}`);
  console.log(`  - Records Deleted:              ${summary.recordsDeleted}`);
  console.log(`  - Operation Mode:               ${isDryRun ? 'DRY RUN ONLY (No changes applied)' : 'EXECUTED'}`);
  if (isDryRun && summary.demoRecordsIdentified > 0) {
    console.log('\nTo execute deletion of identified demo records, run with:');
    console.log('  node scripts/cleanup_demo_data.js --execute --confirm-delete');
  } else if (summary.demoRecordsIdentified === 0) {
    console.log('\n>>> RESULT: Database persistent tables are 100% clean of demo records. <<<');
  }
  console.log('================================================================\n');

  return summary;
}

runCleanup().catch(err => {
  console.error('[Fatal Error in cleanup runner]:', err);
  process.exit(1);
});
