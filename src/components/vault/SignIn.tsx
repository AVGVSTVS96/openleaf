import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES, SESSION_KEY } from "@/lib/constants";
import { validateMnemonic } from "@/lib/mnemonic";

export const SignIn = memo(function SignIn() {
  const [mnemonic, setMnemonic] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    const trimmedMnemonic = mnemonic.trim().toLowerCase();

    setIsSigningIn(true);
    setError("");

    // Validate mnemonic (fast - just word list check)
    const isValid = await validateMnemonic(trimmedMnemonic);
    if (!isValid) {
      setError("Invalid recovery phrase. Please check and try again.");
      setIsSigningIn(false);
      return;
    }

    // Save mnemonic and navigate immediately
    // Key derivation + vault verification happens in restoreAuthFromNavigation()
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ mnemonic: trimmedMnemonic }));
    window.location.href = ROUTES.NOTES;
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
