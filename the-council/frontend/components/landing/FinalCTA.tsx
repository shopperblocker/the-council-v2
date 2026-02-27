"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/animations";

export default function FinalCTA() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative py-32 px-6 text-center overflow-hidden">
      {/* Gold radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(201, 162, 39, 0.07) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <motion.div
        variants={prefersReduced ? {} : staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="relative z-10 max-w-3xl mx-auto"
      >
        <motion.p
          variants={prefersReduced ? {} : fadeUp}
          className="font-mono text-xs tracking-[0.3em] uppercase text-council-gold-dim mb-6"
        >
          Ready?
        </motion.p>

        <motion.h2
          variants={prefersReduced ? {} : fadeUp}
          className="font-display text-4xl sm:text-6xl font-bold text-council-text-primary mb-6 leading-tight"
        >
          Stop Deciding Alone
          <span style={{ color: "#C9A227" }}>.</span>
        </motion.h2>

        <motion.p
          variants={prefersReduced ? {} : fadeUp}
          className="text-lg text-council-text-secondary max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Your advisors are assembled. The table is set.
          Bring your problem and let history work for you.
        </motion.p>

        <motion.div variants={prefersReduced ? {} : fadeUp}>
          <Link
            href="/war-room"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-xl text-base font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #D4663A 0%, #B8512A 100%)",
              color: "#F0EDE6",
              boxShadow: "0 4px 32px rgba(212, 102, 58, 0.3)",
            }}
          >
            Enter the War Room
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3.5 9h11M10 4.5l4.5 4.5L10 13.5" />
            </svg>
          </Link>
        </motion.div>

        <motion.p
          variants={prefersReduced ? {} : fadeUp}
          className="mt-6 text-xs text-council-text-tertiary"
        >
          No account required. Your sessions are private.
        </motion.p>
      </motion.div>
    </section>
  );
}
