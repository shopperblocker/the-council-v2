"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AgentQuickLaunch from "@/components/AgentQuickLaunch";

const STORAGE_KEY = "council:plans:goals";

type Column = "This Week" | "This Semester" | "Long Term";

interface Goal {
  id: string;
  text: string;
  column: Column;
  done: boolean;
  deadline?: string;
}

const COLUMNS: Column[] = ["This Week", "This Semester", "Long Term"];

const COLUMN_COLORS: Record<Column, string> = {
  "This Week": "#c9a84c",
  "This Semester": "#7b9ea6",
  "Long Term": "#8b9467",
};

export default function PlansPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [adding, setAdding] = useState<Column | null>(null);
  const [draft, setDraft] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setGoals(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (updated: Goal[]) => {
    setGoals(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addGoal = (col: Column) => {
    if (!draft.trim()) return;
    save([
      ...goals,
      {
        id: Date.now().toString(),
        text: draft.trim(),
        column: col,
        done: false,
        deadline: deadline || undefined,
      },
    ]);
    setDraft("");
    setDeadline("");
    setAdding(null);
  };

  const toggleDone = (id: string) => {
    save(goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  };

  const deleteGoal = (id: string) => {
    save(goals.filter((g) => g.id !== id));
  };

  // Compile all goals for the "Review with Council" prompt
  const compiledGoals = COLUMNS.map((col) => {
    const colGoals = goals.filter((g) => g.column === col && !g.done);
    if (colGoals.length === 0) return null;
    return `${col}:\n${colGoals.map((g) => `- ${g.text}${g.deadline ? ` (by ${g.deadline})` : ""}`).join("\n")}`;
  })
    .filter(Boolean)
    .join("\n\n");

  const reviewPrompt = compiledGoals
    ? `Review my current goals and give strategic advice:\n\n${compiledGoals}\n\nWhat should I prioritize? What am I missing? What risks do you see?`
    : "Help me think through a strategic plan. What goals should I be setting for this week, this semester, and long term?";

  const weeklyReviewPrompt = `Weekly review check-in. Here are my goals:\n\n${compiledGoals || "(no goals set)"}\n\nWhat did I accomplish? What's blocking me? What's the most important thing this week?`;

  return (
    <div className="min-h-[100dvh] bg-council-navy p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-council-text-secondary hover:text-council-text-primary transition-colors text-sm mb-5 block"
          >
            &larr; Back
          </button>
          <div className="rule-gold w-10 mb-4" />
          <h1
            className="text-3xl text-council-gold mb-1"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, letterSpacing: "0.1em" }}
          >
            PLANS
          </h1>
          <p className="label-caps text-council-text-secondary">Strategy Execution</p>
        </div>

        {/* Three column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {COLUMNS.map((col) => {
            const colGoals = goals.filter((g) => g.column === col);
            const color = COLUMN_COLORS[col];
            return (
              <div key={col}>
                <div
                  className="flex items-center justify-between mb-3 pb-2"
                  style={{ borderBottom: `1px solid ${color}30` }}
                >
                  <span className="label-caps" style={{ color }}>{col}</span>
                  <button
                    onClick={() => { setAdding(col); setDraft(""); setDeadline(""); }}
                    className="text-[10px] transition-colors label-caps hover:opacity-80"
                    style={{ color }}
                  >
                    + Add
                  </button>
                </div>

                {/* Add form */}
                {adding === col && (
                  <div
                    className="p-2.5 rounded-lg mb-2 space-y-1.5"
                    style={{ background: "rgba(15,30,53,0.8)", border: `1px solid ${color}30` }}
                  >
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Goal..."
                      className="glass-input w-full px-2.5 py-1.5 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && addGoal(col)}
                      autoFocus
                    />
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="glass-input w-full px-2.5 py-1 text-xs"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => addGoal(col)}
                        disabled={!draft.trim()}
                        className="flex-1 py-1 text-xs rounded-lg transition-all disabled:opacity-40"
                        style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setAdding(null)}
                        className="px-2 py-1 text-xs rounded-lg text-council-text-tertiary border border-council-border"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Goals list */}
                <div className="space-y-1.5">
                  {colGoals.length === 0 ? (
                    <p className="text-[10px] text-council-text-tertiary italic py-4 text-center">No goals yet</p>
                  ) : (
                    colGoals.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-start gap-2 p-2 rounded-lg group transition-all"
                        style={{
                          background: "rgba(15,30,53,0.5)",
                          border: "1px solid rgba(30,58,95,0.6)",
                          opacity: g.done ? 0.5 : 1,
                        }}
                      >
                        <button
                          onClick={() => toggleDone(g.id)}
                          className="flex-shrink-0 w-3.5 h-3.5 rounded border mt-0.5 flex items-center justify-center transition-colors"
                          style={{
                            borderColor: g.done ? color : "#1e3a5f",
                            background: g.done ? `${color}20` : "transparent",
                          }}
                        >
                          {g.done && <span className="text-[7px]" style={{ color }}>✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${g.done ? "line-through text-council-text-secondary" : "text-council-text-primary"}`}>
                            {g.text}
                          </p>
                          {g.deadline && (
                            <p className="text-[9px] text-council-text-tertiary mt-0.5">{g.deadline}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteGoal(g.id)}
                          className="flex-shrink-0 text-[9px] text-council-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Council review buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AgentQuickLaunch
            agents={["Napoleon", "Marcus_Aurelius", "Rockefeller"]}
            prefillPrompt={reviewPrompt}
            mode="war-room"
            title="Review with Council"
          />
          <AgentQuickLaunch
            agents={["Marcus_Aurelius"]}
            prefillPrompt={weeklyReviewPrompt}
            mode="private-desk"
            title="Weekly Review"
          />
        </div>
      </div>
    </div>
  );
}
