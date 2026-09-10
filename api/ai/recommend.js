import { protectAI, RequestError } from '../../lib/ai/request.js';
import { validateRecommendation } from '../../lib/ai/inputs.js';
import { generate, parseAIObject } from '../../lib/ai/generate.js';

function itemFields(item) {
  return {
    id: item.id,
    title: String(item.title || item.meta?.title || 'Unknown').slice(0, 100),
    brand: String(item.brand || item.meta?.brand || 'Unknown').slice(0, 50),
    description: String(item.description || item.meta?.description || 'N/A').slice(0, 200),
    price: String(item.price || item.meta?.price || 'Unknown').slice(0, 50),
  };
}

export default protectAI(async (req, res, { budget }) => {
    const historyItems = req.body.historyItems;
    const currentItem = itemFields(req.body.currentItem);
    const sanitizedHistory = historyItems.map(itemFields);
    const prompt = `You are an expert high-end fashion stylist. Your goal is to curate exactly ONE recommendation from the user's "Fashion Memory" (History) that perfectly complements the item they are currently browsing.

Current Item:
- Title: ${(currentItem.title || currentItem.meta?.title || 'Unknown').substring(0, 100)}
- Brand: ${(currentItem.brand || currentItem.meta?.brand || 'Unknown').substring(0, 50)}
- Price: ${String(currentItem.price || 'Unknown').slice(0, 50)}
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
  "reasoning": "A concise stylist note (max 15 words)"
}

If nothing fits or history is empty, set recommendedItemId to null.`;

    const response = await generate({ budget, contents: prompt, config: {
      responseMimeType: 'application/json', maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 }, temperature: 0.7,
    } });
    const result = parseAIObject(response);
    if (result.recommendedItemId != null && typeof result.recommendedItemId !== 'string') throw new RequestError(502, 'AI returned an invalid recommendation.');
    const item = result.recommendedItemId ? historyItems.find(item => String(item.id) === result.recommendedItemId) : null;
    const reasoning = typeof result.reasoning === 'string' ? result.reasoning.slice(0, 100) : 'Perfect pair!';
    const recommendation = item ? { ...item, reasoning } : null;
    return res.status(200).json({ recommendation, recommendations: recommendation ? [recommendation] : [],
      matchedItemId: recommendation?.id || null, reasoning: recommendation?.reasoning || 'No matches found.' });
}, { endpoint: 'recommend', validate: validateRecommendation });
