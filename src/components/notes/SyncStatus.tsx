import { AlertCircle, Cloud, CloudOff, Loader2 } from "lucide-react";
import { memo } from "react";
import { useSync } from "@/components/providers/SyncProvider";

export const SyncStatus = memo(function SyncStatus() {
  const { status, isEnabled } = useSync();

  // Don't show anything if sync is not enabled
  if (!isEnabled) {
    return null;
  }

  const config = {
    synced: {
      icon: Cloud,
      className: "text-green-600",
    },
    syncing: {
      icon: Loader2,
      className: "text-blue-500 animate-spin",
    },
    offline: {
      icon: CloudOff,
      className: "text-muted-foreground",
    },
    error: {
      icon: AlertCircle,
      className: "text-destructive",
    },
  };

  const { icon: Icon, className } = config[status];

  return (
    <div
      className="flex h-8 w-8 items-center justify-center"
      title={
        status === "synced"
          ? "Synced"
          : status === "syncing"
            ? "Syncing..."
            : status === "offline"
              ? "Offline"
              : "Sync error"
      }
    >
      <Icon className={className} size={16} />
    </div>
  );
});
