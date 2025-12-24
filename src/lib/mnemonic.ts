import * as bip39 from 'bip39';

export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase());
}

export async function mnemonicToSeed(mnemonic: string): Promise<Uint8Array> {
  const seed = await bip39.mnemonicToSeed(mnemonic.trim().toLowerCase());
  return new Uint8Array(seed);
}
