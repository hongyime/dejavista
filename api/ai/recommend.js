import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { currentItem, historyItems, userId } = req.body;

  if (!currentItem || !historyItems || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!geminiApiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    // Construct prompt for Gemini
    const prompt = `You are a fashion stylist. Review these ${historyItems.length} items from the user's browsing history and return the ONE item ID that best matches the style of the current item.

Current Item:
- Title: ${currentItem.meta?.title || 'Unknown'}
- Brand: ${currentItem.meta?.brand || 'Unknown'}
- URL: ${currentItem.url}

History Items:
${historyItems.map((item, idx) => 
  `${idx + 1}. ID: ${item.id}, Title: ${item.meta?.title || 'Unknown'}, Brand: ${item.meta?.brand || 'Unknown'}`
).join('\n')}

Respond in JSON format ONLY (no markdown, no explanation):
{
  "matchedItemId": "uuid-or-null",
  "reasoning": "Brief explanation of why this item matches (or why no match was found)"
}

If no good match exists, set matchedItemId to null.`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.statusText} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse JSON (strip markdown fences if present)
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '');
    }

    const result = JSON.parse(cleanedText);

    return res.status(200).json({
      matchedItemId: result.matchedItemId || null,
      reasoning: result.reasoning || 'No match found.',
    });
  } catch (error) {
    console.error('Error in recommend API:', error);
    return res.status(500).json({ 
      error: 'Failed to get recommendation',
      details: error.message 
    });
  }
}
