import { FileText, User } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingMessage } from "@/components/ui/loading-message";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ROUTES } from "@/lib/constants";
import { decryptNoteData } from "@/lib/crypto";
import { db } from "@/lib/db";
import { clearEncryptionKey } from "@/lib/store";
import type { DecryptedNote } from "@/lib/types";
import { extractTitle } from "@/lib/utils";
import { AccountModal } from "./AccountModal";

interface NoteListProps {
  onNavigate?: (path: string) => void;
}

export const NoteList = memo(function NoteList({ onNavigate }: NoteListProps) {
  const { isLoading: isAuthLoading, key, vaultId } = useRequireAuth();
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAccount, setShowAccount] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!(key && vaultId)) {
      return;
    }

    setIsLoading(true);
    try {
      const encryptedNotes = await db.notes
        .where("vaultId")
        .equals(vaultId)
        .reverse()
        .sortBy("updatedAt");
      const decryptedNotes: DecryptedNote[] = [];

      for (const note of encryptedNotes) {
        try {
          const noteData = await decryptNoteData(
            note.encryptedData,
            note.iv,
            key
          );
          decryptedNotes.push({
            id: note.id,
            title: noteData.title || extractTitle(noteData.content),
            content: noteData.content,
            updatedAt: note.updatedAt,
          });
        } catch (err) {
          console.error("Failed to decrypt note:", note.id, err);
        }
      }

      setNotes(decryptedNotes);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [key, vaultId]);

  useEffect(() => {
    if (!isAuthLoading && key && vaultId) {
      loadNotes();
    }
  }, [isAuthLoading, key, vaultId, loadNotes]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return notes;
    }
    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  function handleCreateNote() {
    const id = crypto.randomUUID();
    onNavigate?.(ROUTES.NOTE(id));
  }

  function handleSignOut() {
    clearEncryptionKey();
    window.location.href = ROUTES.HOME;
  }

  if (isLoading) {
    return <LoadingMessage message="Loading..." />;
  }

  const hasNotes = notes.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-bold text-2xl tracking-tight">
          <span className="font-normal text-muted-foreground">#</span> Notes
        </h1>
        <Button
          onClick={() => setShowAccount(!showAccount)}
          size="icon"
          variant="outline"
        >
          <User size={16} />
        </Button>
      </header>

      {hasNotes && (
        <Input
          className="text-sm"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          type="text"
          value={searchQuery}
        />
      )}

      <div className="flex-1 space-y-1">
        {filteredNotes.length > 0 &&
          filteredNotes.map((note) => (
            <button
              className="w-full border-border border-b px-3 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-muted"
              key={note.id}
              onClick={() => onNavigate?.(ROUTES.NOTE(note.id))}
              type="button"
            >
              {note.title || "Untitled"}
            </button>
          ))}

        {filteredNotes.length === 0 && hasNotes && (
          <p className="py-4 text-muted-foreground text-sm">No notes found.</p>
        )}

        {filteredNotes.length === 0 && !hasNotes && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <FileText className="text-muted-foreground" size={32} />
            </div>
            <p className="mb-2 font-medium text-foreground">No notes yet</p>
            <p className="mb-6 text-muted-foreground text-sm">
              Create your first note to get started
            </p>
            <Button
              className="h-10 px-6 font-semibold text-sm"
              onClick={handleCreateNote}
            >
              Create new note
            </Button>
          </div>
        )}
      </div>

      {hasNotes && (
        <div className="mt-auto pt-8">
          <Button
            className="h-10 px-6 font-semibold text-sm"
            onClick={handleCreateNote}
          >
            Create new note
          </Button>
        </div>
      )}

      <AccountModal
        onOpenChange={setShowAccount}
        onSignOut={handleSignOut}
        open={showAccount}
      />
    </div>
  );
});
