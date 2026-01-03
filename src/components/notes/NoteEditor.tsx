import { ArrowLeft, Menu, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingMessage } from "@/components/ui/loading-message";
import { MarkdownEditor } from "@/components/notes/MarkdownEditor";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AUTOSAVE_DELAY_MS, ROUTES } from "@/lib/constants";
import { decryptNoteData, encryptNoteData } from "@/lib/crypto";
import { db } from "@/lib/db";
import { extractTitle } from "@/lib/utils";

interface NoteEditorProps {
  noteId: string;
  onNavigate?: (path: string) => void;
}

export const NoteEditor = memo(function NoteEditor({
  noteId,
  onNavigate,
}: NoteEditorProps) {
  const { isLoading: isAuthLoading, key, vaultId } = useRequireAuth();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const isNewNoteRef = useRef(false);

  const loadNote = useCallback(async () => {
    if (!key) {
      return;
    }

    setIsLoading(true);
    try {
      const note = await db.notes.get(noteId);
      if (note) {
        // Existing note
        isNewNoteRef.current = false;
        const noteData = await decryptNoteData(
          note.encryptedData,
          note.iv,
          key
        );
        setContent(noteData.content);
        lastSavedContentRef.current = noteData.content;
      } else {
        // New note - not yet persisted
        isNewNoteRef.current = true;
        setContent("");
        lastSavedContentRef.current = "";
      }
    } catch (err) {
      console.error("Failed to load note:", err);
    } finally {
      setIsLoading(false);
    }
  }, [noteId, key]);

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

      if (!(key && vaultId)) {
        return;
      }

      try {
        const title = extractTitle(newContent);

        const { encryptedData, iv } = await encryptNoteData(
          { title, content: newContent },
          key
        );

        if (isNewNoteRef.current) {
          // First save - create note
          const now = Date.now();
          await db.notes.add({
            id: noteId,
            vaultId,
            encryptedData,
            iv,
            createdAt: now,
            updatedAt: now,
          });
          isNewNoteRef.current = false;
        } else {
          // Update existing note
          await db.notes.update(noteId, {
            encryptedData,
            iv,
            updatedAt: Date.now(),
          });
        }

        lastSavedContentRef.current = newContent;
      } catch (err) {
        console.error("Failed to save note:", err);
      }
    },
    [noteId, key, vaultId]
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
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const hasContent = content.trim().length > 0;

    if (isNewNoteRef.current && !hasContent) {
      // New note with no content - discard
      onNavigate?.(ROUTES.NOTES);
      return;
    }

    if (content !== lastSavedContentRef.current) {
      saveNote(content);
    }

    onNavigate?.(ROUTES.NOTES);
  }

  if (isLoading) {
    return <LoadingMessage message="Loading..." />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <MarkdownEditor
        content={content}
        onChange={handleContentChange}
        placeholder="Start writing..."
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
