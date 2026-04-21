# API Documentation

## Overview
Vercel Serverless Functions providing AI-powered fashion recommendations and virtual try-on functionality.

**Base URL**: `https://your-app.vercel.app` (set via `VITE_VERCEL_API_URL`)

**Authentication**: User authentication handled via Supabase Auth + Google OAuth. API endpoints validate user identity via `userId` parameter.

---

## Endpoints

### POST `/api/ai/recommend`

Get AI-powered outfit recommendations by analyzing user's browsing history.

**Request**
```json
{
  "currentItem": {
    "url": "https://example.com/product/123",
    "meta": {
      "title": "Classic Navy Blazer",
      "price": "$299.00",
      "brand": "Example Brand"
    }
  },
  "historyItems": [
    {
      "id": "uuid-1",
      "url": "https://example.com/item/456",
      "meta": { "title": "White Cotton Shirt", ... }
    }
  ],
  "userId": "supabase-user-uuid"
}
```

**Response**
```json
{
  "recommendation": {
    "id": "uuid-1",
    "url": "https://example.com/item/456",
    "meta": { "title": "White Cotton Shirt", ... },
    "reasoning": "Classic pairing with navy blazer"
  },
  "recommendations": [{ ... }],
  "matchedItemId": "uuid-1",
  "reasoning": "Classic pairing with navy blazer"
}
```

**Model Used**: Google AI Gemini 2.5 Flash (`gemini-2.5-flash`)

**Context Window**: Latest 40 items from history (token-optimized)

**Rate Limit**: 10 requests/minute/user

---

### POST `/api/ai/visualize`

Generate virtual try-on images by combining user's reference photo with clothing items.

**Request**
```json
{
  "userId": "supabase-user-uuid",
  "items": [
    {
      "url": "https://example.com/jacket.jpg",
      "meta": {
        "title": "Navy Blazer",
        "image": "https://example.com/jacket.jpg"
      }
    }
  ]
}
```

**Response**
```json
{
  "jobId": "job_1713456789000",
  "status": "complete",
  "poses": [
    { "id": "front", "imageUrl": "data:image/png;base64,..." },
    { "id": "side", "imageUrl": "data:image/png;base64,..." }
  ],
  "message": "Virtual try-on generated with Gemini image model.",
  "itemsProcessed": ["Navy Blazer"]
}
```

**Model Used**: Google AI Gemini 3.1 Flash Image Preview (`gemini-3.1-flash-image-preview`)

**Alternative Provider**: External try-on API (via `TRYON_API_URL`/`TRYON_API_KEY` environment variables)

**Simulation Fallback**: If AI generation fails, returns reference photo in multiple pose slots (graceful degradation)

**Rate Limit**: 5 requests/minute/user

---

### GET `/api/ai/visualize/:jobId`

Poll for visualization job status (for async operations).

**Response**
```json
{
  "status": "complete",
  "imageUrl": "https://..."
}
```

---

### POST `/api/ai/validate-photo`

Validate user's reference photo using AI to ensure it meets requirements for virtual try-on.

**Request**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJR..."
}
```

**Response**
```json
{
  "valid": true,
  "reasoning": "Photo contains a clear full-body shot with good lighting"
}
```

**Validation Criteria**:
- Photo contains a person
- Full body or upper body visible
- Adequate lighting and clarity
- No inappropriate content

---

## Rate Limiting

API endpoints implement rate limiting to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/ai/recommend` | 10 requests | per minute, per user |
| `/api/ai/visualize` | 5 requests | per minute, per user |
| `/api/ai/validate-photo` | 10 requests | per minute, per user |

**Excessive requests** return HTTP 429 with headers:
```
Retry-After: 60
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "details": "userId must be a non-empty string"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired session"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "AI service temporarily unavailable",
  "details": "All Gemini models failed or were unavailable"
}
```

---

## Environment Variables

### Required for API Functions
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-google-ai-api-key
```

### Optional
```
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
VERTEX_AI_LOCATION=us-central1
TRYON_API_URL=https://external-tryon-api.com
TRYON_API_KEY=your-external-api-key
```

---

## Implementation Notes

### Model Fallback Chain
The recommendation endpoint tries models in this order:
1. `gemini-2.5-flash`
2. `gemini-flash-latest`
3. `gemini-1.5-flash`
4. Vertex AI (if credentials available)

Each attempt is logged for debugging.

### Simulation Mode
When AI image generation fails, the system returns a "simulation" response:
```json
{
  "status": "complete",
  "poses": [
    { "id": "front", "imageUrl": "reference-photo-url" },
    { "id": "side", "imageUrl": "reference-photo-url" }
  ],
  "message": "Simulation mode: using your reference photo"
}
```

This is logged and can be detected by checking if `message.toLowerCase().includes('simulation mode')`.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-21 | Initial documentation |
| - | - |
