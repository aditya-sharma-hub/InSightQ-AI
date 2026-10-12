const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  console.log('Testing public query on anomaly_runs...');
  const { data: runs, error: runsErr } = await supabase.from('anomaly_runs').select('*').limit(1);
  console.log('runs result:', runs, 'error:', runsErr);

  console.log('Testing public query on anomaly_results...');
  const { data: res, error: resErr } = await supabase.from('anomaly_results').select('*').limit(1);
  console.log('results result:', res, 'error:', resErr);
}

test();
