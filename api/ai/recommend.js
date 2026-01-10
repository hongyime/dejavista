import { createClient } from '@supabase/supabase-js';
import { getVertexAIAuthOptions, initGoogleAI } from './utils/auth.js';

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

  // Check if we have any AI credentials
  const hasVertexAICreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!geminiApiKey && !hasVertexAICreds) {
    return res.status(500).json({ error: 'No AI credentials configured (neither GEMINI_API_KEY nor GOOGLE_APPLICATION_CREDENTIALS)' });
  }

  try {
    console.log('[Recommend] Processing recommendation for user:', userId);
    console.log('[Recommend] History items count:', historyItems.length);
    console.log('[Recommend] Current item title:', currentItem.title || currentItem.meta?.title);

    // Construct prompt for Gemini
    // Limit history to last 40 items to avoid token limits
    const sanitizedHistory = historyItems.slice(0, 40).map(item => ({
      id: item.id,
      title: (item.meta?.title || 'Unknown').substring(0, 100),
      brand: (item.meta?.brand || 'Unknown').substring(0, 50),
      description: (item.meta?.description || 'N/A').substring(0, 200)
    }));

    const prompt = `You are an expert high-end fashion stylist. Your goal is to curate exactly ONE recommendation from the user's "Fashion Memory" (History) that perfectly complements the item they are currently browsing.

Current Item:
- Title: ${(currentItem.title || currentItem.meta?.title || 'Unknown').substring(0, 100)}
- Brand: ${(currentItem.brand || currentItem.meta?.brand || 'Unknown').substring(0, 50)}
- Price: ${currentItem.price || 'Unknown'}
- Description: ${(currentItem.description || currentItem.meta?.description || 'N/A').substring(0, 200)}

User's Fashion Memory (History):
${sanitizedHistory.length > 0
        ? sanitizedHistory.map((item, idx) => `${idx + 1}. ID: ${item.id}, Title: ${item.title}, Brand: ${item.brand}, Desc: ${item.description}`).join('\n')
        : "The user's history is currently empty. Provide general fashion advice if possible, or return null for recommendedItemId."}

STYLING PRINCIPLES:
1. Color Coordination (Complementary/Analogous)
2. Occasion Matching (Formal vs Casual)
3. Texture & Fabric Synergy
4. Completism (Top + Bottom + Bag)

Respond in JSON format ONLY:
{
  "recommendedItemId": "uuid",
  "reasoning": "A sophisticated stylist note (max 15 words)"
}

If nothing fits or history is empty, set recommendedItemId to null.`;

    let responseText = '';
    
    // Prefer Google AI SDK (simpler, more reliable) if API key is available
    // Only use Vertex AI if no API key but Vertex AI credentials are available
    if (geminiApiKey) {
      try {
        console.log('[Recommend] Using Google AI SDK (API key)...');
        const googleAI = await initGoogleAI();
        if (!googleAI) {
          throw new Error('Google AI SDK initialization failed');
        }
        const model = googleAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
        console.log('[Recommend] Successfully got response from Google AI SDK');
      } catch (googleAIError) {
        console.warn('[Recommend] Google AI SDK failed:', googleAIError.message);
        // Fall through to Vertex AI if available
        if (!hasVertexAICreds) {
          throw new Error(`AI service unavailable: ${googleAIError.message}`);
        }
      }
    }
    
    // Try Vertex AI if Google AI SDK failed or wasn't available
    if (!responseText && hasVertexAICreds) {
      try {
        console.log('[Recommend] Attempting Vertex AI...');
        const project = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0209105478';
        const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
        const authOptions = getVertexAIAuthOptions();
        
        if (!authOptions.credentials) {
          throw new Error('Vertex AI credentials not properly configured');
        }
        
        const { VertexAI } = await import('@google-cloud/vertexai');
        const vertexAI = new VertexAI({ project, location, ...authOptions });
        const model = vertexAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            maxOutputTokens: 256,
            temperature: 0.7,
          }
        });

        console.log('[Recommend] Calling Vertex AI...');
        const result_vertex = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const v_response = await result_vertex.response;
        responseText = v_response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('[Recommend] Successfully got response from Vertex AI');
      } catch (vertexError) {
        console.error('[Recommend] Vertex AI failed:', vertexError.message);
        if (!responseText) {
          throw new Error(`AI service unavailable: ${vertexError.message}`);
        }
      }
    }
    
    if (!responseText) {
      throw new Error('No response from AI service');
    }

    if (!responseText || responseText.trim() === '') {
      console.log('[Recommend] Empty response from AI service');
      return res.status(200).json({ recommendation: null });
    }

    // Defensive JSON Extraction
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }

    let result = { recommendedItemId: null, reasoning: 'No match found.' };
    try {
      result = JSON.parse(responseText.trim());
    } catch (parseError) {
      console.error('[Recommend] JSON Parse Error:', parseError, 'Raw:', responseText);
      // Clean markdown
      const cleaned = responseText.replace(/```json\n?|```/g, '').trim();
      try { result = JSON.parse(cleaned); } catch (e2) { }
    }

    // Merge history details for the single recommendation
    let finalRecommendation = null;
    if (result.recommendedItemId && result.recommendedItemId !== "null") {
      const item = historyItems.find(h => String(h.id) === String(result.recommendedItemId));
      if (item) {
        finalRecommendation = {
          ...item,
          reasoning: result.reasoning?.substring(0, 100) || 'Perfect pair!'
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
