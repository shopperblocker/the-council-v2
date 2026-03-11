"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AgentQuickLaunch from "@/components/AgentQuickLaunch";

const STORAGE_KEY = "council:academy:topics";

interface Topic {
  id: string;
  title: string;
  course: string;
  date: string;
  mastered: boolean;
}

const QUICK_ACTIONS = [
  {
    label: "Essay Review",
    prompt: "Review my writing for clarity, argumentation, and depth. Give specific, actionable feedback.",
  },
  {
    label: "Concept Explainer",
    prompt: "Explain this concept using the Feynman technique — no jargon, just first principles.",
  },
  {
    label: "Exam Prep",
    prompt: "Help me prepare for my upcoming exam. Quiz me and identify my weak spots.",
  },
  {
    label: "Socratic Dialogue",
    prompt: "Challenge my understanding through questions. Don't give me answers — make me discover them.",
  },
];

export default function AcademyPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [prefill, setPrefill] = useState(QUICK_ACTIONS[0].prompt);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTopics(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (updated: Topic[]) => {
    setTopics(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addTopic = () => {
    if (!title.trim()) return;
    const topic: Topic = {
      id: Date.now().toString(),
      title: title.trim(),
      course: course.trim(),
      date: new Date().toISOString().split("T")[0],
      mastered: false,
    };
    save([topic, ...topics]);
    setTitle("");
    setCourse("");
    setAdding(false);
  };

  const toggleMastered = (id: string) => {
    save(topics.map((t) => (t.id === id ? { ...t, mastered: !t.mastered } : t)));
  };

  const deleteTopic = (id: string) => {
    save(topics.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-[100dvh] bg-council-navy p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
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
            ACADEMY
          </h1>
          <p className="label-caps text-council-text-secondary">Adaptive Learning</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Study Topics */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="label-caps">Study Topics</span>
              <button
                onClick={() => setAdding(!adding)}
                className="text-xs text-council-gold hover:text-council-gold-light transition-colors label-caps"
              >
                {adding ? "Cancel" : "+ Add"}
              </button>
            </div>

            {/* Add form */}
            {adding && (
              <div
                className="p-3 rounded-xl mb-3 space-y-2"
                style={{
                  background: "rgba(15,30,53,0.8)",
                  border: "1px solid rgba(201,168,76,0.2)",
                }}
              >
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Topic title"
                  className="glass-input w-full px-3 py-2 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && addTopic()}
                  autoFocus
                />
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Course (optional)"
                  className="glass-input w-full px-3 py-2 text-sm"
                />
                <button
                  onClick={addTopic}
                  disabled={!title.trim()}
                  className="btn-primary w-full py-2 text-sm disabled:opacity-40"
                >
                  Add Topic
                </button>
              </div>
            )}

            {/* Topics list */}
            {topics.length === 0 ? (
              <p className="text-xs text-council-text-tertiary text-center py-8">
                No topics yet. Add your first study topic above.
              </p>
            ) : (
              <div className="space-y-2">
                {topics.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-2 p-3 rounded-xl group transition-all"
                    style={{
                      background: "rgba(15,30,53,0.6)",
                      border: "1px solid rgba(30,58,95,0.7)",
                      opacity: t.mastered ? 0.6 : 1,
                    }}
                  >
                    <button
                      onClick={() => toggleMastered(t.id)}
                      className="flex-shrink-0 w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: t.mastered ? "#c9a84c" : "#1e3a5f",
                        background: t.mastered ? "rgba(201,168,76,0.2)" : "transparent",
                      }}
                    >
                      {t.mastered && <span className="text-[8px] text-council-gold">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${t.mastered ? "line-through text-council-text-secondary" : "text-council-text-primary"}`}>
                        {t.title}
                      </p>
                      {t.course && (
                        <p className="text-[10px] text-council-text-tertiary mt-0.5">{t.course}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTopic(t.id)}
                      className="flex-shrink-0 text-council-text-tertiary hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Quick Launch */}
          <div className="space-y-4">
            <div>
              <div className="label-caps mb-2">Quick Actions</div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setPrefill(action.prompt)}
                    className="px-3 py-2 rounded-lg text-xs text-left transition-all"
                    style={{
                      background: prefill === action.prompt ? "rgba(201,168,76,0.08)" : "rgba(15,30,53,0.5)",
                      border: `1px solid ${prefill === action.prompt ? "rgba(201,168,76,0.4)" : "rgba(30,58,95,0.8)"}`,
                      color: prefill === action.prompt ? "#c9a84c" : "#9a8a6a",
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <AgentQuickLaunch
              agents={["Feynman", "Marcus_Aurelius"]}
              prefillPrompt={prefill}
              mode="private-desk"
              title="Ask the Scholars"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
