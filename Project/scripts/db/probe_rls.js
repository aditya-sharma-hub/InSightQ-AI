const { createClient } = require('c:/Users/admin/Desktop/AI Business/Project-2/node_modules/@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('c:/Users/admin/Desktop/AI Business/Project-2/.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)[1].trim();
const supabase = createClient(url, key);

async function testRLS() {
  console.log('Testing insert into datasets without auth...');
  const { data, error } = await supabase.from('datasets').insert({
    user_id: '33a65f2b-2701-44d6-9f5a-b6938f2fe219',
    name: 'Anon Test Dataset',
    original_filename: 'anon_test.csv',
    storage_path: 'anon/test',
    file_type: 'CSV',
    file_size: 100,
    status: 'processing'
  }).select('*');

  console.log('Insert result:', data, 'Error:', error);
}

testRLS();
