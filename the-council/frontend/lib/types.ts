/**
 * Types for The Council frontend.
 * Mirrors backend Pydantic schemas.
 */

export interface Agent {
  name: string;
  display_name: string;
  role: string;
  emoji: string;
  color: string;
  board: string;
  voice: string;
  core_belief: string;
  specializations: string[];
}

export interface ChatMessage {
  id: string;
  sender: string;
  sender_type: "user" | "agent";
  content: string;
  color?: string;
  emoji?: string;
  display_name?: string;
  isStreaming?: boolean;
}

export interface DebateSession {
  session_id: string;
  agents: Agent[];
  topic: string;
}

// SSE Event payloads
export interface DebateStartAgent {
  name: string;
  display_name: string;
  emoji: string;
  color: string;
  role: string;
}

export interface DebateStartEvent {
  session_id: string;
  agents: DebateStartAgent[];
  topic: string;
}

export interface AgentStartEvent {
  agent: string;
  display_name: string;
  emoji: string;
  color: string;
}

export interface AgentTokenEvent {
  agent: string;
  token: string;
}

export interface AgentEndEvent {
  agent: string;
}

export interface RoundEndEvent {
  session_id: string;
  round?: number;
  message_count: number;
}

// Agent color map for quick lookups
export const AGENT_COLORS: Record<string, string> = {
  Rockefeller: "#059669",
  Napoleon: "#DC2626",
  Bismarck: "#64748B",
  Madam_Walker: "#D97706",
  Marcus_Aurelius: "#7C3AED",
  Frankl: "#06B6D4",
  Wim_Hof: "#0EA5E9",
  Feynman: "#F59E0B",
  Da_Vinci: "#EC4899",
  Socrates: "#8B5CF6",
  Ben_Franklin: "#F59E0B",
  Steve_Jobs: "#1F2937",
};

export const AGENT_EMOJIS: Record<string, string> = {
  Rockefeller: "💰",
  Napoleon: "⚔️",
  Bismarck: "🏛️",
  Madam_Walker: "👑",
  Marcus_Aurelius: "🏛️",
  Frankl: "🔮",
  Wim_Hof: "🧊",
  Feynman: "⚛️",
  Da_Vinci: "🎨",
  Socrates: "🪰",
  Ben_Franklin: "📚",
  Steve_Jobs: "🍎",
};
