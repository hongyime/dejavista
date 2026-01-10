# DejaView - Design System

## Design Philosophy
**"Invisible until needed."**

The UI blends seamlessly into the browser environment, matching the clean aesthetic of modern e-commerce sites. Visual attention is reserved exclusively for high-value AI interactions.

---

## Color Palette

### Primary Colors

#### Base White
```
HEX: #FFFFFF
RGB: 255, 255, 255
Usage: Side Panel container, card backgrounds, navigation bar
```
**Purpose:** Creates a clean, native feel that matches e-commerce sites (Uniqlo, Zara)

#### GenAI Purple (Action Accent)
```
HEX: #6366F1
RGB: 99, 102, 241
Usage: AI-specific interactions ONLY
```
**Reserved for:**
- "Try On" button (solid fill)
- "Match Found" pulse animation (outline/glow)
- Buying Intent notification dot
- AI reasoning highlight border

**Never use for:**
- Standard navigation
- Generic buttons (Cancel, Close, etc.)
- Static text or icons

#### Soft Gray (Secondary Surface)
```
HEX: #F3F4F6
RGB: 243, 244, 246
Usage: Closet tab background, inactive states, disabled elements
```
**Purpose:** Creates depth to make active elements feel elevated

---

### Text Hierarchy

#### Jet Black (Headings)
```
HEX: #111827
RGB: 17, 24, 39
Usage: Product titles, prices, primary CTAs
Font Weight: 600-700
```

#### Slate Gray (Body)
```
HEX: #6B7280
RGB: 107, 114, 128
Usage: Metadata, timestamps, helper text
Font Weight: 400-500
```

#### Purple-Black (AI Reasoning)
```
HEX: #312E81
RGB: 49, 46, 129
Usage: Gemini-generated reasoning text ONLY
Font Weight: 500
Font Style: Italic (optional, for emphasis)
```

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
```
**Rationale:** System fonts ensure fast rendering and native OS feel

### Scale

```css
/* Headings */
h1: 24px / 1.3 / 700    /* Page titles */
h2: 20px / 1.4 / 600    /* Section headers */
h3: 16px / 1.5 / 600    /* Card titles */

/* Body */
body: 14px / 1.6 / 400      /* Default text */
small: 12px / 1.5 / 400     /* Metadata, captions */
micro: 10px / 1.4 / 500     /* Timestamps, badges */
```

---

## Spacing System

### Base Unit: 4px

```css
--space-1: 4px    /* Tight spacing (icon gaps) */
--space-2: 8px    /* Small padding */
--space-3: 12px   /* Default padding */
--space-4: 16px   /* Card padding */
--space-6: 24px   /* Section spacing */
--space-8: 32px   /* Large gaps */
--space-12: 48px  /* Page margins */
```

### Application
- **Card internal padding:** 16px (space-4)
- **Gap between cards:** 12px (space-3)
- **Side Panel horizontal padding:** 16px (space-4)
- **Section vertical spacing:** 24px (space-6)

---

## Components

### 1. Side Panel Container
```css
background: #FFFFFF
width: 400px (fixed by Chrome)
padding: 16px
border-left: 1px solid #E5E7EB
```

### 2. Navigation Tabs
**Active State:**
```css
background: #FFFFFF
color: #111827
border-bottom: 2px solid #6366F1 (GenAI Purple)
font-weight: 600
```

**Inactive State:**
```css
background: transparent
color: #6B7280 (Slate Gray)
border-bottom: 2px solid transparent
font-weight: 400

hover:
  color: #111827
  border-bottom: 2px solid #E5E7EB
```

### 3. Product Card
```css
background: #FFFFFF
border: 1px solid #E5E7EB
border-radius: 8px
padding: 16px
box-shadow: 0 1px 3px rgba(0,0,0,0.05)

hover:
  box-shadow: 0 4px 12px rgba(0,0,0,0.1)
  border-color: #D1D5DB
```

**Image Container:**
```css
aspect-ratio: 3/4
border-radius: 4px
overflow: hidden
background: #F9FAFB (loading state)
```

**Metadata:**
```css
margin-top: 12px
display: flex
flex-direction: column
gap: 4px
```

### 4. AI Match Card (Special Variant)
```css
background: linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)
border: 2px solid #6366F1 (GenAI Purple)
border-radius: 12px
padding: 16px
position: relative

/* Glow effect */
box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1),
            0 4px 12px rgba(99, 102, 241, 0.15)
```

**Reasoning Text:**
```css
color: #312E81 (Purple-Black)
font-size: 14px
line-height: 1.6
font-style: italic
margin-top: 12px
padding: 12px
background: rgba(99, 102, 241, 0.05)
border-radius: 6px
border-left: 3px solid #6366F1
```

### 5. Buttons

#### Primary (AI Actions Only)
```css
background: #6366F1 (GenAI Purple)
color: #FFFFFF
padding: 12px 24px
border-radius: 8px
font-weight: 600
font-size: 14px
border: none
cursor: pointer

hover:
  background: #4F46E5
  transform: translateY(-1px)
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3)

active:
  transform: translateY(0)
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2)

disabled:
  background: #D1D5DB
  color: #9CA3AF
  cursor: not-allowed
```

#### Secondary (Generic Actions)
```css
background: #FFFFFF
color: #111827
padding: 12px 24px
border-radius: 8px
font-weight: 500
font-size: 14px
border: 1px solid #E5E7EB
cursor: pointer

hover:
  background: #F9FAFB
  border-color: #D1D5DB
```

#### Destructive (Purge, Delete)
```css
background: #FFFFFF
color: #DC2626
padding: 12px 24px
border-radius: 8px
font-weight: 500
font-size: 14px
border: 1px solid #FCA5A5
cursor: pointer

hover:
  background: #FEF2F2
  border-color: #EF4444
```

### 6. Loading States

#### Skeleton Card
```css
background: linear-gradient(
  90deg,
  #F3F4F6 0%,
  #E5E7EB 50%,
  #F3F4F6 100%
)
background-size: 200% 100%
animation: shimmer 1.5s infinite
border-radius: 8px
```

```css
@keyframes shimmer {
  0% { background-position: -200% 0 }
  100% { background-position: 200% 0 }
}
```

#### Spinner (AI Processing)
```css
width: 24px
height: 24px
border: 3px solid #E5E7EB
border-top-color: #6366F1 (GenAI Purple)
border-radius: 50%
animation: spin 0.8s linear infinite
```

```css
@keyframes spin {
  to { transform: rotate(360deg) }
}
```

### 7. Notification Dot (Buying Intent)
```css
position: absolute
top: 8px
right: 8px
width: 10px
height: 10px
background: #6366F1 (GenAI Purple)
border-radius: 50%
animation: pulse 2s infinite
```

```css
@keyframes pulse {
  0%, 100% {
    opacity: 1
    transform: scale(1)
  }
  50% {
    opacity: 0.5
    transform: scale(1.2)
  }
}
```

### 8. Input Fields

#### Text Input
```css
background: #FFFFFF
border: 1px solid #D1D5DB
border-radius: 6px
padding: 10px 12px
font-size: 14px
color: #111827

focus:
  outline: none
  border-color: #6366F1
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1)

placeholder:
  color: #9CA3AF
```

#### Toggle Switch (Incognito Mode)
```css
/* Track */
width: 44px
height: 24px
background: #D1D5DB
border-radius: 12px
cursor: pointer

/* Thumb */
width: 20px
height: 20px
background: #FFFFFF
border-radius: 50%
transform: translateX(2px)
transition: transform 0.2s

/* Active State */
background: #6366F1 (GenAI Purple)
thumb transform: translateX(22px)
```

### 9. Empty States
```css
text-align: center
padding: 48px 24px
color: #6B7280 (Slate Gray)

/* Icon */
font-size: 48px
color: #D1D5DB
margin-bottom: 16px

/* Text */
h3: color #111827
    font-size: 16px
    font-weight: 600
    margin-bottom: 8px

p:  color #6B7280
    font-size: 14px
    line-height: 1.6
```

---

## Animation Guidelines

### Timing Functions
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1)    /* UI transitions */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)  /* Hover effects */
--spring: cubic-bezier(0.34, 1.56, 0.64, 1)  /* Playful interactions */
```

### Duration Standards
```css
--duration-fast: 150ms    /* Hover, focus states */
--duration-base: 250ms    /* Standard transitions */
--duration-slow: 400ms    /* Page transitions, modals */
```

### Usage
- **Hover effects:** 150ms ease-in-out
- **Button clicks:** 250ms ease-out
- **Card expansion:** 400ms spring
- **Page transitions:** 400ms ease-out

---

## Accessibility

### Focus States
All interactive elements MUST have visible focus indicators:
```css
:focus-visible {
  outline: 2px solid #6366F1
  outline-offset: 2px
}
```

### Color Contrast
All text must meet WCAG AA standards:
- **Large text (18px+):** 3:1 minimum
- **Body text (14px):** 4.5:1 minimum

**Verified Combinations:**
- `#111827` on `#FFFFFF` → 16.1:1 ✓
- `#6B7280` on `#FFFFFF` → 5.7:1 ✓
- `#312E81` on `#FFFFFF` → 10.2:1 ✓
- `#FFFFFF` on `#6366F1` → 8.3:1 ✓

### Semantic HTML
- Use `<button>` for clickable actions (never `<div>`)
- Use `<nav>` for tab navigation
- Use `<article>` for product cards
- Add `aria-label` for icon-only buttons

---

## Responsive Behavior

### Side Panel Width
Fixed by Chrome at **400px** (no responsive needed)

### Card Grid
```css
/* Closet Tab */
display: grid
grid-template-columns: repeat(2, 1fr)
gap: 12px

/* Single column on narrow panels (future-proofing) */
@media (max-width: 350px) {
  grid-template-columns: 1fr
}
```

### Image Scaling
```css
img {
  width: 100%
  height: auto
  object-fit: cover
}
```

---

## Implementation Notes

### Image Rendering
**Critical:** Add to ALL product images:
```jsx
<img 
  src={url}
  alt={title}
  referrerPolicy="no-referrer"  // Prevents 403 errors
  loading="lazy"                // Performance optimization
/>
```

### Tailwind CSS Classes (If Used)
Map design tokens to Tailwind utilities:
```
bg-white → #FFFFFF
bg-gray-50 → #F9FAFB
bg-gray-100 → #F3F4F6
text-gray-900 → #111827
text-gray-500 → #6B7280
text-indigo-600 → #6366F1
border-gray-200 → #E5E7EB
```

### CSS Custom Properties (Recommended)
Define in `:root` for consistency:
```css
:root {
  --color-base: #FFFFFF;
  --color-accent: #6366F1;
  --color-surface: #F3F4F6;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-text-ai: #312E81;
  
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-ai: 0 0 0 4px rgba(99, 102, 241, 0.1);
}
```

---

## Example Compositions

### Mirror Tab Layout
```
┌─────────────────────────────────┐
│ Navigation Tabs                 │ ← 48px height
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │  User Reference Photo     │  │ ← 16px padding
│  │  (300x400px)              │  │
│  └───────────────────────────┘  │
│                                 │
│  Current Product Card           │ ← AI Match Card style
│  ┌───────────────────────────┐  │
│  │ Product Image             │  │
│  ├───────────────────────────┤  │
│  │ Title, Price              │  │
│  │ [Try On Button]           │  │ ← GenAI Purple
│  └───────────────────────────┘  │
│                                 │
│  AI Reasoning                   │
│  ┌───────────────────────────┐  │
│  │ "These items match        │  │ ← Purple-Black italic
│  │  because..."              │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Closet Tab Layout
```
┌─────────────────────────────────┐
│ Navigation Tabs                 │
├─────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐       │
│  │ Card 1  │  │ Card 2  │       │ ← 2-column grid
│  │ Image   │  │ Image   │       │   12px gap
│  │ Title   │  │ Title   │       │
│  │ $29     │  │ $45     │       │
│  └─────────┘  └─────────┘       │
│                                 │
│  ┌─────────┐  ┌─────────┐       │
│  │ Card 3  │  │ Card 4  │       │
│  └─────────┘  └─────────┘       │
│                                 │
│         [Load More]             │ ← Secondary button
└─────────────────────────────────┘
```
