import { memo, useEffect, useState } from "react";
import { LoadingMessage } from "@/components/ui/loading-message";
import { useNavigation } from "@/hooks/useNavigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ROUTES } from "@/lib/constants";
import type { View } from "@/lib/types";
import { NoteEditor } from "./NoteEditor";
import { NoteList } from "./NoteList";

function parsePathToView(path: string): View {
  if (path === ROUTES.NOTES) {
    return { type: "list" };
  }
  if (path.startsWith(`${ROUTES.NOTES}/`)) {
    const noteId = path.replace(`${ROUTES.NOTES}/`, "");
    return { type: "edit", noteId };
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
