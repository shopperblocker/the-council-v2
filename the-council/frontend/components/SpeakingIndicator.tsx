"use client";

import { getAgentColor } from "@/lib/design-system";

interface SpeakingIndicatorProps {
  agentId?: string;
  color?: string;
  className?: string;
}

export default function SpeakingIndicator({
  agentId,
  color,
  className = "",
}: SpeakingIndicatorProps) {
  const dotColor = color || (agentId ? getAgentColor(agentId) : "#c9a84c");

  return (
    <span
      className={`flex items-center gap-[3px] ${className}`}
      aria-label="Speaking"
      role="status"
    >
      <span
        className="w-1 h-1 rounded-full typing-dot"
        style={{ background: dotColor }}
      />
      <span
        className="w-1 h-1 rounded-full typing-dot"
        style={{ background: dotColor, animationDelay: "0.2s" }}
      />
      <span
        className="w-1 h-1 rounded-full typing-dot"
        style={{ background: dotColor, animationDelay: "0.4s" }}
      />
    </span>
  );
}
