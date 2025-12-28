import { useEffect, useState } from "react";
import { ROUTES } from "../lib/constants";
import {
  getCurrentVaultId,
  getEncryptionKey,
  isAuthenticated,
  restoreAuthFromNavigation,
} from "../lib/store";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  key: CryptoKey | null;
  vaultId: string | null;
}

/**
 * Hook that requires authentication and redirects to sign in if not authenticated.
 * Returns auth state including the encryption key and vault ID.
 */
export function useRequireAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    key: null,
    vaultId: null,
  });

  useEffect(() => {
    async function checkAuth() {
      // Try to restore auth from sessionStorage (after page navigation)
      if (!isAuthenticated()) {
        await restoreAuthFromNavigation();
      }

      // If still not authenticated, redirect to sign in
      if (!isAuthenticated()) {
        window.location.href = ROUTES.SIGNIN;
        return;
      }

      const key = getEncryptionKey();
      const vaultId = getCurrentVaultId();

      if (!(key && vaultId)) {
        window.location.href = ROUTES.SIGNIN;
        return;
      }

      setState({
        isLoading: false,
        isAuthenticated: true,
        key,
        vaultId,
      });
    }

    checkAuth();
  }, []);

  return state;
}
