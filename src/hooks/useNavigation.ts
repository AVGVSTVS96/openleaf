import { useCallback } from "react";
import type { View } from "../lib/types";

// Regex for matching note edit routes
const NOTE_ROUTE_REGEX = /^\/notes\/([^/]+)$/;

export function useNavigation() {
  const navigate = useCallback((view: View) => {
    try {
      const url = view.type === "list" ? "/notes" : `/notes/${view.noteId}`;
      window.history.pushState({}, "", url);
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback to direct navigation
      if (view.type === "list") {
        window.location.href = "/notes";
      } else {
        window.location.href = `/notes/${view.noteId}`;
      }
    }
  }, []);

  const getCurrentView = useCallback((): View => {
    const path = window.location.pathname;
    const match = path.match(NOTE_ROUTE_REGEX);
    if (match) {
      return { type: "edit", noteId: match[1] };
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
