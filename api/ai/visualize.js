import { randomUUID } from 'node:crypto';
import { protectAI, RequestError } from '../../lib/ai/request.js';
import { validateVisualization } from '../../lib/ai/inputs.js';
import { fetchImage, imageURL, resolveImageURL } from '../../lib/ai/images.js';
import { generate } from '../../lib/ai/generate.js';

function title(item) { return String(item.meta?.title || item.title || 'Item').slice(0, 100); }

async function readJSON(response) {
  const reader = response.body.getReader(); const chunks = []; let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      length += value.length;
      if (length > 3 * 1024 * 1024) throw new RequestError(502, 'Try-on response is too large.');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}

function normalizePoses(data) {
  const poses = Array.isArray(data?.poses) ? data.poses : [{imageUrl:data?.imageUrl || data?.url}];
  return poses.slice(0, 3).flatMap((pose, index) => {
    const value = pose?.imageUrl || pose?.url;
    if (typeof value !== 'string' || value.length > 3 * 1024 * 1024 || !/^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(value)) return [];
    return [{id:String(pose.id || `pose-${index}`).slice(0,100),imageUrl:value}];
  });
}

export default protectAI(async (req, res, { user, supabase, budget }) => {
  const { items } = req.body;
  const jobId = `job_${randomUUID()}`;
  const garmentImageUrls = items.map(item => item.meta?.image || item.image || item.url).filter(Boolean).map(value => imageURL(value).href);
  // This client sends the caller's JWT, so Storage RLS applies as well as this
  // server-side ownership check. No browser-supplied ID selects the photo.
  const { data, error } = await budget.run(() => supabase.storage.from('user_photos').createSignedUrl(`${user.id}/reference.jpg`, 3600));
  if (error || !data?.signedUrl) throw new RequestError(404, 'Upload a reference photo in Settings before using try-on.');
  const referenceImageUrl = data.signedUrl;
  const complete = (poses, message, expiresAt = null) => {
    budget.remaining();
    if (Buffer.byteLength(JSON.stringify(poses)) > 3 * 1024 * 1024) throw new RequestError(502, 'Try-on response is too large.');
    return res.status(200).json({jobId, status:'complete', poses, message, expiresAt, itemsProcessed:items.map(title)});
  };
  if (garmentImageUrls.length && process.env.TRYON_API_URL && process.env.TRYON_API_KEY) {
    for (const url of garmentImageUrls) await resolveImageURL(url, budget);
    // An explicitly configured provider takes precedence; do not multiply a
    // failed generation request into another paid provider call.
    const response = await budget.run(() => fetch(imageURL(process.env.TRYON_API_URL), {
      method:'POST', redirect:'error', signal:budget.signal,
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.TRYON_API_KEY}`},
      body:JSON.stringify({userId:user.id,referenceImageUrl,garmentImageUrls}),
    }));
    if (!response.ok) { await response.body?.cancel(); throw new RequestError(502, 'Try-on service is temporarily unavailable.'); }
    const poses = normalizePoses(await budget.run(() => readJSON(response)));
    if (!poses.length) throw new RequestError(502, 'Try-on service returned no image.');
    return complete(poses, 'Virtual try-on generated via external API.');
  }
  if (garmentImageUrls.length && process.env.GEMINI_API_KEY) {
    const referenceImage = await fetchImage(referenceImageUrl, budget);
    const garmentImage = await fetchImage(garmentImageUrls[0], budget);
    const response = await generate({budget, model:'gemini-3.1-flash-image-preview', image:true,
      contents:[{inlineData:referenceImage},{inlineData:garmentImage},{text:`Create a professional fashion try-on image. The first image is the person's reference photo; the second is the exact garment: ${title(items[0])}. Preserve the person's face, hair, expression and body proportions, and the garment color, silhouette and details. Keep inner layers and trousers unless covered by the garment. Do not add accessories. Use realistic e-commerce lighting.`}],
      config:{responseModalities:['IMAGE'],candidateCount:1,imageConfig:{aspectRatio:'3:4',imageSize:'1K'}},
    });
    const part = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    const poses = normalizePoses({imageUrl:part ? `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}` : null});
    if (!poses.length) throw new RequestError(502, 'Try-on service returned no image.');
    return complete(poses, 'Virtual try-on generated with Gemini image model.');
  }
  return complete(['front','side','back'].map(id => ({id,imageUrl:referenceImageUrl})),
    'Simulation mode: using your reference photo with multiple pose slots (same image for now).', Date.now() + 3600000);
}, { endpoint:'visualize', maxBytes:32 * 1024, limit:5, validate:validateVisualization });
