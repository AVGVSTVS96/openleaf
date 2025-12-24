import { useState } from 'react';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';
import { validateMnemonic, mnemonicToSeed } from '../../lib/mnemonic';
import { deriveKey, verifyKey } from '../../lib/crypto';
import { db } from '../../lib/db';
import { setEncryptionKey } from '../../lib/store';

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
      // Derive encryption key from mnemonic
      const seed = await mnemonicToSeed(trimmedMnemonic);
      const key = await deriveKey(seed);

      // Check if vault exists
      const vaults = await db.vault.toArray();

      if (vaults.length === 0) {
        setError('No vault found. Please create a new vault first.');
        setIsSigningIn(false);
        return;
      }

      // Try to verify against stored vault
      let verified = false;
      for (const vault of vaults) {
        if (await verifyKey(vault.encryptedVerifier, key)) {
          verified = true;
          break;
        }
      }

      if (!verified) {
        setError('Invalid recovery phrase for this vault.');
        setIsSigningIn(false);
        return;
      }

      // Store key in memory
      setEncryptionKey(key);

      // Redirect to notes
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
      <div className="text-[#6B7280]">
        <p>Enter your 12-word recovery phrase to access your vault.</p>
      </div>

      <TextArea
        label="Recovery phrase"
        value={mnemonic}
        onChange={(e) => setMnemonic(e.target.value)}
        placeholder="Enter your 12-word recovery phrase..."
        rows={4}
        className="font-mono"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSigningIn || !mnemonic.trim()}
        className="w-full"
      >
        {isSigningIn ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}
