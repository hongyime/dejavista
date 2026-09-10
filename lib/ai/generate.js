import { GoogleGenAI } from '@google/genai';
import { parseGoogleCredentials } from '../../api/ai/utils/auth.js';
import { RequestError } from './request.js';

export async function generate({ budget, model = 'gemini-2.5-flash', contents, config = {}, image = false }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const credentials = apiKey ? null : parseGoogleCredentials();
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!apiKey && (!credentials || !project)) throw new RequestError(503, 'AI service is not configured.');
  // Both configured authentication modes use the same bounded SDK transport.
  const ai = new GoogleGenAI(apiKey ? { apiKey } : {
    vertexai: true, project, location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    googleAuthOptions: { credentials },
  });
  const models = !image && apiKey && model === 'gemini-2.5-flash' ? [model, 'gemini-flash-latest'] : [model];
  for (let index = 0; index < models.length; index++) {
    try {
      return await budget.run(() => ai.models.generateContent({
        model: models[index], contents,
        config: { ...config, abortSignal: budget.signal,
          httpOptions: { timeout: budget.remaining(), retryOptions: { attempts: 1 } },
        },
      }));
    } catch (error) {
      budget.remaining();
      // Only a missing model can advance to an alias. Never fan out capacity,
      // quota, authentication or timeout failures into more generation calls.
      if (error.status !== 404 || index === models.length - 1) throw error;
    }
  }
}

export function parseAIObject(response) {
  const text = response.text || response.candidates?.[0]?.content?.parts?.find(part => typeof part.text === 'string')?.text || '';
  if (typeof text !== 'string' || text.length > 16384) throw new RequestError(502, 'AI returned an invalid response.');
  let parsed;
  try { parsed = JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()); }
  catch { throw new RequestError(502, 'AI returned an invalid response.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new RequestError(502, 'AI returned an invalid response.');
  return parsed;
}
