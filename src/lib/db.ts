import Dexie, { type Table } from "dexie";
import { DB_NAME } from "./constants";
import type { Note, Vault } from "./types";

export class OpenLeafDB extends Dexie {
  vault!: Table<Vault, string>;
  notes!: Table<Note, string>;

  constructor() {
    super(DB_NAME);

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
