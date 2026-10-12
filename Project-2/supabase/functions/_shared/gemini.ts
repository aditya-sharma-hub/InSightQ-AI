/**
 * InsightIQ AI - Server-Side Gemini API Client with Exponential Backoff Retries
 * Executed strictly within Deno Edge Functions using Deno.env.get('GEMINI_API_KEY')
 */

export async function generateGeminiContent(prompt: string, systemInstruction?: string, retries: number = 3): Promise<string> {
  const apiKey = (Deno.env.get('GEMINI_API_KEY') || '').trim();
  
  if (!apiKey || apiKey.startsWith('your_gemini')) {
    console.warn('[Gemini Edge Warning] GEMINI_API_KEY secret is not configured in environment.');
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [
      {
        parts: [
          { text: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt }
        ]
      }
    ]
  };

  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      const errorText = await response.text();
      attempt++;
      if (attempt >= retries) {
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
    }
  }

  throw new Error('Gemini API request failed after retries.');
}
