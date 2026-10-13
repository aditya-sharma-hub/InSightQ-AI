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

async function checkColumns() {
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL || 'testuser_26889@example.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
  });

  if (authError) {
    console.error('Login failed:', authError);
    return;
  }
  console.log('Login successful.');

  console.log('Probing dataset_columns...');
  const { data, error } = await supabase.from('dataset_columns').select('*').limit(1);
  if (error) {
    console.error('Error fetching dataset_columns:', error);
  } else {
    console.log('dataset_columns row sample:', data);
  }
}

checkColumns();
