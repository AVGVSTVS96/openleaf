import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { convex } from "@/components/providers/ConvexClientProvider";
import { getCurrentVaultId, isAuthenticated, onAuthReady } from "@/lib/store";
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
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(!convex);
  const [isFreshVault, setIsFreshVault] = useState(false);
  const [authReady, setAuthReady] = useState(isAuthenticated());

  // Check if sync is enabled (Convex client configured)
  const isEnabled = !!convex;

  // Subscribe to auth ready event (no polling needed)
  useEffect(() => {
    if (authReady) return;

    const unsubscribe = onAuthReady(() => {
      setAuthReady(true);
    });

    return unsubscribe;
  }, [authReady]);

  useEffect(() => {
    if (!convex || !authReady) {
      return;
    }

    const vaultId = getCurrentVaultId();
    if (!vaultId) return;

    let mounted = true;

    // Create sync engine
    console.log("[Sync] Creating SyncEngine for vault:", vaultId);
    const syncEngine = new SyncEngine(convex, vaultId);
    setEngine(syncEngine);

    // Subscribe to status changes
    const unsubscribe = syncEngine.onStatusChange((newStatus) => {
      if (!mounted) return;
      console.log("[Sync] Status changed:", newStatus);
      setStatus(newStatus);
      if (newStatus === "synced") {
        setIsInitialSyncComplete(true);
      }
    });

    // Perform initial sync
    console.log("[Sync] Starting initial sync...");
    syncEngine.initialSync()
      .then((result) => {
        if (!mounted) return;
        setIsInitialSyncComplete(true);
        if (result.isFreshVault) {
          console.log("[Sync] Fresh vault detected");
          setIsFreshVault(true);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("[Sync] Initial sync failed:", err);
        setIsInitialSyncComplete(true); // Don't block UI on sync failure
      });

    return () => {
      mounted = false;
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
