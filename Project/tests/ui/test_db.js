const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
let url = process.env.VITE_SUPABASE_URL || '';
let key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  url = (env.match(/VITE_SUPABASE_URL=(.+)/)?.[1] || url).trim();
  key = (env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)?.[1] || key).trim();
}

const supabase = createClient(url, key);

async function checkSchema() {
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL || 'testuser_26889@example.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
  });

  if (authError) {
    console.error('Login failed:', authError.message || authError);
    process.exitCode = 1;
    return;
  }
  console.log('Login successful for user:', authData.user.id);

  console.log('Probing anomaly_results columns...');
  const { data, error } = await supabase.from('anomaly_results').select('*').limit(1);
  console.log('anomaly_results query result:', data, 'Error:', error);

  console.log('Probing anomaly_runs existence...');
  const { data: runsData, error: runsError } = await supabase.from('anomaly_runs').select('*').limit(1);
  console.log('anomaly_runs query result:', runsData, 'Error:', runsError);
}

checkSchema();
