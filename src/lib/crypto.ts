import {
  PBKDF2_ITERATIONS,
  SALT,
  VERIFIER_PLAINTEXT,
} from "./constants";
import type { NoteData } from "./types";

export async function deriveKey(
  seed: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    seed,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
  };
}

export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(iv);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    ciphertextBuffer
  );

  return new TextDecoder().decode(plaintextBuffer);
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function createVerifier(key: CryptoKey): Promise<string> {
  const { ciphertext, iv } = await encrypt(VERIFIER_PLAINTEXT, key);
  return JSON.stringify({ ciphertext, iv });
}

export async function verifyKey(
  encryptedVerifier: string,
  key: CryptoKey
): Promise<boolean> {
  try {
    const { ciphertext, iv } = JSON.parse(encryptedVerifier);
    const decrypted = await decrypt(ciphertext, iv, key);
    return decrypted === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

export async function encryptNoteData(
  data: NoteData,
  key: CryptoKey
): Promise<{ encryptedData: string; iv: string }> {
  const plaintext = JSON.stringify(data);
  const { ciphertext, iv } = await encrypt(plaintext, key);
  return { encryptedData: ciphertext, iv };
}

export async function decryptNoteData(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<NoteData> {
  const plaintext = await decrypt(encryptedData, iv, key);
  return JSON.parse(plaintext) as NoteData;
}

// Generate a unique vault ID from the mnemonic
export async function generateVaultId(mnemonic: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(mnemonic);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex.slice(0, 16);
}
