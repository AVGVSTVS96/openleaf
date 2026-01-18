import { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { ROUTES } from "@/lib/constants";
import { createVerifier, deriveKey, generateVaultId } from "@/lib/crypto";
import { db } from "@/lib/db";
import { generateMnemonic, mnemonicToSeed } from "@/lib/mnemonic";
import { saveAuthForNavigation } from "@/lib/store";
import { MnemonicDisplay } from "./MnemonicDisplay";

export const CreateVault = memo(function CreateVault() {
  const [mnemonic, setMnemonic] = useState<string>("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function setup() {
      try {
        // Generate mnemonic FIRST (fast - just random words)
        const newMnemonic = await generateMnemonic();
        setMnemonic(newMnemonic); // Show immediately!

        // Now do slow crypto in background while user reads
        const seed = await mnemonicToSeed(newMnemonic);
        const [key, vaultId] = await Promise.all([
          deriveKey(seed),
          generateVaultId(newMnemonic),
        ]);
        const encryptedVerifier = await createVerifier(key);

        await db.vault.put({
          id: vaultId,
          encryptedVerifier,
          createdAt: Date.now(),
        });

        saveAuthForNavigation(seed, vaultId, newMnemonic);
        setIsReady(true);
      } catch (err) {
        console.error("Failed to create vault:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    setup();
  }, []);

  function handleContinue() {
    const noteId = crypto.randomUUID();
    window.location.href = ROUTES.NOTE(noteId);
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
        {isReady ? "Start writing" : "Setting up..."}
      </Button>
    </div>
  );
});
