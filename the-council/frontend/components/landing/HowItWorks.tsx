"use client";

import { motion, useReducedMotion } from "framer-motion";
import StepCard, { type Step } from "./StepCard";
import { staggerContainer, fadeUp } from "@/lib/animations";

const STEPS: Step[] = [
  {
    number: "01",
    title: "Bring Your Challenge",
    description:
      "Type any decision — strategic, financial, personal. The Council accepts everything from business pivots to life choices.",
    icon: "speech",
  },
  {
    number: "02",
    title: "The Advisors Debate",
    description:
      "Your selected advisors respond sequentially, each reading what the others said. They agree, clash, and build on each other in real time.",
    icon: "debate",
  },
  {
    number: "03",
    title: "Walk Away With Clarity",
    description:
      "After the debate, a synthesis extracts consensus, key tensions, and concrete action steps — distilled from centuries of expertise.",
    icon: "check",
  },
];

export default function HowItWorks() {
  const prefersReduced = useReducedMotion();

  return (
    <section
      id="how-it-works"
      className="py-24 px-6"
      style={{
        background:
          "linear-gradient(180deg, #06060B 0%, #0D0D14 50%, #06060B 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          variants={prefersReduced ? {} : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-20"
        >
          <motion.p
            variants={prefersReduced ? {} : fadeUp}
            className="font-mono text-xs tracking-[0.3em] uppercase text-council-gold-dim mb-4"
          >
            The Process
          </motion.p>
          <motion.h2
            variants={prefersReduced ? {} : fadeUp}
            className="font-display text-4xl sm:text-5xl font-bold text-council-text-primary mb-4"
          >
            How It Works
          </motion.h2>
          <motion.p
            variants={prefersReduced ? {} : fadeUp}
            className="text-council-text-secondary max-w-lg mx-auto leading-relaxed"
          >
            Three steps from question to clarity. No fluff. No filler.
            Just unfiltered strategic intelligence.
          </motion.p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative">
              <StepCard step={step} index={i} />

              {/* Connector arrow — desktop only, between cards */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:flex absolute top-[4.5rem] -right-4 items-center gap-1 z-10">
                  <div
                    className="w-8 border-t border-dashed"
                    style={{ borderColor: "#8B7355" }}
                  />
                  <span style={{ color: "#8B7355" }} className="text-sm font-mono">
                    →
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
