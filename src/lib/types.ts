// Centralized type definitions for the application

// Navigation view state
export type View = { type: "list" } | { type: "edit"; noteId: string };

// Note data structure (decrypted content)
export interface NoteData {
  title: string;
  content: string;
}

// Decrypted note with metadata
export interface DecryptedNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

// Vault database schema
export interface Vault {
  id: string;
  encryptedVerifier: string;
  createdAt: number;
}

// Note database schema
export interface Note {
  id: string;
  vaultId: string;
  encryptedData: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
}
