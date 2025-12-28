import { ArrowLeft, Menu, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AUTOSAVE_DELAY_MS } from "../../lib/constants";
import { decryptNoteData, encryptNoteData } from "../../lib/crypto";
import { db } from "../../lib/db";
import { getEncryptionKey } from "../../lib/store";
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
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef<string>("");

  const loadNote = useCallback(async () => {
    setIsLoading(true);
    try {
      const key = getEncryptionKey();
      if (!key) {
        window.location.href = "/signin";
        return;
      }

      const note = await db.notes.get(noteId);
      if (!note) {
        onNavigate?.("/notes");
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
  }, [noteId, onNavigate]);

  useEffect(() => {
    loadNote();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [loadNote]);

  const saveNote = useCallback(
    async (newContent: string) => {
      if (newContent === lastSavedContentRef.current) {
        return;
      }

      const key = getEncryptionKey();
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
    [noteId]
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
      onNavigate?.("/notes");
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  function handleBack() {
    if (content !== lastSavedContentRef.current) {
      saveNote(content);
    }
    onNavigate?.("/notes");
  }

  if (isLoading) {
    return <p className="text-secondary">Loading...</p>;
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-1 flex-col">
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
