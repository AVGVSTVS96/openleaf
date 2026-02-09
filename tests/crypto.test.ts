import { describe, expect, it } from "bun:test";
import {
  createVerifier,
  decrypt,
  deriveKey,
  encrypt,
  generateVaultId,
  verifyKey,
} from "../src/lib/crypto";

describe("crypto helpers", () => {
  it("encrypts and decrypts round-trip", async () => {
    const seed = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const key = await deriveKey(seed);
    const plaintext = "hello openleaf";
    const { ciphertext, iv } = await encrypt(plaintext, key);
    const decrypted = await decrypt(ciphertext, iv, key);
    expect(decrypted).toBe(plaintext);
  });

  it("verifies the correct key and rejects the wrong one", async () => {
    const keyA = await deriveKey(new Uint8Array([9, 9, 9, 9]));
    const keyB = await deriveKey(new Uint8Array([8, 8, 8, 8]));
    const verifier = await createVerifier(keyA);
    expect(await verifyKey(verifier, keyA)).toBe(true);
    expect(await verifyKey(verifier, keyB)).toBe(false);
  });

  it("generates a deterministic vault id of expected length", async () => {
    const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const idA = await generateVaultId(mnemonic);
    const idB = await generateVaultId(mnemonic);
    expect(idA).toBe(idB);
    expect(idA.length).toBe(16);
  });
});
