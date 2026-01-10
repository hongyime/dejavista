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

    console.log('[Visualize] Processing request for user:', userPhotoUrl.split('/')[0]);

    // Download user photo from Supabase Storage
    const photoPath = userPhotoUrl.split('/').slice(-2).join('/'); // userId/reference.jpg
    const { data: photoBlob, error: photoError } = await supabase.storage
      .from('user_photos')
      .download(photoPath);

    if (photoError) {
      console.error('[Visualize] Supabase download error:', photoError);
      throw new Error(`Failed to download user photo: ${photoError.message}`);
    }

    // Convert Blob to Buffer for processing
    const photoBuffer = Buffer.from(await photoBlob.arrayBuffer());

    // Download and validate item images
    const itemReferenceImages = await Promise.all(
      items.map(async (item, idx) => {
        if (!item.url) {
          console.warn(`[Visualize] Item ${idx} has no URL, skipping`);
          return null;
        }

        try {
          const response = await fetch(item.url, {
            headers: { 'Referer': item.url },
          });
          if (!response.ok) throw new Error(`Status ${response.status}`);

          const buffer = await response.arrayBuffer();
          const contentType = response.headers.get('content-type') || 'image/jpeg';

          return {
            inlineData: {
              data: Buffer.from(buffer).toString('base64'),
              mimeType: contentType,
            }
          };
        } catch (err) {
          console.error(`[Visualize] Failed to fetch item image from ${item.url}:`, err);
          return null;
        }
      })
    );

    // Filter out nulls
    const validReferences = itemReferenceImages.filter(img => img !== null);

    // Initialize Vertex AI
    const vertexAI = new VertexAI({ project: projectId, location });
    const model = vertexAI.preview.getGenerativeModel({
      model: 'imagen-3.0-generate-002',
    });

    // Construct prompt
    const prompt = `Role: Expert AI Fashion Compositor.
Seamlessly integrate the clothing item(s) from the provided Reference Images onto the Target Model while maintaining 100% identity preservation.

Instructions:
1. Preserve the face, pose, and background of the Target Model exactly.
2. Apply the garment(s) naturally to the body following physics and draping.
3. Match lighting and shadows of the original scene.

Target: Attached reference image
Garments: ${items.map(i => i.meta?.title || 'Clothing').join(', ')}`;

    // Generate image using Vertex AI Imagen 3
    console.log('[Visualize] Generation request sent');

    const generationResult = await model.generateImages({
      prompt,
      image: {
        inlineData: {
          data: photoBuffer.toString('base64'),
          mimeType: photoBlob.type || 'image/jpeg',
        }
      },
      // Note: In some SDK versions, person_reference might be needed
      // but 'image' is standard for image-to-image/reference for Imagen.
      numberOfImages: 1,
      aspectRatio: '9:16',
      addWatermark: false
    });

    const imageUrl = generationResult.images?.[0]?.url || '';

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
