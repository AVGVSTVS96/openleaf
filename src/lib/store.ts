// Client-side state management for encryption key and vault
// Key is stored only in memory and cleared on tab close

import { SESSION_KEY } from "./constants";

let encryptionKey: CryptoKey | null = null;
let currentVaultId: string | null = null;

// Helper to check if we're in the browser
const isBrowser = typeof window !== "undefined";

export function setEncryptionKey(key: CryptoKey): void {
  encryptionKey = key;
}

export function getEncryptionKey(): CryptoKey | null {
  return encryptionKey;
}

export function setCurrentVaultId(vaultId: string): void {
  currentVaultId = vaultId;
}

export function getCurrentVaultId(): string | null {
  return currentVaultId;
}

export function clearEncryptionKey(): void {
  encryptionKey = null;
  currentVaultId = null;
  if (isBrowser) {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function isAuthenticated(): boolean {
  return encryptionKey !== null && currentVaultId !== null;
}

// Temporarily save auth state to survive page navigation
export function saveAuthForNavigation(seed: Uint8Array, vaultId: string): void {
  if (!isBrowser) {
    return;
  }
  const seedBase64 = btoa(String.fromCharCode(...seed));
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ seed: seedBase64, vaultId })
  );
}

// Restore auth state after page navigation (returns true if restored)
export async function restoreAuthFromNavigation(): Promise<boolean> {
  if (!isBrowser) {
    return false;
  }

  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) {
    return false;
  }

  try {
    const { seed: seedBase64, vaultId } = JSON.parse(stored);
    const seedBytes = Uint8Array.from(atob(seedBase64), (c) => c.charCodeAt(0));

    // Dynamic import to avoid SSR issues with crypto module
    const { deriveKey } = await import("./crypto");
    const key = await deriveKey(seedBytes);

    setEncryptionKey(key);
    setCurrentVaultId(vaultId);
    sessionStorage.removeItem(SESSION_KEY);
    return true;
  } catch (err) {
    console.error("Failed to restore auth:", err);
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}
