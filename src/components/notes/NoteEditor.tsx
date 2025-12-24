import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { db } from '../../lib/db';
import { encrypt, decrypt } from '../../lib/crypto';
import { getEncryptionKey, isAuthenticated } from '../../lib/store';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
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
    setError('');

    try {
      const key = getEncryptionKey();
      if (!key) {
        window.location.href = '/signin';
        return;
      }

      const note = await db.notes.get(noteId);

      if (!note) {
        setError('Note not found.');
        setIsLoading(false);
        return;
      }

      const decryptedContent = await decrypt(note.encryptedContent, note.iv, key);
      setContent(decryptedContent);
      lastSavedContentRef.current = decryptedContent;
    } catch (err) {
      console.error('Failed to load note:', err);
      setError('Failed to load note.');
    } finally {
      setIsLoading(false);
    }
  }

  const saveNote = useCallback(async (newContent: string) => {
    if (newContent === lastSavedContentRef.current) return;

    const key = getEncryptionKey();
    if (!key) return;

    setIsSaving(true);

    try {
      // Extract title from first line
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
      setError('Failed to save note.');
    } finally {
      setIsSaving(false);
    }
  }, [noteId]);

  function handleContentChange(newContent: string) {
    setContent(newContent);

    // Debounced auto-save (500ms)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveNote(newContent);
    }, 500);
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this note? This cannot be undone.')) {
      return;
    }

    try {
      await db.notes.delete(noteId);
      window.location.href = '/notes';
    } catch (err) {
      console.error('Failed to delete note:', err);
      setError('Failed to delete note.');
    }
  }

  function handleBack() {
    // Save before navigating
    if (content !== lastSavedContentRef.current) {
      saveNote(content);
    }
    window.location.href = '/notes';
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#6B7280]">Loading note...</p>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[#6B7280] hover:text-black transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to notes</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[#6B7280] hover:text-black transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-4">
          {isSaving && (
            <span className="text-sm text-[#6B7280]">Saving...</span>
          )}
          <button
            onClick={handleDelete}
            className="p-2 text-[#6B7280] hover:text-red-600 transition-colors"
            title="Delete note"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Start writing..."
        className="flex-1 w-full p-4 font-mono text-base bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
        autoFocus
      />
    </div>
  );
}
