import { memo, useState } from "react";
import { convex } from "@/components/providers/ConvexClientProvider";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/constants";
import { deriveKey, generateVaultId, verifyKey } from "@/lib/crypto";
import { db } from "@/lib/db";
import { mnemonicToSeed, validateMnemonic } from "@/lib/mnemonic";
import { saveAuthForNavigation } from "@/lib/store";
import { api } from "../../../convex/_generated/api";

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

      // Run key derivation and vault ID generation in parallel
      const [key, canonicalVaultId] = await Promise.all([
        deriveKey(seed),
        generateVaultId(trimmedMnemonic),
      ]);
      let matchedVaultId: string | null = null;

      // Check local vault FIRST (fast) - canonical id
      const localVault = await db.vault.get(canonicalVaultId);
      if (localVault && (await verifyKey(localVault.encryptedVerifier, key))) {
        matchedVaultId = canonicalVaultId;
      }

      // Check all local vaults (for old vaults created before canonical id)
      if (!matchedVaultId) {
        const vaults = await db.vault.toArray();
        for (const vault of vaults) {
          if (await verifyKey(vault.encryptedVerifier, key)) {
            matchedVaultId = vault.id;
            break;
          }
        }
      }

      // Only check Convex if not found locally (slower network request)
      if (!matchedVaultId && convex) {
        const remoteVault = await convex.query(api.vaults.get, {
          vaultId: canonicalVaultId,
        });

        if (remoteVault && (await verifyKey(remoteVault.encryptedVerifier, key))) {
          // Create local vault entry from remote
          await db.vault.put({
            id: remoteVault.vaultId,
            encryptedVerifier: remoteVault.encryptedVerifier,
            createdAt: remoteVault.createdAt,
          });
          matchedVaultId = remoteVault.vaultId;
        }
      }

      if (!matchedVaultId) {
        setError("No vault found. Please create a new vault first.");
        setIsSigningIn(false);
        return;
      }

      // Save auth state to sessionStorage to survive page navigation
      saveAuthForNavigation(seed, matchedVaultId, trimmedMnemonic);
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
