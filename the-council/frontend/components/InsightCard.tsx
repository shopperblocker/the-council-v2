"use client";

import type { Insight } from "@/lib/types";
import { getAgentColor, getAgentInitials } from "@/lib/design-system";

interface InsightCardProps {
  insight: Insight;
  onClick: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  opportunity: "Opportunity",
  warning: "Warning",
  pattern: "Pattern",
  consensus: "Consensus",
};

const TYPE_COLORS: Record<string, string> = {
  opportunity: "#c9a84c",
  warning: "#ef4444",
  pattern: "#7b9ea6",
  consensus: "#8b9467",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "text-red-400 bg-red-400/10 border-red-400/20",
  medium: "text-council-gold bg-council-gold/10 border-council-gold/20",
  low: "text-council-text-secondary bg-council-text-secondary/10 border-council-text-secondary/20",
};

export default function InsightCard({ insight, onClick }: InsightCardProps) {
  const agentColor = getAgentColor(insight.agent_name);
  const initials = getAgentInitials(insight.agent_name);
  const typeColor = TYPE_COLORS[insight.insight_type] ?? "#c9a84c";

  return (
    <button
      onClick={onClick}
      className="w-full text-left group transition-all duration-200"
    >
      <div
        className="p-4 rounded-xl transition-all duration-200 group-hover:border-council-gold/40"
        style={{
          background: "linear-gradient(135deg, rgba(15,30,53,0.9), rgba(10,22,40,0.7))",
          border: `1px solid rgba(30,58,95,0.8)`,
          borderLeft: `3px solid ${typeColor}`,
        }}
      >
        {/* Header row */}
        <div className="flex items-start gap-2 mb-2">
          {/* Agent initials */}
          <div
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold mt-0.5"
            style={{
              background: `${agentColor}18`,
              border: `1.5px solid ${agentColor}`,
              color: agentColor,
              fontFamily: "var(--font-label)",
            }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: typeColor }}
              >
                {TYPE_LABELS[insight.insight_type] ?? insight.insight_type}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded border label-caps ${PRIORITY_BADGE[insight.priority] ?? PRIORITY_BADGE.medium}`}
              >
                {insight.priority}
              </span>
              {!insight.viewed && (
                <span className="w-1.5 h-1.5 rounded-full bg-council-gold flex-shrink-0" />
              )}
            </div>

            <p className="text-sm font-semibold text-council-text-primary leading-snug">
              {insight.title}
            </p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-xs text-council-text-secondary leading-relaxed line-clamp-2 ml-8">
          {insight.summary || insight.content}
        </p>

        {/* Tags */}
        {insight.tags && insight.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-8">
            {insight.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 rounded-full label-caps"
                style={{
                  background: "rgba(201,168,76,0.08)",
                  border: "1px solid rgba(201,168,76,0.2)",
                  color: "#9a8a6a",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 ml-8">
          <span className="text-[10px] text-council-text-tertiary">
            {insight.agent_name.replace(/_/g, " ")}
          </span>
          <span className="text-[10px] text-council-text-tertiary">
            {new Date(insight.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    </button>
  );
}
