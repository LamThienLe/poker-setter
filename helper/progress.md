# Progress

## 2026-09-29
- Live pot tracker on game screen: 6 chip buttons (1/5/10/25/50/100), undo, clear — syncs via Supabase Realtime
- Player list now collapses to compact name+rebuy summary during active play; "▼ Rebuys" expands full rows
- Auto-expands player rows when GG is hit (for chip entry)
- Added `pot` (integer) and `pot_history` (jsonb) columns to `games` table; requires SQL migration

## 2026-06-23
- Replaced all emoji (🃏 ✅ 🔗 📊 ⚠️ 🎉 🗑) with Heroicons (24px outline) across all three pages
- Installed `@heroicons/react`
- Kept 🍭 candy emoji as the in-text chip/currency token
- Pushed to `railway` branch — Railway redeployed automatically

- QR code sharing: tap QR icon in header to show a scannable game link modal
- Chip imbalance warning: amber notice above GG button when total 🍭 in ≠ out
- Settled game view: settlement panel (transfers + net results) renders immediately after GG
- Installed `qrcode.react`
- Pushed to `railway` branch — Railway redeploying
