# Bugfix Log - Audit Findings

## Status Legend
- **Open**: Not yet addressed
- **In Progress**: Currently being fixed
- **Fixed**: Resolved in this execution cycle

---

## BUGS & EDGE CASES

### B-001: AI Model Version Drift
| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Issue** | Documentation specifies `gemini-3-pro-preview` but code uses `gemini-2.5-flash`, `gemini-1.5-flash` |
| **Root Cause** | Model versions updated without updating documentation |
| **Impact** | Documentation misleading about AI capabilities |
| **Location** | `api/ai/recommend.js:102-106` |
| **Fixed In** | T-001 (BASE.md updated) |

### B-002: Imagen Version Drift
| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Issue** | Documentation specifies `imagen-3.0-generate-002` but code uses `gemini-3.1-flash-image-preview` |
| **Root Cause** | Switched from Vertex AI Imagen to Gemini image SDK |
| **Impact** | Virtual Try-On uses different model than documented |
| **Location** | `api/ai/visualize.js:9` |
| **Fixed In** | T-001 (BASE.md updated) |

### B-003: Context Window Mismatch
| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Issue** | Documentation promises 200 items context, code sends only 40 items |
| **Root Cause** | Token limit handling reduced to 40 items without documentation update |
| **Impact** | Performance optimized but context reduced |
| **Location** | `api/ai/recommend.js:56` |
| **Fixed In** | T-002 (BASE.md updated) |

### B-004: Deduplication Scope Limited
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | Only checks last 100 items for duplicates, not full history |
| **Root Cause** | `limit(100)` in query, assumes recent items cover duplicates |
| **Impact** | Potential for same item being tracked from different pages |
| **Location** | `src/background/background.js:105` |

### B-005: Missing validate-photo Endpoint Documentation
| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Issue** | `api/ai/validate-photo.js` exists but has no documentation |
| **Root Cause** | Endpoint added incrementally without documentation |
| **Impact** | No clear API contract for photo validation |
| **Location** | `api/ai/validate-photo.js` |
| **Fixed In** | T-003 (API.md created) |

### B-006: Simulation Fallback Undocumented
| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Issue** | When AI fails, system returns reference photo as fallback (simulation mode) |
| **Root Cause** | Graceful degradation not documented |
| **Impact** | User may not understand why try-on returns same image |
| **Location** | `api/ai/visualize.js:186-199` |
| **Fixed In** | T-003 (API.md documented simulation mode) |

### B-007: External Try-On API Integration Undocumented
| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Issue** | Code supports external try-on API via `TRYON_API_URL`/`TRYON_API_KEY` env vars |
| **Root Cause** | Feature added without updating documentation |
| **Impact** | Users unaware they can use external AI for try-on |
| **Location** | `api/ai/visualize.js:10-11, 77-112` |
| **Fixed In** | T-003 (API.md documented external integration) |

### B-008: Try-On Caching Undocumented
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | Try-on results cached in `chrome.storage.local` but not documented |
| **Root Cause** | Performance optimization without documentation |
| **Impact** | Cached results may confuse users on fresh visits |
| **Location** | `src/sidepanel/components/MirrorTab.jsx:117-141` |
| **Note** | Will be addressed in T-011 (cache explanation UI) |

### B-009: Accessories Section Undocumented
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | "Complete the look" section shows matching accessories |
| **Root Cause** | Feature implemented without documentation update |
| **Impact** | Users unaware of accessory recommendation feature |
| **Location** | `src/sidepanel/components/MirrorTab.jsx:704-762` |
| **Note** | Lower priority - feature works correctly, just lacks doc |

---

## SECURITY ISSUES

### S-001: Hardcoded OAuth Client ID
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | OAuth client ID hardcoded in manifest.json |
| **Root Cause** | Placeholder ID left in codebase |
| **Impact** | If committed, this is a security leak of OAuth credentials |
| **Location** | `src/manifest.json:116` |
| **Recommendation** | Move to environment variable |

### S-002: No Input Sanitization on meta Fields
| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Issue** | `meta` JSONB fields stored without validation |
| **Root Cause** | Trust in client-supplied data |
| **Impact** | Potential XSS if meta fields rendered unsafely |
| **Location** | Multiple locations (`gaze-tracker.js`, `background.js`) |
| **Fixed In** | T-006 (sanitize.js created, background.js uses inline sanitization) |

### S-003: No Rate Limiting on API Endpoints
| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Issue** | `/api/ai/recommend` and `/api/ai/visualize` have no rate limiting |
| **Root Cause** | Not implemented |
| **Impact** | Potential API abuse/DoS |
| **Location** | `api/ai/recommend.js`, `api/ai/visualize.js` |
| **Fixed In** | T-007 (rate-limit.js created, endpoints updated) |

---

## EDGE CASES

### E-001: AbortController Timeout Hardcoded
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | 30-second timeout hardcoded, not configurable |
| **Root Cause** | Simple implementation |
| **Impact** | Cannot adjust timeout per network conditions |
| **Location** | `src/sidepanel/components/MirrorTab.jsx:240` |

### E-002: No Error Boundary in React Components
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | React components lack error boundaries |
| **Root Cause** | Not implemented |
| **Impact** | Single error crashes entire side panel |
| **Location** | All React component files |

### E-003: Magic Strings Scattered
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | `referrerPolicy="no-referrer"` repeated across files |
| **Root Cause** | Copy-paste coding |
| **Impact** | Maintenance burden |
| **Location** | Multiple JSX files |

### E-004: Content Script Scope Limited
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | Content scripts only run on specific fashion sites (70+ domains) |
| **Root Cause** | `manifest.json` restricts to explicit domain list |
| **Impact** | Users cannot track on non-listed fashion sites |
| **Location** | `src/manifest.json:27-96` |

### E-005: Model Fallback Chain Complex
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | Code tries multiple models in sequence, hard to debug |
| **Root Cause** | Resilience built without clear logging |
| **Impact** | Difficult to diagnose which model actually succeeded |
| **Location** | `api/ai/recommend.js:92-167` |

---

## ARCHITECTURE ISSUES

### A-001: Documentation vs. Code Architecture Mismatch
| Field | Value |
|-------|-------|
| **Status** | Fixed |
| **Issue** | Docs say "Vercel Serverless Functions (Next.js API Routes)" but structure is vanilla JS serverless functions |
| **Root Cause** | Architecture simplified from Next.js to plain Vercel functions |
| **Impact** | Misleading for developers expecting Next.js setup |
| **Location** | `BASE.md`, project structure |
| **Fixed In** | T-004 (README.md updated) |

### A-002: Design Tokens Not Centralized
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | `STYLE.md` defines CSS variables but components use inline styles |
| **Root Cause** | Inline styles used for "quick" implementations |
| **Impact** | Design system not consistently applied |
| **Location** | `STYLE.md` vs all component files |

### A-003: No TypeScript Types
| Field | Value |
|-------|-------|
| **Status** | Open |
| **Issue** | Entire codebase is plain JavaScript/JSX |
| **Root Cause** | TypeScript not introduced |
| **Impact** | Type safety, autocompletion, refactoring safety issues |
| **Location** | All source files |

---

## Summary Statistics

| Category | Total | Open | In Progress | Fixed |
|----------|-------|------|------------|-------|
| Bugs | 9 | 9 | 0 | 0 |
| Security | 3 | 3 | 0 | 0 |
| Edge Cases | 5 | 5 | 0 | 0 |
| Architecture | 3 | 3 | 0 | 0 |
| **TOTAL** | **20** | **20** | **0** | **0** |
