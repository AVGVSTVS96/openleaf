import { useEffect, useState } from "react";
import { ROUTES } from "../../lib/constants";
import { createVerifier, deriveKey, generateVaultId } from "../../lib/crypto";
import { db } from "../../lib/db";
import { generateMnemonic, mnemonicToSeed } from "../../lib/mnemonic";
import { saveAuthForNavigation } from "../../lib/store";
import { Button } from "../ui/button";
import { MnemonicDisplay } from "./MnemonicDisplay";

export function CreateVault() {
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

  function handleCreateNote() {
    window.location.href = ROUTES.NOTES;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-secondary">Creating your vault...</p>
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

      {error && <p className="text-destructive">{error}</p>}

      <Button disabled={!isReady} onClick={handleCreateNote}>
        Create new note
      </Button>
    </div>
  );
}
