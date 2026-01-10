export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { image } = req.body; // Base64 image
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!image) {
        return res.status(400).json({ error: 'Missing image data' });
    }

    if (!geminiApiKey) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    try {
        console.log('[Validate] Processing photo validation...');

        // Construct prompt for Gemini Vision
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

        // Prepare image for Gemini (remove data:image/xxx;base64, prefix if present)
        const base64Data = image.split(',')[1] || image;

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: base64Data
                                }
                            }
                        ],
                    }],
                }),
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('[Validate] Gemini API Error:', errorText);
            throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Robust JSON extraction
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            responseText = jsonMatch[0];
        }

        let result = { valid: false, reasoning: 'Failed to process AI validation.', missingParts: [] };
        try {
            result = JSON.parse(responseText.trim());
        } catch (parseError) {
            console.error('[Validate] JSON Parse Error:', parseError, 'Raw text:', responseText);
        }

        console.log('[Validate] Validation result:', result.valid ? 'PASSED' : 'FAILED', result.reasoning);

        return res.status(200).json(result);

    } catch (error) {
        console.error('[Validate] Fatal Error:', error);
        return res.status(500).json({
            error: 'Failed to validate photo',
            details: error.message
        });
    }
}
