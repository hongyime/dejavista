// DejaVista - Application Constants
// Centralized magic strings and configuration values

// ===============================
// Image Tracking Configuration
// ===============================
export const TIME_THRESHOLD = 2000; // ms - image must be viewed for 2+ seconds
export const SIZE_THRESHOLD = 200; // pixels - minimum image dimension
export const MIN_IMAGE_SIZE = 50; // pixels - for initial observation filter

// ===============================
// Debounce Configuration
// ===============================
export const DEBOUNCE_ITEMS = 3; // items before forcing batch send
export const DEBOUNCE_TIME = 5000; // ms - time before sending partial batch

// ===============================
// Intent Detection
// ===============================
export const INTENT_THRESHOLD = 3; // score required to show FAB

// Intent scoring weights
export const INTENT_OG_TYPE_PRODUCT = 5;
export const INTENT_ADD_TO_CART = 2;
export const INTENT_CURRENCY = 1;
export const INTENT_SIZE_SELECTOR = 2;
export const INTENT_SIZE_GUIDE = 1;
export const INTENT_COLOR_VARIANT = 1;
export const INTENT_MATERIAL = 1;
export const INTENT_STOCK_STATUS = 1;
export const INTENT_QUANTITY = 1;

// ===============================
// Data Limits
// ===============================
export const MAX_HISTORY_ITEMS = 200; // items fetched from DB
export const MAX_CONTEXT_ITEMS = 40; // items sent to AI (token optimized)
export const MAX_DEDUP_CHECK = 100; // items checked for duplicates
export const MAX_CLEANUP_ITEMS = 50; // items kept after cleanup

// ===============================
// Image Extraction Priority
// ===============================
export const IMAGE_EXTRACT_PRIORITY = [
  'data-zoom-image', // Priority 1
  'srcset',         // Priority 2
  'src'             // Priority 3 (fallback)
];

// ===============================
// HTTP / Network
// ===============================
export const REFERRER_POLICY = 'no-referrer'; // for image hotlink protection
export const REQUEST_TIMEOUT = 30000; // ms - recommendation request timeout
export const AI_GENERATION_TIMEOUT = 9000; // ms - try-on generation timeout

// ===============================
// Rate Limiting
// ===============================
export const RECOMMEND_RATE_LIMIT = 10; // requests per window
export const VISUALIZE_RATE_LIMIT = 5; // requests per window
export const RATE_LIMIT_WINDOW = 60000; // ms (1 minute)

// ===============================
// UI Configuration
// ===============================
export const INTERSECTION_THRESHOLD = 0.5; // 50% visible required
export const VIEWPORT_MIN_WIDTH = 201; // pixels for product detection
export const VIEWPORT_MIN_HEIGHT = 201; // pixels for product detection

// ===============================
// Storage Keys
// ===============================
export const STORAGE_KEYS = {
  SUPABASE_URL: 'supabaseUrl',
  SUPABASE_ANON_KEY: 'supabaseAnonKey',
  SUPABASE_SESSION: 'supabaseSession',
  CURRENT_PRODUCT: 'currentProduct',
  INCognito_MODE: 'incognitoMode',
  PHOTO_Purged: 'photoPurged',
  TRYON_CACHE_PREFIX: 'tryon:'
};

// ===============================
// Error Messages
// ===============================
export const ERRORS = {
  NO_SUPABASE_CREDS: 'Missing Supabase environment variables',
  NO_USER: 'Please sign in to use this feature',
  NO_API_URL: 'API URL not configured',
  NO_REFERENCE_PHOTO: 'Upload a reference photo in Settings first',
  NO_PRODUCT_IMAGE: 'Current product image missing',
  AI_UNAVAILABLE: 'AI temporarily unavailable. Please try again later.',
  RATE_LIMITED: 'Too many requests. Please wait before trying again.'
};

// ===============================
// Price Pattern Regex
// ===============================
export const PRICE_PATTERN = /[\$\u00a3\u20ac\u00a5]\s*[\d,]+\.?\d*/g;
export const PRICE_SINGLE_PATTERN = /[\$\u00a3\u20ac\u00a5]\s*[\d,]+\.?\d*/;
export const PRICE_EXCLUDE_ONE = /^[\$\u00a3\u20ac\u00a5]\s*1$/;

// ===============================
// Brand Detection
// ===============================
export const DEFAULT_BRAND_SOURCE = 'hostname'; // use window.location.hostname as brand

// ===============================
// Auth
// ===============================
export const AUTH_PROVIDER = 'google';
export const AUTH_SCOPES = ['openid', 'email', 'profile'];

// ===============================
// Supabase Storage
// ===============================
export const STORAGE_BUCKET = 'user_photos';
export const REFERENCE_PHOTO_PATH = 'reference.jpg';

// ===============================
// AI Models
// ===============================
export const AI_MODELS = {
  RECOMMEND: [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-1.5-flash'
  ],
  IMAGE: 'gemini-3.1-flash-image-preview'
};

// ===============================
// AI Prompt Configuration
// ===============================
export const AI_LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MAX_BRAND_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_REASONING_LENGTH: 100,
  MAX_OUTPUT_TOKENS: 256
};

// ===============================
// Try-On Configuration
// ===============================
export const TRYON_CONFIG = {
  ASPECT_RATIO: '3:4',
  IMAGE_SIZE: '1K',
  MAX_POSES: 6, // for accessories "complete the look"
  CACHE_TTL: null // null = no expiration (cleared on navigation)
};

// ===============================
// UI Strings
// ===============================
export const STRINGS = {
  LOADING: 'Loading...',
  SIGNING_IN: 'Signing in...',
  GENERATING_LOOK: 'Generating look...',
  IMAGE_MISSING: 'Image Missing',
  TRY_ON: 'Try On',
  REFRESH: 'Refresh',
  VIEW_ITEM: 'View Item',
  COMPLETE_LOOK: 'Complete the look',
  READY_TO_SHOP: 'Ready to Shop',
  VISIT_PRODUCT_PAGE: 'Visit a product page to see AI recommendations.',
  LOOK_FOR_BUTTON: 'Look for the "View Match" button on fashion sites.',
  MEMORY_EMPTY: 'Your fashion memory is empty.',
  BROWSE_MORE: 'Browse more items to unlock recommendations.',
  UPLOAD_REFERENCE: 'Upload a reference photo in Settings to enable try-on.',
  CURRENTLY_BROWSING: 'Currently Browsing',
  RECOMMENDED_MATCH: 'Recommended Match',
  SIMULATION_MODE: 'simulation mode'
};
