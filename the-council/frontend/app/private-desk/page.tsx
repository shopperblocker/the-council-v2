"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import ChatMessage from "@/components/ChatMessage";
import AgentCard from "@/components/AgentCard";
import SessionHistory from "@/components/SessionHistory";
import {
  fetchPrivateDeskAgents,
  startPrivateConversationStream,
  sendPrivateMessageStream,
} from "@/lib/api";
import type { Agent, ChatMessage as MessageType } from "@/lib/types";

export default function PrivateDesk() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);

  // Load agents on mount
  useEffect(() => {
    fetchPrivateDeskAgents()
      .then(setAgents)
      .catch((err) => console.error("Failed to load agents:", err));
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start or continue conversation
  const startConversation = async () => {
    if (!input.trim() || !selectedAgent) return;

    const userMessage: MessageType = {
      sender: "You",
      sender_type: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput("");
    setIsResponding(true);

    // SSE callbacks
    const callbacks = {
      onConversationStart: (data: any) => {
        setSessionId(data.session_id);
      },

      onAgentStart: (data: any) => {
        const agentMsg: MessageType = {
          sender: data.agent,
          sender_type: "agent",
          content: "",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      },

      onAgentToken: (data: any) => {
        setMessages((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].sender === data.agent && updated[i].sender_type === "agent") {
              updated[i] = {
                ...updated[i],
                content: updated[i].content + data.token,
              };
              break;
            }
          }
          return updated;
        });
      },

      onAgentEnd: () => {
        setIsResponding(false);
      },

      onRoundEnd: (data: any) => {
        if (data.session_id) {
          setSessionId(data.session_id);
        }
      },

      onError: (data: { message: string }) => {
        setIsResponding(false);
        const errorMsg: MessageType = {
          sender: "System",
          sender_type: "agent",
          content: `Error: ${data.message}`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      },
    };

    // Start or continue conversation
    if (sessionId) {
      sendPrivateMessageStream(sessionId, messageToSend, callbacks);
    } else {
      startPrivateConversationStream(selectedAgent.name, messageToSend, callbacks);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startConversation();
    }
  };

  const handleSessionLoad = (session: any) => {
    // Load session data
    setSessionId(session.id);

    // Find the agent from the session
    const sessionAgent = agents.find((a) => a.name === session.agents[0]);
    if (sessionAgent) {
      setSelectedAgent(sessionAgent);
    }

    // Load messages
    const loadedMessages = session.messages.map((msg: any) => ({
      sender: msg.sender_type === "user" ? "You" : msg.sender,
      sender_type: msg.sender_type,
      content: msg.content,
      created_at: msg.created_at,
    }));
    setMessages(loadedMessages);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push("/")}
              className="text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-2"
            >
              ← Back to Tables
            </button>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              🪑 Private Desk
            </h1>
            <p className="text-gray-500 mt-1">
              1-on-1 advisory session. Deep conversation with a single advisor.
            </p>
          </div>
          <SessionHistory mode="private_desk" onSessionLoad={handleSessionLoad} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Agent Selection Sidebar */}
          <div className="lg:col-span-1">
            <GlassPanel className="p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Select Your Advisor</h2>
              <div className="space-y-2">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.name}
                    agent={agent}
                    isActive={selectedAgent?.name === agent.name}
                    onClick={() => setSelectedAgent(agent)}
                    variant="compact"
                  />
                ))}
              </div>
            </GlassPanel>
          </div>

          {/* Conversation Area */}
          <div className="lg:col-span-3">
            <GlassPanel className="flex flex-col h-[calc(100vh-12rem)]">
              {/* Agent Info */}
              {selectedAgent && (
                <div className="p-4 border-b border-gray-200/50">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedAgent.emoji}</span>
                    <div>
                      <h2 className="font-bold text-lg" style={{ color: selectedAgent.color }}>
                        {selectedAgent.display_name}
                      </h2>
                      <p className="text-sm text-gray-500">{selectedAgent.role}</p>
                    </div>
                  </div>
                  {selectedAgent.core_belief && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      "{selectedAgent.core_belief}"
                    </p>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {!selectedAgent && (
                  <div className="text-center text-gray-400 mt-20">
                    ← Select an advisor from the sidebar to begin
                  </div>
                )}

                {selectedAgent && messages.length === 0 && (
                  <div className="text-center text-gray-400 mt-20">
                    <p className="text-lg mb-2">Ready for your first question?</p>
                    <p className="text-sm">
                      {selectedAgent.display_name} is waiting to advise you.
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    message={msg}
                    agentColor={
                      msg.sender_type === "agent" ? selectedAgent?.color : undefined
                    }
                  />
                ))}

                {isResponding && selectedAgent && (
                  <ChatMessage
                    message={{
                      sender: selectedAgent.name,
                      sender_type: "agent",
                      content: "",
                      created_at: new Date().toISOString(),
                    }}
                    agentColor={selectedAgent.color}
                    isStreaming={true}
                  />
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200/50">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      selectedAgent
                        ? `Ask ${selectedAgent.display_name}...`
                        : "Select an advisor first"
                    }
                    disabled={!selectedAgent || isResponding}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={startConversation}
                    disabled={!selectedAgent || !input.trim() || isResponding}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isResponding ? "..." : "Send"}
                  </button>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
