"use client";

import type { Agent } from "@/lib/types";

interface AgentCardProps {
  agent: Agent;
  isActive?: boolean;
  isSpeaking?: boolean;
  onToggle?: () => void;
  compact?: boolean;
}

export default function AgentCard({
  agent,
  isActive = false,
  isSpeaking = false,
  onToggle,
  compact = false,
}: AgentCardProps) {
  if (compact) {
    return (
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 w-full text-left
          ${isActive
            ? "glass-strong shadow-sm"
            : "hover:bg-white/30"
          }
          ${isSpeaking ? "ring-2 ring-offset-1" : ""}
        `}
        style={{
          borderLeft: isActive ? `3px solid ${agent.color}` : "3px solid transparent",
          boxShadow: isSpeaking ? `0 0 0 2px ${agent.color}` : undefined,
        }}
      >
        <span className="text-2xl">{agent.emoji}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-800 truncate" style={{ letterSpacing: "-0.3px" }}>
            {agent.display_name}
          </div>
          <div className="text-[11px] text-gray-500 truncate">{agent.role}</div>
        </div>
        {isSpeaking && (
          <span className="ml-auto flex gap-0.5">
            <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: agent.color }} />
            <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: agent.color }} />
            <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: agent.color }} />
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`
        glass-subtle p-4 rounded-xl transition-all duration-200 w-full text-left
        hover:translate-x-1 hover:shadow-md
        ${isActive ? "ring-2" : ""}
      `}
      style={{
        borderLeft: `4px solid ${agent.color}`,
        boxShadow: isActive ? `0 0 0 2px ${agent.color}` : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{agent.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-800" style={{ letterSpacing: "-0.3px" }}>
            {agent.display_name}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{agent.role}</div>
          <div className="text-xs text-gray-400 mt-1 italic line-clamp-2">
            &ldquo;{agent.core_belief}&rdquo;
          </div>
        </div>
      </div>
    </button>
  );
}
