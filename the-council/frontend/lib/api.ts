/**
 * API Client: Handles communication with The Council backend.
 *
 * Uses fetch + ReadableStream for SSE (not EventSource, which doesn't support POST).
 */

import type {
  Agent,
  DebateStartEvent,
  AgentStartEvent,
  AgentTokenEvent,
  AgentEndEvent,
  RoundEndEvent,
  SynthesisEvent,
  ConversationStartEvent,
  ConversationEndEvent,
  PrivateDeskSession,
  UserProfile,
  FinancialAccount,
  Transaction,
  Plan,
  StudyPath,
  Product,
  BusinessOrder,
  Insight,
  ClawTask,
  ClawSummary,
} from "./types";

// ── Type Guards ──

/**
 * Type guard for SSE agent_token events.
 * Avoids unsafe `as { token: string }` casts in page components.
 */
export function isTokenEvent(data: unknown): data is { token: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "token" in data &&
    typeof (data as Record<string, unknown>).token === "string"
  );
}

// API base uses a relative path by default so all requests go through the
// Next.js rewrite proxy (next.config.mjs), which forwards /api/* to the
// backend. This eliminates CORS entirely — the browser never touches the
// backend directly. Set NEXT_PUBLIC_API_URL only if you want to bypass the
// proxy (e.g. direct backend access during local development without Next.js).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

// ── REST endpoints ──

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/war-room/agents`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
}

export async function fetchSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/war-room/session/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

export async function fetchSessions() {
  const res = await fetch(`${API_BASE}/war-room/sessions`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

// ── Profile ──

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profile`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

// ── Financial HQ ──

export async function fetchFinancialDashboard() {
  const res = await fetch(`${API_BASE}/financial/dashboard`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export async function fetchAccounts(): Promise<FinancialAccount[]> {
  const res = await fetch(`${API_BASE}/financial/accounts`);
  if (!res.ok) throw new Error("Failed to fetch accounts");
  return res.json();
}

export async function createAccount(data: Partial<FinancialAccount>): Promise<FinancialAccount> {
  const res = await fetch(`${API_BASE}/financial/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create account");
  return res.json();
}

export async function fetchTransactions(accountId?: number): Promise<Transaction[]> {
  const url = accountId
    ? `${API_BASE}/financial/transactions?account_id=${accountId}`
    : `${API_BASE}/financial/transactions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function createTransaction(data: Partial<Transaction>): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/financial/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create transaction");
  return res.json();
}

// ── Plans Hub ──

export async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch(`${API_BASE}/plans`);
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

export async function createPlan(data: { title: string; description?: string; category: string; target_date?: string }): Promise<Plan> {
  const res = await fetch(`${API_BASE}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create plan");
  return res.json();
}

export async function fetchPlan(id: number): Promise<Plan> {
  const res = await fetch(`${API_BASE}/plans/${id}`);
  if (!res.ok) throw new Error("Failed to fetch plan");
  return res.json();
}

export async function createMilestone(planId: number, data: { title: string; due_date?: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/plans/${planId}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create milestone");
}

export async function toggleMilestone(planId: number, milestoneId: number, completed: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/plans/${planId}/milestones/${milestoneId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) throw new Error("Failed to update milestone");
}

// ── Academy ──

export async function fetchStudyPaths(): Promise<StudyPath[]> {
  const res = await fetch(`${API_BASE}/academy/paths`);
  if (!res.ok) throw new Error("Failed to fetch study paths");
  return res.json();
}

export async function createStudyPath(data: { subject: string; description?: string; difficulty?: string }): Promise<StudyPath> {
  const res = await fetch(`${API_BASE}/academy/paths`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create study path");
  return res.json();
}

// ── Business Engine ──

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/business/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/business/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}

export async function fetchOrders(): Promise<BusinessOrder[]> {
  const res = await fetch(`${API_BASE}/business/orders`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function fetchBusinessDashboard() {
  const res = await fetch(`${API_BASE}/business/dashboard`);
  if (!res.ok) throw new Error("Failed to fetch business dashboard");
  return res.json();
}

// ── Insights ──

export async function fetchInsights(): Promise<Insight[]> {
  const res = await fetch(`${API_BASE}/insights`);
  if (!res.ok) throw new Error("Failed to fetch insights");
  return res.json();
}

export async function fetchUnreadInsightsCount(): Promise<number> {
  const res = await fetch(`${API_BASE}/insights/unread`);
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function markInsightViewed(id: number): Promise<void> {
  await fetch(`${API_BASE}/insights/${id}/viewed`, { method: "POST" });
}

export async function markInsightActedOn(id: number): Promise<void> {
  await fetch(`${API_BASE}/insights/${id}/acted`, { method: "POST" });
}

export async function fetchAllInsights(limit = 50, offset = 0): Promise<Insight[]> {
  const res = await fetch(`${API_BASE}/insights/all?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error("Failed to fetch insights");
  return res.json();
}

export async function extractInsights(conversationId: string): Promise<Insight[]> {
  const res = await fetch(`${API_BASE}/insights/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId }),
  });
  if (!res.ok) throw new Error("Failed to extract insights");
  const data = await res.json();
  return data.insights ?? [];
}

// ── Generic SSE Stream for AI-powered endpoints ──

export function startGenericStream(
  endpoint: string,
  body: Record<string, unknown>,
  callbacks: SSECallbacks,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseSSEStream(res, sseHandlers(callbacks));
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError?.({ message: err.message });
      }
    });

  return controller;
}

// ── Shared SSE Parser ──

/**
 * Parse an SSE stream and dispatch events to a callback map.
 *
 * Handles "event: xxx\ndata: {...}\n\n" format. Both War Room and
 * Private Desk streams use the same wire format — only the event
 * names differ, so one parser handles both.
 */
async function parseSSEStream(
  response: Response,
  handlers: Record<string, (data: unknown) => void>
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventStr of events) {
      if (!eventStr.trim()) continue;

      const lines = eventStr.split("\n");
      let eventType = "";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) eventType = line.slice(7).trim();
        else if (line.startsWith("data: ")) data = line.slice(6);
      }

      if (!eventType || !data) continue;

      try {
        const parsed = JSON.parse(data);
        handlers[eventType]?.(parsed);
      } catch {
        // Skip malformed events
      }
    }
  }
}

// ── War Room SSE Streaming ──

interface SSECallbacks {
  onDebateStart?: (data: DebateStartEvent) => void;
  onAgentStart?: (data: AgentStartEvent) => void;
  onAgentToken?: (data: AgentTokenEvent) => void;
  onAgentEnd?: (data: AgentEndEvent) => void;
  onRoundEnd?: (data: RoundEndEvent) => void;
  onSynthesis?: (data: SynthesisEvent) => void;
  onError?: (data: { message: string }) => void;
}

function sseHandlers(callbacks: SSECallbacks): Record<string, (data: unknown) => void> {
  return {
    debate_start: (d) => callbacks.onDebateStart?.(d as DebateStartEvent),
    agent_start: (d) => callbacks.onAgentStart?.(d as AgentStartEvent),
    agent_token: (d) => callbacks.onAgentToken?.(d as AgentTokenEvent),
    agent_end: (d) => callbacks.onAgentEnd?.(d as AgentEndEvent),
    round_end: (d) => callbacks.onRoundEnd?.(d as RoundEndEvent),
    synthesis: (d) => callbacks.onSynthesis?.(d as SynthesisEvent),
    error: (d) => callbacks.onError?.(d as { message: string }),
  };
}

/**
 * Start a new debate with SSE streaming.
 *
 * Returns an AbortController so the caller can cancel the stream.
 */
export function startDebateStream(
  question: string,
  agents: string[],
  callbacks: SSECallbacks
): AbortController {
  const controller = new AbortController();

  const body = JSON.stringify({ question, agents });

  fetch(`${API_BASE}/war-room/debate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseSSEStream(res, sseHandlers(callbacks));
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError?.({ message: err.message });
      }
    });

  return controller;
}

/**
 * Send a follow-up message in an existing session.
 */
export function sendFollowUpStream(
  sessionId: string,
  content: string,
  mention: string | null,
  callbacks: SSECallbacks
): AbortController {
  const controller = new AbortController();

  const body = JSON.stringify({ content, mention });

  fetch(`${API_BASE}/war-room/session/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseSSEStream(res, sseHandlers(callbacks));
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError?.({ message: err.message });
      }
    });

  return controller;
}

// ── Private Desk ──

export async function fetchPrivateDeskAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/private-desk/agents`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
}

export async function fetchPrivateDeskSessions(): Promise<PrivateDeskSession[]> {
  const res = await fetch(`${API_BASE}/private-desk/sessions`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function fetchPrivateDeskSession(sessionId: string): Promise<PrivateDeskSession> {
  const res = await fetch(`${API_BASE}/private-desk/session/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

interface PrivateDeskCallbacks {
  onConversationStart?: (data: ConversationStartEvent) => void;
  onAgentStart?: (data: AgentStartEvent) => void;
  onAgentToken?: (data: { agent: string; token: string }) => void;
  onToolCall?: (data: { tool: string }) => void;
  onConversationEnd?: (data: ConversationEndEvent) => void;
  onError?: (data: { message: string }) => void;
}

function privateDeskHandlers(callbacks: PrivateDeskCallbacks): Record<string, (data: unknown) => void> {
  return {
    conversation_start: (d) => callbacks.onConversationStart?.(d as ConversationStartEvent),
    agent_start: (d) => callbacks.onAgentStart?.(d as AgentStartEvent),
    agent_token: (d) => callbacks.onAgentToken?.(d as { agent: string; token: string }),
    tool_call: (d) => callbacks.onToolCall?.(d as { tool: string }),
    conversation_end: (d) => callbacks.onConversationEnd?.(d as ConversationEndEvent),
    error: (d) => callbacks.onError?.(d as { message: string }),
  };
}

export function startPrivateDeskStream(
  agent: string,
  message: string,
  callbacks: PrivateDeskCallbacks
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/private-desk/conversation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent, message }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseSSEStream(res, privateDeskHandlers(callbacks));
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError?.({ message: err.message });
      }
    });

  return controller;
}

export function continuePrivateDeskStream(
  sessionId: string,
  message: string,
  callbacks: PrivateDeskCallbacks
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/private-desk/session/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseSSEStream(res, privateDeskHandlers(callbacks));
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError?.({ message: err.message });
      }
    });

  return controller;
}

// ── Claw Orchestrator ──

export async function fetchClawTasks(status?: string): Promise<ClawTask[]> {
  const url = status
    ? `${API_BASE}/claw/tasks?status=${status}`
    : `${API_BASE}/claw/tasks`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch Claw tasks");
  return res.json();
}

export async function fetchClawSummary(): Promise<ClawSummary> {
  const res = await fetch(`${API_BASE}/claw/summary`);
  if (!res.ok) throw new Error("Failed to fetch Claw summary");
  return res.json();
}

export async function fetchClawTask(taskId: string): Promise<ClawTask> {
  const res = await fetch(`${API_BASE}/claw/tasks/${taskId}`);
  if (!res.ok) throw new Error("Failed to fetch Claw task");
  return res.json();
}
