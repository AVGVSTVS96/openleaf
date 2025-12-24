interface NoteItemProps {
  id: string;
  title: string;
  updatedAt: number;
  onClick: () => void;
}

export function NoteItem({ title, updatedAt, onClick }: NoteItemProps) {
  const formattedDate = new Date(updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const displayTitle = title || 'Untitled';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <h3 className="font-medium text-black truncate">{displayTitle}</h3>
      <p className="text-sm text-[#6B7280] mt-1">{formattedDate}</p>
    </button>
  );
}
