import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { MnemonicDisplay } from './MnemonicDisplay';
import { generateMnemonic, mnemonicToSeed } from '../../lib/mnemonic';
import { deriveKey, createVerifier } from '../../lib/crypto';
import { db } from '../../lib/db';
import { setEncryptionKey } from '../../lib/store';

export function CreateVault() {
  const [mnemonic, setMnemonic] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setMnemonic(generateMnemonic());
  }, []);

  async function handleCreateVault() {
    if (!mnemonic) return;

    setIsCreating(true);
    setError('');

    try {
      // Derive encryption key from mnemonic
      const seed = await mnemonicToSeed(mnemonic);
      const key = await deriveKey(seed);

      // Create verifier for future sign-ins
      const encryptedVerifier = await createVerifier(key);

      // Generate vault ID from first 8 chars of mnemonic hash
      const vaultId = await generateVaultId(mnemonic);

      // Store vault in IndexedDB
      await db.vault.put({
        id: vaultId,
        encryptedVerifier,
        createdAt: Date.now()
      });

      // Store key in memory
      setEncryptionKey(key);

      // Redirect to notes
      window.location.href = '/notes';
    } catch (err) {
      console.error('Failed to create vault:', err);
      setError('Failed to create vault. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-[#6B7280] space-y-2">
        <p>
          Your vault is protected by a 12-word recovery phrase. This phrase is the
          <strong className="text-black"> only way</strong> to access your encrypted notes.
        </p>
        <p>
          Write it down and store it somewhere safe. If you lose this phrase,
          your notes will be <strong className="text-black">permanently inaccessible</strong>.
        </p>
      </div>

      {mnemonic && <MnemonicDisplay mnemonic={mnemonic} />}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
        <strong>Important:</strong> Write down these 12 words in order. This is
        the only way to access your vault!
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={handleCreateVault}
        disabled={isCreating || !mnemonic}
        className="w-full"
      >
        {isCreating ? 'Creating vault...' : 'Create vault'}
      </Button>
    </div>
  );
}

async function generateVaultId(mnemonic: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(mnemonic);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 16);
}
