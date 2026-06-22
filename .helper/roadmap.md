# Poker Settler — Roadmap

## Phase 1 — Core UI ✅
- Today's game page with buy-in amount selector (candies 🍭)
- Fixed player name dropdown (AJ, Antoine, Damien, Dani, Elliot, Gaby, Jack, Kevin, Lam, Leon, Nikita, Pascal, Remi, Ronan, Tarek)
- Add players dynamically as they join the table
- Per-player: rebuy counter (+/- buttons), final chip count input
- Edit anytime before submit; grey-out after submit

## Phase 2 — Settlement Calculation ✅
- Net balance: chips_out − (buy_ins × buy_in_amount)
- Minimum-transfer algorithm (greedy debt simplification)
- Results screen: "X pays Y → 🍭 amount"

## Phase 3 — Mobile Polish ✅
- Large tap targets, thumb-friendly layout
- Numeric keyboard for inputs
- Final review before submit

## Phase 4 — Stats Dashboard ✅
- /stats page: leaderboard with all-time net, sessions, win rate
- Session history list with color-coded player results
- Delete session button (trash icon) with Supabase RLS delete policy
- Stats link from settled game view

## Phase 5 — Deploy ✅
- [x] Push `railway` branch to GitHub
- [x] Confirm Railway connected and auto-deploying

## Nice-to-haves (future)
- Player profile page — tap name in stats to see full session history
- [x] Share game link — copy button on game page
- [x] Total pot display on game page (e.g. "Total pot: 3,500 🍭")
