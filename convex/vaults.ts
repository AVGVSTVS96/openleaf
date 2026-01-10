import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get a vault by its ID (derived from mnemonic hash)
export const get = query({
  args: { vaultId: v.string() },
  handler: async (ctx, { vaultId }) => {
    return ctx.db
      .query("vaults")
      .withIndex("by_vaultId", (q) => q.eq("vaultId", vaultId))
      .first();
  },
});

// Create a new vault (called on first device setup)
export const create = mutation({
  args: {
    vaultId: v.string(),
    encryptedVerifier: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if vault already exists
    const existing = await ctx.db
      .query("vaults")
      .withIndex("by_vaultId", (q) => q.eq("vaultId", args.vaultId))
      .first();

    if (existing) {
      // Vault already exists, return it
      return { status: "exists" as const, vault: existing };
    }

    // Create new vault
    const id = await ctx.db.insert("vaults", {
      vaultId: args.vaultId,
      encryptedVerifier: args.encryptedVerifier,
      createdAt: args.createdAt,
    });

    return { status: "created" as const, id };
  },
});
