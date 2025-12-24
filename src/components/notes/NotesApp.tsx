import { useState, useEffect } from 'react';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';
import { isAuthenticated } from '../../lib/store';

type View =
  | { type: 'list' }
  | { type: 'edit'; noteId: string };

export function NotesApp() {
  const [view, setView] = useState<View>({ type: 'list' });

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/signin';
      return;
    }

    // Handle initial route from URL
    const path = window.location.pathname;
    const match = path.match(/^\/notes\/([^/]+)$/);
    if (match) {
      setView({ type: 'edit', noteId: match[1] });
    }

    // Handle browser back/forward
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/notes\/([^/]+)$/);
      if (match) {
        setView({ type: 'edit', noteId: match[1] });
      } else {
        setView({ type: 'list' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newView: View) => {
    const url = newView.type === 'list' ? '/notes' : `/notes/${newView.noteId}`;
    window.history.pushState({}, '', url);
    setView(newView);
  };

  if (view.type === 'edit') {
    return (
      <NoteEditor
        noteId={view.noteId}
        onNavigate={(path) => {
          if (path === '/notes') {
            navigate({ type: 'list' });
          } else if (path.startsWith('/notes/')) {
            navigate({ type: 'edit', noteId: path.replace('/notes/', '') });
          }
        }}
      />
    );
  }

  return (
    <NoteList
      onNavigate={(path) => {
        if (path.startsWith('/notes/')) {
          navigate({ type: 'edit', noteId: path.replace('/notes/', '') });
        }
      }}
    />
  );
}
