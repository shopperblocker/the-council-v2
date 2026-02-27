"use client";

import { motion, useReducedMotion } from "framer-motion";
import { defaultEase } from "@/lib/animations";

export default function WarRoomPreview() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-council-gold-dim mb-4">
            The Experience
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-council-text-primary">
            The War Room
          </h2>
        </div>

        {/* Preview frame */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, scale: 0.95 }}
          whileInView={prefersReduced ? {} : { opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: defaultEase }}
          className="relative"
        >
          {/* Outer frame */}
          <div
            className="rounded-2xl p-3"
            style={{
              background: "#0D0D14",
              border: "1px solid #1A1A2E",
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,162,39,0.05)",
            }}
          >
            {/* Inner video-aspect placeholder */}
            <div
              className="relative rounded-xl overflow-hidden flex items-center justify-center"
              style={{
                aspectRatio: "16/9",
                background: "#14141F",
              }}
            >
              {/* Subtle grid */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(201,162,39,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,39,0.03) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Play button */}
              <div className="relative flex flex-col items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer"
                  style={{
                    background: "rgba(201, 162, 39, 0.1)",
                    border: "1px solid rgba(201, 162, 39, 0.3)",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="#C9A227"
                    className="ml-1"
                  >
                    <path d="M5 3l14 7-14 7V3z" />
                  </svg>
                </div>
                <p className="font-mono text-xs tracking-widest uppercase text-council-text-tertiary">
                  War Room Demo
                </p>
              </div>

              {/* Floating label — top left */}
              <motion.div
                animate={
                  prefersReduced ? {} : { y: [-2, 2, -2] }
                }
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-4 left-4 px-3 py-1.5 rounded-lg flex items-center gap-2"
                style={{
                  background: "rgba(13, 13, 20, 0.9)",
                  border: "1px solid rgba(201, 162, 39, 0.2)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#C9A227" }}
                />
                <span className="text-xs font-mono text-council-text-secondary tracking-wide">
                  Real-time Debate
                </span>
              </motion.div>

              {/* Floating label — bottom right */}
              <motion.div
                animate={
                  prefersReduced ? {} : { y: [2, -2, 2] }
                }
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg"
                style={{
                  background: "rgba(13, 13, 20, 0.9)",
                  border: "1px solid rgba(201, 162, 39, 0.2)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="text-xs font-mono text-council-text-secondary tracking-wide">
                  5 Advisors
                </span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
