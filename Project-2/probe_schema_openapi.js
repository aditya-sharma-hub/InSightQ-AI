const fs = require('fs');

async function getOpenAPI() {
  const env = fs.readFileSync('c:/Users/admin/Desktop/AI Business/Project-2/.env.local', 'utf8');
  const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)[1].trim();

  const openapiUrl = `${url}/rest/v1/?apikey=${key}`;
  console.log('Fetching OpenAPI schema from:', openapiUrl);

  try {
    const response = await fetch(openapiUrl);
    const schema = await response.json();
    
    if (schema.definitions && schema.definitions.dataset_columns) {
      console.log('Columns in dataset_columns:');
      console.log(Object.keys(schema.definitions.dataset_columns.properties));
    } else {
      console.log('dataset_columns table not found in OpenAPI definitions.');
    }
  } catch (error) {
    console.error('Error fetching OpenAPI schema:', error);
  }
}

getOpenAPI();
