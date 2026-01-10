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

    // Add sync fields for remote synchronization
    this.version(3)
      .stores({
        vault: "id",
        notes: "id, vaultId, updatedAt, syncStatus, version",
      })
      .upgrade((tx) => {
        // Mark all existing notes as pending sync with version 1
        return tx
          .table("notes")
          .toCollection()
          .modify((note) => {
            note.syncStatus = "pending";
            note.version = 1;
            note.deleted = false;
          });
      });
  }
}

export const db = new OpenLeafDB();
