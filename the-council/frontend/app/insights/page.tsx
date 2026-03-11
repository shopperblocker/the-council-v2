"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import InsightCard from "@/components/InsightCard";
import InsightDetail from "@/components/InsightDetail";
import { fetchAllInsights, markInsightViewed, markInsightActedOn } from "@/lib/api";
import type { Insight } from "@/lib/types";

const ALL_TYPES = ["opportunity", "warning", "pattern", "consensus"];

export default function InsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Insight | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  useEffect(() => {
    fetchAllInsights()
      .then(setInsights)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    insights.forEach((i) => i.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).slice(0, 12);
  }, [insights]);

  const filtered = useMemo(() => {
    return insights.filter((i) => {
      if (activeType && i.insight_type !== activeType) return false;
      if (activeTag && !i.tags?.includes(activeTag)) return false;
      return true;
    });
  }, [insights, activeType, activeTag]);

  const handleOpen = useCallback(async (insight: Insight) => {
    setSelected(insight);
    if (!insight.viewed) {
      await markInsightViewed(insight.id).catch(() => {});
      setInsights((prev) =>
        prev.map((i) => (i.id === insight.id ? { ...i, viewed: true } : i))
      );
    }
  }, []);

  const handleMarkActed = useCallback(async () => {
    if (!selected) return;
    await markInsightActedOn(selected.id).catch(() => {});
    const updated = { ...selected, acted_on: true, viewed: true };
    setSelected(updated);
    setInsights((prev) =>
      prev.map((i) => (i.id === selected.id ? updated : i))
    );
  }, [selected]);

  return (
    <div className="min-h-[100dvh] bg-council-navy">
      {/* Background ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 30% at 50% 10%, rgba(201,168,76,0.04), transparent)",
        }}
      />

      <div className="max-w-5xl mx-auto px-4 py-8 relative">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-council-text-secondary hover:text-council-text-primary transition-colors text-sm mb-6 block"
          >
            &larr; Back
          </button>

          <div className="rule-gold w-10 mb-5" />
          <h1
            className="text-4xl text-council-gold mb-2"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, letterSpacing: "0.1em" }}
          >
            INSIGHTS
          </h1>
          <p className="label-caps text-council-text-secondary">
            {insights.filter((i) => !i.viewed).length > 0
              ? `${insights.filter((i) => !i.viewed).length} unread · ${insights.length} total`
              : `${insights.length} insight${insights.length !== 1 ? "s" : ""} from your advisors`}
          </p>
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveType(null)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all label-caps ${
              activeType === null
                ? "bg-council-gold text-council-navy"
                : "border border-council-border text-council-text-secondary hover:border-council-gold/40"
            }`}
          >
            All
          </button>
          {ALL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(activeType === type ? null : type)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all label-caps ${
                activeType === type
                  ? "bg-council-gold text-council-navy"
                  : "border border-council-border text-council-text-secondary hover:border-council-gold/40"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Tag filter pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`text-[10px] px-2 py-1 rounded-full transition-all label-caps ${
                  activeTag === tag
                    ? "bg-council-gold/20 border-council-gold/50 text-council-gold border"
                    : "border border-council-border/50 text-council-text-tertiary hover:border-council-gold/30"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Insights grid */}
        {loading ? (
          <div className="text-center py-16 text-council-text-secondary text-sm">
            Loading insights...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">&#128161;</div>
            <p className="text-council-text-secondary text-sm mb-4">
              {insights.length === 0
                ? "No insights yet. Start a conversation in the War Room or Private Desk."
                : "No insights match the current filters."}
            </p>
            {insights.length === 0 && (
              <button
                onClick={() => router.push("/war-room")}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Open War Room
              </button>
            )}
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 gap-3 space-y-3">
            {filtered.map((insight) => (
              <div key={insight.id} className="break-inside-avoid">
                <InsightCard insight={insight} onClick={() => handleOpen(insight)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail overlay */}
      {selected && (
        <InsightDetail
          insight={selected}
          onClose={() => setSelected(null)}
          onMarkActed={handleMarkActed}
        />
      )}
    </div>
  );
}
