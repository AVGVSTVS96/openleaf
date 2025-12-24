import { useState } from 'react';
import { validateMnemonic, mnemonicToSeed } from '../../lib/mnemonic';
import { deriveKey, verifyKey } from '../../lib/crypto';
import { db } from '../../lib/db';
import { setEncryptionKey, setCurrentVaultId } from '../../lib/store';

export function SignIn() {
  const [mnemonic, setMnemonic] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string>('');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    const trimmedMnemonic = mnemonic.trim().toLowerCase();

    if (!validateMnemonic(trimmedMnemonic)) {
      setError('Invalid recovery phrase. Please check and try again.');
      return;
    }

    setIsSigningIn(true);
    setError('');

    try {
      const seed = await mnemonicToSeed(trimmedMnemonic);
      const key = await deriveKey(seed);
      const vaults = await db.vault.toArray();

      if (vaults.length === 0) {
        setError('No vault found. Please create a new vault first.');
        setIsSigningIn(false);
        return;
      }

      let matchedVaultId: string | null = null;
      for (const vault of vaults) {
        if (await verifyKey(vault.encryptedVerifier, key)) {
          matchedVaultId = vault.id;
          break;
        }
      }

      if (!matchedVaultId) {
        setError('Invalid recovery phrase for this vault.');
        setIsSigningIn(false);
        return;
      }

      setEncryptionKey(key);
      setCurrentVaultId(matchedVaultId);
      window.location.href = '/notes';
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-6">
      <p>Enter your 12-word recovery phrase to access your vault.</p>

      <textarea
        value={mnemonic}
        onChange={(e) => setMnemonic(e.target.value)}
        placeholder="Enter your recovery phrase..."
        rows={3}
        className="w-full p-3 bg-transparent border border-[#ccc] focus:outline-none focus:border-[#888] resize-none"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {error && (
        <p className="text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSigningIn || !mnemonic.trim()}
        className="px-6 py-2 bg-[#E8E4DF] hover:bg-[#D8D4CF] disabled:opacity-50 transition-colors"
      >
        {isSigningIn ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
