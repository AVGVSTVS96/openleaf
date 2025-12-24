import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { NoteItem } from './NoteItem';
import { Button } from '../ui/Button';
import { db, type Note } from '../../lib/db';
import { decrypt } from '../../lib/crypto';
import { getEncryptionKey, isAuthenticated } from '../../lib/store';

interface DecryptedNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export function NoteList() {
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/signin';
      return;
    }

    loadNotes();
  }, []);

  async function loadNotes() {
    setIsLoading(true);
    setError('');

    try {
      const key = getEncryptionKey();
      if (!key) {
        window.location.href = '/signin';
        return;
      }

      const encryptedNotes = await db.notes.orderBy('updatedAt').reverse().toArray();
      const decryptedNotes: DecryptedNote[] = [];

      for (const note of encryptedNotes) {
        try {
          const title = await decrypt(note.encryptedTitle, note.iv, key);
          const content = await decrypt(note.encryptedContent, note.iv, key);

          decryptedNotes.push({
            id: note.id,
            title,
            content,
            updatedAt: note.updatedAt
          });
        } catch (err) {
          console.error('Failed to decrypt note:', note.id, err);
        }
      }

      setNotes(decryptedNotes);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('Failed to load notes.');
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
    if (!key) {
      window.location.href = '/signin';
      return;
    }

    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      // Import encrypt function
      const { encrypt } = await import('../../lib/crypto');

      const { ciphertext: encryptedTitle, iv } = await encrypt('', key);
      const { ciphertext: encryptedContent } = await encrypt('', key);

      await db.notes.add({
        id,
        encryptedTitle,
        encryptedContent,
        iv,
        createdAt: now,
        updatedAt: now
      });

      window.location.href = `/notes/${id}`;
    } catch (err) {
      console.error('Failed to create note:', err);
      setError('Failed to create note.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6B7280]">Loading notes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <Button onClick={handleCreateNote} className="flex items-center gap-2">
          <Plus size={18} />
          <span>New note</span>
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {filteredNotes.length === 0 ? (
          <div className="p-8 text-center text-[#6B7280]">
            {searchQuery
              ? 'No notes found matching your search.'
              : 'No notes yet. Create your first note!'}
          </div>
        ) : (
          filteredNotes.map((note) => (
            <NoteItem
              key={note.id}
              id={note.id}
              title={note.title}
              updatedAt={note.updatedAt}
              onClick={() => (window.location.href = `/notes/${note.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
