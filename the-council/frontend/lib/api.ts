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
} from "./types";

const API_BASE = "/api";

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

// ── SSE Streaming ──

interface SSECallbacks {
  onDebateStart?: (data: DebateStartEvent) => void;
  onAgentStart?: (data: AgentStartEvent) => void;
  onAgentToken?: (data: AgentTokenEvent) => void;
  onAgentEnd?: (data: AgentEndEvent) => void;
  onRoundEnd?: (data: RoundEndEvent) => void;
  onError?: (data: { message: string }) => void;
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
      return processSSEStream(res, callbacks);
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
      return processSSEStream(res, callbacks);
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        callbacks.onError?.({ message: err.message });
      }
    });

  return controller;
}

/**
 * Process an SSE stream from a fetch response.
 *
 * Parses "event: xxx\ndata: {...}\n\n" format and dispatches to callbacks.
 */
async function processSSEStream(
  response: Response,
  callbacks: SSECallbacks
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete events (separated by double newlines)
    const events = buffer.split("\n\n");
    buffer = events.pop() || ""; // Keep incomplete event in buffer

    for (const eventStr of events) {
      if (!eventStr.trim()) continue;

      const lines = eventStr.split("\n");
      let eventType = "";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          data = line.slice(6);
        }
      }

      if (!eventType || !data) continue;

      try {
        const parsed = JSON.parse(data);

        switch (eventType) {
          case "debate_start":
            callbacks.onDebateStart?.(parsed);
            break;
          case "agent_start":
            callbacks.onAgentStart?.(parsed);
            break;
          case "agent_token":
            callbacks.onAgentToken?.(parsed);
            break;
          case "agent_end":
            callbacks.onAgentEnd?.(parsed);
            break;
          case "round_end":
            callbacks.onRoundEnd?.(parsed);
            break;
          case "error":
            callbacks.onError?.(parsed);
            break;
        }
      } catch {
        // Skip malformed events
      }
    }
  }
}
