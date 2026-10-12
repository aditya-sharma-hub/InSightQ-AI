const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)[1].trim();
const supabase = createClient(url, key);

async function checkSchema() {
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'testuser_26889@gmail.com',
    password: 'TestPassword123!'
  });

  if (authError) {
    console.error('Login failed:', authError);
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
