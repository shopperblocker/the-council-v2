export interface Advisor {
  name: string;
  title: string;
  quote: string;
  tags: string[];
  initial: string;
}

export const advisors: Advisor[] = [
  {
    name: "John D. Rockefeller",
    title: "Chief Financial Strategist",
    quote: "The secret to success is to do the common things uncommonly well.",
    tags: ["Capital", "Systems", "Scale"],
    initial: "R",
  },
  {
    name: "Napoleon Bonaparte",
    title: "Emperor of Strategy",
    quote: "Impossible is a word found only in the dictionary of fools.",
    tags: ["Warfare", "Leadership", "Conquest"],
    initial: "N",
  },
  {
    name: "Marcus Aurelius",
    title: "Philosopher King",
    quote: "You have power over your mind, not outside events. Realize this, and you will find strength.",
    tags: ["Stoicism", "Resilience", "Clarity"],
    initial: "M",
  },
  {
    name: "Cleopatra VII",
    title: "Sovereign Diplomat",
    quote: "I will not be triumphed over.",
    tags: ["Power", "Negotiation", "Vision"],
    initial: "C",
  },
  {
    name: "Sun Tzu",
    title: "Master of War",
    quote: "Supreme excellence consists in breaking the enemy's resistance without fighting.",
    tags: ["Strategy", "Intelligence", "Timing"],
    initial: "S",
  },
];
