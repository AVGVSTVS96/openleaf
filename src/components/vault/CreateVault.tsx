import { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingMessage } from "@/components/ui/loading-message";
import { ROUTES } from "@/lib/constants";
import { createVerifier, deriveKey, generateVaultId } from "@/lib/crypto";
import { db } from "@/lib/db";
import { generateMnemonic, mnemonicToSeed } from "@/lib/mnemonic";
import { saveAuthForNavigation } from "@/lib/store";
import { MnemonicDisplay } from "./MnemonicDisplay";

export const CreateVault = memo(function CreateVault() {
  const [mnemonic, setMnemonic] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>("");

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
          createdAt: Date.now(),
        });

        // Save auth state for navigation
        saveAuthForNavigation(seed, vaultId);
        setIsReady(true);
      } catch (err) {
        console.error("Failed to create vault:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to create vault: ${message}`);
      } finally {
        setIsLoading(false);
      }
    }

    createVault();
  }, []);

  function handleContinue() {
    const noteId = crypto.randomUUID();
    window.location.href = ROUTES.NOTE(noteId);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingMessage message="Creating your vault..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
        <p>
          Your vault is protected by a 12-word recovery phrase. This is the
          <strong className="text-foreground"> only way</strong> to access your
          notes.
        </p>
        <p>
          Write it down and keep it safe. If you lose it, your notes are
          <strong className="text-foreground"> gone forever</strong>.
        </p>
      </div>

      {mnemonic && <MnemonicDisplay mnemonic={mnemonic} />}

      {error && <ErrorMessage message={error} />}

      <Button
        className="h-10 px-6 font-semibold text-sm"
        disabled={!isReady}
        onClick={handleContinue}
      >
        Start writing
      </Button>
    </div>
  );
});
