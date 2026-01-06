import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MnemonicDisplayProps {
  mnemonic: string;
}

export function MnemonicDisplay({ mnemonic }: MnemonicDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <div className="border border-border bg-muted/30 px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          Your recovery phrase
        </p>
        <Button
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={handleCopy}
          size="sm"
          variant="ghost"
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </Button>
      </div>
      <p className="font-mono text-foreground text-sm leading-relaxed">
        {mnemonic}
      </p>
    </div>
  );
}
