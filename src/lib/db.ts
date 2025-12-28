import Dexie, { type Table } from "dexie";

export interface Vault {
  id: string;
  encryptedVerifier: string;
  createdAt: number;
}

export interface Note {
  id: string;
  vaultId: string;
  encryptedData: string; // JSON blob containing { title, content }
  iv: string;
  createdAt: number;
  updatedAt: number;
}

export class OpenLeafDB extends Dexie {
  vault!: Table<Vault, string>;
  notes!: Table<Note, string>;

  constructor() {
    super("OpenLeafDB");

    this.version(1).stores({
      vault: "id",
      notes: "id, updatedAt",
    });

    // Add vaultId field to notes for multi-vault support
    this.version(2).stores({
      vault: "id",
      notes: "id, vaultId, updatedAt",
    });
  }
}

export const db = new OpenLeafDB();
