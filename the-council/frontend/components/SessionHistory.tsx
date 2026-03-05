"use client";

import { useState, useEffect } from "react";
import { fetchPrivateDeskSessions } from "@/lib/api";
import type { PrivateDeskSession } from "@/lib/types";
import { AGENT_EMOJIS } from "@/lib/types";

interface SessionHistoryProps {
  currentSessionId: string | null;
  onSelectSession: (session: PrivateDeskSession) => void;
}

export default function SessionHistory({ currentSessionId, onSelectSession }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<PrivateDeskSession[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // AbortController cancels stale in-flight requests when currentSessionId changes
    const abortCtrl = new AbortController();
    setLoading(true);

    fetchPrivateDeskSessions()
      .then((data) => {
        if (!abortCtrl.signal.aborted) setSessions(data);
      })
      .catch(() => {
        // Silently fail — history is not critical
      })
      .finally(() => {
        if (!abortCtrl.signal.aborted) setLoading(false);
      });

    return () => abortCtrl.abort();
  }, [currentSessionId]); // Refresh when a new session is created

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffHours < 168) {
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  if (sessions.length === 0 && !loading) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 glass-subtle rounded-xl transition-all"
      >
        <span>📋</span>
        <span>History</span>
        <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
          {sessions.length}
        </span>
        <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 glass rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-white/30">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Past Sessions
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-400">Loading...</div>
            ) : (
              sessions.map((session) => {
                const agentName = session.agents[0] || "";
                const emoji = AGENT_EMOJIS[agentName] || "🤖";
                const isActive = session.id === currentSessionId;

                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full text-left p-3 hover:bg-white/50 transition-colors border-b border-white/20 last:border-0
                      ${isActive ? "bg-blue-50/60" : ""}
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {session.topic || "Untitled conversation"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {agentName.replace("_", " ")} · {formatDate(session.created_at)}
                        </p>
                      </div>
                      {isActive && (
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
