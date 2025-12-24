import { LogOut } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { clearEncryptionKey } from '../../lib/store';

interface TopBarProps {
  showLogout?: boolean;
}

export function TopBar({ showLogout = false }: TopBarProps) {
  function handleLogout() {
    clearEncryptionKey();
    window.location.href = '/';
  }

  return (
    <header className="border-b border-gray-200 bg-[#FAFAFA]">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <a href="/" className="hover:opacity-80 transition-opacity">
          <Logo size="sm" />
        </a>

        {showLogout && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#6B7280] hover:text-black transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign out</span>
          </button>
        )}
      </div>
    </header>
  );
}
