# Poker Settler — Roadmap

## Phase 1 — Core UI ✅
- Today's game page with buy-in amount selector (candies 🍭)
- Fixed player name dropdown (AJ, Damien, Dani, Elliot, Gaby, Jack, Kevin, Lam, Leon, Nikita, Pascal, Remi, Ronan, Tarek)
- Add players dynamically as they join the table
- Per-player: rebuy counter (+/- buttons), final chip count input
- Edit anytime before submit; grey-out after submit

## Phase 2 — Settlement Calculation ✅
- Net balance: chips_out − (buy_ins × buy_in_amount)
- Minimum-transfer algorithm (greedy debt simplification)
- Results screen: "X pays Y → amount 🍭"

## Phase 3 — Mobile Polish ✅
- Large tap targets, thumb-friendly layout
- Numeric keyboard for inputs
- Final review before submit

## Phase 4 — Stats Dashboard (later)
- Net profit/loss per player (all-time + per session)
- Sessions played & win rate (finished positive)
- Biggest single-session win/loss
- Average buy-ins per session
- Head-to-head: who tends to win when X plays

## Phase 5 — Deploy
- [ ] Push `railway` branch to GitHub
- [ ] Connect repo to Railway
- [ ] Set up Railway deployment
