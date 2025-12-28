import { User } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { decryptNoteData, encryptNoteData } from "../../lib/crypto";
import { db } from "../../lib/db";
import {
  clearEncryptionKey,
  getCurrentVaultId,
  getEncryptionKey,
} from "../../lib/store";
import type { DecryptedNote } from "../../lib/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AccountModal } from "./AccountModal";

interface NoteListProps {
  onNavigate?: (path: string) => void;
}

export const NoteList = memo(function NoteList({ onNavigate }: NoteListProps) {
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAccount, setShowAccount] = useState(false);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const key = getEncryptionKey();
      const vaultId = getCurrentVaultId();
      if (!(key && vaultId)) {
        window.location.href = "/signin";
        return;
      }

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
            title:
              noteData.title || noteData.content.split("\n")[0] || "Untitled",
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
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

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

  async function handleCreateNote() {
    const key = getEncryptionKey();
    const vaultId = getCurrentVaultId();
    if (!(key && vaultId)) {
      window.location.href = "/signin";
      return;
    }

    try {
      const id = crypto.randomUUID();
      const now = Date.now();
      const { encryptedData, iv } = await encryptNoteData(
        { title: "", content: "" },
        key
      );

      await db.notes.add({
        id,
        vaultId,
        encryptedData,
        iv,
        createdAt: now,
        updatedAt: now,
      });

      onNavigate?.(`/notes/${id}`);
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  }

  function handleSignOut() {
    clearEncryptionKey();
    window.location.href = "/";
  }

  if (isLoading) {
    return <p className="text-secondary">Loading...</p>;
  }

  return (
    <div className="flex-1 space-y-6">
      <Input
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search notes"
        type="text"
        value={searchQuery}
      />

      <div className="space-y-2">
        {filteredNotes.length === 0 ? (
          <p className="text-secondary">
            {searchQuery ? "No notes found." : "No notes yet."}
          </p>
        ) : (
          filteredNotes.map((note) => (
            <button
              className="block w-full text-left hover:underline"
              key={note.id}
              onClick={() => onNavigate?.(`/notes/${note.id}`)}
              type="button"
            >
              {note.title || "Untitled"}
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button onClick={handleCreateNote}>Create note</Button>

        <Button
          className="rounded-full"
          onClick={() => setShowAccount(!showAccount)}
          size="icon"
          variant="outline"
        >
          <User size={20} />
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
