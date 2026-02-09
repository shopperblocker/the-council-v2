"use client";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "subtle" | "strong";
}

export default function GlassPanel({
  children,
  className = "",
  variant = "default",
}: GlassPanelProps) {
  const variants = {
    default: "glass",
    subtle: "glass-subtle",
    strong: "glass-strong",
  };

  return (
    <div className={`${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}
