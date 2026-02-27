"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { defaultEase } from "@/lib/animations";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const motionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: defaultEase },
      };

  return (
    <motion.nav
      {...motionProps}
      className="fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center border-b border-council-border transition-all duration-300"
      style={{
        background: scrolled
          ? "rgba(6, 6, 11, 0.95)"
          : "rgba(6, 6, 11, 0.80)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-none group">
          <span className="font-display text-xl font-bold text-council-text-primary tracking-wide">
            The Council
          </span>
          <span
            className="block h-[2px] w-full mt-1 transition-all duration-300 group-hover:w-3/4"
            style={{ background: "#C9A227" }}
          />
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#advisors" className="text-sm text-council-text-secondary hover:text-council-text-primary transition-colors duration-200 tracking-wide">
            Advisors
          </a>
          <a href="#how-it-works" className="text-sm text-council-text-secondary hover:text-council-text-primary transition-colors duration-200 tracking-wide">
            How It Works
          </a>
          <Link href="/dashboard" className="text-sm text-council-text-secondary hover:text-council-text-primary transition-colors duration-200 tracking-wide">
            Dashboard
          </Link>
        </div>

        {/* CTA + Hamburger */}
        <div className="flex items-center gap-3">
          <Link
            href="/war-room"
            className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #D4663A 0%, #B8512A 100%)",
              color: "#F0EDE6",
              boxShadow: "0 4px 16px rgba(212, 102, 58, 0.25)",
            }}
          >
            Enter the War Room
          </Link>

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col gap-[5px] p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`block h-0.5 w-5 bg-council-text-secondary transition-all duration-200 ${
                menuOpen ? "rotate-45 translate-y-[7px]" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-council-text-secondary transition-all duration-200 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-5 bg-council-text-secondary transition-all duration-200 ${
                menuOpen ? "-rotate-45 -translate-y-[7px]" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-[72px] left-0 right-0 bg-council-surface border-b border-council-border p-6 flex flex-col gap-4 md:hidden">
          <a href="#advisors" onClick={() => setMenuOpen(false)} className="text-council-text-secondary hover:text-council-text-primary text-sm tracking-wide">Advisors</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-council-text-secondary hover:text-council-text-primary text-sm tracking-wide">How It Works</a>
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-council-text-secondary hover:text-council-text-primary text-sm tracking-wide">Dashboard</Link>
          <Link
            href="/war-room"
            className="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, #D4663A 0%, #B8512A 100%)",
              color: "#F0EDE6",
            }}
          >
            Enter the War Room
          </Link>
        </div>
      )}
    </motion.nav>
  );
}
