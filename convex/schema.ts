import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Vault metadata - stores encrypted verifier for authentication proof
  vaults: defineTable({
    vaultId: v.string(), // SHA-256(mnemonic)[0:16] - public identifier
    encryptedVerifier: v.string(), // JSON {ciphertext, iv} - for key verification
    createdAt: v.number(),
  }).index("by_vaultId", ["vaultId"]),

  // Encrypted notes - server sees only opaque blobs
  notes: defineTable({
    noteId: v.string(), // UUID - client-generated
    vaultId: v.string(), // Links to vault
    encryptedData: v.string(), // Base64 encrypted {title, content}
    iv: v.string(), // Base64 IV for AES-GCM
    createdAt: v.number(),
    updatedAt: v.number(),
    version: v.number(), // Monotonic counter for conflict detection
    deleted: v.optional(v.boolean()), // Soft delete for sync
  })
    .index("by_vaultId", ["vaultId"])
    .index("by_vaultId_and_updatedAt", ["vaultId", "updatedAt"])
    .index("by_vaultId_and_noteId", ["vaultId", "noteId"]),
});
