"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import ChatMessage from "@/components/ChatMessage";
import AgentCard from "@/components/AgentCard";
import MobileDrawer from "@/components/MobileDrawer";
import { fetchAgents, startDebateStream, sendFollowUpStream } from "@/lib/api";
import type { Agent, ChatMessage as MessageType, DebateStartEvent } from "@/lib/types";

export default function WarRoom() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isDebating, setIsDebating] = useState(false);
  const [speakingAgent, setSpeakingAgent] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [streamController, setStreamController] = useState<AbortController | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load agents on mount
  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch((err) => console.error("Failed to load agents:", err));
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Toggle agent selection
  const toggleAgent = useCallback((name: string) => {
    setSelectedAgents((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : prev.length < 5
          ? [...prev, name]
          : prev
    );
  }, []);

  // Submit question or follow-up
  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text || isDebating) return;

    setInput("");
    setIsDebating(true);
    setSidebarOpen(false);

    // Add user message
    const userMsg: MessageType = {
      id: `user-${Date.now()}`,
      sender: "user",
      sender_type: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Detect @mention
    const mentionMatch = text.match(/@(\w+)/);
    const mention = mentionMatch ? mentionMatch[1] : null;

    // Callbacks for SSE events
    const callbacks = {
      onDebateStart: (data: DebateStartEvent) => {
        setSessionId(data.session_id);
        setTopic(data.topic);
        setSelectedAgents(data.agents.map((a) => a.name));
      },

      onAgentStart: (data: { agent: string; display_name: string; emoji: string; color: string }) => {
        setSpeakingAgent(data.agent);
        const agentMsg: MessageType = {
          id: `agent-${data.agent}-${Date.now()}`,
          sender: data.agent,
          sender_type: "agent",
          content: "",
          color: data.color,
          emoji: data.emoji,
          display_name: data.display_name,
          isStreaming: true,
        };
        setMessages((prev) => [...prev, agentMsg]);
      },

      onAgentToken: (data: { agent: string; token: string }) => {
        setMessages((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].sender === data.agent && updated[i].isStreaming) {
              updated[i] = { ...updated[i], content: updated[i].content + data.token };
              break;
            }
          }
          return updated;
        });
      },

      onAgentEnd: (data: { agent: string }) => {
        setSpeakingAgent(null);
        setMessages((prev) =>
          prev.map((m) =>
            m.sender === data.agent && m.isStreaming
              ? { ...m, isStreaming: false }
              : m
          )
        );
      },

      onRoundEnd: (data: { session_id: string }) => {
        setSessionId(data.session_id);
        setIsDebating(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      },

      onError: (data: { message: string }) => {
        setIsDebating(false);
        setSpeakingAgent(null);
        const errorMsg: MessageType = {
          id: `error-${Date.now()}`,
          sender: "system",
          sender_type: "agent",
          content: `Warning: ${data.message}`,
          emoji: "Warning",
          display_name: "System",
          color: "#EF4444",
        };
        setMessages((prev) => [...prev, errorMsg]);
      },
    };

    // Start debate or follow-up
    let controller: AbortController;
    if (sessionId) {
      controller = sendFollowUpStream(sessionId, text, mention, callbacks);
    } else {
      controller = startDebateStream(text, selectedAgents, callbacks);
    }
    setStreamController(controller);
  }, [input, isDebating, sessionId, selectedAgents]);

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // New debate
  const handleNewDebate = () => {
    streamController?.abort();
    setMessages([]);
    setSessionId(null);
    setTopic(null);
    setIsDebating(false);
    setSpeakingAgent(null);
    setSelectedAgents([]);
    inputRef.current?.focus();
  };

  // Active agents in sidebar
  const sessionAgents = agents.filter((a) => selectedAgents.includes(a.name));
  const hasStarted = messages.length > 0;

  // Sidebar content (shared between desktop sidebar and mobile drawer)
  const sidebarContent = (
    <>
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
        {hasStarted ? "Strategic Council" : "Select Advisors"}
      </div>

      {!hasStarted ? (
        <div className="space-y-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              isActive={selectedAgents.includes(agent.name)}
              compact
              onToggle={() => toggleAgent(agent.name)}
            />
          ))}
          <p className="text-[10px] text-gray-400 mt-3 text-center">
            {selectedAgents.length === 0
              ? "Select agents or let AI choose"
              : `${selectedAgents.length} selected (max 5)`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessionAgents.map((agent) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              isActive
              isSpeaking={speakingAgent === agent.name}
              compact
            />
          ))}
        </div>
      )}

      {/* Topic Panel (mobile only shows inside drawer) */}
      {topic && (
        <div
          className="mt-4 p-3 rounded-xl"
          style={{
            background: "linear-gradient(135deg, rgba(239,246,255,0.9), rgba(219,234,254,0.9))",
            border: "1px solid rgba(147,197,253,0.4)",
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-2">
            Strategic Question
          </div>
          <p className="text-sm text-blue-800 leading-relaxed">{topic}</p>
        </div>
      )}
    </>
  );

  return (
    <div className="h-[100dvh] p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 max-w-[1440px] mx-auto bg-[#F8F9FA]">
      {/* Header */}
      <GlassPanel className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary px-3 sm:px-4 py-2 text-sm shrink-0"
          >
            <span className="hidden sm:inline">&larr; Back</span>
            <span className="sm:hidden">&larr;</span>
          </button>
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-lg glass-subtle text-sm"
          >
            {hasStarted ? `${sessionAgents.length}` : "12"}
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">War Room</h1>
            {topic && (
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px] sm:max-w-md">{topic}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {sessionId && (
            <button
              onClick={handleNewDebate}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <span className="hidden sm:inline">New Debate</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </GlassPanel>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        {sidebarContent}
      </MobileDrawer>

      {/* Main Layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Desktop Sidebar — hidden on mobile */}
        <div className="hidden md:flex w-[280px] shrink-0 flex-col gap-4">
          <GlassPanel className="p-4 flex-1 overflow-y-auto">
            {sidebarContent}
          </GlassPanel>

          {/* Topic Panel (desktop only — mobile version is inside drawer) */}
          {topic && (
            <GlassPanel
              className="p-4 shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(239,246,255,0.9), rgba(219,234,254,0.9))",
                border: "1px solid rgba(147,197,253,0.4)",
              } as React.CSSProperties}
            >
              <div className="text-[11px] font-bold uppercase tracking-widest text-blue-400 mb-2">
                Strategic Question
              </div>
              <p className="text-sm text-blue-800 leading-relaxed">{topic}</p>
            </GlassPanel>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-w-0">
          {/* Messages */}
          <GlassPanel variant="subtle" className="flex-1 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="text-4xl sm:text-5xl mb-4">&#9876;&#65039;</div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                    The War Room awaits
                  </h2>
                  <p className="text-sm text-gray-400 max-w-sm">
                    Ask a strategic question. Your advisors will debate from their
                    unique perspectives, challenge each other, and deliver actionable insight.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </GlassPanel>

          {/* Input */}
          <GlassPanel className="px-3 sm:px-5 py-3 sm:py-4 shrink-0">
            {/* Typing indicator */}
            <div className="h-5 mb-2">
              {speakingAgent && (
                <p className="text-xs text-gray-400 italic animate-fade-in truncate">
                  {agents.find((a) => a.name === speakingAgent)?.emoji}{" "}
                  {agents.find((a) => a.name === speakingAgent)?.display_name} is speaking...
                </p>
              )}
            </div>

            <div className="flex gap-2 sm:gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasStarted
                    ? "Follow up... (@Rockefeller to direct)"
                    : "Ask a strategic question..."
                }
                disabled={isDebating}
                className="glass-input flex-1 px-3 sm:px-5 py-3 sm:py-3.5 text-sm text-gray-800 placeholder:text-gray-400 disabled:opacity-50"
              />
              <button
                onClick={handleSubmit}
                disabled={isDebating || !input.trim()}
                className="btn-primary px-4 sm:px-6 py-3 sm:py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isDebating ? "..." : hasStarted ? "Send" : "Convene"}
              </button>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
