"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import ErrorBanner from "@/components/ErrorBanner";
import { fetchPlans, createPlan, createMilestone, toggleMilestone, startGenericStream, isTokenEvent } from "@/lib/api";
import type { Plan } from "@/lib/types";

const CATEGORIES = ["business", "academic", "health", "financial", "personal"];

export default function PlansHubPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [newMilestone, setNewMilestone] = useState("");
  const [review, setReview] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () => fetchPlans().then(setPlans).catch(() => setError("Failed to load plans. Is the backend running?"));
  useEffect(() => { reload(); }, []);

  const handleCreatePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createPlan({
      title: form.get("title") as string,
      description: form.get("description") as string,
      category: form.get("category") as string,
      target_date: form.get("target_date") as string || undefined,
    });
    setShowAdd(false);
    reload();
  };

  const handleAddMilestone = async () => {
    if (!selectedPlan || !newMilestone.trim()) return;
    await createMilestone(selectedPlan.id, { title: newMilestone.trim() });
    setNewMilestone("");
    reload();
    // Refresh selected plan
    const updated = await fetchPlans();
    setPlans(updated);
    setSelectedPlan(updated.find((p) => p.id === selectedPlan.id) || null);
  };

  const handleToggle = async (planId: number, milestoneId: number, completed: boolean) => {
    await toggleMilestone(planId, milestoneId, !completed);
    reload();
    const updated = await fetchPlans();
    setPlans(updated);
    setSelectedPlan(updated.find((p) => p.id === planId) || null);
  };

  const handleReview = (plan: Plan) => {
    setReviewing(true);
    setReview("");
    startGenericStream(
      `/plans/${plan.id}/review`,
      {},
      {
        onAgentToken: (data) => { if (isTokenEvent(data)) setReview((prev) => prev + data.token); },
        onRoundEnd: () => setReviewing(false),
        onError: () => setReviewing(false),
      }
    );
  };

  const activePlans = plans.filter((p) => p.status === "active");
  const completedPlans = plans.filter((p) => p.status === "completed");

  return (
    <div className="min-h-[100dvh] p-3 sm:p-6 bg-[#F8F9FA]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-gray-700 text-sm">&larr; Back</button>
            <h1 className="text-xl sm:text-2xl font-bold">Plans Hub</h1>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary px-4 py-2 text-sm">+ New Plan</button>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Add Plan Form */}
        {showAdd && (
          <GlassPanel className="p-4 sm:p-6 mb-6">
            <form onSubmit={handleCreatePlan} className="space-y-3">
              <input name="title" placeholder="Plan title" required className="glass-input w-full px-4 py-3 text-sm" />
              <textarea name="description" placeholder="Description (optional)" className="glass-input w-full px-4 py-3 text-sm min-h-[60px]" />
              <div className="flex gap-3">
                <select name="category" required className="glass-input flex-1 px-4 py-3 text-sm">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <input name="target_date" type="date" className="glass-input px-4 py-3 text-sm" />
              </div>
              <button type="submit" className="btn-primary px-6 py-3 text-sm w-full">Create Plan</button>
            </form>
          </GlassPanel>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Plans List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Active ({activePlans.length})</h2>
            {activePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => { setSelectedPlan(plan); setReview(""); }}
                className={`w-full text-left ${selectedPlan?.id === plan.id ? "" : ""}`}
              >
                <GlassPanel className={`p-4 transition-all ${selectedPlan?.id === plan.id ? "ring-2 ring-blue-400" : "hover:-translate-y-0.5"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{plan.title}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{plan.category}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-500">{Math.round(plan.progress * 100)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${plan.progress * 100}%` }} />
                  </div>
                </GlassPanel>
              </button>
            ))}
            {activePlans.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No active plans</p>}

            {completedPlans.length > 0 && (
              <>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-6 mb-2">Completed ({completedPlans.length})</h2>
                {completedPlans.map((plan) => (
                  <GlassPanel key={plan.id} className="p-4 opacity-60">
                    <p className="text-sm text-gray-700 line-through">{plan.title}</p>
                  </GlassPanel>
                ))}
              </>
            )}
          </div>

          {/* Plan Detail */}
          <div className="lg:col-span-2">
            {selectedPlan ? (
              <GlassPanel className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedPlan.title}</h2>
                    {selectedPlan.description && <p className="text-sm text-gray-500 mt-1">{selectedPlan.description}</p>}
                    <div className="flex gap-3 mt-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg capitalize">{selectedPlan.category}</span>
                      {selectedPlan.target_date && <span className="text-xs text-gray-400">Due: {selectedPlan.target_date}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleReview(selectedPlan)}
                    disabled={reviewing}
                    className="btn-primary px-4 py-2 text-sm shrink-0"
                  >
                    {reviewing ? "..." : "Council Review"}
                  </button>
                </div>

                {/* Milestones */}
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-6 mb-3">Milestones</h3>
                <div className="space-y-2">
                  {(selectedPlan.milestones || []).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleToggle(selectedPlan.id, m.id, m.completed)}
                      className="w-full flex items-center gap-3 p-3 bg-white/20 rounded-xl text-left hover:bg-white/30 transition-colors"
                    >
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs shrink-0 ${m.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"}`}>
                        {m.completed && "OK"}
                      </span>
                      <span className={`text-sm ${m.completed ? "line-through text-gray-400" : "text-gray-800"}`}>{m.title}</span>
                    </button>
                  ))}
                </div>

                {/* Add milestone */}
                <div className="flex gap-2 mt-3">
                  <input
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
                    placeholder="Add milestone..."
                    className="glass-input flex-1 px-3 py-2 text-sm"
                  />
                  <button onClick={handleAddMilestone} className="btn-primary px-3 py-2 text-sm">+</button>
                </div>

                {/* Review */}
                {review && (
                  <div className="mt-6 p-4 bg-white/30 rounded-xl">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Council Review</h3>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {review}
                      {reviewing && <span className="inline-block w-1.5 h-4 bg-purple-500 animate-pulse ml-0.5" />}
                    </div>
                  </div>
                )}
              </GlassPanel>
            ) : (
              <GlassPanel className="p-8 flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <p className="text-3xl mb-3">&#128203;</p>
                  <p className="text-gray-400 text-sm">Select a plan or create a new one</p>
                </div>
              </GlassPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
