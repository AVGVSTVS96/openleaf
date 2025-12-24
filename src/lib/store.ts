// Client-side state management for encryption key and vault
// Key is stored only in memory and cleared on tab close

let encryptionKey: CryptoKey | null = null;
let currentVaultId: string | null = null;

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
}

export function isAuthenticated(): boolean {
  return encryptionKey !== null && currentVaultId !== null;
}
