import { ArrowLeft, Menu, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { AUTOSAVE_DELAY_MS, ROUTES } from "../../lib/constants";
import { decryptNoteData, encryptNoteData } from "../../lib/crypto";
import { db } from "../../lib/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

// Regex for extracting title from markdown heading
const TITLE_REGEX = /^#\s*/;

interface NoteEditorProps {
  noteId: string;
  onNavigate?: (path: string) => void;
}

export const NoteEditor = memo(function NoteEditor({
  noteId,
  onNavigate,
}: NoteEditorProps) {
  const { isLoading: isAuthLoading, key } = useRequireAuth();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef<string>("");

  const loadNote = useCallback(async () => {
    if (!key) {
      return;
    }

    setIsLoading(true);
    try {
      const note = await db.notes.get(noteId);
      if (!note) {
        onNavigate?.(ROUTES.NOTES);
        return;
      }

      const noteData = await decryptNoteData(note.encryptedData, note.iv, key);
      setContent(noteData.content);
      lastSavedContentRef.current = noteData.content;
    } catch (err) {
      console.error("Failed to load note:", err);
    } finally {
      setIsLoading(false);
    }
  }, [noteId, onNavigate, key]);

  useEffect(() => {
    if (!isAuthLoading && key) {
      loadNote();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isAuthLoading, key, loadNote]);

  const saveNote = useCallback(
    async (newContent: string) => {
      if (newContent === lastSavedContentRef.current) {
        return;
      }

      if (!key) {
        return;
      }

      try {
        const lines = newContent.split("\n");
        const title = lines[0]?.replace(TITLE_REGEX, "").trim() || "";

        const { encryptedData, iv } = await encryptNoteData(
          { title, content: newContent },
          key
        );

        await db.notes.update(noteId, {
          encryptedData,
          iv,
          updatedAt: Date.now(),
        });

        lastSavedContentRef.current = newContent;
      } catch (err) {
        console.error("Failed to save note:", err);
      }
    },
    [noteId, key]
  );

  function handleContentChange(newContent: string) {
    setContent(newContent);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveNote(newContent);
    }, AUTOSAVE_DELAY_MS);
  }

  async function handleDelete() {
    try {
      await db.notes.delete(noteId);
      onNavigate?.(ROUTES.NOTES);
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  function handleBack() {
    if (content !== lastSavedContentRef.current) {
      saveNote(content);
    }
    onNavigate?.(ROUTES.NOTES);
  }

  if (isLoading) {
    return <p className="flex-1 text-secondary">Loading...</p>;
  }

  return (
    <div className="flex flex-1 flex-col">
      <textarea
        autoFocus
        className="w-full flex-1 resize-none bg-transparent focus:outline-none"
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Start writing..."
        value={content}
      />

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon" variant="outline" />}
          >
            <Menu size={20} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top">
            <DropdownMenuItem onClick={handleBack}>
              <ArrowLeft size={16} />
              Back to notes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
            >
              <Trash2 size={16} />
              Delete note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This note will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
