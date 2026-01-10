import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { convex } from "@/components/providers/ConvexClientProvider";
import { getCurrentVaultId, isAuthenticated } from "@/lib/store";
import { SyncEngine } from "@/lib/sync/engine";
import type { GlobalSyncStatus } from "@/lib/types";

interface SyncContextValue {
  engine: SyncEngine | null;
  status: GlobalSyncStatus;
  isEnabled: boolean;
  isInitialSyncComplete: boolean;
  isFreshVault: boolean;
}

const SyncContext = createContext<SyncContextValue>({
  engine: null,
  status: "offline",
  isEnabled: false,
  isInitialSyncComplete: false,
  isFreshVault: false,
});

interface Props {
  children: ReactNode;
}

export function SyncProvider({ children }: Props) {
  const [engine, setEngine] = useState<SyncEngine | null>(null);
  const [status, setStatus] = useState<GlobalSyncStatus>("offline");
  const [authReady, setAuthReady] = useState(false);
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(!convex);
  const [isFreshVault, setIsFreshVault] = useState(false);

  // Check if sync is enabled (Convex client configured)
  const isEnabled = !!convex;

  // Poll for auth state to be ready (workaround for timing issue)
  useEffect(() => {
    if (authReady) return;

    const checkAuth = () => {
      if (isAuthenticated() && getCurrentVaultId()) {
        console.log("[Sync] Auth ready!");
        setAuthReady(true);
      }
    };

    // Check immediately
    checkAuth();

    // Poll every 100ms for up to 5 seconds
    const interval = setInterval(checkAuth, 100);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !convex) {
      return;
    }

    const vaultId = getCurrentVaultId();
    if (!vaultId) return;

    // Create sync engine
    console.log("[Sync] Creating SyncEngine for vault:", vaultId);
    const syncEngine = new SyncEngine(convex, vaultId);
    setEngine(syncEngine);

    // Subscribe to status changes
    const unsubscribe = syncEngine.onStatusChange((newStatus) => {
      console.log("[Sync] Status changed:", newStatus);
      setStatus(newStatus);
      if (newStatus === "synced") {
        setIsInitialSyncComplete(true);
      }
    });

    // Perform initial sync
    console.log("[Sync] Starting initial sync...");
    syncEngine.initialSync().then((result) => {
      setIsInitialSyncComplete(true);
      if (result.isFreshVault) {
        console.log("[Sync] Fresh vault detected");
        setIsFreshVault(true);
      }
    });

    return () => {
      unsubscribe();
      syncEngine.destroy();
    };
  }, [authReady]);

  const value = useMemo(
    () => ({ engine, status, isEnabled, isInitialSyncComplete, isFreshVault }),
    [engine, status, isEnabled, isInitialSyncComplete, isFreshVault]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  return useContext(SyncContext);
}
