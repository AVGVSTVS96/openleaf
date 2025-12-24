interface MnemonicDisplayProps {
  mnemonic: string;
}

export function MnemonicDisplay({ mnemonic }: MnemonicDisplayProps) {
  const words = mnemonic.split(' ');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="grid grid-cols-3 gap-3">
        {words.map((word, index) => (
          <div
            key={index}
            className="flex items-center gap-2 font-mono text-sm"
          >
            <span className="text-[#6B7280] w-5 text-right">{index + 1}.</span>
            <span className="font-medium">{word}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
