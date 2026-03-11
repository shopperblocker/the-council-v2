// The Council — Design System
// Central registry for colors, typography, and agent identity.
// Import from this file before any UI task.

export type AgentId =
  | "Rockefeller"
  | "Napoleon"
  | "Bismarck"
  | "Madam_Walker"
  | "Marcus_Aurelius"
  | "Frankl"
  | "Wim_Hof"
  | "Feynman"
  | "Da_Vinci"
  | "Socrates"
  | "Ben_Franklin"
  | "Steve_Jobs";

// Gold / amber / copper spectrum — one per advisor
export const AGENT_COLORS: Record<AgentId, string> = {
  Rockefeller: "#c9a84c",    // council gold
  Napoleon: "#b87333",       // copper
  Bismarck: "#8b9467",       // olive drab
  Madam_Walker: "#cd7f32",   // bronze
  Marcus_Aurelius: "#a0956b",// antique brass
  Frankl: "#9b8f6e",         // warm khaki
  Wim_Hof: "#7b9ea6",        // steel blue-grey
  Feynman: "#d4a853",        // warm amber
  Da_Vinci: "#c4956a",       // terra cotta
  Socrates: "#b8a88a",       // sand
  Ben_Franklin: "#c9a227",   // classic gold
  Steve_Jobs: "#8a7f72",     // warm slate
};

export const AGENT_ROLES: Record<AgentId, string> = {
  Rockefeller: "Industrialist",
  Napoleon: "Emperor",
  Bismarck: "Chancellor",
  Madam_Walker: "Entrepreneur",
  Marcus_Aurelius: "Stoic",
  Frankl: "Logotherapist",
  Wim_Hof: "Iceman",
  Feynman: "Physicist",
  Da_Vinci: "Polymath",
  Socrates: "Philosopher",
  Ben_Franklin: "Statesman",
  Steve_Jobs: "Visionary",
};

// Returns agent accent color with a fallback to council gold
export function getAgentColor(agentId: string): string {
  return AGENT_COLORS[agentId as AgentId] ?? "#c9a84c";
}

// Returns agent role label with a fallback
export function getAgentRole(agentId: string): string {
  return AGENT_ROLES[agentId as AgentId] ?? "Advisor";
}

// Design tokens (mirrors tailwind.config.ts — use Tailwind classes in components)
export const COLORS = {
  navy: "#0a1628",
  navyLight: "#0d1f3c",
  navyMid: "#112240",
  surface: "#0f1e35",
  border: "#1e3a5f",
  gold: "#c9a84c",
  goldLight: "#e8c97a",
  goldDim: "#8a6d2f",
  cream: "#f5f0e8",
  textPrimary: "#e8dcc8",
  textSecondary: "#9a8a6a",
} as const;

export const TYPOGRAPHY = {
  display: "var(--font-display)",   // Cormorant Garamond
  body: "var(--font-body)",         // Libre Baskerville
  label: "var(--font-label)",       // Cinzel
  mono: "var(--font-mono)",         // JetBrains Mono
} as const;

// Helper: get initials from agent display name or id
export function getAgentInitials(nameOrId: string): string {
  const cleaned = nameOrId.replace(/_/g, " ");
  const words = cleaned.trim().split(" ");
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
