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
    console.log('[Recommend] Processing recommendation for user:', userId);

    // Construct prompt for Gemini
    const prompt = `You are a fashion stylist. Review these ${historyItems.length} items from the user's fashion memory and recommend the TOP 3-5 items that best complement or match the style of the current item the user is browsing.

Current Item the user is looking at:
- Title: ${currentItem.title || currentItem.meta?.title || 'Unknown'}
- Brand: ${currentItem.brand || currentItem.meta?.brand || 'Unknown'}
- Price: ${currentItem.price || 'Unknown'}

User's Fashion Memory (History):
${historyItems.slice(0, 50).map((item, idx) =>
      `${idx + 1}. ID: ${item.id}, Title: ${item.meta?.title || 'Unknown'}, Brand: ${item.meta?.brand || 'Unknown'}`
    ).join('\n')}

Think like a stylist:
1. Don't just pick identical items. Pick items that would look GOOD with the current item, or are in a similar aesthetic "vibe".
2. Provide a short "Stylist Note" for each recommendation explaining the styling choice (e.g., "The minimalist aesthetic of these trousers perfectly balances the bold pattern of your current shirt").

Respond in JSON format ONLY:
{
  "recommendations": [
    {
      "itemId": "uuid",
      "reasoning": "Brief stylist note (max 20 words)"
    },
    ...
  ]
}

If no good matches exist, return an empty recommendations array.`;

    // Call Gemini API - CORRECT MODEL: gemini-1.5-flash
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            response_mime_type: "application/json"
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[Recommend] Gemini API Error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{"recommendations": []}';

    // Robust Sanitization: strip markdown code blocks if present
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json\n?|```/g, '').trim();
    }

    let result = { recommendations: [] };
    try {
      result = JSON.parse(responseText.trim());
    } catch (parseError) {
      console.error('[Recommend] JSON Parse Error:', parseError, 'Raw text:', responseText);
      // Fallback to empty if Gemini returns invalid JSON
    }

    // Merge history details back into recommendations for the UI
    const detailedRecommendations = (result.recommendations || [])
      .map(rec => {
        // Ensure we are matching IDs correctly (uuid string comparison)
        const item = historyItems.find(h => String(h.id) === String(rec.itemId));
        if (!item) return null;
        return {
          ...item,
          reasoning: rec.reasoning
        };
      })
      .filter(Boolean);

    console.log('[Recommend] Generated', detailedRecommendations.length, 'recommendations');

    return res.status(200).json({
      recommendations: detailedRecommendations,
      // Keep legacy fields for backward compatibility
      matchedItemId: detailedRecommendations[0]?.id || null,
      reasoning: detailedRecommendations[0]?.reasoning || 'No matches found.'
    });
  } catch (error) {
    console.error('[Recommend] Fatal Error:', error);
    return res.status(500).json({
      error: 'Failed to get recommendation',
      details: error.message
    });
  }
}
