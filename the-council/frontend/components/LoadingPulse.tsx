"use client";

interface LoadingPulseProps {
  className?: string;
}

export default function LoadingPulse({ className = "" }: LoadingPulseProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-label="Loading The Council"
    >
      <span
        className="text-council-gold tracking-[0.35em] uppercase"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.25rem, 3vw, 2rem)",
          letterSpacing: "0.35em",
        }}
      >
        THE COUNCIL
      </span>
      <div className="relative w-48 h-px overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-council-gold"
          style={{
            animation: "councilExpand 1.5s ease-in-out infinite",
          }}
        />
        <div className="w-full h-full bg-council-border opacity-40" />
      </div>
    </div>
  );
}
