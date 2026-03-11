# The Council — Design Specification

> Pass this file as context: `claude --files docs/DESIGN_SPEC.md`
> Updated: v3 design system (navy dark theme, Cormorant Garamond, Cinzel)

---

## Color Tokens

Defined in `the-council/frontend/tailwind.config.ts`. **Never use hardcoded hex values.**

| Token | Value | Usage |
|-------|-------|-------|
| `council-navy` | `#0a1628` | Page background |
| `council-navy-light` | `#0d1f3c` | Elevated surfaces |
| `council-navy-mid` | `#112240` | Active states, hover backgrounds |
| `council-surface` | `#0f1e35` | Cards, panels, sidebar |
| `council-border` | `#1e3a5f` | All borders |
| `council-gold` | `#c9a84c` | Primary accent, CTAs, active indicators |
| `council-gold-light` | `#e8c97a` | Hover state for gold elements |
| `council-gold-dim` | `#8a6d2f` | Muted gold |
| `council-cream` | `#f5f0e8` | High-contrast text on dark |
| `council-text-primary` | `#e8dcc8` | Primary text |
| `council-text-secondary` | `#9a8a6a` | Labels, metadata |
| `council-text-tertiary` | `#4a5a7a` | Placeholders, timestamps |

---

## Agent Identity System

Defined in `the-council/frontend/lib/design-system.ts`.

| Agent ID | Color | Role |
|----------|-------|------|
| `Rockefeller` | `#c9a84c` | CFO · The Standard Oil Magnate |
| `Napoleon` | `#b87333` | Emperor · The Military Strategist |
| `Bismarck` | `#8b9467` | Chancellor · The Iron Chancellor |
| `Madam_Walker` | `#cd7f32` | Hustler · The Self-Made Millionaire |
| `Marcus_Aurelius` | `#a0956b` | Stoic · The Philosopher Emperor |
| `Frankl` | `#9b8f6e` | Meaning-Maker · The Logotherapy Founder |
| `Wim_Hof` | `#7b9ea6` | Iceman · The Breathing Master |
| `Feynman` | `#d4a853` | Explainer · The Nobel Physicist |
| `Da_Vinci` | `#c4956a` | Polymath · The Renaissance Man |
| `Socrates` | `#b8a88a` | Gadfly · The Philosopher |
| `Ben_Franklin` | `#c9a227` | Pragmatist · The Founding Scientist |
| `Steve_Jobs` | `#8a7f72` | Perfectionist · The Design Visionary |

**Helper functions** (import from `@/lib/design-system`):
- `getAgentColor(agentId: string): string`
- `getAgentRole(agentId: string): string`
- `getAgentInitials(name: string): string`

---

## Typography Scale

| Class | Font | Usage |
|-------|------|-------|
| `font-display` | Cormorant Garamond | Page titles, section headers (`text-4xl+`) |
| `font-body` | Libre Baskerville | Body text (default) |
| `font-label` | Cinzel | Used via `.label-caps` utility |
| `font-mono` | JetBrains Mono | Code, timestamps |
| `.label-caps` | Cinzel 400, `0.65rem`, uppercase, tracked | Section labels, badges |

---

## Component Patterns

### Glass panels
```tsx
// Standard glass panel
<div className="glass p-4 rounded-xl">
// Subtle variant
<div className="glass-subtle p-4 rounded-xl">
// Strong variant
<div className="glass-strong p-4 rounded-xl">
// Input
<input className="glass-input px-3 py-2" />
```

### Gold decorators
```tsx
<div className="rule-gold w-16" />        {/* Thin gold horizontal line */}
<div className="rule-gold w-16 mx-auto" />{/* Centered */}
```

### Buttons
```tsx
<button className="btn-primary px-4 py-2.5 text-sm">Action</button>
```

### Section labels
```tsx
<span className="label-caps">Section Name</span>
```

### Agent avatar (inline, without AgentAvatar component)
```tsx
<div
  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
  style={{
    background: `${color}18`,
    border: `2px solid ${color}`,
    color: color,
    fontFamily: "var(--font-label)",
  }}
>
  {initials}
</div>
```

---

## Screen Notes

| Route | Component | Notes |
|-------|-----------|-------|
| `/` | `app/page.tsx` | Cinematic landing, framer-motion, `defaultEase` required |
| `/dashboard` | `app/dashboard/page.tsx` | Hub grid, links to all pages |
| `/war-room` | `app/war-room/page.tsx` | SSE streaming, RAF batching, ConversationSidebar |
| `/private-desk` | `app/private-desk/page.tsx` | 1-on-1, tool use, ConversationSidebar |
| `/insights` | `app/insights/page.tsx` | Tag filter, masonry grid, InsightDetail modal |
| `/academy` | `app/academy/page.tsx` | localStorage only, AgentQuickLaunch |
| `/workshop` | `app/workshop/page.tsx` | localStorage only, AgentQuickLaunch |
| `/financial` | `app/financial/page.tsx` | localStorage only, AgentQuickLaunch |
| `/plans` | `app/plans/page.tsx` | localStorage only, AgentQuickLaunch |
| `/login` | `app/login/page.tsx` | NextAuth v5 credentials |

---

## Animation Inventory

All keyframes defined in `app/globals.css`. **Never use framer-motion in new council components.**

| Keyframe | CSS class / usage | Effect |
|----------|-------------------|--------|
| `councilPulse` | `animation: councilPulse` | ThinkingIndicator bars scale Y |
| `councilExpand` | `animation: councilExpand` | LoadingPulse line width 0→100% |
| `councilFadeIn` | `animation: councilFadeIn` | Fade in + slight Y translate |
| `speakingPulse` | `animation: speakingPulse` | AgentAvatar scale 1→1.04 |
| `typing-dot` | `.typing-dot` class | Chat message streaming dots |
| `message-enter` | `.message-enter` class | New message fade+slide |
| `marquee` | `animate-marquee` | Landing marquee scroll |

---

## Anti-Patterns (Never Do These)

1. **Hardcoded hex** — Use `council-gold` not `#c9a84c`
2. **`bg-white` or `bg-gray-*`** — This is a dark-only app
3. **`text-gray-*`** — Use `text-council-text-secondary` or `text-council-text-tertiary`
4. **framer-motion in war-room/private-desk components** — Use CSS keyframes only
5. **`number[]` for framer ease values** — Use `defaultEase` from `@/lib/animations`
6. **Editing without reading first** — The Edit tool fails if file hasn't been read
7. **Import from `@/components/SessionHistory`** — Replaced by `ConversationSidebar`
8. **Backend calls from Academy/Workshop/Financial/Plans** — These are localStorage-only

---

## Rules for New Components

1. Use `bg-council-surface` + `border border-council-border` for cards
2. Use `text-council-text-primary` for body copy
3. Use `.label-caps` for all section headers and badges
4. Agent colors from `getAgentColor(agentId)` — never hardcode
5. Mobile: test at `sm:` (640px) breakpoint — sidebar components use `md:` (768px)
6. Streaming states: use `typing-dot` CSS class for dots, not framer-motion
7. New pages: include `&larr; Back` button linking to `/dashboard`
