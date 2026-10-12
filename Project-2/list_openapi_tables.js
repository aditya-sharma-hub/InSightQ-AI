const fs = require('fs');

async function getOpenAPI() {
  const env = fs.readFileSync('c:/Users/admin/Desktop/AI Business/Project-2/.env.local', 'utf8');
  const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.+)/)[1].trim();

  const openapiUrl = `${url}/rest/v1/?apikey=${key}`;
  try {
    const response = await fetch(openapiUrl);
    const schema = await response.json();
    console.log('Available definitions:', Object.keys(schema.definitions || {}));
  } catch (error) {
    console.error('Error fetching OpenAPI schema:', error);
  }
}

getOpenAPI();
