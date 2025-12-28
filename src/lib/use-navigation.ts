import { useCallback } from "react";

type View = { type: "list" } | { type: "edit"; noteId: string };

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
    const match = path.match(/^\/notes\/([^/]+)$/);
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
