import { useState } from "react";
import { deriveKey, verifyKey } from "../../lib/crypto";
import { db } from "../../lib/db";
import { mnemonicToSeed, validateMnemonic } from "../../lib/mnemonic";
import { saveAuthForNavigation } from "../../lib/store";

export function SignIn() {
  const [mnemonic, setMnemonic] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    const trimmedMnemonic = mnemonic.trim().toLowerCase();

    setIsSigningIn(true);
    setError("");

    const isValid = await validateMnemonic(trimmedMnemonic);
    if (!isValid) {
      setError("Invalid recovery phrase. Please check and try again.");
      setIsSigningIn(false);
      return;
    }

    try {
      const seed = await mnemonicToSeed(trimmedMnemonic);
      const key = await deriveKey(seed);
      const vaults = await db.vault.toArray();

      if (vaults.length === 0) {
        setError("No vault found. Please create a new vault first.");
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
        setError("Invalid recovery phrase for this vault.");
        setIsSigningIn(false);
        return;
      }

      // Save auth state to sessionStorage to survive page navigation
      saveAuthForNavigation(seed, matchedVaultId);
      window.location.href = "/notes";
    } catch (err) {
      console.error("Sign in failed:", err);
      setError("Sign in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSignIn}>
      <p>Enter your 12-word recovery phrase to access your vault.</p>

      <textarea
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="w-full resize-none border border-secondary bg-transparent p-3 focus:border-primary focus:outline-none"
        onChange={(e) => setMnemonic(e.target.value)}
        placeholder="Enter your recovery phrase..."
        rows={3}
        spellCheck={false}
        value={mnemonic}
      />

      {error && <p className="text-red-600">{error}</p>}

      <button
        className="bg-button px-6 py-2 transition-colors hover:bg-button-hover disabled:opacity-50"
        disabled={isSigningIn || !mnemonic.trim()}
        type="submit"
      >
        {isSigningIn ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
