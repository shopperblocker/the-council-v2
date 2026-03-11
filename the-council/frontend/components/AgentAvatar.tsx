"use client";

import { getAgentColor, getAgentInitials } from "@/lib/design-system";

interface AgentAvatarProps {
  agentId: string;
  displayName?: string;
  size?: "sm" | "md";
  isActive?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

export default function AgentAvatar({
  agentId,
  displayName,
  size = "md",
  isActive = false,
  isSpeaking = false,
  className = "",
}: AgentAvatarProps) {
  const color = getAgentColor(agentId);
  const initials = getAgentInitials(displayName || agentId);
  const sizePx = size === "sm" ? 28 : 40;

  return (
    <div
      className={`
        flex-shrink-0 flex items-center justify-center rounded-full font-label font-semibold select-none
        transition-all duration-300
        ${isSpeaking ? "animate-[speakingPulse_2s_ease-in-out_infinite]" : ""}
        ${className}
      `}
      style={{
        width: sizePx,
        height: sizePx,
        fontSize: size === "sm" ? "0.55rem" : "0.7rem",
        letterSpacing: "0.1em",
        background: `${color}18`,
        border: `2px solid ${color}`,
        color: color,
        boxShadow: isActive
          ? `0 0 0 3px ${color}30, 0 0 16px ${color}25`
          : isSpeaking
          ? `0 0 0 2px ${color}40`
          : "none",
      }}
      aria-label={displayName || agentId}
      title={displayName || agentId}
    >
      {initials}
    </div>
  );
}
