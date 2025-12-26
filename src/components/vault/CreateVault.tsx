import { useState, useEffect } from 'react';
import { MnemonicDisplay } from './MnemonicDisplay';
import { generateMnemonic, mnemonicToSeed } from '../../lib/mnemonic';
import { deriveKey, createVerifier } from '../../lib/crypto';
import { db } from '../../lib/db';
import { saveAuthForNavigation } from '../../lib/store';

export function CreateVault() {
  const [mnemonic, setMnemonic] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function createVault() {
      try {
        // Generate mnemonic
        const newMnemonic = await generateMnemonic();
        setMnemonic(newMnemonic);

        // Create vault automatically
        const seed = await mnemonicToSeed(newMnemonic);
        const key = await deriveKey(seed);
        const encryptedVerifier = await createVerifier(key);
        const vaultId = await generateVaultId(newMnemonic);

        await db.vault.put({
          id: vaultId,
          encryptedVerifier,
          createdAt: Date.now()
        });

        // Save auth state for navigation
        saveAuthForNavigation(seed, vaultId);
        setIsReady(true);
      } catch (err) {
        console.error('Failed to create vault:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to create vault: ${message}`);
      } finally {
        setIsLoading(false);
      }
    }

    createVault();
  }, []);

  function handleCreateNote() {
    window.location.href = '/notes';
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-[#888]">Creating your vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p>
        Your vault is protected by a 12-word recovery phrase. This is the
        <strong> only way</strong> to access your notes.
      </p>

      <p>
        Write it down and keep it safe. If you lose it, your notes are
        <strong> gone forever</strong>.
      </p>

      {mnemonic && <MnemonicDisplay mnemonic={mnemonic} />}

      {error && (
        <p className="text-red-600">{error}</p>
      )}

      <button
        onClick={handleCreateNote}
        disabled={!isReady}
        className="px-6 py-2 bg-[#E8E4DF] hover:bg-[#D8D4CF] disabled:opacity-50 transition-colors"
      >
        Create new note
      </button>
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
