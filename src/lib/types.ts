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

// Sync status for notes
export type SyncStatus = "synced" | "pending" | "error";

// Note database schema
export interface Note {
  id: string;
  vaultId: string;
  encryptedData: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
  // Sync fields
  version?: number;
  syncStatus?: SyncStatus;
  deleted?: boolean;
}

// Remote note from Convex (matches Convex schema)
export interface RemoteNote {
  _id: string;
  noteId: string;
  vaultId: string;
  encryptedData: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  deleted?: boolean;
}

// Global sync state
export type GlobalSyncStatus = "synced" | "syncing" | "offline" | "error";
