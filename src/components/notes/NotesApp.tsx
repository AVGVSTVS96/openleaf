import { useEffect, useState } from "react";
import { useNavigation } from "../../hooks/useNavigation";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { ROUTES } from "../../lib/constants";
import type { View } from "../../lib/types";
import { NoteEditor } from "./NoteEditor";
import { NoteList } from "./NoteList";

export function NotesApp() {
  const { isLoading: isAuthLoading } = useRequireAuth();
  const [view, setView] = useState<View>({ type: "list" });
  const { navigate, getCurrentView, handlePopState } = useNavigation();

  useEffect(() => {
    if (!isAuthLoading) {
      setView(getCurrentView());
    }

    // Handle browser back/forward
    return handlePopState(setView);
  }, [isAuthLoading, getCurrentView, handlePopState]);

  const handleNavigate = (newView: View) => {
    navigate(newView);
    setView(newView);
  };

  if (isAuthLoading) {
    return <p className="flex-1 text-secondary">Loading...</p>;
  }

  if (view.type === "edit") {
    return (
      <NoteEditor
        noteId={view.noteId}
        onNavigate={(path) => {
          if (path === ROUTES.NOTES) {
            handleNavigate({ type: "list" });
          } else if (path.startsWith(`${ROUTES.NOTES}/`)) {
            handleNavigate({
              type: "edit",
              noteId: path.replace(`${ROUTES.NOTES}/`, ""),
            });
          }
        }}
      />
    );
  }

  return (
    <NoteList
      onNavigate={(path) => {
        if (path.startsWith(`${ROUTES.NOTES}/`)) {
          handleNavigate({
            type: "edit",
            noteId: path.replace(`${ROUTES.NOTES}/`, ""),
          });
        }
      }}
    />
  );
}
