import { useEffect, useState } from "react";
import { isAuthenticated, restoreAuthFromNavigation } from "../../lib/store";
import { useNavigation } from "../../lib/use-navigation";
import { NoteEditor } from "./NoteEditor";
import { NoteList } from "./NoteList";

type View = { type: "list" } | { type: "edit"; noteId: string };

export function NotesApp() {
  const [view, setView] = useState<View>({ type: "list" });
  const [isInitializing, setIsInitializing] = useState(true);
  const { navigate, getCurrentView, handlePopState } = useNavigation();

  useEffect(() => {
    async function initialize() {
      // Try to restore auth from sessionStorage (after page navigation)
      if (!isAuthenticated()) {
        await restoreAuthFromNavigation();
      }

      // If still not authenticated, redirect to sign in
      if (!isAuthenticated()) {
        window.location.href = "/signin";
        return;
      }

      // Handle initial route from URL
      setView(getCurrentView());
      setIsInitializing(false);
    }

    initialize();

    // Handle browser back/forward
    return handlePopState(setView);
  }, [getCurrentView, handlePopState]);

  const handleNavigate = (newView: View) => {
    navigate(newView);
    setView(newView);
  };

  if (isInitializing) {
    return <p className="text-gray-500">Loading...</p>;
  }

  if (view.type === "edit") {
    return (
      <NoteEditor
        noteId={view.noteId}
        onNavigate={(path) => {
          if (path === "/notes") {
            handleNavigate({ type: "list" });
          } else if (path.startsWith("/notes/")) {
            handleNavigate({
              type: "edit",
              noteId: path.replace("/notes/", ""),
            });
          }
        }}
      />
    );
  }

  return (
    <NoteList
      onNavigate={(path) => {
        if (path.startsWith("/notes/")) {
          handleNavigate({ type: "edit", noteId: path.replace("/notes/", "") });
        }
      }}
    />
  );
}
