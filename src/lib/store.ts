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
    const data = JSON.parse(stored);

    // Handle new format (mnemonic only) vs old format (seed + vaultId)
    if (data.mnemonic && !data.seed) {
      // New optimistic flow - derive everything here
      const { mnemonicToSeed } = await import("./mnemonic");
      const { deriveKey, generateVaultId, verifyKey } = await import("./crypto");
      const { db } = await import("./db");

      const mnemonic = data.mnemonic;
      const seedBytes = await mnemonicToSeed(mnemonic);
      const [key, canonicalVaultId] = await Promise.all([
        deriveKey(seedBytes),
        generateVaultId(mnemonic),
      ]);

      // Verify vault exists locally
      const vault = await db.vault.get(canonicalVaultId);
      if (!vault || !(await verifyKey(vault.encryptedVerifier, key))) {
        // Vault not found - redirect back to sign in
        console.error("Vault not found for mnemonic");
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = "/signin?error=vault_not_found";
        return false;
      }

      setEncryptionKey(key);
      setCurrentVaultId(canonicalVaultId);
      setMnemonic(mnemonic);
    } else {
      // Old format with pre-computed seed
      const seedBytes = Uint8Array.from(atob(data.seed), (c) => c.charCodeAt(0));
      const { deriveKey } = await import("./crypto");
      const key = await deriveKey(seedBytes);

      setEncryptionKey(key);
      setCurrentVaultId(data.vaultId);
      if (data.mnemonic) {
        setMnemonic(data.mnemonic);
      }
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
