const { createClient } = require('c:/Users/admin/Desktop/AI Business/Project-2/node_modules/@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('c:/Users/admin/Desktop/AI Business/Project-2/.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)[1].trim();
const supabase = createClient(url, key);

async function checkColumns() {
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'testuser_26889@gmail.com',
    password: 'TestPassword123!'
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
