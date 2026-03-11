"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchSessions,
  fetchPrivateDeskSessions,
  fetchUnreadInsightsCount,
  fetchClawSummary,
} from "@/lib/api";
import type { ClawSummary } from "@/lib/types";

interface Metrics {
  warRoomSessions: number;
  privateDeskSessions: number;
  unreadInsights: number;
  claw: ClawSummary | null;
}

const TABLES = [
  {
    name: "War Room",
    label: "Strategic Debates",
    description: "Multi-agent debates. Your advisors argue, challenge, and build on each other's ideas in real time.",
    href: "/war-room",
    color: "#DC2626",
    accent: "rgba(220, 38, 38, 0.12)",
    initial: "W",
  },
  {
    name: "Private Desk",
    label: "1-on-1 Advisory",
    description: "Deep conversations with a single advisor. Uninterrupted. Personal. Focused.",
    href: "/private-desk",
    color: "#3B82F6",
    accent: "rgba(59, 130, 246, 0.12)",
    initial: "P",
  },
  {
    name: "Academy",
    label: "Adaptive Learning",
    description: "Structured learning with adaptive difficulty. Feynman explains, Socrates questions, Da Vinci connects the dots.",
    href: "/academy",
    color: "#F59E0B",
    accent: "rgba(245, 158, 11, 0.12)",
    initial: "A",
  },
  {
    name: "Workshop",
    label: "Business Tools",
    description: "SWOT analysis, revenue models, brainstorming, pitch review. Business tools powered by AI.",
    href: "/workshop",
    color: "#10B981",
    accent: "rgba(16, 185, 129, 0.12)",
    initial: "W",
  },
  {
    name: "Financial HQ",
    label: "Money & Numbers",
    description: "Track your tuition fund, income, expenses. Rockefeller watches the numbers.",
    href: "/financial",
    color: "#059669",
    accent: "rgba(5, 150, 105, 0.12)",
    initial: "F",
  },
  {
    name: "Plans Hub",
    label: "Strategy Execution",
    description: "Create plans, get Council feedback, track milestones. Strategy made executable.",
    href: "/plans",
    color: "#7C3AED",
    accent: "rgba(124, 58, 237, 0.12)",
    initial: "P",
  },
  {
    name: "Content Lab",
    label: "Creator Engine",
    description: "TikTok hooks, captions, video scripts, failure analysis. Your content creation engine.",
    href: "/content",
    color: "#EC4899",
    accent: "rgba(236, 72, 153, 0.12)",
    initial: "C",
  },
  {
    name: "Business Engine",
    label: "Commerce HQ",
    description: "Deal tracking, arbitrage, listing copy, order fulfillment. Your commerce operations center.",
    href: "/business",
    color: "#F97316",
    accent: "rgba(249, 115, 22, 0.12)",
    initial: "B",
  },
  {
    name: "Insights",
    label: "Advisory Patterns",
    description: "Patterns, opportunities, and warnings your advisors have flagged across all your sessions.",
    href: "/insights",
    color: "#c9a84c",
    accent: "rgba(201,168,76,0.12)",
    initial: "I",
  },
  {
    name: "Profile",
    label: "Your Dossier",
    description: "Edit what your advisors know about you. Control the context. Shape the advice.",
    href: "/profile",
    color: "#8A8A9A",
    accent: "rgba(138, 138, 154, 0.12)",
    initial: "P",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics>({
    warRoomSessions: 0,
    privateDeskSessions: 0,
    unreadInsights: 0,
    claw: null,
  });

  useEffect(() => {
    // Fetch all metrics in parallel — failures are non-fatal
    Promise.allSettled([
      fetchSessions().then((s) => s.length).catch(() => 0),
      fetchPrivateDeskSessions().then((s) => s.length).catch(() => 0),
      fetchUnreadInsightsCount().catch(() => 0),
      fetchClawSummary().catch(() => null),
    ]).then(([wr, pd, ins, claw]) => {
      setMetrics({
        warRoomSessions: wr.status === "fulfilled" ? wr.value : 0,
        privateDeskSessions: pd.status === "fulfilled" ? pd.value : 0,
        unreadInsights: ins.status === "fulfilled" ? (ins.value as number) : 0,
        claw: claw.status === "fulfilled" ? (claw.value as ClawSummary | null) : null,
      });
    });
  }, []);

  const clawTotal = metrics.claw
    ? metrics.claw.total
    : 0;
  const clawRunning = metrics.claw?.running ?? 0;

  return (
    <div className="min-h-screen bg-council-navy py-10 sm:py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <Link
              href="/"
              className="font-mono text-xs tracking-[0.2em] uppercase text-council-text-tertiary hover:text-council-text-secondary transition-colors mb-4 inline-block"
            >
              &larr; Home
            </Link>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-council-text-primary">
              Choose Your Table
            </h1>
            <p className="text-council-text-secondary mt-2 text-sm">
              Your advisors are waiting.
            </p>
          </div>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <MetricCard
            label="War Room Sessions"
            value={metrics.warRoomSessions}
            color="#DC2626"
          />
          <MetricCard
            label="Private Desk Sessions"
            value={metrics.privateDeskSessions}
            color="#3B82F6"
          />
          <MetricCard
            label="Unread Insights"
            value={metrics.unreadInsights}
            color="#c9a84c"
            href="/insights"
          />
          <MetricCard
            label={clawRunning > 0 ? `Claw: ${clawRunning} running` : "Claw Tasks"}
            value={clawTotal}
            color="#10B981"
          />
        </div>

        {/* Table Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {TABLES.map((table) => {
            // Badge counts for specific cards
            let badge: number | null = null;
            if (table.href === "/insights" && metrics.unreadInsights > 0) {
              badge = metrics.unreadInsights;
            }

            return (
              <button
                key={table.href + table.name}
                onClick={() => router.push(table.href)}
                className="text-left group"
              >
                <div
                  className="h-full p-5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  style={{
                    background: "#0f1e35",
                    borderColor: "#1e3a5f",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${table.color}40`;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px ${table.color}10`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#1e3a5f";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className="relative w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-display font-bold"
                      style={{ background: table.accent, color: table.color }}
                    >
                      {table.initial}
                      {badge != null && badge > 0 && (
                        <span
                          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-white"
                          style={{ background: table.color }}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-0.5" style={{ color: table.color, opacity: 0.7 }}>
                        {table.label}
                      </p>
                      <h2 className="font-display text-base font-bold text-council-text-primary">
                        {table.name}
                      </h2>
                      <p className="text-xs text-council-text-secondary mt-1.5 leading-relaxed">
                        {table.description}
                      </p>
                    </div>
                  </div>

                  <div
                    className="mt-4 text-xs font-semibold font-mono tracking-wide transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ color: table.color }}
                  >
                    Enter &rarr;
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center mt-10 text-[10px] text-council-text-tertiary font-mono tracking-widest uppercase">
          Opus 4.6 &middot; Sonnet 4.5 &middot; Haiku 4.5 &middot; 12 Advisors &middot; 4 Boards
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={href ? () => router.push(href) : undefined}
      className={`text-left p-4 rounded-xl border transition-all ${href ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"}`}
      style={{
        background: "#0f1e35",
        borderColor: "#1e3a5f",
      }}
    >
      <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-council-text-secondary mb-1">
        {label}
      </p>
      <p
        className="text-2xl font-display font-bold"
        style={{ color }}
      >
        {value}
      </p>
    </button>
  );
}
