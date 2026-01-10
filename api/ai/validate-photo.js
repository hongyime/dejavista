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

        // Initialize Vertex AI
        const project = process.env.GOOGLE_CLOUD_PROJECT_ID || 'gen-lang-client-0209105478';
        const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

        let authOptions = {};
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            try {
                const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
                authOptions = { credentials: creds };
            } catch (e) {
                console.warn('[Validate] Warning: GOOGLE_APPLICATION_CREDENTIALS parsing failed');
            }
        }

        const { VertexAI } = await import('@google-cloud/vertexai');
        const vertexAI = new VertexAI({ project, location, ...authOptions });
        const model = vertexAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                maxOutputTokens: 512,
                temperature: 0.1, // Stricter for validation
            }
        });

        // Prepare image for Gemini (remove data:image/xxx;base64, prefix if present)
        const base64Data = image.split(',')[1] || image;

        console.log('[Validate] Calling Vertex AI Vision...');
        const result_vertex = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64Data
                        }
                    }
                ]
            }]
        });

        const v_response = await result_vertex.response;
        let responseText = v_response.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
