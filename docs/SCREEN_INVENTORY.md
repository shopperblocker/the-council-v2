# Screen Inventory — The Council v3

## Route Table

| Route | File | Mode | Auth | Components | SSE | Mobile |
|-------|------|------|------|------------|-----|--------|
| `/` | `app/page.tsx` | server | No | 10 landing sections | No | Yes |
| `/login` | `app/login/page.tsx` | client | No (is auth) | form | No | Yes |
| `/dashboard` | `app/dashboard/page.tsx` | client | Yes | TABLES grid | No | Yes |
| `/war-room` | `app/war-room/page.tsx` | client | Yes | ConversationSidebar, AgentCard, ChatMessage, GlassPanel, MobileDrawer | Yes | Partial |
| `/private-desk` | `app/private-desk/page.tsx` | client | Yes | ConversationSidebar, ThinkingIndicator, GlassPanel | Yes | Partial |
| `/insights` | `app/insights/page.tsx` | client | Yes | InsightCard, InsightDetail | No | Yes |
| `/academy` | `app/academy/page.tsx` | client | Yes | AgentQuickLaunch | No | Yes |
| `/workshop` | `app/workshop/page.tsx` | client | Yes | AgentQuickLaunch | No | Yes |
| `/financial` | `app/financial/page.tsx` | client | Yes | AgentQuickLaunch | No | Yes |
| `/plans` | `app/plans/page.tsx` | client | Yes | AgentQuickLaunch | No | Yes |
| `/profile` | `app/profile/page.tsx` | client | Yes | form | No | Yes |
| `/content` | `app/content/page.tsx` | client | Yes | - | No | - |
| `/business` | `app/business/page.tsx` | client | Yes | - | No | - |

---

## Component Inventory

| Component | File | Props | State | Notes |
|-----------|------|-------|-------|-------|
| `ConversationSidebar` | `components/ConversationSidebar.tsx` | `mode, activeSessionId, onSelect, onNew` | sessions, search, mobileOpen | Self-contained mobile toggle; uses `fixed md:relative` |
| `ChatMessage` | `components/ChatMessage.tsx` | `message: MessageType` | — | `React.memo`, `useMemo` for markdown; role badge hidden on mobile |
| `AgentCard` | `components/AgentCard.tsx` | `agent, isActive, isSpeaking, onToggle, compact` | — | compact=true for sidebar list |
| `AgentAvatar` | `components/AgentAvatar.tsx` | `agentId, size, isActive, isSpeaking` | — | CSS `speakingPulse` animation |
| `SpeakingIndicator` | `components/SpeakingIndicator.tsx` | `agentId, color?` | — | Three `typing-dot` dots |
| `ThinkingIndicator` | `components/ThinkingIndicator.tsx` | `agentId?, color?, agentName?` | — | Three bars, `councilPulse` CSS keyframe |
| `LoadingPulse` | `components/LoadingPulse.tsx` | — | — | Full-page loading state |
| `AgentQuickLaunch` | `components/AgentQuickLaunch.tsx` | `agents, prefillPrompt, mode, title?` | — | Routes to war-room or private-desk with params |
| `InsightCard` | `components/InsightCard.tsx` | `insight, onClick` | — | Type color left border, tag pills, masonry-friendly |
| `InsightDetail` | `components/InsightDetail.tsx` | `insight, onClose, onMarkActed?` | — | Fixed overlay, Escape to close |
| `GlassPanel` | `components/GlassPanel.tsx` | `variant?, className?` | — | Dark navy glass morphism |
| `MobileDrawer` | `components/MobileDrawer.tsx` | `isOpen, onClose` | — | War Room mobile agent panel |
| `SessionHistory` | `components/SessionHistory.tsx` | - | - | DEPRECATED — replaced by ConversationSidebar |
| `ErrorBanner` | `components/ErrorBanner.tsx` | `message` | — | Reusable error display |

---

## Interactive States

### War Room
- **Empty** (no session): agent selection sidebar, empty message area with prompt
- **Debating**: typing indicator in input bar, per-agent streaming dots in message
- **Complete**: synthesis card with gold border, "New Debate" button enabled

### Private Desk
- **Select-agent view**: board-grouped agent grid
- **Conversation view**: ConversationSidebar left, chat area right

### Insights
- **Empty**: link to War Room
- **Filtered**: tag pills + type filter, combined
- **Detail open**: modal overlay, key points + actions list

### Utility Pages
- All localStorage-only — no loading states or error banners needed

---

## Known Gaps

- `SessionHistory` component is deprecated (replaced by `ConversationSidebar`) but the file still exists — safe to keep or delete
- `/content` and `/business` pages not yet rebuilt to localStorage-only (low priority)
- War Room doesn't show ConversationSidebar mobile toggle button consistently (two toggle buttons: hamburger for agents sidebar, ConversationSidebar's own toggle)
- `@phosphor-icons/react` installed but not yet used in any component — icons.ts registry exists for future use
