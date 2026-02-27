"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import { startGenericStream } from "@/lib/api";

type Tool = "swot" | "revenue-model" | "brainstorm" | "pitch-review";

const TOOLS: { key: Tool; label: string; emoji: string; description: string; placeholder: string }[] = [
  { key: "swot", label: "SWOT Analysis", emoji: "&#128200;", description: "Strengths, Weaknesses, Opportunities, Threats", placeholder: "Describe your business or idea..." },
  { key: "revenue-model", label: "Revenue Model", emoji: "&#128176;", description: "Build a revenue model with real numbers", placeholder: "Describe your business and pricing..." },
  { key: "brainstorm", label: "Brainstorm", emoji: "&#128161;", description: "Multi-agent idea generation", placeholder: "What problem or idea to brainstorm?" },
  { key: "pitch-review", label: "Pitch Review", emoji: "&#127908;", description: "Council reviews your elevator pitch", placeholder: "Paste your elevator pitch..." },
];

export default function WorkshopPage() {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);

  const handleRun = () => {
    if (!selectedTool || !input.trim() || streaming) return;
    setStreaming(true);
    setResponse("");

    const body: Record<string, unknown> = {};
    if (selectedTool === "swot") { body.topic = input; body.context = context; }
    else if (selectedTool === "revenue-model") { body.business = input; body.details = context; }
    else if (selectedTool === "brainstorm") { body.idea = input; body.context = context; }
    else if (selectedTool === "pitch-review") { body.pitch = input; }

    startGenericStream(
      `/workshop/${selectedTool}`,
      body,
      {
        onAgentToken: (data) => setResponse((prev) => prev + (data as { token: string }).token),
        onRoundEnd: () => setStreaming(false),
        onError: () => setStreaming(false),
      }
    );
  };

  const tool = TOOLS.find((t) => t.key === selectedTool);

  return (
    <div className="min-h-[100dvh] p-3 sm:p-6 bg-[#F8F9FA]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-gray-700 text-sm">&larr; Back</button>
          <h1 className="text-xl sm:text-2xl font-bold">Workshop</h1>
        </div>

        {/* Tool Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setSelectedTool(t.key); setResponse(""); setInput(""); setContext(""); }}
            >
              <GlassPanel className={`p-3 sm:p-4 text-center transition-all h-full ${selectedTool === t.key ? "ring-2 ring-emerald-400" : "hover:-translate-y-0.5"}`}>
                <p className="text-xl sm:text-2xl mb-1" dangerouslySetInnerHTML={{ __html: t.emoji }} />
                <p className="text-xs sm:text-sm font-semibold text-gray-900">{t.label}</p>
                <p className="text-[10px] text-gray-400 hidden sm:block mt-1">{t.description}</p>
              </GlassPanel>
            </button>
          ))}
        </div>

        {/* Tool Interface */}
        {tool ? (
          <GlassPanel className="p-4 sm:p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">{tool.label}</h2>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tool.placeholder}
              className="glass-input w-full px-4 py-3 text-sm min-h-[100px] resize-y mb-3"
              disabled={streaming}
            />

            {selectedTool !== "pitch-review" && (
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Additional context (optional)..."
                className="glass-input w-full px-4 py-3 text-sm min-h-[60px] resize-y mb-3"
                disabled={streaming}
              />
            )}

            <button
              onClick={handleRun}
              disabled={streaming || !input.trim()}
              className="btn-primary px-6 py-3 text-sm w-full disabled:opacity-50"
            >
              {streaming ? "Running..." : `Run ${tool.label}`}
            </button>

            {response && (
              <div className="mt-6 p-4 bg-white/30 rounded-xl text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {response}
                {streaming && <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-0.5" />}
              </div>
            )}
          </GlassPanel>
        ) : (
          <GlassPanel className="p-8 text-center">
            <p className="text-3xl mb-3">&#128295;</p>
            <p className="text-gray-400 text-sm">Select a tool to get started</p>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
