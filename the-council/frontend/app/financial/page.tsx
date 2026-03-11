"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AgentQuickLaunch from "@/components/AgentQuickLaunch";

const STORAGE_KEY = "council:financial:decisions";

type DecisionStatus = "thinking" | "decided" | "acted";

interface Decision {
  id: string;
  description: string;
  amount?: string;
  status: DecisionStatus;
  createdAt: string;
}

const STATUS_CYCLE: DecisionStatus[] = ["thinking", "decided", "acted"];
const STATUS_STYLES: Record<DecisionStatus, { label: string; color: string }> = {
  thinking: { label: "Thinking", color: "#9a8a6a" },
  decided: { label: "Decided", color: "#c9a84c" },
  acted: { label: "Acted", color: "#7b9ea6" },
};

const QUICK_QUESTIONS = [
  { label: "Evaluate Opportunity", prompt: "I have a potential business opportunity. Help me evaluate whether to pursue it, using first-principles financial thinking." },
  { label: "Pricing Decision", prompt: "Help me think through my pricing strategy. What factors should I consider and what price point makes sense?" },
  { label: "Risk Assessment", prompt: "Walk me through a risk assessment of my current financial situation. What are my biggest exposures?" },
  { label: "Investment Allocation", prompt: "How should I allocate my available capital right now? What's the highest-leverage use of money given my situation?" },
];

export default function FinancialPage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [input, setInput] = useState("");
  const [amount, setAmount] = useState("");
  const [prefill, setPrefill] = useState(QUICK_QUESTIONS[0].prompt);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDecisions(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (updated: Decision[]) => {
    setDecisions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addDecision = () => {
    if (!input.trim()) return;
    save([
      {
        id: Date.now().toString(),
        description: input.trim(),
        amount: amount.trim() || undefined,
        status: "thinking",
        createdAt: new Date().toISOString(),
      },
      ...decisions,
    ]);
    setInput("");
    setAmount("");
  };

  const cycleStatus = (id: string) => {
    save(
      decisions.map((d) => {
        if (d.id !== id) return d;
        const i = STATUS_CYCLE.indexOf(d.status);
        return { ...d, status: STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length] };
      })
    );
  };

  const deleteDecision = (id: string) => {
    save(decisions.filter((d) => d.id !== id));
  };

  return (
    <div className="min-h-[100dvh] bg-council-navy p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-council-text-secondary hover:text-council-text-primary transition-colors text-sm mb-5 block"
          >
            &larr; Back
          </button>
          <div className="rule-gold w-10 mb-4" />
          <h1
            className="text-3xl text-council-gold mb-1"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300, letterSpacing: "0.1em" }}
          >
            FINANCIAL HQ
          </h1>
          <p className="label-caps text-council-text-secondary">Decision Queue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Decision queue */}
          <div className="md:col-span-2">
            {/* Add decision */}
            <div
              className="p-4 rounded-xl mb-4"
              style={{
                background: "rgba(15,30,53,0.8)",
                border: "1px solid rgba(201,168,76,0.2)",
              }}
            >
              <div className="label-caps mb-3">New Decision</div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What financial decision are you facing?"
                className="glass-input w-full px-3 py-2.5 text-sm mb-2"
                onKeyDown={(e) => e.key === "Enter" && addDecision()}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (optional, e.g. $500)"
                  className="glass-input flex-1 px-3 py-2 text-sm"
                />
                <button
                  onClick={addDecision}
                  disabled={!input.trim()}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Decision list */}
            {decisions.length === 0 ? (
              <p className="text-xs text-council-text-tertiary text-center py-8">
                No decisions yet. Add your first financial decision above.
              </p>
            ) : (
              <div className="space-y-2">
                {decisions.map((d) => {
                  const style = STATUS_STYLES[d.status];
                  return (
                    <div
                      key={d.id}
                      className="flex items-start gap-3 p-3 rounded-xl group transition-all"
                      style={{
                        background: "linear-gradient(135deg, rgba(15,30,53,0.7), rgba(10,22,40,0.5))",
                        border: "1px solid rgba(30,58,95,0.8)",
                        borderLeft: `3px solid ${style.color}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-council-text-primary leading-relaxed">{d.description}</p>
                        {d.amount && (
                          <p className="text-xs text-council-gold mt-0.5">{d.amount}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => cycleStatus(d.id)}
                          className="text-[9px] px-1.5 py-0.5 rounded label-caps transition-all hover:opacity-80"
                          style={{
                            color: style.color,
                            border: `1px solid ${style.color}40`,
                            background: `${style.color}10`,
                          }}
                        >
                          {style.label}
                        </button>
                        <button
                          onClick={() => deleteDecision(d.id)}
                          className="text-council-text-tertiary hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Quick questions */}
            <div>
              <div className="label-caps mb-2">Quick Questions</div>
              <div className="space-y-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => setPrefill(q.prompt)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                    style={{
                      background: prefill === q.prompt ? "rgba(201,168,76,0.08)" : "rgba(15,30,53,0.5)",
                      border: `1px solid ${prefill === q.prompt ? "rgba(201,168,76,0.4)" : "rgba(30,58,95,0.8)"}`,
                      color: prefill === q.prompt ? "#c9a84c" : "#9a8a6a",
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <AgentQuickLaunch
              agents={["Rockefeller", "Bismarck"]}
              prefillPrompt={prefill}
              mode="war-room"
              title="Get Advisory"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
