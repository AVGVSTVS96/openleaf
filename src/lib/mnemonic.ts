// Use dynamic import to ensure bip39 only loads in browser environment
let bip39Module: typeof import('bip39') | null = null;

async function getBip39() {
  if (!bip39Module) {
    // Polyfill Buffer for browser environment (required by bip39)
    if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
      const { Buffer } = await import('buffer');
      window.Buffer = Buffer;
    }
    bip39Module = await import('bip39');
  }
  return bip39Module;
}

export async function generateMnemonic(): Promise<string> {
  const bip39 = await getBip39();
  return bip39.generateMnemonic();
}

export async function validateMnemonic(mnemonic: string): Promise<boolean> {
  const bip39 = await getBip39();
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase());
}

export async function mnemonicToSeed(mnemonic: string): Promise<Uint8Array> {
  const bip39 = await getBip39();
  const seed = await bip39.mnemonicToSeed(mnemonic.trim().toLowerCase());
  return new Uint8Array(seed);
}
