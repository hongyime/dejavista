import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { Buffer } from 'node:buffer';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const tryOnApiUrl = process.env.TRYON_API_URL;
const tryOnApiKey = process.env.TRYON_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, items } = req.body || {};

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return res.status(400).json({
      error: 'Missing required field: userId',
      details: 'userId must be a non-empty string.',
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Missing required field: items',
      details: 'items must be a non-empty array.',
    });
  }

  try {
    const jobId = `job_${Date.now()}`;
    const photoPath = `${userId}/reference.jpg`;

    const { data: listData, error: listError } = await supabase.storage
      .from('user_photos')
      .list(userId, {
        limit: 1,
        search: 'reference.jpg',
      });

    if (listError || !listData?.length) {
      console.error('[Visualize] Reference photo lookup failed:', listError);
      return res.status(404).json({
        error: 'Reference photo not found in storage',
        details: 'Upload a reference photo in Settings before using try-on.',
      });
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from('user_photos')
      .createSignedUrl(photoPath, 3600);

    if (signedError) {
      throw signedError;
    }

    const referenceImageUrl = signedData.signedUrl;
    const garmentImageUrls = items
      .map((item) => normalizeImageUrl(item?.meta?.image || item?.image || item?.url))
      .filter(Boolean);

    if (!garmentImageUrls.length) {
      console.warn('[Visualize] No garment image URLs found, using simulation fallback');
      return runSimulationFallback(res, { jobId, referenceImageUrl, items });
    }

    if (tryOnApiUrl && tryOnApiKey) {
      try {
        const apiResponse = await fetch(tryOnApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tryOnApiKey}`,
          },
          body: JSON.stringify({
            userId,
            referenceImageUrl,
            garmentImageUrls,
          }),
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text().catch(() => '');
          throw new Error(`Try-on API failed (${apiResponse.status}): ${errorText}`);
        }

        const apiData = await apiResponse.json();
        const poses = normalizePoses(apiData);

        if (poses.length) {
          return res.status(200).json({
            jobId,
            status: 'complete',
            poses,
            message: 'Virtual try-on generated via external API.',
            itemsProcessed: items.map(getItemTitle),
          });
        }
      } catch (error) {
        console.error('[Visualize] External try-on API failed, falling back:', error);
      }
    }

    if (geminiApiKey) {
      try {
        const primaryGarmentUrl = garmentImageUrls[0];
        const primaryGarmentTitle = getItemTitle(items[0]);
        const poses = await Promise.race([
          generateTryOnWithGemini({
            referenceImageUrl,
            garmentImageUrl: primaryGarmentUrl,
            garmentTitle: primaryGarmentTitle,
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Gemini image generation exceeded 9000ms timeout')),
              9000
            )
          ),
        ]);

        if (poses.length) {
          return res.status(200).json({
            jobId,
            status: 'complete',
            poses,
            message: 'Virtual try-on generated with Gemini image model.',
            itemsProcessed: items.map(getItemTitle),
          });
        }
      } catch (error) {
        console.error('[Visualize] Gemini image generation failed, falling back:', error);
      }
    }

    return runSimulationFallback(res, { jobId, referenceImageUrl, items });
  } catch (error) {
    console.error('[Visualize] Fatal error during visualization:', error);
    return res.status(500).json({
      error: 'Failed to generate visualization',
      details: error.message,
    });
  }
}

function normalizeImageUrl(url) {
  return typeof url === 'string' && /^https?:\/\//.test(url) ? url : null;
}

function getItemTitle(item) {
  return item?.meta?.title || item?.title || 'Item';
}

function normalizePoses(data) {
  if (Array.isArray(data?.poses)) {
    return data.poses
      .map((pose, index) => ({
        id: pose.id || `pose-${index}`,
        imageUrl: pose.imageUrl || pose.url,
      }))
      .filter((pose) => !!pose.imageUrl);
  }

  if (data?.imageUrl || data?.url) {
    return [
      {
        id: 'main',
        imageUrl: data.imageUrl || data.url,
      },
    ];
  }

  return [];
}

function runSimulationFallback(res, { jobId, referenceImageUrl, items }) {
  return res.status(200).json({
    jobId,
    status: 'complete',
    poses: [
      { id: 'front', imageUrl: referenceImageUrl },
      { id: 'side', imageUrl: referenceImageUrl },
      { id: 'back', imageUrl: referenceImageUrl },
    ],
    message:
      'Simulation mode: using your reference photo with multiple pose slots (same image for now).',
    itemsProcessed: items.map(getItemTitle),
  });
}

async function generateTryOnWithGemini({
  referenceImageUrl,
  garmentImageUrl,
  garmentTitle,
}) {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const [referenceImage, garmentImage] = await Promise.all([
    fetchAsInlineData(referenceImageUrl),
    fetchAsInlineData(garmentImageUrl),
  ]);

  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: [
      {
        inlineData: referenceImage,
      },
      {
        inlineData: garmentImage,
      },
      {
        text: `Create a professional fashion try-on image. The first image is the user's reference photo. The second image is the exact garment: ${garmentTitle}.

Rules:
- Keep the person's face, hair, expression, and body proportions the same.
- Preserve any inner layers or trousers unless the garment naturally covers them.
- Do not add new accessories.
- Keep the garment color, silhouette, and major design details faithful to the source image.
- Produce a realistic e-commerce style result with clean lighting.`,
      },
    ],
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '3:4',
        imageSize: '1K',
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];

  return parts
    .filter((part) => part.inlineData?.data)
    .map((part, index) => ({
      id: index === 0 ? 'main' : `alt-${index}`,
      imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
    }));
}

async function fetchAsInlineData(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status}) from ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';

  return {
    mimeType,
    data: buffer.toString('base64'),
  };
}
