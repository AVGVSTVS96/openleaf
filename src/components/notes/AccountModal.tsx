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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>Manage your vault access.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Vault Key
            </h3>
            <p className="text-sm">
              Your vault key is only stored in memory and will be cleared when
              you close the tab.
            </p>
          </div>

          <Button className="w-full" onClick={onSignOut} variant="outline">
            Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
