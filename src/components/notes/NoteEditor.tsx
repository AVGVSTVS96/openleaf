import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu } from 'lucide-react';
import { db } from '../../lib/db';
import { encrypt, decrypt } from '../../lib/crypto';
import { getEncryptionKey, isAuthenticated } from '../../lib/store';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/signin';
      return;
    }
    loadNote();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [noteId]);

  async function loadNote() {
    setIsLoading(true);
    try {
      const key = getEncryptionKey();
      if (!key) {
        window.location.href = '/signin';
        return;
      }

      const note = await db.notes.get(noteId);
      if (!note) {
        window.location.href = '/notes';
        return;
      }

      const decryptedContent = await decrypt(note.encryptedContent, note.iv, key);
      setContent(decryptedContent);
      lastSavedContentRef.current = decryptedContent;
    } catch (err) {
      console.error('Failed to load note:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const saveNote = useCallback(async (newContent: string) => {
    if (newContent === lastSavedContentRef.current) return;

    const key = getEncryptionKey();
    if (!key) return;

    try {
      const lines = newContent.split('\n');
      const title = lines[0]?.replace(/^#\s*/, '').trim() || '';

      const { ciphertext: encryptedTitle, iv } = await encrypt(title, key);
      const { ciphertext: encryptedContent } = await encrypt(newContent, key);

      await db.notes.update(noteId, {
        encryptedTitle,
        encryptedContent,
        iv,
        updatedAt: Date.now()
      });

      lastSavedContentRef.current = newContent;
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  }, [noteId]);

  function handleContentChange(newContent: string) {
    setContent(newContent);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveNote(newContent);
    }, 500);
  }

  async function handleDelete() {
    if (!confirm('Delete this note?')) return;

    try {
      await db.notes.delete(noteId);
      window.location.href = '/notes';
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }

  function handleBack() {
    if (content !== lastSavedContentRef.current) {
      saveNote(content);
    }
    window.location.href = '/notes';
  }

  if (isLoading) {
    return <p className="text-[#888]">Loading...</p>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-6rem)]">
      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        className="flex-1 w-full bg-transparent resize-none focus:outline-none"
        placeholder="Start writing..."
        autoFocus
      />

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-3 bg-[#FAF8F5] border border-[#ccc] hover:border-[#888] transition-colors"
        >
          <Menu size={20} />
        </button>

        {showMenu && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#FAF8F5] border border-[#ccc] shadow-lg min-w-[150px]">
            <button
              onClick={handleBack}
              className="block w-full px-4 py-2 text-left hover:bg-[#E8E4DF] transition-colors"
            >
              ← Back to notes
            </button>
            <button
              onClick={handleDelete}
              className="block w-full px-4 py-2 text-left text-red-600 hover:bg-[#E8E4DF] transition-colors"
            >
              Delete note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
