import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

// Get notes updated after a certain version (for incremental sync)
export const listSince = query({
  args: {
    vaultId: v.string(),
    sinceVersion: v.number(),
  },
  handler: async (ctx, { vaultId, sinceVersion }) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_vaultId", (q) => q.eq("vaultId", vaultId))
      .collect();

    return notes
      .filter((note) => note.version > sinceVersion)
      .sort((a, b) => a.version - b.version);
  },
});

// Upsert a note (create or update with conflict detection)
export const upsert = mutation({
  args: {
    vaultId: v.string(),
    noteId: v.string(),
    encryptedData: v.string(),
    iv: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Find existing note
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_vaultId", (q) => q.eq("vaultId", args.vaultId))
      .filter((q) => q.eq(q.field("noteId"), args.noteId))
      .first();

    if (!existing) {
      // New note - create it
      const id = await ctx.db.insert("notes", {
        noteId: args.noteId,
        vaultId: args.vaultId,
        encryptedData: args.encryptedData,
        iv: args.iv,
        createdAt: args.createdAt,
        updatedAt: args.updatedAt,
        version: 1,
        deleted: false,
      });

      return { status: "created" as const, version: 1, id };
    }

    // Conflict check: only update if incoming updatedAt is newer (last-write-wins)
    if (args.updatedAt <= existing.updatedAt) {
      return {
        status: "conflict" as const,
        currentVersion: existing.version,
        currentUpdatedAt: existing.updatedAt,
      };
    }

    // Update with incremented version
    const newVersion = existing.version + 1;
    await ctx.db.patch(existing._id, {
      encryptedData: args.encryptedData,
      iv: args.iv,
      updatedAt: args.updatedAt,
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
    deletedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_vaultId", (q) => q.eq("vaultId", args.vaultId))
      .filter((q) => q.eq(q.field("noteId"), args.noteId))
      .first();

    if (!existing) {
      return { status: "not_found" as const };
    }

    // Only mark as deleted if this delete is newer
    if (args.deletedAt <= existing.updatedAt && existing.deleted) {
      return { status: "already_deleted" as const };
    }

    const newVersion = existing.version + 1;
    await ctx.db.patch(existing._id, {
      deleted: true,
      updatedAt: args.deletedAt,
      version: newVersion,
    });

    return { status: "deleted" as const, version: newVersion };
  },
});

// Get the maximum version for a vault (for sync cursor)
export const getMaxVersion = query({
  args: { vaultId: v.string() },
  handler: async (ctx, { vaultId }) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_vaultId", (q) => q.eq("vaultId", vaultId))
      .collect();

    if (notes.length === 0) {
      return 0;
    }

    return Math.max(...notes.map((n) => n.version));
  },
});
