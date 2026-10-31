export default function LoadingSkeleton({ className = '', lines = 3 }) {
  return (
    <div
      aria-label="Loading content"
      className={`animate-pulse space-y-3 ${className}`}
      role="status"
    >
      <span className="sr-only">Loading content</span>
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <div
          className={`h-4 rounded-md bg-slate-200 ${index === 0 ? 'w-2/5' : 'w-full'}`}
          key={index}
        />
      ))}
    </div>
  );
}
