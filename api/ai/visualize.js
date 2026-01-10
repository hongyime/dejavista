import { createClient } from '@supabase/supabase-js';
import { VertexAI } from '@google-cloud/vertexai';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userPhotoUrl, items } = req.body;

  if (!userPhotoUrl || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!projectId) {
    return res.status(500).json({ error: 'Google Cloud Project ID not configured' });
  }

  try {
    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Download user photo from Supabase Storage
    const photoPath = userPhotoUrl.split('/').slice(-2).join('/'); // Extract path
    const { data: photoData, error: photoError } = await supabase.storage
      .from('user_photos')
      .download(photoPath);

    if (photoError) throw photoError;

    // Download item images
    const itemImages = await Promise.all(
      items.map(async (item) => {
        const response = await fetch(item.url, {
          headers: { 'Referer': item.url },
        });
        return await response.arrayBuffer();
      })
    );

    // Initialize Vertex AI
    const vertexAI = new VertexAI({ project: projectId, location });
    const model = vertexAI.preview.getGenerativeModel({
      model: 'imagen-3.0-generate-002',
    });

    // Construct prompt with explicit variable mapping
    const prompt = `Role: You are an expert AI Fashion Compositor and Virtual Try-On Specialist. 
Your goal is to seamlessly integrate specific clothing items onto a target user while maintaining absolute identity preservation.

Inputs:
- Target Model: The attached reference photo (user.id: ${userPhotoUrl.split('/')[0]})
- Garments to Apply:
${items.map((item, idx) => `  - Garment ${idx + 1} [${item.meta?.title || 'Clothing Item'}]: ${item.url}`).join('\n')}

Execution Guidelines:
1. Identity & Pose Preservation (CRITICAL): The user's facial features, skin tone, body type, pose, and background must remain 100% pixel-perfect to the original Target Model image. Do not alter the subject's physical traits or environment.
2. Garment Transfer: Replace the user's existing clothing in the Target Model with the garments listed above. Ensure Garment 1 and any subsequent garments are fitted naturally onto the body.
3. Physics & Draping: Ensure the clothing follows the contour of the body. Apply realistic gravity, folds, wrinkles, and tension points based on the pose in the Target Model.
4. Lighting & Integration: Analyze the lighting source, color temperature, and shadows of the Target Model. Apply these exact lighting conditions to the new garments so they look optically bonded to the scene.
5. Output Quality: Photorealistic, 8k resolution, high fidelity texture, commercial fashion photography style.`;

    // Generate image using Vertex AI Imagen
    const result = await model.generateImages({
      prompt,
      image: photoData, // This is the 'Target Model' image passed to the model
      numberOfImages: 1,
      aspectRatio: '9:16',
      addWatermark: false
    });

    // Store result (in production, save to storage and return URL)
    const imageUrl = result.images?.[0]?.url || '';

    return res.status(200).json({
      jobId,
      status: 'complete',
      imageUrl,
    });
  } catch (error) {
    console.error('Error in visualize API:', error);
    return res.status(500).json({
      error: 'Failed to generate visualization',
      details: error.message
    });
  }
}
