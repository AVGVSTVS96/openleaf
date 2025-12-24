// Client-side state management for encryption key
// Key is stored only in memory and cleared on tab close

let encryptionKey: CryptoKey | null = null;

export function setEncryptionKey(key: CryptoKey): void {
  encryptionKey = key;
}

export function getEncryptionKey(): CryptoKey | null {
  return encryptionKey;
}

export function clearEncryptionKey(): void {
  encryptionKey = null;
}

export function isAuthenticated(): boolean {
  return encryptionKey !== null;
}
