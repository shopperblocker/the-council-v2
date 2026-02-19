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
  ConversationStartEvent,
  ConversationEndEvent,
  PrivateDeskSession,
} from "./types";

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
  onError?: (data: { message: string }) => void;
}

function sseHandlers(callbacks: SSECallbacks): Record<string, (data: unknown) => void> {
  return {
    debate_start: (d) => callbacks.onDebateStart?.(d as DebateStartEvent),
    agent_start: (d) => callbacks.onAgentStart?.(d as AgentStartEvent),
    agent_token: (d) => callbacks.onAgentToken?.(d as AgentTokenEvent),
    agent_end: (d) => callbacks.onAgentEnd?.(d as AgentEndEvent),
    round_end: (d) => callbacks.onRoundEnd?.(d as RoundEndEvent),
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
