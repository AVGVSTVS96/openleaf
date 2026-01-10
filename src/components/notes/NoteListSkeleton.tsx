import { memo } from "react";

// Just the notes items skeleton (for sync loading within NoteList)
export const NotesItemsSkeleton = memo(function NotesItemsSkeleton() {
  return (
    <div className="flex-1 space-y-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-11 w-full animate-pulse border-b border-border bg-muted/40"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
});

// Full page skeleton (for initial auth loading in NotesApp)
export const NoteListSkeleton = memo(function NoteListSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* Header skeleton */}
      <header className="flex items-center justify-between gap-4">
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        </div>
      </header>

      {/* Note items skeleton */}
      <NotesItemsSkeleton />
    </div>
  );
});
