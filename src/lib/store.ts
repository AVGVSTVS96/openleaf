// Client-side state management for encryption key and vault
// Key is stored only in memory and cleared on tab close

import { SESSION_KEY } from "./constants";

let encryptionKey: CryptoKey | null = null;
let currentVaultId: string | null = null;
let currentMnemonic: string | null = null;

// Event-based auth signaling (eliminates polling)
type AuthListener = () => void;
const authListeners = new Set<AuthListener>();

export function onAuthReady(callback: AuthListener): () => void {
  // If already authenticated, call immediately
  if (isAuthenticated()) {
    callback();
    return () => {};
  }
  authListeners.add(callback);
  return () => authListeners.delete(callback);
}

function notifyAuthReady() {
  authListeners.forEach((cb) => cb());
  authListeners.clear();
}

// Helper to check if we're in the browser
const isBrowser = typeof window !== "undefined";

export function setEncryptionKey(key: CryptoKey) {
  encryptionKey = key;
}

export function getEncryptionKey() {
  return encryptionKey;
}

export function setCurrentVaultId(vaultId: string) {
  currentVaultId = vaultId;
}

export function getCurrentVaultId() {
  return currentVaultId;
}

export function setMnemonic(mnemonic: string) {
  currentMnemonic = mnemonic;
}

export function getMnemonic() {
  return currentMnemonic;
}

export function clearEncryptionKey() {
  encryptionKey = null;
  currentVaultId = null;
  currentMnemonic = null;
  if (isBrowser) {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function isAuthenticated() {
  return encryptionKey !== null && currentVaultId !== null;
}

export function saveAuthForNavigation(seed: Uint8Array, vaultId: string, mnemonic: string) {
  if (!isBrowser) {
    return;
  }
  const seedBase64 = btoa(String.fromCharCode(...seed));
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ seed: seedBase64, vaultId, mnemonic })
  );
}

export async function restoreAuthFromNavigation(): Promise<boolean> {
  if (!isBrowser) {
    return false;
  }

  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) {
    return false;
  }

  try {
    const { seed: seedBase64, vaultId, mnemonic } = JSON.parse(stored);
    const seedBytes = Uint8Array.from(atob(seedBase64), (c) => c.charCodeAt(0));

    // Dynamic import to avoid SSR issues with crypto module
    const { deriveKey } = await import("./crypto");
    const key = await deriveKey(seedBytes);

    setEncryptionKey(key);
    setCurrentVaultId(vaultId);
    if (mnemonic) {
      setMnemonic(mnemonic);
    }
    sessionStorage.removeItem(SESSION_KEY);
    notifyAuthReady();
    return true;
  } catch (err) {
    console.error("Failed to restore auth:", err);
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}
