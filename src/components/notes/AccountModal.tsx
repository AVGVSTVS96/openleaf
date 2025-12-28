import { memo } from "react";

interface AccountModalProps {
  onClose: () => void;
  onSignOut: () => void;
}

export const AccountModal = memo(function AccountModal({
  onClose,
  onSignOut,
}: AccountModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="relative w-full max-w-md bg-background p-6 shadow-lg">
        <button
          className="absolute top-4 right-4 text-secondary hover:text-primary"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>

        <h2 className="md-h2 mb-2 font-bold text-lg">Account</h2>
        <p className="mb-4 text-secondary">Manage your vault access.</p>

        <h3 className="md-h3 mb-2 font-bold text-sm uppercase">Vault Key</h3>
        <p className="mb-4 text-secondary text-sm">
          Your vault key is only stored in memory and will be cleared when you
          close the tab.
        </p>

        <button
          className="w-full bg-button px-6 py-2 transition-colors hover:bg-button-hover"
          onClick={onSignOut}
          type="button"
        >
          Sign out
        </button>
      </div>
    </div>
  );
});
