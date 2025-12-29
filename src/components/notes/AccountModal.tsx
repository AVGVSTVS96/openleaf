import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
              Vault Key
            </h3>
            <p className="text-muted-foreground text-sm">
              Your vault key is only stored in memory and will be cleared when
              you close the tab.
            </p>
          </div>

          <Button className="w-full" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
