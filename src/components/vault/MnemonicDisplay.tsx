interface MnemonicDisplayProps {
  mnemonic: string;
}

export function MnemonicDisplay({ mnemonic }: MnemonicDisplayProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Recovery phrase</p>
      <p className="leading-relaxed text-sm font-medium">{mnemonic}</p>
    </div>
  );
}
