# Progress

## 2026-06-20
- Project initialized with Next.js + Tailwind, committed on `railway` branch
- Core UI: today's page, dynamic player add, buy-in selector (200/250/500 🍭), rebuy +/− counter, chip input
- Settlement algorithm: greedy minimum-transfer, net leaderboard, ⚠️ imbalance warning
- Cards grey out after submit, Edit button to unlock
- Mobile-first: large tap targets, numeric keyboard, dark theme
- Build passing — ready for Mr. Lam to push from home and deploy on Railway
- Supabase Realtime integrated: shared game sessions via /game/[code], live sync across all phones
- Redesigned to 2-stage flow: buy-in picker → compact game screen with thin player rows
- GG button settles and locks the game for all connected devices simultaneously
- Pending: Phase 4 stats dashboard, Phase 5 Railway deploy

## 2026-06-21
- Added Antoine to player list (alphabetical)

## 2026-06-22
- Discard button added to game page — deletes game from Supabase, redirects home (with confirm dialog)
- Active-game guard on home page — prompts to resume if an unsettled game exists today
- Stats dashboard built at /stats — leaderboard (all-time net, sessions, win rate) + session history
- Stats link added to settled game view
- Delete session button added to stats history (trash icon, confirm prompt)
- Fixed: Supabase RLS missing delete policy — added "public delete" policy so deletions persist
- All changes pushed to `railway` branch on GitHub
- Mid-game stats access added — Stats button now opens leaderboard/history without needing GG first
- Stats page can return straight back to the live table when opened from a game
