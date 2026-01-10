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
    console.log('[Recommend] History items count:', historyItems.length);
    console.log('[Recommend] Current item title:', currentItem.title || currentItem.meta?.title);

    // Construct prompt for Gemini
    const prompt = `You are an expert high-end fashion stylist. Your goal is to curate exactly ONE recommendation from the user's "Fashion Memory" that perfectly complements the item they are currently browsing.

Current Item:
- Title: ${currentItem.title || currentItem.meta?.title || 'Unknown'}
- Brand: ${currentItem.brand || currentItem.meta?.brand || 'Unknown'}
- Price: ${currentItem.price || 'Unknown'}
- Description: ${currentItem.description || currentItem.meta?.description || 'N/A'}

User's Fashion Memory (History):
${historyItems.slice(0, 50).map((item, idx) =>
      `${idx + 1}. ID: ${item.id}, Title: ${item.meta?.title || 'Unknown'}, Brand: ${item.meta?.brand || 'Unknown'}, Desc: ${item.meta?.description || 'N/A'}`
    ).join('\n')}

STYLING PRINCIPLES TO FOLLOW:
1. Color Coordination: Use color theory (complementary, analogous, or monochrome) to match items.
2. Occasion Matching: If the current item is formal, recommend formal accessories or footwear.
3. Texture & Fabric: Pair similar or complementary textures (e.g., silk with wool, denim with leather).
4. Completism: Try to recommend items that "complete the look" (e.g., if browsing a top, recommend bottoms or bags).

Respond in JSON format ONLY:
{
  "recommendedItemId": "uuid",
  "reasoning": "A sophisticated stylist note explaining the fit/style synergy (max 15 words)"
}

If nothing fits well, set recommendedItemId to null.`;

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
      let errorText = '';
      try {
        const errJson = await geminiResponse.json();
        errorText = JSON.stringify(errJson);
      } catch (e) {
        errorText = await geminiResponse.text();
      }
      console.error('[Recommend] Gemini API Error Response:', errorText);
      throw new Error(`Gemini API error (${geminiResponse.status}): ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{"recommendations": []}';

    // Robust Sanitization: strip markdown code blocks if present
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json\n?|```/g, '').trim();
    }

    let result = { recommendedItemId: null, reasoning: 'No match found.' };
    try {
      result = JSON.parse(responseText.trim());
    } catch (parseError) {
      console.error('[Recommend] JSON Parse Error:', parseError, 'Raw text:', responseText);
    }

    // Merge history details for the single recommendation
    let finalRecommendation = null;
    if (result.recommendedItemId) {
      const item = historyItems.find(h => String(h.id) === String(result.recommendedItemId));
      if (item) {
        finalRecommendation = {
          ...item,
          reasoning: result.reasoning
        };
      }
    }

    console.log('[Recommend] Recommendation generated:', finalRecommendation ? finalRecommendation.meta?.title : 'None');

    return res.status(200).json({
      recommendation: finalRecommendation,
      recommendations: finalRecommendation ? [finalRecommendation] : [], // Backwards compatibility if needed
      // Keep legacy fields
      matchedItemId: finalRecommendation?.id || null,
      reasoning: finalRecommendation?.reasoning || 'No matches found.'
    });
  } catch (error) {
    console.error('[Recommend] Fatal Error:', error);
    return res.status(500).json({
      error: 'Failed to get recommendation',
      details: error.message
    });
  }
}
