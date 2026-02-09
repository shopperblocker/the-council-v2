"use client";

import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";

const TABLES = [
  {
    name: "War Room",
    emoji: "⚔️",
    description: "Multi-agent strategic debates. Your advisors argue, challenge, and build on each other's ideas.",
    href: "/war-room",
    color: "#DC2626",
    ready: true,
  },
  {
    name: "Private Desk",
    emoji: "🪑",
    description: "1-on-1 advisory sessions. Deep conversations with a single advisor.",
    href: "/private-desk",
    color: "#3B82F6",
    ready: false,
  },
  {
    name: "Academy",
    emoji: "📚",
    description: "Structured learning with adaptive difficulty. Feynman teaches, Socrates questions.",
    href: "/academy",
    color: "#F59E0B",
    ready: false,
  },
  {
    name: "Workshop",
    emoji: "🔧",
    description: "Collaborative building with tools. Revenue calculators, SWOT analysis, goal tracking.",
    href: "/workshop",
    color: "#10B981",
    ready: false,
  },
  {
    name: "Financial HQ",
    emoji: "💰",
    description: "Track your tuition fund, income, expenses. Rockefeller watches the numbers.",
    href: "/financial",
    color: "#059669",
    ready: false,
  },
  {
    name: "Plans Hub",
    emoji: "📋",
    description: "Strategy execution. Create plans, get Council feedback, track progress.",
    href: "/plans",
    color: "#7C3AED",
    ready: false,
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
            🏛️ The Council
          </h1>
          <p className="text-gray-500 text-lg">
            Choose your table. Your advisors are waiting.
          </p>
        </div>

        {/* Table Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TABLES.map((table) => (
            <button
              key={table.name}
              onClick={() => table.ready && router.push(table.href)}
              disabled={!table.ready}
              className="text-left group"
            >
              <GlassPanel
                className={`
                  p-6 h-full transition-all duration-300
                  ${table.ready
                    ? "hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{table.emoji}</span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      {table.name}
                      {!table.ready && (
                        <span className="text-[10px] font-medium bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Soon
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {table.description}
                    </p>
                  </div>
                </div>
                {table.ready && (
                  <div
                    className="mt-4 text-sm font-semibold transition-colors"
                    style={{ color: table.color }}
                  >
                    Enter →
                  </div>
                )}
              </GlassPanel>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-xs text-gray-400 tracking-wide">
            Opus 4.6 · Sonnet 4.5 · Haiku 4.5 · 12 Advisors · 4 Boards
          </p>
        </div>
      </div>
    </div>
  );
}
