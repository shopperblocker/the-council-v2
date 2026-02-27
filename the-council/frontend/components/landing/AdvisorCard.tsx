"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Advisor } from "@/lib/advisors";
import { defaultEase } from "@/lib/animations";

interface Props {
  advisor: Advisor;
  index: number;
}

export default function AdvisorCard({ advisor, index }: Props) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, y: 40 }}
      whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        ease: defaultEase,
      }}
      whileHover={prefersReduced ? {} : { y: -4 }}
      className="flex flex-col p-5 rounded-xl border border-council-border bg-council-surface transition-all duration-300 cursor-default group"
      style={{ minWidth: "200px" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "rgba(201, 162, 39, 0.30)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 32px rgba(201, 162, 39, 0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#1A1A2E";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Portrait placeholder */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-lg font-display font-bold"
        style={{
          background: "rgba(201, 162, 39, 0.12)",
          color: "#C9A227",
          border: "1px solid rgba(201, 162, 39, 0.2)",
        }}
      >
        {advisor.initial}
      </div>

      {/* Overline */}
      <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-council-text-tertiary mb-1">
        Advisor
      </p>

      {/* Name */}
      <h3 className="font-display text-base font-bold text-council-text-primary mb-3 leading-tight">
        {advisor.name}
      </h3>

      {/* Quote */}
      <p className="text-sm italic text-council-text-secondary leading-relaxed mb-4 flex-1">
        &ldquo;{advisor.quote}&rdquo;
      </p>

      {/* Divider */}
      <div className="w-8 h-px mb-4" style={{ background: "#C9A227", opacity: 0.4 }} />

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {advisor.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full font-mono tracking-wide"
            style={{
              background: "rgba(201, 162, 39, 0.08)",
              color: "#8B7355",
              border: "1px solid rgba(201, 162, 39, 0.15)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
