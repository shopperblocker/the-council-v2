"use client";

import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { Insight } from "@/lib/types";
import { getAgentColor } from "@/lib/design-system";

interface InsightDetailProps {
  insight: Insight;
  onClose: () => void;
  onMarkActed?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  opportunity: "#c9a84c",
  warning: "#ef4444",
  pattern: "#7b9ea6",
  consensus: "#8b9467",
};

export default function InsightDetail({ insight, onClose, onMarkActed }: InsightDetailProps) {
  const agentColor = getAgentColor(insight.agent_name);
  const typeColor = TYPE_COLORS[insight.insight_type] ?? "#c9a84c";

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,40,0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, #0f1e35, #0a1628)",
          border: `1px solid rgba(30,58,95,0.9)`,
          borderLeft: `4px solid ${typeColor}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-council-text-secondary hover:text-council-text-primary transition-colors"
          style={{ background: "rgba(30,58,95,0.5)" }}
        >
          ✕
        </button>

        {/* Type + priority header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="label-caps text-xs"
            style={{ color: typeColor }}
          >
            {insight.insight_type}
          </span>
          <span className="text-council-text-tertiary text-xs">·</span>
          <span className="label-caps text-xs text-council-text-secondary">{insight.priority} priority</span>
        </div>

        {/* Title */}
        <h2
          className="text-2xl text-council-text-primary mb-4 leading-snug"
          style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
        >
          {insight.title}
        </h2>

        <div className="rule-gold w-12 mb-4" />

        {/* Summary */}
        {(insight.summary || insight.content) && (
          <div className="text-sm text-council-text-primary leading-relaxed council-markdown mb-5">
            <ReactMarkdown>{insight.summary || insight.content}</ReactMarkdown>
          </div>
        )}

        {/* Key Points */}
        {insight.key_points && insight.key_points.length > 0 && (
          <div className="mb-5">
            <h3 className="label-caps mb-2">Key Points</h3>
            <ul className="space-y-1.5">
              {insight.key_points.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm text-council-text-secondary leading-relaxed">
                  <span style={{ color: typeColor }} className="flex-shrink-0 mt-0.5">▸</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Actions */}
        {insight.recommended_actions && insight.recommended_actions.length > 0 && (
          <div className="mb-5">
            <h3 className="label-caps mb-2">Recommended Actions</h3>
            <ul className="space-y-1.5">
              {insight.recommended_actions.map((action, i) => (
                <li key={i} className="flex gap-2 text-sm text-council-text-primary leading-relaxed">
                  <span className="flex-shrink-0 mt-0.5 text-council-gold">◆</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        {insight.tags && insight.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {insight.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full label-caps"
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

        <div className="rule-gold w-12 mb-4" />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold"
              style={{
                background: `${agentColor}18`,
                border: `1.5px solid ${agentColor}`,
                color: agentColor,
                fontFamily: "var(--font-label)",
              }}
            >
              {insight.agent_name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs text-council-text-secondary">
              {insight.agent_name.replace(/_/g, " ")}
              {insight.source_mode && (
                <span className="text-council-text-tertiary"> · {insight.source_mode.replace(/_/g, " ")}</span>
              )}
            </span>
          </div>
          {onMarkActed && !insight.acted_on && (
            <button
              onClick={onMarkActed}
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "#c9a84c",
              }}
            >
              Mark Acted On
            </button>
          )}
          {insight.acted_on && (
            <span className="text-xs text-council-text-tertiary label-caps">Acted On ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
