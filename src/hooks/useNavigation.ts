import { useCallback } from "react";
import { ROUTES } from "../lib/constants";
import type { View } from "../lib/types";

const NOTES_PREFIX = `${ROUTES.NOTES}/`;

function getViewUrl(view: View): string {
  return view.type === "list" ? ROUTES.NOTES : ROUTES.NOTE(view.noteId);
}

export function useNavigation() {
  const navigate = useCallback((view: View) => {
    try {
      window.history.pushState({}, "", getViewUrl(view));
    } catch (error) {
      console.error("Navigation error:", error);
      window.location.href = getViewUrl(view);
    }
  }, []);

  const getCurrentView = useCallback((): View => {
    const path = window.location.pathname;
    if (path.startsWith(NOTES_PREFIX)) {
      return { type: "edit", noteId: path.slice(NOTES_PREFIX.length) };
    }
    return { type: "list" };
  }, []);

  const handlePopState = useCallback(
    (callback: (view: View) => void) => {
      const handler = () => callback(getCurrentView());
      window.addEventListener("popstate", handler);
      return () => window.removeEventListener("popstate", handler);
    },
    [getCurrentView]
  );

  return {
    navigate,
    getCurrentView,
    handlePopState,
  };
}
