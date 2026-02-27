"use client";

import { motion, useReducedMotion } from "framer-motion";
import { advisors } from "@/lib/advisors";
import AdvisorCard from "./AdvisorCard";
import { staggerContainer, fadeUp } from "@/lib/animations";

export default function AdvisorShowcase() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="advisors" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          variants={prefersReduced ? {} : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-16"
        >
          <motion.p
            variants={prefersReduced ? {} : fadeUp}
            className="font-mono text-xs tracking-[0.3em] uppercase text-council-gold-dim mb-4"
          >
            Your Advisors
          </motion.p>
          <motion.h2
            variants={prefersReduced ? {} : fadeUp}
            className="font-display text-4xl sm:text-5xl font-bold text-council-text-primary mb-4"
          >
            History&apos;s Greatest Minds
          </motion.h2>
          <motion.p
            variants={prefersReduced ? {} : fadeUp}
            className="text-council-text-secondary max-w-lg mx-auto leading-relaxed"
          >
            Each advisor brings a unique perspective forged over centuries.
            They argue. They challenge. They hold nothing back.
          </motion.p>
        </motion.div>

        {/* Desktop grid / tablet grid / mobile scroll */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {advisors.map((advisor, i) => (
            <AdvisorCard key={advisor.name} advisor={advisor} index={i} />
          ))}
        </div>

        {/* Mobile: horizontal scroll snap */}
        <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6">
          {advisors.map((advisor, i) => (
            <div key={advisor.name} className="snap-start shrink-0 w-64">
              <AdvisorCard advisor={advisor} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
