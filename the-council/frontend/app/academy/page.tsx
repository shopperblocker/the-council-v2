"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import ErrorBanner from "@/components/ErrorBanner";
import { fetchStudyPaths, createStudyPath, startGenericStream, isTokenEvent } from "@/lib/api";
import type { StudyPath } from "@/lib/types";

type Mode = "paths" | "explain" | "question" | "quiz";

const MASTERY_COLORS: Record<string, string> = {
  not_started: "#9CA3AF",
  learning: "#F59E0B",
  practiced: "#3B82F6",
  mastered: "#10B981",
};

export default function AcademyPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<StudyPath[]>([]);
  const [mode, setMode] = useState<Mode>("paths");
  const [showAdd, setShowAdd] = useState(false);
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudyPaths().then(setPaths).catch(() => setError("Failed to load study paths. Is the backend running?"));
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createStudyPath({
      subject: form.get("subject") as string,
      description: form.get("description") as string,
      difficulty: form.get("difficulty") as string,
    });
    setShowAdd(false);
    fetchStudyPaths().then(setPaths);
  };

  const handleAIAction = (endpoint: string) => {
    if (!input.trim() || streaming) return;
    setStreaming(true);
    setResponse("");
    startGenericStream(
      `/academy/${endpoint}`,
      { concept: input, topic: input, difficulty: "intermediate" },
      {
        onAgentToken: (data) => { if (isTokenEvent(data)) setResponse((prev) => prev + data.token); },
        onRoundEnd: () => setStreaming(false),
        onError: () => setStreaming(false),
      }
    );
  };

  const modes: { key: Mode; label: string; emoji: string; description: string }[] = [
    { key: "paths", label: "Study Paths", emoji: "📚", description: "Track your learning" },
    { key: "explain", label: "Feynman Explains", emoji: "⚛️", description: "Simple explanations" },
    { key: "question", label: "Socrates Questions", emoji: "🦉", description: "Challenge understanding" },
    { key: "quiz", label: "Quiz Me", emoji: "🧠", description: "Test your knowledge" },
  ];

  return (
    <div className="min-h-[100dvh] p-3 sm:p-6 bg-[#F8F9FA]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-gray-700 text-sm">&larr; Back</button>
          <h1 className="text-xl sm:text-2xl font-bold">Academy</h1>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Mode Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          {modes.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)}>
              <GlassPanel className={`p-3 sm:p-4 text-center transition-all ${mode === m.key ? "ring-2 ring-amber-400" : "hover:-translate-y-0.5"}`}>
                <p className="text-xl sm:text-2xl mb-1">{m.emoji}</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-900">{m.label}</p>
                <p className="text-[10px] text-gray-400 hidden sm:block">{m.description}</p>
              </GlassPanel>
            </button>
          ))}
        </div>

        {/* Study Paths View */}
        {mode === "paths" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Your Study Paths</h2>
              <button onClick={() => setShowAdd(!showAdd)} className="text-sm text-amber-500 hover:text-amber-700">+ Add Path</button>
            </div>

            {showAdd && (
              <GlassPanel className="p-4 mb-4">
                <form onSubmit={handleCreate} className="space-y-3">
                  <input name="subject" placeholder="Subject (e.g., Linear Algebra)" required className="glass-input w-full px-4 py-3 text-sm" />
                  <textarea name="description" placeholder="Description" className="glass-input w-full px-4 py-2 text-sm" />
                  <select name="difficulty" className="glass-input w-full px-4 py-2 text-sm">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <button type="submit" className="btn-primary px-4 py-2 text-sm w-full">Create</button>
                </form>
              </GlassPanel>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paths.map((path) => (
                <GlassPanel key={path.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{path.subject}</h3>
                      {path.description && <p className="text-xs text-gray-400 mt-1">{path.description}</p>}
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg mt-2 inline-block capitalize">{path.difficulty}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-500">{Math.round(path.progress * 100)}%</span>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${path.progress * 100}%` }} />
                  </div>
                  {path.topics && path.topics.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {path.topics.map((topic) => (
                        <div key={topic.id} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MASTERY_COLORS[topic.mastery_level] || "#9CA3AF" }} />
                          <span className="text-xs text-gray-600">{topic.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassPanel>
              ))}
              {paths.length === 0 && (
                <GlassPanel className="p-8 sm:col-span-2 text-center">
                  <p className="text-gray-400 text-sm">No study paths yet. Create one to get started.</p>
                </GlassPanel>
              )}
            </div>
          </div>
        )}

        {/* AI Modes */}
        {mode !== "paths" && (
          <div>
            <GlassPanel className="p-4 sm:p-6">
              <div className="flex gap-2 sm:gap-3 mb-4">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAIAction(mode === "explain" ? "explain" : mode === "question" ? "question" : "quiz");
                    }
                  }}
                  placeholder={
                    mode === "explain" ? "What concept should Feynman explain?" :
                    mode === "question" ? "What topic should Socrates probe?" :
                    "What should the quiz cover?"
                  }
                  disabled={streaming}
                  className="glass-input flex-1 px-4 py-3 text-sm"
                />
                <button
                  onClick={() => handleAIAction(mode === "explain" ? "explain" : mode === "question" ? "question" : "quiz")}
                  disabled={streaming || !input.trim()}
                  className="btn-primary px-4 sm:px-6 py-3 text-sm shrink-0 disabled:opacity-50"
                >
                  {streaming ? "..." : "Go"}
                </button>
              </div>

              {response && (
                <div className="p-4 bg-white/30 rounded-xl text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {response}
                  {streaming && <span className="inline-block w-1.5 h-4 bg-amber-500 animate-pulse ml-0.5" />}
                </div>
              )}
            </GlassPanel>
          </div>
        )}
      </div>
    </div>
  );
}
