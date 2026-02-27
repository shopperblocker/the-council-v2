"use client";

import { motion, useReducedMotion } from "framer-motion";
import { defaultEase } from "@/lib/animations";

export interface Step {
  number: string;
  title: string;
  description: string;
  icon: "speech" | "debate" | "check";
}

function SpeechBubbleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C9A227" strokeWidth="1.5">
      <path d="M4 6h24v16H18l-6 6v-6H4V6z" />
    </svg>
  );
}

function DebateIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C9A227" strokeWidth="1.5">
      <path d="M4 10h14M4 10l5-5M4 10l5 5" />
      <path d="M28 22H14M28 22l-5-5M28 22l-5 5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C9A227" strokeWidth="1.5">
      <circle cx="16" cy="16" r="12" />
      <path d="M10 16l4 4 8-8" />
    </svg>
  );
}

const ICONS: Record<Step["icon"], React.ReactNode> = {
  speech: <SpeechBubbleIcon />,
  debate: <DebateIcon />,
  check: <CheckIcon />,
};

interface Props {
  step: Step;
  index: number;
}

export default function StepCard({ step, index }: Props) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, y: 40 }}
      whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.2,
        ease: defaultEase,
      }}
      className="flex flex-col"
    >
      {/* Step number */}
      <p
        className="font-mono font-bold leading-none mb-4 select-none"
        style={{ fontSize: "3rem", color: "rgba(201, 162, 39, 0.15)" }}
      >
        {step.number}
      </p>

      {/* Icon box */}
      <div
        className="w-16 h-16 flex items-center justify-center rounded-xl mb-5"
        style={{
          background: "rgba(201, 162, 39, 0.06)",
          border: "1px solid rgba(201, 162, 39, 0.15)",
        }}
      >
        {ICONS[step.icon]}
      </div>

      {/* Title */}
      <h3 className="font-display text-xl font-bold text-council-text-primary mb-3">
        {step.title}
      </h3>

      {/* Description */}
      <p className="text-council-text-secondary leading-relaxed text-sm">
        {step.description}
      </p>
    </motion.div>
  );
}
