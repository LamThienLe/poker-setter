# settle-wasm

The poker settlement algorithm, written in Rust and compiled to WebAssembly.

This replaces the old `lib/settle.ts`. The algorithm is unchanged — it is the
same greedy minimum-transfer match (biggest debtor against biggest creditor,
repeat), producing at most `n - 1` transfers. Only the implementation language
changed.

The previous TypeScript implementation is kept at `lib/settle.ts.bak` for
diffing during the transition. It is not imported anywhere and does not compile
into the app (`.bak` is outside the TypeScript include set).

## Layout

| Path | What it is |
| --- | --- |
| `settle-wasm/src/lib.rs` | The Rust source. Edit this. |
| `settle-wasm/Cargo.toml` | Crate manifest. |
| `lib/settle_wasm/` | **Generated** by wasm-pack. Never edit by hand. |

`lib/settle_wasm/` is committed on purpose: Vercel builds the Next.js app
without a Rust toolchain, so the `.wasm` and its JS bindings have to be in the
repo. wasm-pack writes a `.gitignore` containing `*` into its output directory
on every build — **delete that file after rebuilding**, or the bindings will
silently stop being committed and deploys will fail to resolve the import.

## Rebuilding after changing the Rust

Prerequisites, once per machine:

```bash
rustup target add wasm32-unknown-unknown
brew install wasm-pack        # or: cargo install wasm-pack
```

Then, from the repository root:

```bash
cd settle-wasm
cargo test                    # run the native unit tests first — fast, no browser
wasm-pack build --release --target bundler \
  --out-dir ../lib/settle_wasm --out-name settle_wasm
rm -f ../lib/settle_wasm/.gitignore
```

Verify the app still compiles and type-checks against the new bindings:

```bash
cd .. && npx next build
```

Commit both the Rust change and the regenerated contents of `lib/settle_wasm/`
in the same commit, so the source and the artifact never drift apart.

## Why `--target bundler`

wasm-pack can emit several flavours of bindings. `bundler` produces an ES module
that does `import * as wasm from "./settle_wasm_bg.wasm"` and lets the bundler
handle loading. Next.js 16's Turbopack supports that import natively, which is
what keeps `calculateSettlements` a **synchronous** call — the call site in
`app/game/[code]/page.tsx` invokes it during render, so an `await init()` step
would have forced an API change.

If a future Next.js version stops handling that import, the fallback is
`--target web` plus serving the `.wasm` from `public/` and initialising it once
behind a provider. That would make initialisation async, so prefer staying on
`bundler`.

## Public API

Unchanged from the TypeScript version:

```ts
import { calculateSettlements } from "@/lib/settle_wasm/settle_wasm";

interface PlayerEntry { name: string; buyIns: number; chips: number }
interface Transfer { from: string; to: string; amount: number }

calculateSettlements(players: PlayerEntry[], buyInAmount: number): Transfer[]
```

The TypeScript interfaces in the generated `.d.ts` are declared in `lib.rs` via
`#[wasm_bindgen(typescript_custom_section)]` and the `typescript_type` extern
types. Without those, wasm-bindgen would type the boundary as `any` and the call
site would lose its type checking — so if you add or rename a field in the Rust
structs, update that TypeScript block in `lib.rs` to match.

## Notes on matching JavaScript exactly

A few places in `lib.rs` look odd for Rust and are deliberate, because the
output has to match the implementation it replaces:

- **All amounts are `f64`**, not integers. Chip counts can be fractional, and
  JS has only `Number`.
- **Balances are a `Vec` of pairs, not a `HashMap`.** The TS version keys a
  plain object by player name, which iterates in first-insertion order and
  overwrites in place on a repeated name. A `HashMap` loses the ordering; a bare
  `Vec` loses the overwrite.
- **`sort_by` is a stable sort**, matching `Array.prototype.sort`, so players
  tied on amount keep their original relative order.
- **`amount == 0.0` is an exact float comparison**, mirroring `=== 0`. An
  epsilon here could change how many transfers get emitted.

These are covered by the unit tests in `lib.rs`, and were checked against the
old TypeScript over ~4000 randomised games before the switch.
