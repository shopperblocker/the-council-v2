"use client";

import { getAgentColor } from "@/lib/design-system";

interface ThinkingIndicatorProps {
  agentId?: string;
  agentName?: string;
  color?: string;
  className?: string;
}

export default function ThinkingIndicator({
  agentId,
  agentName,
  color,
  className = "",
}: ThinkingIndicatorProps) {
  const barColor = color || (agentId ? getAgentColor(agentId) : "#c9a84c");

  return (
    <div className={`flex items-center gap-2 ${className}`} role="status" aria-label={agentName ? `${agentName} is thinking` : "Thinking"}>
      {/* Three vertical bars with staggered councilPulse animation */}
      <span className="flex items-end gap-[3px]">
        <span
          className="inline-block w-[3px] h-4 rounded-sm"
          style={{
            background: barColor,
            animation: "councilPulse 1.2s ease-in-out infinite",
            animationDelay: "0ms",
          }}
        />
        <span
          className="inline-block w-[3px] h-4 rounded-sm"
          style={{
            background: barColor,
            animation: "councilPulse 1.2s ease-in-out infinite",
            animationDelay: "200ms",
          }}
        />
        <span
          className="inline-block w-[3px] h-4 rounded-sm"
          style={{
            background: barColor,
            animation: "councilPulse 1.2s ease-in-out infinite",
            animationDelay: "400ms",
          }}
        />
      </span>
      {agentName && (
        <span className="label-caps">{agentName} is thinking</span>
      )}
    </div>
  );
}
