"use client";

import { useRouter } from "next/navigation";
import { getAgentColor, getAgentInitials, getAgentRole } from "@/lib/design-system";

interface AgentQuickLaunchProps {
  agents: string[];
  prefillPrompt: string;
  mode?: "war-room" | "private-desk";
  title?: string;
}

export default function AgentQuickLaunch({
  agents,
  prefillPrompt,
  mode = "war-room",
  title = "Ask the Council",
}: AgentQuickLaunchProps) {
  const router = useRouter();

  const handleLaunch = () => {
    const params = new URLSearchParams();
    if (agents.length > 0) params.set("agents", agents.join(","));
    if (prefillPrompt) params.set("prompt", prefillPrompt);
    router.push(`/${mode}?${params.toString()}`);
  };

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "linear-gradient(135deg, rgba(15,30,53,0.9), rgba(10,22,40,0.7))",
        border: "1px solid rgba(201,168,76,0.2)",
      }}
    >
      <div className="label-caps mb-3">{title}</div>

      {/* Agent pills */}
      {agents.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {agents.map((agentId) => {
            const color = getAgentColor(agentId);
            const initials = getAgentInitials(agentId);
            const role = getAgentRole(agentId);
            return (
              <div key={agentId} className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0"
                  style={{
                    background: `${color}18`,
                    border: `1.5px solid ${color}`,
                    color,
                    fontFamily: "var(--font-label)",
                  }}
                >
                  {initials}
                </div>
                <span className="text-xs text-council-text-secondary">{role}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Prompt preview */}
      {prefillPrompt && (
        <p className="text-xs text-council-text-secondary italic mb-3 line-clamp-2">
          &ldquo;{prefillPrompt}&rdquo;
        </p>
      )}

      <button
        onClick={handleLaunch}
        className="btn-primary w-full py-2.5 text-sm"
      >
        Open Session
      </button>
    </div>
  );
}
