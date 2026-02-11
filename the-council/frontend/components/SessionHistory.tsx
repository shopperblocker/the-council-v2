"use client";

import { useState, useEffect } from "react";
import GlassPanel from "./GlassPanel";
import { fetchPrivateDeskSessions, fetchPrivateDeskSession } from "@/lib/api";

interface Session {
  id: string;
  topic: string;
  agents: string[];
  created_at: string;
}

interface SessionHistoryProps {
  mode?: "private_desk" | "war_room";
  onSessionLoad?: (session: any) => void;
}

export default function SessionHistory({
  mode = "private_desk",
  onSessionLoad,
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [mode]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await fetchPrivateDeskSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = async (sessionId: string) => {
    try {
      const session = await fetchPrivateDeskSession(sessionId);
      onSessionLoad?.(session);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
      >
        📜 History {sessions.length > 0 && `(${sessions.length})`}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-80 z-50">
            <GlassPanel className="p-4 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Recent Sessions
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {loading && (
                <div className="text-center text-gray-500 py-4">
                  Loading...
                </div>
              )}

              {!loading && sessions.length === 0 && (
                <div className="text-center text-gray-500 py-4 text-sm">
                  No sessions yet. Start a conversation!
                </div>
              )}

              {!loading && sessions.length > 0 && (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleSessionClick(session.id)}
                      className="w-full text-left p-3 rounded-lg bg-white/50 hover:bg-white/70 transition-colors border border-gray-200/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {session.topic}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600">
                              {session.agents.join(", ")}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(session.created_at)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && sessions.length > 0 && (
                <button
                  onClick={loadSessions}
                  className="w-full mt-3 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              )}
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  );
}
