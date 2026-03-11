# Claw Memory

## Current Focus
- Shipping The Council v3 design system + authentication
- Building Claw autonomous orchestrator (this system)

## Recent Decisions
- Utility pages (Academy/Workshop/Financial/Plans): localStorage-only rebuild — no backend calls
- Insights schema: backward-compatible nullable columns added to existing table
- ConversationSidebar: self-contained component with mobile overlay, uses existing sessions endpoints
- Authentication: NextAuth v5 + bcryptjs + PostgreSQL users table (same Railway DB)

## What's Shipping
- The Council v3: navy design system, Cinzel fonts, Cormorant Garamond headers
- Claw: Python task orchestrator with Telegram bot + tmux agent spawning

## Blockers
- (none currently)

## Agent Patterns That Worked
- Always read files before editing — "File has not been read yet" error otherwise
- For multi-step edits, read the specific offset/limit range before editing
- ConversationSidebar uses `fixed md:relative` so it participates in flex layout on desktop

## Agent Patterns That Failed
- Guessing exact string content for Edit tool without reading first → always fails
- Trying to import lodash debounce → not installed, use useRef + setTimeout instead
- Using `number[]` typed arrays for framer-motion ease values → TypeScript fails, use defaultEase
