"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { defaultEase } from "@/lib/animations";

const AVATAR_INITIALS = ["R", "N", "M", "C", "S"];

export default function Hero() {
  const prefersReduced = useReducedMotion();

  const entry = (delay: number) =>
    prefersReduced
      ? {}
      : {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: defaultEase },
        };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-[72px]">
      {/* Ambient gold glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(201, 162, 39, 0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Overline */}
        <motion.p
          {...entry(0.3)}
          className="font-mono text-xs tracking-[0.3em] uppercase text-council-gold-dim mb-6"
        >
          12 Historical Minds. One Room. Your Problem.
        </motion.p>

        {/* H1 */}
        <div className="overflow-hidden mb-6">
          <motion.h1
            {...entry(0.5)}
            className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight text-council-text-primary"
          >
            Your Decisions
            <span style={{ color: "#C9A227" }}>.</span>
          </motion.h1>
          <motion.h1
            {...entry(0.7)}
            className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight text-council-text-primary"
          >
            Elevated
            <span style={{ color: "#C9A227" }}>.</span>
          </motion.h1>
        </div>

        {/* Subheadline */}
        <motion.p
          {...entry(1.0)}
          className="text-lg sm:text-xl text-council-text-secondary max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Bring your toughest challenges to a table of history&apos;s greatest
          minds. Rockefeller, Napoleon, Marcus Aurelius — they debate, challenge,
          and forge a path forward.
        </motion.p>

        {/* CTA Cluster */}
        <motion.div
          {...entry(1.2)}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <Link
            href="/war-room"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #D4663A 0%, #B8512A 100%)",
              color: "#F0EDE6",
              boxShadow: "0 4px 24px rgba(212, 102, 58, 0.3)",
            }}
          >
            Enter the War Room
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>

          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold border transition-all duration-200 hover:-translate-y-0.5 hover:border-council-gold-dim"
            style={{
              borderColor: "#1A1A2E",
              color: "#8A8A9A",
              background: "transparent",
            }}
          >
            See How It Works
          </a>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          {...entry(1.6)}
          className="flex items-center justify-center gap-3"
        >
          <div className="flex -space-x-2">
            {AVATAR_INITIALS.map((initial, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2"
                style={{
                  background: `rgba(201, 162, 39, 0.15)`,
                  color: "#C9A227",
                  borderColor: "#06060B",
                }}
              >
                {initial}
              </div>
            ))}
          </div>
          <p className="text-sm text-council-text-tertiary">
            5 advisors ready to challenge you
          </p>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={prefersReduced ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4A4A5A"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </motion.div>
    </section>
  );
}
