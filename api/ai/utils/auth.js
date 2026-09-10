/**
 * Robust Google Cloud authentication utilities
 * Handles both Vertex AI (service account) and Google AI SDK (API key) authentication
 */

/**
 * Parse GOOGLE_APPLICATION_CREDENTIALS from environment variable
 * Supports raw, double-encoded or outer-single-quoted JSON; never reads a file path
 * 
 * @returns {Object|null} Credentials object or null if not available/invalid
 */
export function parseGoogleCredentials() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!raw) return null;
  try {
    let value = raw.trim();
    // Shell-style outer single quotes are not part of the JSON document.
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    let credentials = JSON.parse(value);
    if (typeof credentials === 'string') credentials = JSON.parse(credentials);
    if (!credentials || credentials.type !== 'service_account' ||
        !['project_id', 'client_email', 'private_key'].every(field => typeof credentials[field] === 'string' && credentials[field].trim())) return null;
    return credentials;
  } catch {
    console.warn('[Auth] Service account JSON is invalid. Check server configuration.');
    return null;
  }
}

/**
 * Get Vertex AI authentication options
 * @returns {Object} Auth options for VertexAI constructor
 */
export function getVertexAIAuthOptions() {
  const creds = parseGoogleCredentials();
  
  if (creds) {
    return { credentials: creds };
  }
  
  // Return empty object - VertexAI will use default credentials or fail
  return {};
}

/**
 * Initialize Vertex AI with robust error handling
 * Falls back to Google AI SDK if Vertex AI auth fails
 * 
 * @param {string} projectId - Google Cloud project ID
 * @param {string} location - Vertex AI location (default: us-central1)
 * @returns {Promise<{vertexAI: VertexAI|null, fallback: boolean}>}
 */
export async function initVertexAI(projectId, location = 'us-central1') {
  const authOptions = getVertexAIAuthOptions();

  if (!projectId || !authOptions.credentials) {
    console.warn('[Auth] Vertex AI credentials or projectId missing; using Google AI SDK fallback');
    return { vertexAI: null, fallback: true };
  }
  
  try {
    const { VertexAI } = await import('@google-cloud/vertexai');
    const vertexAI = new VertexAI({ 
      project: projectId, 
      location,
      ...authOptions 
    });
    
    return { vertexAI, fallback: false };
  } catch (error) {
    console.warn('[Auth] Vertex AI initialization failed.');
    console.log('[Auth] Falling back to Google AI SDK (API key)...');
    return { vertexAI: null, fallback: true };
  }
}

/**
 * Initialize Google AI SDK (fallback) using GEMINI_API_KEY
 * 
 * @returns {Promise<Object|null>} GoogleGenerativeAI instance or null
 */
export async function initGoogleAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('[Auth] GEMINI_API_KEY not found, cannot use Google AI SDK fallback');
    return null;
  }
  
  try {
    // Dynamic import to avoid errors if package not installed
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.warn('[Auth] Failed to initialize Google AI SDK.');
    return null;
  }
}
