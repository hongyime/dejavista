# Implementation Tasks - Audit Remediation

## Task Status Legend
- **TODO**: Not started
- **IN_PROGRESS**: Currently working
- **DONE**: Completed
- **BLOCKED**: Waiting on dependency

---

## PHASE 1: DOCUMENTATION ALIGNMENT

### T-001: Update BASE.md AI Model Specifications
| Field | Value |
|-------|-------|
| **Status** | DONE |
| **Priority** | P0 |
| **Bugs Fixed** | B-001, B-002 |
| **Description** | Update AI model names in BASE.md to match actual code |
| **Changes** | `gemini-3-pro-preview` → `gemini-2.5-flash`, `imagen-3.0-generate-002` → `gemini-3.1-flash-image-preview` |
| **Completed** | 2026-04-21 |

**Acceptance Criteria:**
- [ ] BASE.md mentions `gemini-2.5-flash` for recommendations
- [ ] BASE.md mentions `gemini-3.1-flash-image-preview` for visualization
- [ ] No references to non-existent model names

---

### T-002: Update BASE.md Context Window Specification
| Field | Value |
|-------|-------|
| **Status** | DONE |
| **Priority** | P0 |
| **Bugs Fixed** | B-003 |
| **Description** | Update context window from 200 to 40 items |
| **Completed** | 2026-04-21 |

**Acceptance Criteria:**
- [ ] BASE.md specifies "latest 40 items" not "latest 200 items"
- [ ] Reasoning for 40-item limit documented (token constraints)

---

### T-003: Create API.md Documentation
| Field | Value |
|-------|-------|
| **Status** | DONE |
| **Priority** | P0 |
| **Bugs Fixed** | B-005, B-006, B-007, B-008, B-009 |
| **Description** | Document all API endpoints including undocumented ones |
| **Completed** | 2026-04-21 |
| **Output** | API.md created with full endpoint documentation |

**Acceptance Criteria:**
- [ ] `/api/ai/recommend` documented with input/output types
- [ ] `/api/ai/visualize` documented
- [ ] `/api/ai/validate-photo` documented
- [ ] `/api/ai/visualize/:jobId` polling endpoint documented
- [ ] Simulation fallback mode explained
- [ ] External try-on API integration documented
- [ ] Rate limiting information included

---

### T-004: Update README.md Tech Stack
| Field | Value |
|-------|-------|
| **Status** | DONE |
| **Priority** | P1 |
| **Bugs Fixed** | A-001 |
| **Description** | Update README to reflect actual architecture (Vercel Functions vs Next.js) |
| **Completed** | 2026-04-21 |

**Acceptance Criteria:**
- [ ] README specifies "Vercel Serverless Functions" not "Next.js API Routes"
- [ ] All documented features align with code

---

## PHASE 2: SECURITY HARDENING

### T-005: Remove Hardcoded OAuth Client ID
| Field | Value |
|-------|-------|
| **Status** | DONE |
| **Priority** | P1 |
| **Bugs Fixed** | S-001 |
| **Description** | Move OAuth client ID to environment variable |
| **Completed** | 2026-04-21 |
| **Output** | build-extension.js injects from env, .env.example updated
| **Changes** | `manifest.json` uses placeholder, build injects actual value |

**Acceptance Criteria:**
- [ ] `manifest.json` contains placeholder `${OAUTH_CLIENT_ID}`
- [ ] `vite.config.js` injects OAuth client ID at build time
- [ ] `.env.example` documents `VITE_OAUTH_CLIENT_ID`
- [ ] No hardcoded client IDs in version control

---

### T-006: Add Input Sanitization
| Field | Value |
|-------|-------|
| **Status** | DONE |
| **Priority** | P1 |
| **Bugs Fixed** | S-002 |
| **Description** | Sanitize meta fields before storage |
| **Completed** | 2026-04-21 |
| **Output** | sanitize.js utility created, background.js uses sanitization

**Acceptance Criteria:**
- [ ] `sanitizeMeta()` function created in `src/utils/sanitize.js`
- [ ] Function strips HTML tags and limits string lengths
- [ ] All meta field writes use sanitization
- [ ] Unit tests verify sanitization (edge cases: `<script>`, long strings)

---

### T-007: Add Rate Limiting to API Endpoints
| Field | Value |
|-------|-------|
| **Status** | DONE |
| **Priority** | P1 |
| **Bugs Fixed** | S-003 |
| **Description** | Implement rate limiting on API endpoints |
| **Completed** | 2026-04-21 |
| **Output** | rate-limit.js created, recommend.js and visualize.js updated

**Acceptance Criteria:**
- [ ] `/api/ai/recommend` limits to 10 requests/minute/user
- [ ] `/api/ai/visualize` limits to 5 requests/minute/user
- [ ] Excessive requests return 429 status with retry-after header
- [ ] Rate limit info logged for monitoring

---

## PHASE 3: CODE CLARITY

### T-008: Add Error Boundary to React App
| Field | Value |
|-------|-------|
| **Status** | DONE |
| **Priority** | P2 |
| **Bugs Fixed** | E-002 |
| **Description** | Wrap App component with error boundary |
| **Completed** | 2026-04-21 |
| **Output** | ErrorBoundary.jsx created, App.jsx wrapped

**Acceptance Criteria:**
- [ ] `ErrorBoundary.jsx` component created
- [ ] App.jsx wraps children with ErrorBoundary
- [ ] Errors logged to console with stack trace
- [ ] Graceful fallback UI displayed on error

---

### T-009: Extract Magic Strings to Constants
| Field | Value |
|-------|-------|
| **Status** | Partial |
| **Priority** | P2 |
| **Bugs Fixed** | E-003 |
| **Description** | Create constants file and replace magic strings |
| **Completed** | 2026-04-21 (constants.js created) |
| **Note** | File encoding issues prevented full code refactoring; constants.js available for future use |

**Acceptance Criteria:**
- [ ] `src/constants.js` created with named exports
- [ ] `REFERRER_POLICY`, `INTENT_THRESHOLD`, `TIME_THRESHOLD`, `SIZE_THRESHOLD` defined
- [ ] All magic strings replaced with constants
- [ ] No duplicate definitions

---

### T-010: Improve Model Fallback Logging
| Field | Value |
|-------|-------|
| **Status** | DONE |
| **Priority** | P2 |
| **Bugs Fixed** | E-005 |
| **Description** | Enhanced logging for model fallback chain |
| **Note** | Will log each model attempt with success/failure

**Acceptance Criteria:**
- [x] Each model attempt logged with success/failure status
- [x] Final selected model clearly identified
- [x] Failure reason logged for debugging
- [x] Logs parseable for monitoring dashboards

---

## PHASE 4: ARCHITECTURE (LONG-TERM)

### T-011: Add User-Facing Cache Explanation
| Field | Value |
|-------|-------|
| **Status** | TODO |
| **Priority** | P3 |
| **Bugs Fixed** | B-008 |
| **Description** | Add tooltip explaining cached try-on results |

**Acceptance Criteria:**
- [ ] Tooltip on try-on container explains caching
- [ ] "Refresh" button clears cache and regenerates
- [ ] Documentation mentions caching behavior

---

### T-012: Centralize Design Tokens
| Field | Value |
|-------|-------|
| **Status** | TODO |
| **Priority** | P3 |
| **Bugs Fixed** | A-002 |
| **Description** | Generate CSS from STYLE.md and use consistently |

**Acceptance Criteria:**
- [ ] `src/styles/tokens.css` generated from STYLE.md
- [ ] Components import tokens.css
- [ ] Inline styles replaced with CSS variable references
- [ ] Build script generates CSS from markdown

---

### T-013: Add JSDoc Type Annotations
| Field | Value |
|-------|-------|
| **Status** | TODO |
| **Priority** | P3 |
| **Bugs Fixed** | A-003 |
| **Description** | Add type annotations to public interfaces |

**Acceptance Criteria:**
- [ ] ClosetItem typedef defined
- [ ] API handler functions have JSDoc
- [ ] Public component props documented
- [ ] IDE shows type hints (verified in VS Code)

---

## TASK DEPENDENCIES

```
T-001 ─┬─ T-002 ─┬─ T-004
       │         │
       └─ T-003 ─┘

T-005 ─┬─ T-006 ─┬─ T-007
       │         │
       └─────────┘

T-008 ─┐
       ├─ T-009 ─ T-010
T-011 ─┘

T-012 ─┐
       ├─ T-013
T-001 ─┘
```

---

## PROGRESS TRACKING

| Task | Status | Date Completed | Notes |
|------|--------|---------------|-------|
| T-001 | DONE | 2026-04-21 | BASE.md AI models |
| T-002 | DONE | 2026-04-21 | BASE.md context window |
| T-003 | DONE | 2026-04-21 | API.md created |
| T-004 | DONE | 2026-04-21 | README.md |
| T-005 | DONE | 2026-04-21 | OAuth injection |
| T-006 | DONE | 2026-04-21 | Sanitization |
| T-007 | DONE | 2026-04-21 | Rate limiting |
| T-008 | DONE | 2026-04-21 | Error boundary |
| T-009 | Partial | 2026-04-21 | constants.js created |
| T-010 | DONE | 2026-04-21 | - |
| T-011 | DONE | 2026-04-21 | Added cache indicator and Refresh button |
| T-012 | Partial | 2026-04-21 | tokens.css created from STYLE.md |
| T-013 | DONE | 2026-04-21 | JSDoc typedefs created |

**Completion: 10/13 tasks (77%)**
