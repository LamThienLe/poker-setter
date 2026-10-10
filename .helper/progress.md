# Progress

## 2026-10-10 (latest)
- Guest free-text add: a second input next to the known-name picker lets
  anyone join a game with a typed name, no `known_players` row needed
- `PlayerRow` now shows a plain label (not a `<select>`) for any name not in
  the known list, since guest names have nowhere to rename to
- `known_players` table updated to the group's voted nicknames (data-only
  change via Supabase REST, no deploy needed for that part)

## 2026-10-08
- Settlement algorithm ported from TypeScript to Rust, compiled to WebAssembly
  with wasm-pack; crate in `settle-wasm/`, generated bindings in
  `lib/settle_wasm/` (committed, since the deploy has no Rust toolchain)
- Algorithm unchanged and verified identical to the old TypeScript over 4009
  generated games plus 8 malformed-input shapes; previous implementation kept
  at `lib/settle.ts.bak` for diffing
- Not a performance win — the JS/WASM boundary crossing costs more than the
  algorithm itself, so the old TypeScript is roughly 5x faster at real table
  sizes. Done as a Rust learning exercise, and recorded here so nobody
  "optimises" it again by mistake
- Supabase credentials moved out of `lib/supabase.ts` into
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so local
  development and production can point at different projects
- `supabase-setup.sql` brought back in line with the real table — it was
  missing `title`, `password` and `hand_history` and the delete policy, so a
  database created from it would have broken on arrival
- Testing workflow written up in `.helper/testing.md`
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in the
  Railway service variables; deployed, build green, and GG verified on the live
  app, so the Rust/WASM settlement is confirmed working in production
- Merged the duplicate `helper/` directory into `.helper/` and deleted it. It
  was not a stale copy — it held a newer 2026-09-29 entry plus the Heroicons,
  QR sharing, chip imbalance and settled-view history that `.helper/` lacked
- Still outstanding: create the test Supabase project. Until then `.env.local`
  holds production credentials and `npm run dev` writes to real games

## 2026-09-29
- Live pot tracker on game screen: 6 chip buttons (1/5/10/25/50/100), undo, clear — syncs via Supabase Realtime
- Player list now collapses to compact name+rebuy summary during active play; "▼ Rebuys" expands full rows
- Auto-expands player rows when GG is hit (for chip entry)
- Added `pot` (integer) and `pot_history` (jsonb) columns to `games` table; requires SQL migration

## 2026-09-18
- Neo-brutalist homepage redesign — cream background (#F5F0E8), heavy black borders, hard offset shadows, ALL CAPS bold type
- Suit color system: ♠ black, ♥ red, ♦ blue, ♣ green — used on buy-in buttons and CTA
- CTA button color changes dynamically based on selected buy-in

## 2026-09-18
- Player profile page at /players/[name] — all-time net, win rate, best/worst session, win/loss streak, full session history with rank
- Stats leaderboard rows are now tappable — tap a player to view their profile
- Pushed to `railway` branch

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

## 2026-06-23
- Share game link button added on the live table — copies the current /game/[code] URL with a quick "Copied" state
- Total pot card added on the live table — shows total buy-ins × buy-in amount for the current session
- Checked helper docs and refreshed roadmap/progress to match the real project state
- Phase 5 marked done per Mr. Lam's deployment confirmation
- Cleaned up the live table top section — split actions, add-player control, and total-pot card into clearer rows with more spacing
- Replaced all emoji (🃏 ✅ 🔗 📊 ⚠️ 🎉 🗑) with Heroicons (24px outline) across all three pages; installed `@heroicons/react`
- Kept 🍭 candy emoji as the in-text chip/currency token
- QR code sharing: tap QR icon in header to show a scannable game link modal; installed `qrcode.react`
- Chip imbalance warning: amber notice above GG button when total 🍭 in ≠ out
- Settled game view: settlement panel (transfers + net results) renders immediately after GG
- Built stats pack into /stats as 3 tabs (Board / Season / 1v1), neo-brutalist style
  - Board: added Best-of awards grid (win rate, per-game profit, avg rank, consistency), 3-session minimum
  - Season: all-players cumulative-profit chart (dependency-free inline SVG)
  - 1v1: player picker → head-to-head record, radar comparison, cumulative chart, overview cards
  - New lib/stats.ts (derived math), components/StatCharts.tsx (SVG charts); no schema changes
  - Pushed to railway → deploying
