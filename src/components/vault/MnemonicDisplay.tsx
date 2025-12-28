interface MnemonicDisplayProps {
  mnemonic: string;
}

export function MnemonicDisplay({ mnemonic }: MnemonicDisplayProps) {
  return (
    <div className="py-4">
      <p className="mb-2 text-[#888]">Your recovery phrase:</p>
      <p className="leading-relaxed">{mnemonic}</p>
    </div>
  );
}
