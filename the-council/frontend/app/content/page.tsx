"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import { startGenericStream } from "@/lib/api";

type ContentTool = "hooks" | "captions" | "concepts" | "analyze-failures" | "script";

const TOOLS: { key: ContentTool; label: string; emoji: string; description: string; fields: { name: string; placeholder: string; type?: string }[] }[] = [
  {
    key: "hooks",
    label: "Hook Generator",
    emoji: "&#127907;",
    description: "Generate viral TikTok hooks",
    fields: [
      { name: "niche", placeholder: "Your niche (e.g., AI, business, fitness)" },
      { name: "topic", placeholder: "Specific topic for the hook" },
    ],
  },
  {
    key: "captions",
    label: "Caption Writer",
    emoji: "&#128221;",
    description: "Optimized captions with hashtags",
    fields: [
      { name: "content_summary", placeholder: "What is the content about?" },
      { name: "platform", placeholder: "Platform (TikTok, Instagram, Twitter)" },
    ],
  },
  {
    key: "concepts",
    label: "Concept Lab",
    emoji: "&#128161;",
    description: "Brainstorm video concepts",
    fields: [
      { name: "niche", placeholder: "Your niche" },
      { name: "audience", placeholder: "Target audience" },
    ],
  },
  {
    key: "analyze-failures",
    label: "Failure Analysis",
    emoji: "&#128269;",
    description: "Analyze why content failed",
    fields: [
      { name: "content_description", placeholder: "Describe the content that failed" },
      { name: "metrics", placeholder: "Views, likes, shares, comments, watch time..." },
    ],
  },
  {
    key: "script",
    label: "Script Writer",
    emoji: "&#127916;",
    description: "Full video script with hooks and CTA",
    fields: [
      { name: "topic", placeholder: "Video topic" },
      { name: "duration", placeholder: "Duration (30s, 60s, 3min)" },
    ],
  },
];

export default function ContentPage() {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<ContentTool | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);

  const tool = TOOLS.find((t) => t.key === selectedTool);

  const handleRun = () => {
    if (!selectedTool || streaming) return;
    setStreaming(true);
    setResponse("");

    startGenericStream(
      `/content/${selectedTool}`,
      formData,
      {
        onAgentToken: (data) => setResponse((prev) => prev + (data as { token: string }).token),
        onRoundEnd: () => setStreaming(false),
        onError: () => setStreaming(false),
      }
    );
  };

  return (
    <div className="min-h-[100dvh] p-3 sm:p-6 bg-[#F8F9FA]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-gray-700 text-sm">&larr; Back</button>
          <h1 className="text-xl sm:text-2xl font-bold">Content Lab</h1>
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-6">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setSelectedTool(t.key);
                setFormData({});
                setResponse("");
              }}
            >
              <GlassPanel className={`p-3 text-center transition-all h-full ${selectedTool === t.key ? "ring-2 ring-pink-400" : "hover:-translate-y-0.5"}`}>
                <p className="text-xl mb-1" dangerouslySetInnerHTML={{ __html: t.emoji }} />
                <p className="text-[11px] sm:text-xs font-semibold text-gray-900">{t.label}</p>
              </GlassPanel>
            </button>
          ))}
        </div>

        {/* Tool Interface */}
        {tool ? (
          <GlassPanel className="p-4 sm:p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-1">{tool.label}</h2>
            <p className="text-xs text-gray-400 mb-4">{tool.description}</p>

            <div className="space-y-3">
              {tool.fields.map((field) => (
                <input
                  key={field.name}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  className="glass-input w-full px-4 py-3 text-sm"
                  disabled={streaming}
                />
              ))}
            </div>

            <button
              onClick={handleRun}
              disabled={streaming}
              className="btn-primary px-6 py-3 text-sm w-full mt-4 disabled:opacity-50"
            >
              {streaming ? "Generating..." : "Generate"}
            </button>

            {response && (
              <div className="mt-6 p-4 bg-white/30 rounded-xl text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {response}
                {streaming && <span className="inline-block w-1.5 h-4 bg-pink-500 animate-pulse ml-0.5" />}
              </div>
            )}
          </GlassPanel>
        ) : (
          <GlassPanel className="p-8 text-center">
            <p className="text-3xl mb-3">&#127916;</p>
            <p className="text-gray-400 text-sm">Select a content tool</p>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
