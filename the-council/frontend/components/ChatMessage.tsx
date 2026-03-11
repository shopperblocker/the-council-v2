"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage as MessageType } from "@/lib/types";
import { getAgentColor, getAgentRole, getAgentInitials } from "@/lib/design-system";

interface ChatMessageProps {
  message: MessageType;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender_type === "user";

  // Memoize markdown parsing — expensive during streaming (1000+ renders per response)
  const renderedContent = useMemo(
    () => <ReactMarkdown>{message.content}</ReactMarkdown>,
    [message.content]
  );

  if (isUser) {
    return (
      <div className="message-enter flex justify-end mb-4">
        <div className="max-w-[85%]">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="label-caps">You</span>
          </div>
          <div
            className="px-4 py-3 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(17,34,64,0.9), rgba(15,30,53,0.9))",
              border: "1px solid rgba(30,58,95,0.7)",
            }}
          >
            <p className="text-sm leading-relaxed text-council-text-primary">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Agent message
  const color = message.color || getAgentColor(message.sender);
  const role = getAgentRole(message.sender);
  const initials = getAgentInitials(message.display_name || message.sender);
  const bgDark = `${color}0d`;
  const borderAccent = `${color}35`;

  return (
    <div className="message-enter flex justify-start mb-4 gap-2">
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[0.6rem] font-label font-semibold mt-1"
        style={{
          background: `${color}18`,
          border: `2px solid ${color}`,
          color: color,
          letterSpacing: "0.08em",
        }}
        aria-hidden
      >
        {initials}
      </div>

      <div className="max-w-[82%]">
        {/* Agent name + role badge */}
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
            {message.display_name || message.sender}
          </span>
          <span className="label-caps hidden sm:inline">{role}</span>
          {message.isStreaming && (
            <span className="flex gap-0.5 ml-0.5 items-center">
              <span className="typing-dot w-1 h-1 rounded-full" style={{ background: color }} />
              <span className="typing-dot w-1 h-1 rounded-full" style={{ background: color }} />
              <span className="typing-dot w-1 h-1 rounded-full" style={{ background: color }} />
            </span>
          )}
        </div>

        {/* Message bubble */}
        <div
          className="px-4 py-3 rounded-2xl transition-all duration-200"
          style={{
            background: `linear-gradient(135deg, ${bgDark}, rgba(10,22,40,0.6))`,
            borderLeft: `3px solid ${color}`,
            borderTop: `1px solid ${borderAccent}`,
            borderRight: `1px solid ${borderAccent}`,
            borderBottom: `1px solid ${borderAccent}`,
          }}
        >
          <div className="text-sm leading-relaxed text-council-text-primary council-markdown">
            {renderedContent}
            {message.isStreaming && (
              <span
                className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle"
                style={{ background: color }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom comparator: skip re-render if only isStreaming changed without content change
export default memo(ChatMessage, (prev, next) => {
  return (
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming &&
    prev.message.color === next.message.color
  );
});
