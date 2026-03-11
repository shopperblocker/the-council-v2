"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import GlassPanel from "@/components/GlassPanel";
import ConversationSidebar from "@/components/ConversationSidebar";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import {
  fetchPrivateDeskAgents,
  fetchPrivateDeskSession,
  startPrivateDeskStream,
  continuePrivateDeskStream,
} from "@/lib/api";
import type { Agent, ChatMessage } from "@/lib/types";

type ViewState = "select-agent" | "conversation";

function PrivateDeskInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [view, setView] = useState<ViewState>("select-agent");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load agents on mount; then auto-select from ?agents= param if provided
  useEffect(() => {
    fetchPrivateDeskAgents()
      .then((loaded) => {
        setAgents(loaded);
        const agentsParam = searchParams.get("agents");
        const promptParam = searchParams.get("prompt");
        if (agentsParam) {
          const agentName = agentsParam.split(",")[0];
          const agent = loaded.find((a) => a.name === agentName);
          if (agent) {
            setSelectedAgent(agent);
            setView("conversation");
            if (promptParam) setInput(decodeURIComponent(promptParam));
          }
        }
      })
      .catch(() => setError("Failed to load advisors. Is the backend running?"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Group agents by board
  const agentsByBoard = agents.reduce<Record<string, Agent[]>>((acc, agent) => {
    if (!acc[agent.board]) acc[agent.board] = [];
    acc[agent.board].push(agent);
    return acc;
  }, {});

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setView("conversation");
    setMessages([]);
    setSessionId(null);
    inputRef.current?.focus();
  };

  const handleLoadSession = async (id: string, _topic?: string) => {
    try {
      const full = await fetchPrivateDeskSession(id);
      const agentName = full.agents[0];
      const agent = agents.find((a) => a.name === agentName);
      if (!agent) return;
      setSelectedAgent(agent);
      setSessionId(full.id);
      setMessages(
        full.messages.map((m) => ({
          id: String(m.id),
          sender: m.sender,
          sender_type: m.sender_type,
          content: m.content,
          color: m.sender_type === "agent" ? agent.color : undefined,
          emoji: m.sender_type === "agent" ? agent.emoji : undefined,
          display_name: m.sender_type === "agent" ? agent.display_name : undefined,
          created_at: m.created_at,
        }))
      );
      setView("conversation");
    } catch {
      setError("Failed to load session.");
    }
  };

  const appendToken = useCallback((token: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last || !last.isStreaming) return prev;
      return [
        ...prev.slice(0, -1),
        { ...last, content: last.content + token },
      ];
    });
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming || !selectedAgent) return;

    setInput("");
    setError(null);

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      sender_type: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsThinking(true);

    const isNewSession = !sessionId;

    const callbacks = {
      onConversationStart: (data: { session_id: string }) => {
        setSessionId(data.session_id);
        setIsThinking(false);
        setIsStreaming(true);
        // Add empty streaming message placeholder
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            sender: selectedAgent.name,
            sender_type: "agent" as const,
            content: "",
            color: selectedAgent.color,
            emoji: selectedAgent.emoji,
            display_name: selectedAgent.display_name,
            isStreaming: true,
          },
        ]);
      },
      onAgentStart: () => {
        setIsThinking(false);
        setIsStreaming(true);
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            sender: selectedAgent.name,
            sender_type: "agent" as const,
            content: "",
            color: selectedAgent.color,
            emoji: selectedAgent.emoji,
            display_name: selectedAgent.display_name,
            isStreaming: true,
          },
        ]);
      },
      onAgentToken: (data: { token: string }) => {
        appendToken(data.token);
      },
      onToolCall: (data: { tool: string }) => {
        // Show a brief "searching..." indicator in the stream
        const toolLabel =
          data.tool === "web_search" ? "🔍 Searching..." :
          data.tool === "get_stock_price" ? "📈 Getting price..." :
          data.tool === "calculator" ? "🧮 Calculating..." : "🔧 Using tool...";
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || !last.isStreaming) return prev;
          return [...prev.slice(0, -1), { ...last, content: last.content + `\n\n*${toolLabel}*\n\n` }];
        });
      },
      onConversationEnd: () => {
        setIsStreaming(false);
        setIsThinking(false);
        setMessages((prev) =>
          prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
        );
      },
      onError: (data: { message: string }) => {
        setIsStreaming(false);
        setIsThinking(false);
        setError(`Error: ${data.message}`);
        // Remove empty streaming message if it exists
        setMessages((prev) => prev.filter((m) => !(m.isStreaming && m.content === "")));
      },
    };

    if (isNewSession) {
      abortRef.current = startPrivateDeskStream(selectedAgent.name, text, callbacks);
    } else {
      abortRef.current = continuePrivateDeskStream(sessionId!, text, {
        ...callbacks,
        onConversationStart: undefined, // Not fired for continue
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render: Agent Selection ──
  if (view === "select-agent") {
    return (
      <div className="min-h-[100dvh] p-3 sm:p-4 md:p-8 bg-council-navy">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-council-text-secondary hover:text-council-text-primary transition-colors text-sm shrink-0"
            >
              &larr; Back
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-council-text-primary">Private Desk</h1>
              <p className="text-xs sm:text-sm text-council-text-secondary">Choose your advisor for a 1-on-1 session</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Agent boards */}
          {Object.entries(agentsByBoard).map(([board, boardAgents]) => (
            <div key={board} className="mb-8">
              <h2 className="label-caps mb-3">{board}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {boardAgents.map((agent) => (
                  <button
                    key={agent.name}
                    onClick={() => handleSelectAgent(agent)}
                    className="text-left group"
                  >
                    <GlassPanel className="p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{agent.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <h3 className="font-bold text-council-text-primary">{agent.display_name}</h3>
                            <span className="text-xs text-council-text-secondary">{agent.role}</span>
                          </div>
                          <p className="text-xs text-council-text-secondary mt-1 italic leading-relaxed line-clamp-2">
                            &ldquo;{agent.core_belief}&rdquo;
                          </p>
                        </div>
                        <span
                          className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          style={{ color: agent.color }}
                        >
                          →
                        </span>
                      </div>
                    </GlassPanel>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render: Conversation ──
  return (
    <div className="min-h-[100dvh] flex bg-council-navy">
      {/* Conversation History Sidebar */}
      <ConversationSidebar
        mode="private-desk"
        activeSessionId={sessionId}
        onSelect={handleLoadSession}
        onNew={() => setView("select-agent")}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-[100dvh] min-w-0">
      {/* Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-council-border">
        <GlassPanel className="px-3 sm:px-4 py-3 flex items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setView("select-agent")}
              className="text-council-text-secondary hover:text-council-text-primary transition-colors shrink-0"
            >
              &larr;
            </button>
            {selectedAgent && (
              <>
                <span className="text-xl sm:text-2xl shrink-0">{selectedAgent.emoji}</span>
                <div className="min-w-0">
                  <p className="font-bold text-council-text-primary text-sm truncate">{selectedAgent.display_name}</p>
                  <p className="text-xs text-council-text-secondary hidden sm:block">{selectedAgent.role}</p>
                </div>
              </>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <span className="text-6xl">{selectedAgent?.emoji}</span>
              <p className="text-council-text-secondary mt-4 text-sm">
                {selectedAgent?.display_name} is ready. What would you like to discuss?
              </p>
              <p className="text-council-text-tertiary mt-2 text-xs italic">
                &ldquo;{selectedAgent?.core_belief}&rdquo;
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender_type === "agent" && (
                <span className="mr-2 text-xl flex-shrink-0 mt-1">{msg.emoji}</span>
              )}
              <div
                className={`
                  max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                  ${msg.sender_type === "user"
                    ? "bg-council-navy-mid text-council-text-primary rounded-tr-sm border border-council-border"
                    : "glass rounded-tl-sm"
                  }
                `}
                style={msg.sender_type === "agent" ? { borderLeft: `3px solid ${msg.color}` } : {}}
              >
                {msg.sender_type === "agent" && (
                  <p className="text-xs font-semibold mb-1" style={{ color: msg.color }}>
                    {msg.display_name}
                  </p>
                )}
                <div className="council-markdown">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-current opacity-70 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            </div>
          ))}

          {isThinking && selectedAgent && (
            <div className="flex justify-start items-center gap-2">
              <span className="text-xl">{selectedAgent.emoji}</span>
              <div className="glass px-4 py-3 rounded-2xl rounded-tl-sm">
                <ThinkingIndicator
                  agentId={selectedAgent.name}
                  color={selectedAgent.color}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-sm text-red-300">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4">
        <div className="max-w-3xl mx-auto">
          <GlassPanel className="p-3 flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${selectedAgent?.display_name ?? "your advisor"} anything...`}
              rows={1}
              disabled={isStreaming || isThinking}
              className="flex-1 resize-none bg-transparent text-sm text-council-text-primary placeholder:text-council-text-secondary outline-none min-h-[36px] max-h-32 py-2"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || isThinking}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
              style={{
                backgroundColor: selectedAgent?.color || "#3B82F6",
                color: "white",
              }}
            >
              ↑
            </button>
          </GlassPanel>
          <p className="text-center text-xs text-council-text-secondary mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
      </div>{/* flex-1 main content */}
    </div>
  );
}

export default function PrivateDeskPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-council-navy flex items-center justify-center">
        <p className="text-council-text-secondary">Loading Private Desk...</p>
      </div>
    }>
      <PrivateDeskInner />
    </Suspense>
  );
}
