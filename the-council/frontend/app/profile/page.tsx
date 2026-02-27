"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import { fetchProfile, updateProfile } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProfile().then(setProfile).catch(console.error);
  }, []);

  const handleSave = async (field: string, value: unknown) => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ [field]: value });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  if (!profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F9FA]">
        <p className="text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] p-3 sm:p-6 bg-[#F8F9FA]">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-400 hover:text-gray-700 transition-colors text-sm"
            >
              &larr; Back
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Your Profile</h1>
          </div>
          <div className="text-xs text-gray-400">
            {saving ? "Saving..." : saved ? "Saved" : ""}
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Identity */}
          <GlassPanel className="p-4 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Identity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" value={profile.name} onSave={(v) => handleSave("name", v)} />
              <Field label="Age" value={String(profile.age)} onSave={(v) => handleSave("age", parseInt(v))} />
              <Field label="Location" value={profile.location} onSave={(v) => handleSave("location", v)} />
              <Field label="Origin" value={profile.origin} onSave={(v) => handleSave("origin", v)} />
              <Field label="School" value={profile.school} onSave={(v) => handleSave("school", v)} />
              <Field label="Major" value={profile.major} onSave={(v) => handleSave("major", v)} />
              <Field label="Year" value={profile.year} onSave={(v) => handleSave("year", v)} />
            </div>
          </GlassPanel>

          {/* North Star */}
          <GlassPanel className="p-4 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">North Star</h2>
            <TextArea label="Driving motivation" value={profile.north_star} onSave={(v) => handleSave("north_star", v)} />
            <TextArea label="Core fear" value={profile.core_fear} onSave={(v) => handleSave("core_fear", v)} />
          </GlassPanel>

          {/* Financial */}
          <GlassPanel className="p-4 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Financial</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tuition Target ($)" value={String(profile.tuition_target)} onSave={(v) => handleSave("tuition_target", parseFloat(v))} />
              <Field label="Deadline" value={profile.tuition_deadline} onSave={(v) => handleSave("tuition_deadline", v)} />
            </div>
            <TextArea label="Budget notes" value={profile.budget_notes} onSave={(v) => handleSave("budget_notes", v)} />
          </GlassPanel>

          {/* War Fronts */}
          <GlassPanel className="p-4 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">War Fronts</h2>
            <KeyValueEditor
              data={profile.war_fronts}
              onSave={(v) => handleSave("war_fronts", v)}
            />
          </GlassPanel>

          {/* What Works */}
          <GlassPanel className="p-4 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">What Works With You</h2>
            <ListEditor items={profile.what_works} onSave={(v) => handleSave("what_works", v)} />
          </GlassPanel>

          {/* Constraints */}
          <GlassPanel className="p-4 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Constraints</h2>
            <ListEditor items={profile.constraints} onSave={(v) => handleSave("constraints", v)} />
          </GlassPanel>

          {/* Custom Sections */}
          <GlassPanel className="p-4 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Custom Sections</h2>
            <p className="text-xs text-gray-400 mb-3">Add your own context that agents should know about.</p>
            <KeyValueEditor
              data={profile.custom_sections}
              onSave={(v) => handleSave("custom_sections", v)}
              keyPlaceholder="Section name"
              valuePlaceholder="Content"
            />
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

// ── Inline editable field ──

function Field({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      {editing ? (
        <input
          autoFocus
          className="glass-input w-full px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { onSave(draft); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { onSave(draft); setEditing(false); } }}
        />
      ) : (
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-white/50 rounded-lg transition-colors"
        >
          {value || <span className="text-gray-400 italic">Click to edit</span>}
        </button>
      )}
    </div>
  );
}

// ── Multiline editable text area ──

function TextArea({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div className="mb-4">
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      {editing ? (
        <textarea
          autoFocus
          className="glass-input w-full px-3 py-2 text-sm min-h-[80px] resize-y"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { onSave(draft); setEditing(false); }}
        />
      ) : (
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-white/50 rounded-lg transition-colors whitespace-pre-wrap"
        >
          {value || <span className="text-gray-400 italic">Click to edit</span>}
        </button>
      )}
    </div>
  );
}

// ── Key-Value editor ──

function KeyValueEditor({
  data,
  onSave,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: {
  data: Record<string, string>;
  onSave: (v: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const [entries, setEntries] = useState(Object.entries(data));
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const save = (updated: [string, string][]) => {
    setEntries(updated);
    onSave(Object.fromEntries(updated));
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, val], i) => (
        <div key={i} className="flex gap-2 items-start">
          <input
            className="glass-input px-3 py-2 text-sm w-1/3"
            value={key}
            onChange={(e) => {
              const updated = [...entries];
              updated[i] = [e.target.value, val];
              setEntries(updated);
            }}
            onBlur={() => save(entries)}
          />
          <input
            className="glass-input px-3 py-2 text-sm flex-1"
            value={val}
            onChange={(e) => {
              const updated = [...entries];
              updated[i] = [key, e.target.value];
              setEntries(updated);
            }}
            onBlur={() => save(entries)}
          />
          <button
            onClick={() => save(entries.filter((_, j) => j !== i))}
            className="text-red-400 hover:text-red-600 px-2 py-2 text-sm shrink-0"
          >
            &times;
          </button>
        </div>
      ))}
      <div className="flex gap-2 items-center">
        <input
          placeholder={keyPlaceholder}
          className="glass-input px-3 py-2 text-sm w-1/3"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <input
          placeholder={valuePlaceholder}
          className="glass-input px-3 py-2 text-sm flex-1"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
        />
        <button
          onClick={() => {
            if (newKey.trim()) {
              save([...entries, [newKey.trim(), newVal]]);
              setNewKey("");
              setNewVal("");
            }
          }}
          className="btn-primary px-3 py-2 text-sm shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── List editor ──

function ListEditor({ items, onSave }: { items: string[]; onSave: (v: string[]) => void }) {
  const [list, setList] = useState(items);
  const [newItem, setNewItem] = useState("");

  const save = (updated: string[]) => {
    setList(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="glass-input px-3 py-2 text-sm flex-1"
            value={item}
            onChange={(e) => {
              const updated = [...list];
              updated[i] = e.target.value;
              setList(updated);
            }}
            onBlur={() => save(list)}
          />
          <button
            onClick={() => save(list.filter((_, j) => j !== i))}
            className="text-red-400 hover:text-red-600 px-2 py-2 text-sm shrink-0"
          >
            &times;
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          placeholder="Add item..."
          className="glass-input px-3 py-2 text-sm flex-1"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newItem.trim()) {
              save([...list, newItem.trim()]);
              setNewItem("");
            }
          }}
        />
        <button
          onClick={() => {
            if (newItem.trim()) {
              save([...list, newItem.trim()]);
              setNewItem("");
            }
          }}
          className="btn-primary px-3 py-2 text-sm shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}
