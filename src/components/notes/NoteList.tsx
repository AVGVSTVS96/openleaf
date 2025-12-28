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

interface NoteListProps {
  onNavigate?: (path: string) => void;
}

export const NoteList = memo(function NoteList({ onNavigate }: NoteListProps) {
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  async function loadNotes() {
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
  }

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
      <input
        className="w-full border border-secondary bg-transparent p-3 focus:border-primary focus:outline-none"
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
            >
              {note.title || "Untitled"}
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button
          className="bg-button px-6 py-2 transition-colors hover:bg-button-hover"
          onClick={handleCreateNote}
        >
          Create note
        </button>

        <button
          className="rounded-full border border-secondary p-2 transition-colors hover:border-primary"
          onClick={() => setShowAccount(!showAccount)}
        >
          <User size={20} />
        </button>
      </div>

      {showAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="relative w-full max-w-md bg-background p-6 shadow-lg">
            <button
              className="absolute top-4 right-4 text-secondary hover:text-primary"
              onClick={() => setShowAccount(false)}
            >
              ✕
            </button>

            <h2 className="md-h2 mb-2 font-bold text-lg">Account</h2>
            <p className="mb-4 text-secondary">Manage your vault access.</p>

            <h3 className="md-h3 mb-2 font-bold text-sm uppercase">
              Vault Key
            </h3>
            <p className="mb-4 text-secondary text-sm">
              Your vault key is only stored in memory and will be cleared when
              you close the tab.
            </p>

            <button
              className="w-full bg-button px-6 py-2 transition-colors hover:bg-button-hover"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
