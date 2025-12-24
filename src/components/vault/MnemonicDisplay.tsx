interface MnemonicDisplayProps {
  mnemonic: string;
}

export function MnemonicDisplay({ mnemonic }: MnemonicDisplayProps) {
  return (
    <div className="py-4">
      <p className="text-[#888] mb-2">Your recovery phrase:</p>
      <p className="leading-relaxed">{mnemonic}</p>
    </div>
  );
}
