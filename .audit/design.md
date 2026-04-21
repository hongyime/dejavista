# Design Document - Audit Remediation

## Overview
This document outlines the high-level implementation strategy for addressing findings from the codebase audit. All changes preserve backward compatibility while improving documentation accuracy, security, and maintainability.

---

## 1. DOCUMENTATION ALIGNMENT

### Problem
Multiple documentation files describe AI models and features that differ from actual implementation.

### Solution
**Update documentation to match actual implementation** (Code-as-Truth principle)

| Document | Change Required |
|----------|-----------------|
| `BASE.md` | Update AI models: `gemini-2.5-flash` (not 3 Pro), Gemini Image SDK (not Imagen 3) |
| `BASE.md` | Update context window specification: 40 items (not 200) |
| `README.md` | Align tech stack with actual implementation |
| Create `API.md` | Document all API endpoints including undocumented ones |

### Verification
- No model names in docs that don't exist in code
- All code imports/exports match doc specifications

---

## 2. SECURITY HARDENING

### Problem
- Hardcoded OAuth Client ID in manifest.json
- No input sanitization on meta fields
- No rate limiting on API endpoints

### Solution

#### S-001: Remove Hardcoded OAuth Client ID
**Strategy**: Move to build-time environment variable injection

```
Before: manifest.json → "client_id": "508630701048-..."
After:  manifest.json → "client_id": "${OAUTH_CLIENT_ID}"
        vite.config.js → inject at build time
```

**Verification**: No OAuth client IDs in version control

#### S-002: Input Sanitization on meta Fields
**Strategy**: Add server-side validation in background.js and API handlers

```javascript
// Sanitize function
function sanitizeMeta(meta) {
  return {
    title: sanitizeString(meta?.title, 200),
    price: sanitizeString(meta?.price, 50),
    brand: sanitizeString(meta?.brand, 100),
    // Strip HTML/script tags
  };
}
```

**Verification**: meta fields contain only safe content

#### S-003: Rate Limiting
**Strategy**: Add Vercel Edge Function rate limiting or middleware

```javascript
// In api/ai/recommend.js
const rateLimit = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // per user per minute
};
```

**Verification**: API rejects excessive requests with 429 status

---

## 3. CODE CLARITY IMPROVEMENTS

### Problem
- Model fallback chain is complex and hard to debug
- Magic strings scattered
- No error boundaries

### Solution

#### E-005: Model Fallback Chain
**Strategy**: Add explicit logging per model attempt

```javascript
// recommend.js - Improved logging
const modelResults = [];
for (const modelId of modelCandidates) {
  try {
    const result = await model.generateContent(prompt);
    modelResults.push({ modelId, success: true });
    // ...
  } catch (error) {
    modelResults.push({ modelId, success: false, error: error.message });
  }
}
console.log('[Recommend] Model attempts:', modelResults);
```

**Verification**: Logs show exactly which model succeeded/failed

#### E-003: Extract Magic Strings
**Strategy**: Centralize constants

```javascript
// src/constants.js
export const REFERRER_POLICY = 'no-referrer';
export const INTENT_THRESHOLD = 3;
export const TIME_THRESHOLD = 2000;
// etc.
```

**Verification**: Magic strings replaced with named constants

#### E-002: Add Error Boundaries
**Strategy**: Wrap App with React error boundary

```javascript
// src/sidepanel/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('[SidePanel] Error:', error, errorInfo);
    // Show graceful fallback UI
  }
}
```

**Verification**: Component errors show fallback, not blank panel

---

## 4. ARCHITECTURE IMPROVEMENTS

### Problem
- Design tokens defined in STYLE.md but not used consistently
- No TypeScript types
- Try-on caching behavior not documented

### Solution

#### A-002: Centralize Design Tokens
**Strategy**: Generate CSS file from tokens and import it

```javascript
// scripts/generate-tokens.js
// Reads STYLE.md, outputs tokens.css
```

**Verification**: All components reference CSS variables, not inline styles

#### A-003: TypeScript Migration (Long-term)
**Strategy**: Introduce gradually via JSDoc types first

```javascript
/**
 * @typedef {Object} ClosetItem
 * @property {string} id
 * @property {string} url
 * @property {Object} meta
 */

/** @type {ClosetItem[]} */
let items = [];
```

**Verification**: IDE shows type hints for all public interfaces

#### B-008: Document Caching Behavior
**Strategy**: Update documentation and add user-facing tooltip

```javascript
// MirrorTab.jsx - Add tooltip explaining cached results
<div className="try-on-container" title="Showing cached results from your last visit">
```

**Verification**: Users understand why they see cached content

---

## 5. DEPENDENCY VERIFICATION

### Current Dependencies (from package.json)
| Package | Purpose | Verification |
|---------|---------|--------------|
| `@supabase/supabase-js` | Database client | Latest version compatible |
| `@google/generative-ai` | Gemini SDK | Version compatible with image generation |
| `react` | UI framework | Manifest V3 compatible |
| `vite` | Build tool | Supports env var injection |

### Required Changes
| Package | Change | Reason |
|---------|--------|--------|
| None | - | Dependencies are compatible with current code |

---

## 6. API CONTRACT DOCUMENTATION

### Current Endpoints

#### POST `/api/ai/recommend`
```typescript
// Input
{
  currentItem: { url: string, meta: object },
  historyItems: ClosetItem[],
  userId: string
}
// Output
{
  recommendation: ClosetItem | null,
  recommendations: ClosetItem[],
  matchedItemId: string | null,
  reasoning: string
}
```

#### POST `/api/ai/visualize`
```typescript
// Input
{
  userId: string,
  items: { url: string, meta: object }[]
}
// Output
{
  jobId: string,
  status: 'complete' | 'processing',
  poses: { id: string, imageUrl: string }[],
  message: string
}
```

#### POST `/api/ai/validate-photo` (UNDOCUMENTED)
```typescript
// Input
{
  image: string // base64 encoded
}
// Output
{
  valid: boolean,
  reasoning: string
}
```

#### GET `/api/ai/visualize/:jobId` (POLLING)
```typescript
// Output
{
  status: 'complete' | 'processing',
  imageUrl: string
}
```

---

## 7. IMPLEMENTATION PRIORITY

| Priority | Tasks |
|----------|-------|
| **P0 - Critical** | Documentation updates (B-001, B-002, B-003) |
| **P1 - High** | Security fixes (S-001, S-002, S-003) |
| **P2 - Medium** | Code clarity (E-002, E-003, E-005) |
| **P3 - Low** | Architecture (A-002, A-003) |

---

## 8. ROLLBACK STRATEGY

For each change:
1. Create git branch before modification
2. Commit with descriptive message
3. Test in isolation
4. If failed, `git checkout` to restore

**Critical files to backup before changes:**
- `src/manifest.json` (OAuth ID change)
- `BASE.md`, `README.md` (Documentation changes)
- `api/ai/recommend.js` (Security improvements)
- `src/sidepanel/` (Error boundary addition)

---

## 9. VERIFICATION CHECKLIST

- [ ] All documentation references valid model names
- [ ] No OAuth credentials in version control
- [ ] meta fields sanitized server-side
- [ ] API endpoints have rate limiting
- [ ] Model fallback logs show success/failure per model
- [ ] Magic strings extracted to constants
- [ ] Error boundary catches and displays errors gracefully
- [ ] CSS variables used instead of inline styles
- [ ] All API endpoints have JSDoc documentation
- [ ] New API.md documents all endpoints
