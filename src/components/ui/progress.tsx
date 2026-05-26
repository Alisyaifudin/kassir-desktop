interface ProgressProps {
  value: number;
  max: number;
  className?: string;
}

export function Progress({ value, max, className = "" }: ProgressProps) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));

  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressIndeterminate({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}
      role="progressbar"
      aria-label="Mengunduh"
    >
      <div
        className="h-full w-1/3 rounded-full bg-primary animate-[progress-indeterminate_1.5s_ease-in-out_infinite]"
        style={{
          animation: "progress-indeterminate 1.5s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
