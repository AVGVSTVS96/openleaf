import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/constants";
import { deriveKey, verifyKey } from "@/lib/crypto";
import { db } from "@/lib/db";
import { mnemonicToSeed, validateMnemonic } from "@/lib/mnemonic";
import { saveAuthForNavigation } from "@/lib/store";

export const SignIn = memo(function SignIn() {
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
      window.location.href = ROUTES.NOTES;
    } catch (err) {
      console.error("Sign in failed:", err);
      setError("Sign in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSignIn}>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Enter your 12-word recovery phrase to access your vault.
      </p>

      <Textarea
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="font-mono text-sm"
        onChange={(e) => setMnemonic(e.target.value)}
        placeholder="word1 word2 word3 ..."
        rows={3}
        spellCheck={false}
        value={mnemonic}
      />

      {error && <ErrorMessage message={error} />}

      <Button
        className="h-10 px-6 font-semibold text-sm"
        disabled={isSigningIn || !mnemonic.trim()}
        type="submit"
      >
        {isSigningIn ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
});
