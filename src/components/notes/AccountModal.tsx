import { Moon, Sun } from "lucide-react";
import { memo, useState } from "react";
import { MnemonicDisplay } from "@/components/vault/MnemonicDisplay";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMnemonic } from "@/lib/store";

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
}

export const AccountModal = memo(function AccountModal({
  open,
  onOpenChange,
  onSignOut,
}: AccountModalProps) {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  function toggleTheme() {
    const newIsDark = !isDark;
    document.documentElement.classList.toggle("dark", newIsDark);
    document.documentElement.style.colorScheme = newIsDark ? "dark" : "light";
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
    setIsDark(newIsDark);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="md-h2 text-lg">Account</DialogTitle>
          <DialogDescription>Manage your vault access.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="md-h3 mb-2 font-bold text-sm uppercase">
              Appearance
            </h3>
            <Button
              className="w-full justify-start gap-2"
              onClick={toggleTheme}
              variant="outline"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {isDark ? "Switch to light mode" : "Switch to dark mode"}
            </Button>
          </div>

          <div>
            <h3 className="md-h3 mb-2 font-bold text-sm uppercase">
              Vault Key
            </h3>
            <p className="text-muted-foreground mb-3 text-sm">
              Your vault key is only stored in memory and will be cleared when
              you close the tab.
            </p>
            {getMnemonic() && <MnemonicDisplay compact mnemonic={getMnemonic()!} />}
          </div>

          <Button className="w-full" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
