"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AgentQuickLaunch from "@/components/AgentQuickLaunch";

const STORAGE_KEY = "council:workshop:projects";

type ProjectStatus = "active" | "paused" | "shipped";

interface Project {
  id: string;
  name: string;
  stack: string;
  status: ProjectStatus;
  nextAction: string;
}

const DEFAULT_PROJECTS: Project[] = [
  { id: "1", name: "The Council", stack: "Next.js · FastAPI · PostgreSQL", status: "active", nextAction: "Deploy v3 design system" },
  { id: "2", name: "BuddyAI", stack: "React Native · Claude API", status: "active", nextAction: "Wire onboarding flow" },
  { id: "3", name: "Inner Compass", stack: "Next.js · OpenAI", status: "paused", nextAction: "Resume after Council ships" },
  { id: "4", name: "Claw", stack: "Python · Telegram · tmux", status: "active", nextAction: "Build spawn command" },
];

const STATUS_STYLES: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#c9a84c", bg: "rgba(201,168,76,0.1)" },
  paused: { label: "Paused", color: "#9a8a6a", bg: "rgba(154,138,106,0.1)" },
  shipped: { label: "Shipped", color: "#7b9ea6", bg: "rgba(123,158,166,0.1)" },
};

export default function WorkshopPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStack, setNewStack] = useState("");
  const [newStatus, setNewStatus] = useState<ProjectStatus>("active");
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [actionDraft, setActionDraft] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setProjects(raw ? JSON.parse(raw) : DEFAULT_PROJECTS);
    } catch {
      setProjects(DEFAULT_PROJECTS);
    }
  }, []);

  const save = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addProject = () => {
    if (!newName.trim()) return;
    save([
      ...projects,
      {
        id: Date.now().toString(),
        name: newName.trim(),
        stack: newStack.trim(),
        status: newStatus,
        nextAction: "",
      },
    ]);
    setNewName("");
    setNewStack("");
    setNewStatus("active");
    setAdding(false);
  };

  const cycleStatus = (id: string) => {
    const cycle: ProjectStatus[] = ["active", "paused", "shipped"];
    save(
      projects.map((p) => {
        if (p.id !== id) return p;
        const i = cycle.indexOf(p.status);
        return { ...p, status: cycle[(i + 1) % cycle.length] };
      })
    );
  };

  const saveAction = (id: string) => {
    save(projects.map((p) => (p.id === id ? { ...p, nextAction: actionDraft } : p)));
    setEditingAction(null);
  };

  const deleteProject = (id: string) => {
    save(projects.filter((p) => p.id !== id));
  };

  const activeProject = projects.find((p) => p.status === "active");
  const prefill = activeProject
    ? `Review the current state of ${activeProject.name}. What's the highest-leverage next step?`
    : "Review my active projects and help me prioritize what to build next.";

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
            WORKSHOP
          </h1>
          <p className="label-caps text-council-text-secondary">Project Tracker</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Projects grid */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <span className="label-caps">Projects</span>
              <button
                onClick={() => setAdding(!adding)}
                className="text-xs text-council-gold hover:text-council-gold-light transition-colors label-caps"
              >
                {adding ? "Cancel" : "+ Add"}
              </button>
            </div>

            {/* Add form */}
            {adding && (
              <div
                className="p-3 rounded-xl mb-3 space-y-2"
                style={{ background: "rgba(15,30,53,0.8)", border: "1px solid rgba(201,168,76,0.2)" }}
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Project name"
                  className="glass-input w-full px-3 py-2 text-sm"
                  autoFocus
                />
                <input
                  type="text"
                  value={newStack}
                  onChange={(e) => setNewStack(e.target.value)}
                  placeholder="Stack (e.g. React · FastAPI)"
                  className="glass-input w-full px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  {(["active", "paused", "shipped"] as ProjectStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className="flex-1 py-1.5 rounded-lg text-xs transition-all label-caps"
                      style={{
                        background: newStatus === s ? STATUS_STYLES[s].bg : "transparent",
                        border: `1px solid ${newStatus === s ? STATUS_STYLES[s].color : "rgba(30,58,95,0.8)"}`,
                        color: newStatus === s ? STATUS_STYLES[s].color : "#9a8a6a",
                      }}
                    >
                      {STATUS_STYLES[s].label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={addProject}
                  disabled={!newName.trim()}
                  className="btn-primary w-full py-2 text-sm disabled:opacity-40"
                >
                  Add Project
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((p) => {
                const style = STATUS_STYLES[p.status];
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl group"
                    style={{
                      background: "linear-gradient(135deg, rgba(15,30,53,0.8), rgba(10,22,40,0.6))",
                      border: "1px solid rgba(30,58,95,0.8)",
                      borderLeft: `3px solid ${style.color}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-council-text-primary truncate">{p.name}</p>
                        {p.stack && <p className="text-[10px] text-council-text-tertiary mt-0.5">{p.stack}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => cycleStatus(p.id)}
                          className="text-[9px] px-1.5 py-0.5 rounded label-caps transition-all hover:opacity-80"
                          style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}40` }}
                        >
                          {style.label}
                        </button>
                        <button
                          onClick={() => deleteProject(p.id)}
                          className="text-council-text-tertiary hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Next action */}
                    {editingAction === p.id ? (
                      <div className="flex gap-1 mt-2">
                        <input
                          type="text"
                          value={actionDraft}
                          onChange={(e) => setActionDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveAction(p.id);
                            if (e.key === "Escape") setEditingAction(null);
                          }}
                          className="glass-input flex-1 px-2 py-1 text-xs"
                          autoFocus
                        />
                        <button
                          onClick={() => saveAction(p.id)}
                          className="text-xs px-2 py-1 rounded text-council-gold border border-council-gold/30"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingAction(p.id); setActionDraft(p.nextAction); }}
                        className="w-full text-left text-xs text-council-text-secondary hover:text-council-text-primary mt-2 transition-colors"
                      >
                        {p.nextAction ? (
                          <span><span className="text-council-gold mr-1">▸</span>{p.nextAction}</span>
                        ) : (
                          <span className="text-council-text-tertiary italic">+ Add next action</span>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Quick Launch */}
          <div>
            <AgentQuickLaunch
              agents={["Rockefeller", "Napoleon"]}
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
