import { User } from "lucide-react";
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

  return (
    <div className="flex-1 flex flex-col gap-6">
      <Input
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search notes..."
        type="text"
        value={searchQuery}
      />

      <div className="flex-1 space-y-1">
        {filteredNotes.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">
            {searchQuery ? "No notes found." : "No notes yet. Create one to get started."}
          </p>
        ) : (
          filteredNotes.map((note) => (
            <button
              className="w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-accent truncate"
              key={note.id}
              onClick={() => onNavigate?.(ROUTES.NOTE(note.id))}
            >
              {note.title || "Untitled"}
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button className="flex-1" onClick={handleCreateNote}>
          Create note
        </Button>

        <Button
          className="rounded-full"
          onClick={() => setShowAccount(!showAccount)}
          size="icon"
          variant="outline"
        >
          <User size={18} />
        </Button>
      </div>

      <AccountModal
        onOpenChange={setShowAccount}
        onSignOut={handleSignOut}
        open={showAccount}
      />
    </div>
  );
});
