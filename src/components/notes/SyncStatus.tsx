import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { memo } from "react";
import { useConvexConnectionState } from "convex/react";

export const SyncStatus = memo(function SyncStatus() {
  const connectionState = useConvexConnectionState();

  const isSynced =
    connectionState.isWebSocketConnected && !connectionState.hasInflightRequests;
  const isSyncing =
    connectionState.hasInflightRequests ||
    (!connectionState.isWebSocketConnected && !connectionState.hasEverConnected);
  const isOffline =
    !connectionState.isWebSocketConnected && connectionState.hasEverConnected;

  const iconConfig = isSynced
    ? { icon: Cloud, className: "text-green-600", title: "Synced" }
    : isSyncing
      ? { icon: Loader2, className: "animate-spin text-blue-500", title: "Syncing..." }
      : isOffline
        ? { icon: CloudOff, className: "text-muted-foreground", title: "Offline" }
        : { icon: Loader2, className: "animate-spin text-blue-500", title: "Connecting..." };

  const Icon = iconConfig.icon;

  return (
    <div className="flex h-8 w-8 items-center justify-center" title={iconConfig.title}>
      <Icon className={iconConfig.className} size={16} />
    </div>
  );
});
