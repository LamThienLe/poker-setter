---
name: project_poker_settler
description: "Poker Settler app — stack, deploy flow, and parked feature decisions"
metadata:
  node_type: memory
  type: project
  originSessionId: 8f850f22-d49c-480d-bd41-c4439f8c936a
  modified: 2026-10-10T10:18:36.655Z
---

Poker Settler: Next.js 16 + React 19 + Supabase cash-game settler. Repo `LamThienLe/poker-setter`, local at ~/projects/poker-settler. Deploy branch is `railway` (push → Railway auto-deploys). Neo-brutalist UI: cream bg `#F5F0E8`, thick black borders, hard offset shadows, uppercase black weights, Heroicons, no new emoji. Chip/currency token is 🍭.

Data model: games table (code, buy_in, players jsonb, settled, created_at, title, password). Per player: name, buyIns, chips. net = chips − buyIns×buy_in. No pot columns (pot tracker removed 2026-10-10). RLS is fully open (anon key can read/insert/update/delete every row) — not an access boundary.

Stats pack (shipped 2026-10-10): /stats has 3 tabs — Board (leaderboard + Best-of awards, 3-session min), Season (all-players cumulative SVG chart), 1v1 (head-to-head record + radar + cumulative chart + overview cards). Math in lib/stats.ts; charts are dependency-free inline SVG in components/StatCharts.tsx.

Auth state (as of 2026-10-10): NO login / accounts / user identity. Access model is shared game-code + optional per-game password (set at create; join screen prompts for it; locked games show a lock icon). Players are free-text names, not accounts. Verified by grep — zero auth/signin/Supabase-auth refs in code.

Parked features (Lam: "only work if there are real people" — i.e. don't build speculatively; wait for real group demand. Decided to revisit later, not now):
- Google sign-in via Supabase OAuth — add only when identity/ownership is actually wanted.
- Crowd nickname suggest + vote — needs a suggestions table + voting UI + anti-stuffing (leans on sign-in). One person requested; hold until more demand.
