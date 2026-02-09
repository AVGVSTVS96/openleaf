import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all non-deleted notes for a vault
export const list = query({
  args: { vaultId: v.string() },
  handler: async (ctx, { vaultId }) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_vaultId", (q) => q.eq("vaultId", vaultId))
      .collect();

    // Filter out deleted notes and sort by updatedAt descending
    return notes
      .filter((note) => !note.deleted)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Get a single note by vault + noteId
export const getByNoteId = query({
  args: {
    vaultId: v.string(),
    noteId: v.string(),
  },
  handler: async (ctx, { vaultId, noteId }) => {
    const note = await ctx.db
      .query("notes")
      .withIndex("by_vaultId_and_noteId", (q) =>
        q.eq("vaultId", vaultId).eq("noteId", noteId)
      )
      .first();

    if (!note || note.deleted) {
      return null;
    }

    return note;
  },
});

// Upsert a note (create or update with conflict detection)
export const upsert = mutation({
  args: {
    vaultId: v.string(),
    noteId: v.string(),
    encryptedData: v.string(),
    iv: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing note
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_vaultId_and_noteId", (q) =>
        q.eq("vaultId", args.vaultId).eq("noteId", args.noteId)
      )
      .first();

    if (!existing) {
      // New note - create it
      const id = await ctx.db.insert("notes", {
        noteId: args.noteId,
        vaultId: args.vaultId,
        encryptedData: args.encryptedData,
        iv: args.iv,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deleted: false,
      });

      return { status: "created" as const, version: 1, id };
    }

    // Update existing note with incremented version.
    const newVersion = existing.version + 1;
    await ctx.db.patch(existing._id, {
      encryptedData: args.encryptedData,
      iv: args.iv,
      updatedAt: now,
      version: newVersion,
      deleted: false, // Undelete if was deleted
    });

    return { status: "updated" as const, version: newVersion };
  },
});

// Soft delete a note
export const remove = mutation({
  args: {
    vaultId: v.string(),
    noteId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_vaultId_and_noteId", (q) =>
        q.eq("vaultId", args.vaultId).eq("noteId", args.noteId)
      )
      .first();

    if (!existing) {
      return { status: "not_found" as const };
    }

    if (existing.deleted) {
      return { status: "already_deleted" as const };
    }

    const newVersion = existing.version + 1;
    await ctx.db.patch(existing._id, {
      deleted: true,
      updatedAt: Date.now(),
      version: newVersion,
    });

    return { status: "deleted" as const, version: newVersion };
  },
});
