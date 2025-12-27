import { useState, useEffect, useMemo } from 'react';
import { User } from 'lucide-react';
import { db } from '../../lib/db';
import { decryptNoteData, encryptNoteData } from '../../lib/crypto';
import { getEncryptionKey, getCurrentVaultId, clearEncryptionKey } from '../../lib/store';

interface DecryptedNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

interface NoteListProps {
  onNavigate?: (path: string) => void;
}

export function NoteList({ onNavigate }: NoteListProps) {
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    setIsLoading(true);
    try {
      const key = getEncryptionKey();
      const vaultId = getCurrentVaultId();
      if (!key || !vaultId) {
        window.location.href = '/signin';
        return;
      }

      const encryptedNotes = await db.notes
        .where('vaultId')
        .equals(vaultId)
        .reverse()
        .sortBy('updatedAt');
      const decryptedNotes: DecryptedNote[] = [];

      for (const note of encryptedNotes) {
        try {
          const noteData = await decryptNoteData(note.encryptedData, note.iv, key);
          decryptedNotes.push({
            id: note.id,
            title: noteData.title || noteData.content.split('\n')[0] || 'Untitled',
            content: noteData.content,
            updatedAt: note.updatedAt
          });
        } catch (err) {
          console.error('Failed to decrypt note:', note.id, err);
        }
      }

      setNotes(decryptedNotes);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
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
    if (!key || !vaultId) {
      window.location.href = '/signin';
      return;
    }

    try {
      const id = crypto.randomUUID();
      const now = Date.now();
      const { encryptedData, iv } = await encryptNoteData({ title: '', content: '' }, key);

      await db.notes.add({
        id,
        vaultId,
        encryptedData,
        iv,
        createdAt: now,
        updatedAt: now
      });

      if (onNavigate) {
        onNavigate(`/notes/${id}`);
      } else {
        window.location.href = `/notes/${id}`;
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  }

  function handleSignOut() {
    clearEncryptionKey();
    window.location.href = '/';
  }

  if (isLoading) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div className="flex-1 space-y-6">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search notes"
        className="w-full p-3 bg-transparent border border-gray-300 focus:outline-none focus:border-gray-500"
      />

      <div className="space-y-2">
        {filteredNotes.length === 0 ? (
          <p className="text-gray-500">
            {searchQuery ? 'No notes found.' : 'No notes yet.'}
          </p>
        ) : (
          filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => {
                if (onNavigate) {
                  onNavigate(`/notes/${note.id}`);
                } else {
                  window.location.href = `/notes/${note.id}`;
                }
              }}
              className="block text-left w-full hover:underline"
            >
              {note.title || 'Untitled'}
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button
          onClick={handleCreateNote}
          className="px-6 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Create note
        </button>

        <button
          onClick={() => setShowAccount(!showAccount)}
          className="p-2 rounded-full border border-gray-300 hover:border-gray-500 transition-colors"
        >
          <User size={20} />
        </button>
      </div>

      {showAccount && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-50 p-6 max-w-md w-full shadow-lg relative">
            <button
              onClick={() => setShowAccount(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold mb-2 md-h2">Account</h2>
            <p className="text-gray-500 mb-4">Manage your vault access.</p>

            <h3 className="text-sm font-bold mb-2 md-h3 uppercase">Vault Key</h3>
            <p className="text-gray-500 mb-4 text-sm">
              Your vault key is only stored in memory and will be cleared when you close the tab.
            </p>

            <button
              onClick={handleSignOut}
              className="w-full px-6 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
