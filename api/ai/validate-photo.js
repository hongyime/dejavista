import { protectAI, RequestError } from '../../lib/ai/request.js';
import { parsePhoto } from '../../lib/ai/inputs.js';
import { generate, parseAIObject } from '../../lib/ai/generate.js';

export default protectAI(async (req, res, { budget }) => {
        const image = parsePhoto(req.body.image);
        const prompt = `Analyze this person's reference photo for a fashion try-on application. 
    You must verify if the photo is a high-quality "Full Body" shot.
    
    CRITERIA:
    1. Face: Must be clearly visible (frontal view).
    2. Arms: Both arms must be fully visible and not cut off.
    3. Legs: Both legs must be fully visible (shoes can be missing/cut off).
    4. Pose: Person should be standing relatively straight.

    Respond in JSON format ONLY:
    {
      "valid": true/false,
      "reasoning": "A concise explanation of why it passed or failed (max 15 words)",
      "missingParts": ["face", "arms", "legs"] // include only what is missing
    }`;

        const response = await generate({ budget, contents: [{text:prompt}, {inlineData:image}], config: {
          responseMimeType: 'application/json', maxOutputTokens: 512,
          thinkingConfig: { thinkingBudget: 0 }, temperature: 0.1,
        } });
        const result = parseAIObject(response);
        if (typeof result.valid !== 'boolean' || typeof result.reasoning !== 'string' ||
            !Array.isArray(result.missingParts) || result.missingParts.some(part => !['face','arms','legs'].includes(part))) {
          throw new RequestError(502, 'AI returned an invalid photo assessment.');
        }
        return res.status(200).json({ valid: result.valid, reasoning: result.reasoning.slice(0, 200), missingParts: [...new Set(result.missingParts)] });
}, { endpoint: 'validate-photo', maxBytes: 3 * 1024 * 1024, validate: body => parsePhoto(body.image) });
