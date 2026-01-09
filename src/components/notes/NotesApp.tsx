import { memo, useEffect, useState } from "react";
import { LoadingMessage } from "@/components/ui/loading-message";
import { useNavigation } from "@/hooks/useNavigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ROUTES } from "@/lib/constants";
import type { View } from "@/lib/types";
import { NoteEditor } from "./NoteEditor";
import { NoteList } from "./NoteList";

const NOTES_PREFIX = `${ROUTES.NOTES}/`;

function parsePathToView(path: string): View {
  if (path.startsWith(NOTES_PREFIX)) {
    return { type: "edit", noteId: path.slice(NOTES_PREFIX.length) };
  }
  return { type: "list" };
}

export const NotesApp = memo(function NotesApp() {
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
    return <LoadingMessage message="Loading..." />;
  }

  if (view.type === "edit") {
    return (
      <NoteEditor
        noteId={view.noteId}
        onNavigate={(path) => {
          handleNavigate(parsePathToView(path));
        }}
      />
    );
  }

  return (
    <NoteList
      onNavigate={(path) => {
        handleNavigate(parsePathToView(path));
      }}
    />
  );
});
