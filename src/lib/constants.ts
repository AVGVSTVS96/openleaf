// Application constants

// App identity
export const APP_NAME = "OpenLeaf";
export const APP_EMOJI = "🌿";
export const DB_NAME = "OpenLeafDB";

// Crypto configuration
export const SALT = "openleaf-v1";
export const VERIFIER_PLAINTEXT = "openleaf-verified";
export const PBKDF2_ITERATIONS = 100_000;
export const VAULT_ID_LENGTH = 16;

// Session storage
export const SESSION_KEY = "openleaf_pending_auth";

// UI timing
export const AUTOSAVE_DELAY_MS = 500;

// Routes
export const ROUTES = {
  HOME: "/",
  CREATE: "/create",
  SIGNIN: "/signin",
  NOTES: "/notes",
  NOTE: (id: string) => `/notes/${id}`,
} as const;
