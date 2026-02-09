"use client";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "subtle" | "strong";
  style?: React.CSSProperties;
}

export default function GlassPanel({
  children,
  className = "",
  variant = "default",
  style,
}: GlassPanelProps) {
  const variants = {
    default: "glass",
    subtle: "glass-subtle",
    strong: "glass-strong",
  };

  return (
    <div className={`${variants[variant]} ${className}`} style={style}>
      {children}
    </div>
  );
}
