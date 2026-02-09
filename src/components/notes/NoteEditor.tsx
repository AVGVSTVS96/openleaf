import { Menu, Moon, Sun, Trash2, User } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AccountModal } from "@/components/notes/AccountModal";
import { MarkdownEditor } from "@/components/notes/MarkdownEditor";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingMessage } from "@/components/ui/loading-message";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useDeleteNote, useNoteById, useUpsertNote } from "@/lib/convex/notes";
import { AUTOSAVE_DELAY_MS, ROUTES } from "@/lib/constants";
import { decryptNoteData, encryptNoteData } from "@/lib/crypto";
import { clearEncryptionKey } from "@/lib/store";
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
  const encryptedNote = useNoteById(vaultId, noteId);
  const upsertNote = useUpsertNote();
  const deleteNote = useDeleteNote();

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const isNewNoteRef = useRef(false);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    initialLoadRef.current = true;
    setIsLoading(true);
  }, [noteId]);

  useEffect(() => {
    if (isAuthLoading || !key || encryptedNote === undefined) {
      return;
    }

    let isCancelled = false;
    if (initialLoadRef.current) {
      setIsLoading(true);
    }

    const load = async () => {
      try {
        if (!encryptedNote) {
          if (isCancelled) {
            return;
          }
          isNewNoteRef.current = true;
          setContent("");
          lastSavedContentRef.current = "";
          setIsLoading(false);
          return;
        }

        const noteData = await decryptNoteData(
          encryptedNote.encryptedData,
          encryptedNote.iv,
          key
        );

        if (isCancelled) {
          return;
        }

        isNewNoteRef.current = false;
        setContent(noteData.content);
        lastSavedContentRef.current = noteData.content;
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load note:", err);
        }
      } finally {
        if (!isCancelled) {
          initialLoadRef.current = false;
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [encryptedNote, isAuthLoading, key]);

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

        await upsertNote({
          vaultId,
          noteId,
          encryptedData,
          iv,
        });

        isNewNoteRef.current = false;
        lastSavedContentRef.current = newContent;
      } catch (err) {
        console.error("Failed to save note:", err);
      }
    },
    [key, noteId, upsertNote, vaultId]
  );

  function toggleTheme() {
    const newIsDark = !isDark;
    document.documentElement.classList.toggle("dark", newIsDark);
    document.documentElement.style.colorScheme = newIsDark ? "dark" : "light";
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
    setIsDark(newIsDark);
  }

  function handleSignOut() {
    clearEncryptionKey();
    window.location.href = ROUTES.HOME;
  }

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
      if (vaultId) {
        await deleteNote({
          vaultId,
          noteId,
        });
      }
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
      onNavigate?.(ROUTES.NOTES);
      return;
    }

    if (content !== lastSavedContentRef.current) {
      void saveNote(content);
    }

    onNavigate?.(ROUTES.NOTES);
  }

  if (isLoading) {
    return <LoadingMessage message="Loading..." />;
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <button
          className="inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
          onClick={handleBack}
          type="button"
        >
          <span className="text-xs">←</span> Back
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button className="h-8 w-8" size="icon" variant="ghost" />}
          >
            <Menu size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowAccount(true)}>
              <User size={16} />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {isDark ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
            >
              <Trash2 size={16} />
              Delete note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <MarkdownEditor
        content={content}
        onChange={handleContentChange}
        placeholder="Start writing..."
      />

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This note will be permanently deleted.
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

      <AccountModal
        onOpenChange={setShowAccount}
        onSignOut={handleSignOut}
        open={showAccount}
      />
    </div>
  );
});
