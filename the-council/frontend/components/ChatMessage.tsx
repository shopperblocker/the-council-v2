"use client";

import type { ChatMessage as MessageType } from "@/lib/types";

interface ChatMessageProps {
  message: MessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender_type === "user";

  if (isUser) {
    return (
      <div className="message-enter flex justify-end mb-4">
        <div className="max-w-[85%]">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">You</span>
          </div>
          <div
            className="px-4 py-3 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
              border: "2px solid #3B82F6",
            }}
          >
            <p className="text-sm leading-relaxed text-gray-800">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Agent message
  const color = message.color || "#6B7280";
  const bgLight = `${color}12`;
  const borderLight = `${color}30`;

  return (
    <div className="message-enter flex justify-start mb-4">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{message.emoji}</span>
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color }}
          >
            {message.display_name || message.sender}
          </span>
          {message.isStreaming && (
            <span className="flex gap-0.5 ml-1">
              <span className="typing-dot w-1 h-1 rounded-full bg-gray-400" />
              <span className="typing-dot w-1 h-1 rounded-full bg-gray-400" />
              <span className="typing-dot w-1 h-1 rounded-full bg-gray-400" />
            </span>
          )}
        </div>
        <div
          className="px-4 py-3 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${bgLight}, ${bgLight})`,
            border: `1px solid ${borderLight}`,
          }}
        >
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
