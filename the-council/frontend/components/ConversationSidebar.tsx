"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { fetchSessions, fetchPrivateDeskSessions } from "@/lib/api";

interface Session {
  id: string;
  topic?: string;
  created_at: string;
  agents?: string[];
  mode?: string;
}

interface ConversationSidebarProps {
  mode: "war-room" | "private-desk";
  activeSessionId: string | null;
  onSelect: (id: string, topic?: string) => void;
  onNew: () => void;
}

function groupByDate(sessions: Session[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const thisWeek = new Date(today.getTime() - 6 * 86400000);

  const groups: Record<string, Session[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };

  for (const s of sessions) {
    const d = new Date(s.created_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups.Today.push(s);
    else if (day >= yesterday) groups.Yesterday.push(s);
    else if (day >= thisWeek) groups["This Week"].push(s);
    else groups.Older.push(s);
  }

  return groups;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / 3600000;
  if (diffHours < 24) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffHours < 168) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationSidebar({
  mode,
  activeSessionId,
  onSelect,
  onNew,
}: ConversationSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const fetchFn = mode === "war-room" ? fetchSessions : fetchPrivateDeskSessions;

  useEffect(() => {
    const abortCtrl = new AbortController();
    setLoading(true);

    fetchFn()
      .then((data: Session[]) => {
        if (!abortCtrl.signal.aborted) setSessions(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!abortCtrl.signal.aborted) setLoading(false);
      });

    return () => abortCtrl.abort();
  }, [activeSessionId, mode]);

  // 300ms debounce on search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return sessions;
    const q = debouncedSearch.toLowerCase();
    return sessions.filter((s) =>
      (s.topic || "").toLowerCase().includes(q)
    );
  }, [sessions, debouncedSearch]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-council-border shrink-0">
        <span className="label-caps">History</span>
        <button
          onClick={onNew}
          className="text-xs text-council-gold hover:text-council-gold-light transition-colors label-caps"
          title="New conversation"
        >
          + New
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search..."
          className="glass-input w-full px-3 py-1.5 text-xs"
        />
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-6 text-center text-xs text-council-text-secondary">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-council-text-tertiary">
            No conversations yet
          </div>
        ) : (
          Object.entries(groups).map(([group, items]) =>
            items.length === 0 ? null : (
              <div key={group}>
                <div className="px-4 py-2">
                  <span className="label-caps text-council-text-tertiary">{group}</span>
                </div>
                {items.map((s) => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        onSelect(s.id, s.topic);
                        setMobileOpen(false);
                      }}
                      className={`
                        w-full text-left px-4 py-2.5 transition-colors border-b border-council-border/40 last:border-0
                        ${isActive
                          ? "bg-council-navy-mid border-l-2 border-l-council-gold"
                          : "hover:bg-council-navy-mid/40 border-l-2 border-l-transparent"
                        }
                      `}
                    >
                      <p className={`text-xs truncate ${isActive ? "text-council-text-primary" : "text-council-text-secondary"}`}>
                        {s.topic || "Untitled"}
                      </p>
                      <p className="text-[10px] text-council-text-tertiary mt-0.5">
                        {formatTime(s.created_at)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )
          )
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-lg glass-subtle text-council-text-secondary hover:text-council-text-primary transition-colors"
        aria-label="Toggle history"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-council-navy/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          w-64 bg-council-surface border-r border-council-border
          flex flex-col
          transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {sidebarContent}
      </div>
    </>
  );
}
