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
  id?: string;
  sender: string;
  sender_type: "user" | "agent";
  content: string;
  color?: string;
  emoji?: string;
  display_name?: string;
  isStreaming?: boolean;
  created_at?: string;
}

export interface DebateSession {
  session_id: string;
  agents: Agent[];
  topic: string;
}

// ── Private Desk types ──

export interface PrivateDeskSession {
  id: string;
  mode: string;
  topic: string | null;
  agents: string[];
  created_at: string;
  messages: ChatMessage[];
}

// ── SSE Event payloads ──
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
  has_synthesis?: boolean;
}

export interface SynthesisEvent {
  content: string;
}

export interface ConversationStartEvent {
  session_id: string;
  agent: string;
  display_name: string;
  emoji: string;
  color: string;
  role: string;
}

export interface ConversationEndEvent {
  session_id: string;
  agent: string;
  message_count: number;
}

// ── User Profile ──

export interface UserProfile {
  id: number;
  name: string;
  age: number;
  location: string;
  origin: string;
  school: string;
  major: string;
  year: string;
  north_star: string;
  core_fear: string;
  war_fronts: Record<string, string>;
  tuition_target: number;
  tuition_deadline: string;
  budget_notes: string;
  psychological_framework: Record<string, string>;
  what_works: string[];
  constraints: string[];
  custom_sections: Record<string, string>;
  updated_at: string;
}

// ── Financial HQ ──

export interface FinancialAccount {
  id: number;
  name: string;
  account_type: string;
  balance: number;
  target: number | null;
  target_date: string | null;
  currency: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  amount: number;
  category: string;
  description: string | null;
  date: string;
}

export interface FinancialDashboard {
  total_balance: number;
  tuition_progress: number;
  tuition_target: number;
  accounts: FinancialAccount[];
  recent_transactions: Transaction[];
}

// ── Plans Hub ──

export interface Milestone {
  id: number;
  plan_id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  notes: string | null;
  completed_at: string | null;
}

export interface Plan {
  id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  target_date: string | null;
  progress: number;
  milestones: Milestone[];
}

// ── Academy ──

export interface StudyTopic {
  id: number;
  path_id: number;
  title: string;
  order: number;
  mastery_level: string;
  notes: string | null;
  feynman_explanation: string | null;
}

export interface StudyPath {
  id: number;
  subject: string;
  description: string | null;
  difficulty: string;
  progress: number;
  topics: StudyTopic[];
}

// ── Business Engine ──

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  source_platform: string;
  source_price: number;
  target_platform: string;
  target_price: number | null;
  estimated_profit: number | null;
  roi_pct: number | null;
  status: string;
  notes: string | null;
}

export interface BusinessOrder {
  id: number;
  product_id: number | null;
  platform: string;
  order_type: string;
  amount: number;
  fees: number;
  status: string;
  tracking: string | null;
}

// ── Insights ──

export interface Insight {
  id: number;
  agent_name: string;
  insight_type: string;
  title: string;
  content: string;
  summary?: string;
  key_points?: string[];
  recommended_actions?: string[];
  tags?: string[];
  source_mode?: string;
  conversation_id?: string;
  priority: string;
  viewed: boolean;
  acted_on: boolean;
  created_at: string;
}

// ── Claw Orchestrator ──

export interface ClawTask {
  id: string;
  description: string;
  project: string;
  status: "running" | "done" | "blocked" | "killed";
  agent: string;
  task_type: string;
  branch: string | null;
  pr_number: number | null;
  failure_reason: string | null;
  retry_count: number;
  notes: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClawSummary {
  total: number;
  running: number;
  done: number;
  blocked: number;
  killed: number;
}

// Agent colors: use AGENT_COLORS from @/lib/design-system.ts (single source of truth)
