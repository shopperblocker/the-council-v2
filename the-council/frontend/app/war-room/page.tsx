"use client";

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import ChatMessage from "@/components/ChatMessage";
import AgentCard from "@/components/AgentCard";
import MobileDrawer from "@/components/MobileDrawer";
import ConversationSidebar from "@/components/ConversationSidebar";
import {
  fetchAgents,
  fetchSession,
  startDebateStream,
  sendFollowUpStream,
  fetchUnreadInsightsCount,
} from "@/lib/api";
import type { Agent, ChatMessage as MessageType, DebateStartEvent } from "@/lib/types";

function WarRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Token accumulator for batched streaming updates (~60fps cap)
  const pendingTokens = useRef<Map<string, string>>(new Map());
  const rafId = useRef<number | null>(null);

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
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [unreadInsights, setUnreadInsights] = useState(0);

  // Pre-fill from ?agents=&prompt= URL params (used by AgentQuickLaunch)
  useEffect(() => {
    const agentsParam = searchParams.get("agents");
    const promptParam = searchParams.get("prompt");
    if (agentsParam) setSelectedAgents(agentsParam.split(",").filter(Boolean));
    if (promptParam) setInput(decodeURIComponent(promptParam));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load agents and unread insights count on mount
  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch((err) => console.error("Failed to load agents:", err));
    fetchUnreadInsightsCount()
      .then(setUnreadInsights)
      .catch(() => {});
  }, []);

  // Cleanup streams and animation frames on unmount
  useEffect(() => {
    return () => {
      streamController?.abort();
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [streamController]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, synthesis]);

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
    setSynthesis(null);

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
        // Accumulate tokens for this agent
        const prev = pendingTokens.current.get(data.agent) ?? "";
        pendingTokens.current.set(data.agent, prev + data.token);

        // Flush accumulated tokens on next animation frame (max ~60fps)
        if (rafId.current === null) {
          rafId.current = requestAnimationFrame(() => {
            rafId.current = null;
            const batch = new Map(pendingTokens.current);
            pendingTokens.current.clear();
            setMessages((msgs) => {
              const updated = [...msgs];
              for (const [agent, tokens] of batch) {
                for (let i = updated.length - 1; i >= 0; i--) {
                  if (updated[i].sender === agent && updated[i].isStreaming) {
                    updated[i] = { ...updated[i], content: updated[i].content + tokens };
                    break;
                  }
                }
              }
              return updated;
            });
          });
        }
      },

      onAgentEnd: (data: { agent: string }) => {
        setSpeakingAgent(null);
        // Flush any pending tokens synchronously before ending the stream
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        const remaining = pendingTokens.current.get(data.agent) ?? "";
        pendingTokens.current.delete(data.agent);
        setMessages((prev) =>
          prev.map((m) =>
            m.sender === data.agent && m.isStreaming
              ? { ...m, content: m.content + remaining, isStreaming: false }
              : m
          )
        );
      },

      onSynthesis: (data: { content: string }) => {
        setSynthesis(data.content.replace(/\\n/g, "\n"));
      },

      onRoundEnd: (data: { session_id: string }) => {
        setSessionId(data.session_id);
        setIsDebating(false);
        setTimeout(() => inputRef.current?.focus(), 100);
        // Refresh insights badge after a debate completes
        fetchUnreadInsightsCount().then(setUnreadInsights).catch(() => {});
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
    setSynthesis(null);
    inputRef.current?.focus();
  };

  // Load a session from history
  const handleLoadSession = async (id: string) => {
    try {
      streamController?.abort();
      const session = await fetchSession(id);
      setSessionId(session.id);
      setTopic(session.topic || null);
      setSelectedAgents(session.agents || []);
      setSynthesis(null);
      setIsDebating(false);
      setSpeakingAgent(null);
      setMessages(
        (session.messages || []).map((m: { id: string | number; sender: string; sender_type: string; content: string }) => {
          const agentInfo = agents.find((a) => a.name === m.sender);
          return {
            id: String(m.id),
            sender: m.sender,
            sender_type: m.sender_type as "user" | "agent",
            content: m.content,
            color: agentInfo?.color,
            emoji: agentInfo?.emoji,
            display_name: agentInfo?.display_name || m.sender,
          };
        })
      );
    } catch {
      // silently fail — sidebar will just keep showing current state
    }
  };

  // Active agents in sidebar (memoized to avoid recomputing on every render)
  const sessionAgents = useMemo(
    () => agents.filter((a) => selectedAgents.includes(a.name)),
    [agents, selectedAgents]
  );
  const hasStarted = messages.length > 0;

  // Memoize the speaking agent lookup used in the typing indicator
  const speakingAgentInfo = useMemo(
    () => agents.find((a) => a.name === speakingAgent) ?? null,
    [agents, speakingAgent]
  );

  // Sidebar content (shared between desktop sidebar and mobile drawer)
  const sidebarContent = (
    <>
      <div className="label-caps mb-3">
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
          <p className="text-[10px] text-council-text-tertiary mt-3 text-center">
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
            background: "linear-gradient(135deg, rgba(15,30,53,0.9), rgba(10,22,40,0.9))",
            border: "1px solid rgba(201,168,76,0.25)",
          }}
        >
          <div className="label-caps mb-2">Strategic Question</div>
          <p className="text-sm text-council-text-primary leading-relaxed">{topic}</p>
        </div>
      )}
    </>
  );

  return (
    <div className="h-[100dvh] p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 max-w-[1440px] mx-auto bg-council-navy">
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
              <p className="text-xs text-council-text-secondary mt-0.5 truncate max-w-[200px] sm:max-w-md">{topic}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Insights badge */}
          {unreadInsights > 0 && (
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{
                background: "rgba(201,162,39,0.12)",
                color: "#C9A227",
                border: "1px solid rgba(201,162,39,0.3)",
              }}
              title="Unread insights from your advisors"
            >
              <span>&#128161;</span>
              <span>{unreadInsights} insight{unreadInsights !== 1 ? "s" : ""}</span>
            </button>
          )}
          {sessionId && (
            <button
              onClick={handleNewDebate}
              className="text-sm text-council-text-secondary hover:text-council-text-primary transition-colors"
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
        {/* Conversation History Sidebar */}
        <ConversationSidebar
          mode="war-room"
          activeSessionId={sessionId}
          onSelect={handleLoadSession}
          onNew={handleNewDebate}
        />

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
                background: "linear-gradient(135deg, rgba(15,30,53,0.9), rgba(10,22,40,0.9))",
                border: "1px solid rgba(201,168,76,0.25)",
              } as React.CSSProperties}
            >
              <div className="label-caps mb-2">Strategic Question</div>
              <p className="text-sm text-council-text-primary leading-relaxed">{topic}</p>
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
                  <h2 className="text-base sm:text-lg font-semibold text-council-text-primary mb-2">
                    The War Room awaits
                  </h2>
                  <p className="text-sm text-council-text-secondary max-w-sm">
                    Ask a strategic question. Your advisors will debate from their
                    unique perspectives, challenge each other, and deliver actionable insight.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {messages.map((msg, i) => (
                  <div key={msg.id}>
                    {/* Gold divider between agent turns (not before user messages or the first message) */}
                    {i > 0 && msg.sender_type === "agent" && messages[i - 1]?.sender_type === "agent" && messages[i - 1]?.sender !== msg.sender && (
                      <div className="rule-gold my-3" />
                    )}
                    <ChatMessage message={msg} />
                  </div>
                ))}

                {/* Synthesis card — shown after debate completes */}
                {synthesis && !isDebating && (
                  <div
                    className="mt-4 p-4 rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(15,30,53,0.95), rgba(10,22,40,0.95))",
                      border: "1px solid rgba(201,168,76,0.3)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm">&#9876;&#65039;</span>
                      <span className="label-caps">Council Synthesis</span>
                      <span className="text-[10px] text-council-text-secondary ml-auto">via Opus</span>
                    </div>
                    <p className="text-sm text-council-text-primary leading-relaxed whitespace-pre-wrap">
                      {synthesis}
                    </p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </GlassPanel>

          {/* Input */}
          <GlassPanel className="px-3 sm:px-5 py-3 sm:py-4 shrink-0">
            {/* Typing indicator */}
            <div className="h-5 mb-2">
              {speakingAgent && speakingAgentInfo && (
                <p className="text-xs text-council-text-secondary italic animate-fade-in truncate">
                  {speakingAgentInfo.emoji}{" "}
                  {speakingAgentInfo.display_name} is speaking...
                </p>
              )}
              {!speakingAgent && isDebating && (
                <p className="text-xs text-council-text-secondary italic">Synthesizing...</p>
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
                className="glass-input flex-1 px-3 sm:px-5 py-3 sm:py-3.5 text-sm text-council-text-primary placeholder:text-council-text-secondary disabled:opacity-50"
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

export default function WarRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-council-navy flex items-center justify-center">
        <p className="text-council-text-secondary">Loading War Room...</p>
      </div>
    }>
      <WarRoom />
    </Suspense>
  );
}
