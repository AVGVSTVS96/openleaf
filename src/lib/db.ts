import Dexie, { type Table } from 'dexie';

export interface Vault {
  id: string;
  encryptedVerifier: string;
  createdAt: number;
}

export interface Note {
  id: string;
  encryptedTitle: string;
  encryptedContent: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
}

export class OpenLeafDB extends Dexie {
  vault!: Table<Vault, string>;
  notes!: Table<Note, string>;

  constructor() {
    super('OpenLeafDB');

    this.version(1).stores({
      vault: 'id',
      notes: 'id, updatedAt'
    });
  }
}

export const db = new OpenLeafDB();
