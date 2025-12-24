import { Leaf } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-xl' },
    md: { icon: 32, text: 'text-2xl' },
    lg: { icon: 48, text: 'text-4xl' }
  };

  return (
    <div className="flex items-center gap-2">
      <Leaf
        size={sizes[size].icon}
        className="text-[#22C55E]"
        strokeWidth={2.5}
      />
      {showText && (
        <span className={`font-bold ${sizes[size].text}`}>
          OpenLeaf
        </span>
      )}
    </div>
  );
}
