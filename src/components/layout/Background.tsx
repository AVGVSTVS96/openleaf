export function Background() {
  return (
    <div className="fixed inset-x-0 bottom-0 h-64 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(
            to top,
            rgba(251, 191, 156, 0.6) 0%,
            rgba(255, 182, 193, 0.4) 30%,
            rgba(135, 206, 235, 0.3) 60%,
            transparent 100%
          )`
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32 opacity-20"
        style={{
          background: `linear-gradient(
            to top,
            rgba(70, 130, 180, 0.5) 0%,
            transparent 100%
          )`
        }}
      />
    </div>
  );
}
