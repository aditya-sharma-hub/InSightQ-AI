const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)[1].trim();
const supabase = createClient(url, key);

async function inspectSchema() {
  console.log('--- Probing PostgreSQL Tables & Relationships ---');
  
  // Test querying datasets
  const { data: datasets, error: dsErr } = await supabase.from('datasets').select('*').limit(5);
  console.log('datasets sample:', datasets, 'Error:', dsErr);

  // Test querying profiles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(5);
  console.log('profiles sample:', profiles, 'Error:', pErr);

  // Check if we can test inserting a dummy dataset with invalid user_id to read the exact FK constraint error from PostgreSQL
  const { error: fkErr } = await supabase.from('datasets').insert({
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'FK Test',
    original_filename: 'test.csv',
    storage_path: 'test/path',
    file_type: 'CSV',
    file_size: 100,
    status: 'processing'
  });

  console.log('FK Error details:', JSON.stringify(fkErr, null, 2));
}

inspectSchema();
