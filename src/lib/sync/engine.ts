import type { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { db } from "../db";
import type { GlobalSyncStatus, Note, RemoteNote } from "../types";

type SyncStatusListener = (status: GlobalSyncStatus) => void;

export interface InitialSyncResult {
  isFreshVault: boolean;
}

export class SyncEngine {
  private vaultId: string;
  private convex: ConvexReactClient;
  private statusListeners: Set<SyncStatusListener> = new Set();
  private currentStatus: GlobalSyncStatus = "synced";
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private unsubscribe: (() => void) | null = null;
  private syncInProgress: boolean = false;

  constructor(convex: ConvexReactClient, vaultId: string) {
    this.convex = convex;
    this.vaultId = vaultId;

    // Listen for online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.setStatus("syncing");
    this.syncPendingNotes();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.setStatus("offline");
  };

  private setStatus(status: GlobalSyncStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  getStatus(): GlobalSyncStatus {
    return this.currentStatus;
  }

  onStatusChange(listener: SyncStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  // Push a single note to Convex
  async pushNote(note: Note): Promise<void> {
    if (!this.isOnline) {
      // Mark as pending for later sync
      await db.notes.update(note.id, { syncStatus: "pending" });
      return;
    }

    this.setStatus("syncing");

    try {
      const result = await this.convex.mutation(api.notes.upsert, {
        vaultId: this.vaultId,
        noteId: note.id,
        encryptedData: note.encryptedData,
        iv: note.iv,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });

      if (result.status === "conflict") {
        // Remote version is newer - pull it
        await this.pullNote(note.id);
      } else {
        // Update local note with new version and synced status
        await db.notes.update(note.id, {
          version: result.version,
          syncStatus: "synced",
        });
      }

      this.setStatus("synced");
    } catch (error) {
      console.error("Failed to push note:", error);
      await db.notes.update(note.id, { syncStatus: "error" });
      this.setStatus("error");
    }
  }

  // Push a note deletion to Convex
  async pushDelete(noteId: string): Promise<void> {
    if (!this.isOnline) {
      // Mark as deleted locally, will sync when online
      await db.notes.update(noteId, {
        deleted: true,
        syncStatus: "pending",
      });
      return;
    }

    this.setStatus("syncing");

    try {
      await this.convex.mutation(api.notes.remove, {
        vaultId: this.vaultId,
        noteId,
        deletedAt: Date.now(),
      });

      // Actually delete from local DB after successful remote delete
      await db.notes.delete(noteId);
      this.setStatus("synced");
    } catch (error) {
      console.error("Failed to push delete:", error);
      this.setStatus("error");
    }
  }

  // Pull a single note from Convex
  private async pullNote(noteId: string): Promise<void> {
    const remoteNotes = await this.convex.query(api.notes.list, {
      vaultId: this.vaultId,
    });

    const remoteNote = remoteNotes.find((n: RemoteNote) => n.noteId === noteId);
    if (remoteNote) {
      await db.notes.update(noteId, {
        encryptedData: remoteNote.encryptedData,
        iv: remoteNote.iv,
        updatedAt: remoteNote.updatedAt,
        version: remoteNote.version,
        syncStatus: "synced",
      });
    }
  }

  // Sync all pending notes
  async syncPendingNotes(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    this.setStatus("syncing");

    try {
      // Get all pending notes
      const pendingNotes = await db.notes
        .where("syncStatus")
        .equals("pending")
        .toArray();

      for (const note of pendingNotes) {
        if (note.deleted) {
          await this.pushDelete(note.id);
        } else {
          await this.pushNote(note);
        }
      }

      this.setStatus("synced");
    } catch (error) {
      console.error("Failed to sync pending notes:", error);
      this.setStatus("error");
    } finally {
      this.syncInProgress = false;
    }
  }

  // Pull all notes from Convex and merge into local DB
  async pullAllNotes(): Promise<void> {
    if (!this.isOnline) return;

    this.setStatus("syncing");

    try {
      console.log("[Sync] Querying notes for vault:", this.vaultId);
      const remoteNotes: RemoteNote[] = await this.convex.query(api.notes.list, {
        vaultId: this.vaultId,
      });
      console.log("[Sync] Remote notes found:", remoteNotes.length);

      for (const remote of remoteNotes) {
        const local = await db.notes.get(remote.noteId);

        if (!local) {
          // New note from remote - add locally
          await db.notes.add({
            id: remote.noteId,
            vaultId: remote.vaultId,
            encryptedData: remote.encryptedData,
            iv: remote.iv,
            createdAt: remote.createdAt,
            updatedAt: remote.updatedAt,
            version: remote.version,
            syncStatus: "synced",
            deleted: false,
          });
        } else if (remote.version > (local.version || 0)) {
          // Remote is newer - update local
          await db.notes.update(remote.noteId, {
            encryptedData: remote.encryptedData,
            iv: remote.iv,
            updatedAt: remote.updatedAt,
            version: remote.version,
            syncStatus: "synced",
          });
        }
        // If local version >= remote version, keep local (will be pushed if pending)
      }

      // Handle remote deletions
      const localNotes = await db.notes
        .where("vaultId")
        .equals(this.vaultId)
        .toArray();

      for (const local of localNotes) {
        const remote = remoteNotes.find((r: RemoteNote) => r.noteId === local.id);
        if (remote?.deleted && !local.deleted) {
          await db.notes.delete(local.id);
        }
      }

      this.setStatus("synced");
    } catch (error) {
      console.error("Failed to pull notes:", error);
      this.setStatus("error");
    }
  }

  // Initial sync when connecting to a vault
  async initialSync(): Promise<InitialSyncResult> {
    console.log("[Sync] initialSync started, isOnline:", this.isOnline);

    if (!this.isOnline) {
      this.setStatus("offline");
      return { isFreshVault: false };
    }

    this.setStatus("syncing");

    let isFreshVault = false;

    try {
      // First, ensure vault exists on server
      const vault = await db.vault.get(this.vaultId);
      console.log("[Sync] Local vault:", vault ? "found" : "not found");

      if (vault) {
        const result = await this.convex.mutation(api.vaults.create, {
          vaultId: this.vaultId,
          encryptedVerifier: vault.encryptedVerifier,
          createdAt: vault.createdAt,
        });
        console.log("[Sync] Vault create result:", result.status);

        if (result.status === "exists") {
          // Vault already exists - pull remote notes first
          console.log("[Sync] Pulling all notes...");
          await this.pullAllNotes();
        } else {
          // Fresh vault - no remote data to pull
          isFreshVault = true;
          console.log("[Sync] Fresh vault detected, skipping pull");
        }
      }

      // Then push any pending local notes
      await this.syncPendingNotes();

      this.setStatus("synced");
      return { isFreshVault };
    } catch (error) {
      console.error("Initial sync failed:", error);
      this.setStatus("error");
      return { isFreshVault: false };
    }
  }

  // Handle remote changes (called when subscription receives updates)
  async handleRemoteChanges(remoteNotes: RemoteNote[]): Promise<void> {
    for (const remote of remoteNotes) {
      const local = await db.notes.get(remote.noteId);

      if (remote.deleted) {
        // Remote deletion
        if (local && !local.deleted) {
          await db.notes.delete(remote.noteId);
        }
        continue;
      }

      if (!local) {
        // New note from remote
        await db.notes.add({
          id: remote.noteId,
          vaultId: remote.vaultId,
          encryptedData: remote.encryptedData,
          iv: remote.iv,
          createdAt: remote.createdAt,
          updatedAt: remote.updatedAt,
          version: remote.version,
          syncStatus: "synced",
          deleted: false,
        });
      } else if (
        remote.version > (local.version || 0) &&
        local.syncStatus !== "pending"
      ) {
        // Remote is newer and local isn't pending - update
        await db.notes.update(remote.noteId, {
          encryptedData: remote.encryptedData,
          iv: remote.iv,
          updatedAt: remote.updatedAt,
          version: remote.version,
          syncStatus: "synced",
        });
      }
      // If local is pending, it will be pushed and conflict resolved then
    }
  }

  // Cleanup
  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.statusListeners.clear();
  }
}
