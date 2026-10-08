//! Minimum-transfer settlement for a poker game.
//!
//! This is a direct port of the original `lib/settle.ts`. The algorithm is
//! unchanged: compute each player's net balance, then greedily match the
//! largest remaining debtor against the largest remaining creditor. That
//! produces at most `n - 1` transfers, which is the practical minimum for
//! settling up a home game.
//!
//! The port deliberately mirrors JavaScript's *observable* semantics, not just
//! its happy path — see the notes on ordering and float equality below.

use serde::de::{Deserializer, IgnoredAny};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Coerce a JSON value to `f64` the way JavaScript's `Number()` would.
///
/// The TypeScript version degraded quietly on malformed input: a missing field
/// became `undefined`, arithmetic on it produced `NaN`, and `NaN` is neither
/// `> 0` nor `< 0`, so that player silently dropped out of the settlement.
/// Strict serde would instead return `Err` here, and because the call site runs
/// during a React render, that error would surface as a blank screen in the
/// middle of a live game. Matching the old leniency is the safer behaviour.
fn js_number<'de, D>(deserializer: D) -> Result<f64, D::Error>
where
    D: Deserializer<'de>,
{
    // `untagged` tries each variant in order; `Other` catches null, booleans
    // and objects so that nothing reaches the caller as an error.
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Loose {
        Num(f64),
        Str(String),
        Other(IgnoredAny),
    }

    Ok(match Loose::deserialize(deserializer) {
        Ok(Loose::Num(n)) => n,
        Ok(Loose::Str(s)) => {
            // `Number("")` and `Number("  ")` are 0; `Number("abc")` is NaN.
            let t = s.trim();
            if t.is_empty() {
                0.0
            } else {
                t.parse().unwrap_or(f64::NAN)
            }
        }
        // `Number(null)` is 0. Anything else is treated as NaN, which drops the
        // player from the settlement rather than inventing a debt for them.
        Ok(Loose::Other(_)) => 0.0,
        Err(_) => f64::NAN,
    })
}

/// A field that is absent entirely becomes NaN, same as `undefined` in JS.
fn nan() -> f64 {
    f64::NAN
}

/// One player's result for the session.
///
/// `rename_all = "camelCase"` maps Rust's snake_case fields onto the exact JSON
/// keys the TypeScript caller already sends (`buyIns`), so the call site needs
/// no reshaping.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerEntry {
    #[serde(default)]
    pub name: String,
    #[serde(default = "nan", deserialize_with = "js_number")]
    pub buy_ins: f64,
    #[serde(default = "nan", deserialize_with = "js_number")]
    pub chips: f64,
}

/// A single "X pays Y" instruction.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Transfer {
    pub from: String,
    pub to: String,
    pub amount: f64,
}

/// A name with a running balance, used for both sides of the match.
#[derive(Debug, Clone)]
struct Party {
    name: String,
    amount: f64,
}

/// The pure algorithm, free of any wasm/JS types.
///
/// Keeping this separate from the `#[wasm_bindgen]` wrapper is the important
/// structural choice here: it is ordinary Rust, so it can be unit-tested with
/// plain `cargo test` on the host, with no browser and no JS runtime involved.
pub fn calculate_settlements(players: &[PlayerEntry], buy_in_amount: f64) -> Vec<Transfer> {
    // The TS version builds `balances` as a plain object keyed by name. That
    // has two behaviours we must reproduce:
    //   1. iteration follows *first* insertion order, and
    //   2. a repeated name overwrites the earlier value while keeping its
    //      original position.
    // A `HashMap` would lose (1) and a plain `Vec` would lose (2), so we use a
    // Vec of pairs plus a positional lookup. Player counts here are tiny, so
    // the linear scan is irrelevant to performance and keeps the dependency
    // list short (no `indexmap`).
    let mut balances: Vec<Party> = Vec::with_capacity(players.len());
    for player in players {
        let balance = player.chips - player.buy_ins * buy_in_amount;
        match balances.iter_mut().find(|p| p.name == player.name) {
            Some(existing) => existing.amount = balance,
            None => balances.push(Party {
                name: player.name.clone(),
                amount: balance,
            }),
        }
    }

    // Positive balance = owed money. Negative = owes money, stored as a
    // positive magnitude so both sides can be compared directly.
    let mut creditors: Vec<Party> = balances
        .iter()
        .filter(|p| p.amount > 0.0)
        .cloned()
        .collect();

    let mut debtors: Vec<Party> = balances
        .iter()
        .filter(|p| p.amount < 0.0)
        .map(|p| Party {
            name: p.name.clone(),
            amount: -p.amount,
        })
        .collect();

    // Descending by amount. `sort_by` is a *stable* sort, which matches
    // `Array.prototype.sort` in modern JS engines, so players tied on amount
    // keep their original relative order and the output stays identical.
    // `total_cmp` gives a total order over f64 without the `unwrap()` that
    // `partial_cmp` would need.
    creditors.sort_by(|a, b| b.amount.total_cmp(&a.amount));
    debtors.sort_by(|a, b| b.amount.total_cmp(&a.amount));

    let mut transfers: Vec<Transfer> = Vec::new();

    let mut ci = 0usize;
    let mut di = 0usize;

    while ci < creditors.len() && di < debtors.len() {
        // Two separate Vecs, so the borrow checker is happy to hand out a
        // mutable reference into each at the same time.
        let creditor = &mut creditors[ci];
        let debtor = &mut debtors[di];

        // `f64::min` rather than a hand-rolled comparison: it matches
        // `Math.min` for ordinary values.
        let amount = creditor.amount.min(debtor.amount);

        transfers.push(Transfer {
            from: debtor.name.clone(),
            to: creditor.name.clone(),
            amount,
        });

        creditor.amount -= amount;
        debtor.amount -= amount;

        // Exact `== 0.0` mirrors the original `=== 0`. Clippy would normally
        // object to comparing floats, but matching the TS behaviour bit for
        // bit is the point: a different epsilon here could emit a different
        // number of transfers than the version this replaces.
        #[allow(clippy::float_cmp)]
        {
            if creditor.amount == 0.0 {
                ci += 1;
            }
            if debtor.amount == 0.0 {
                di += 1;
            }
        }
    }

    transfers
}

// Hand-written TypeScript for the generated `.d.ts`. Without this, wasm-bindgen
// types the boundary as `any`, and the call site would silently lose the type
// checking it has today.
#[wasm_bindgen(typescript_custom_section)]
const TS_APPEND_CONTENT: &'static str = r#"
export interface PlayerEntry {
  name: string;
  buyIns: number;
  chips: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}
"#;

// `extern "C"` blocks with `typescript_type` declare opaque JS-side types.
// They carry no Rust representation; they exist purely so the generated
// signature reads `(players: PlayerEntry[], buyInAmount: number): Transfer[]`.
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "PlayerEntry[]")]
    pub type PlayerEntryArray;

    #[wasm_bindgen(typescript_type = "Transfer[]")]
    pub type TransferArray;
}

/// JS entry point. `js_name` preserves the original camelCase export name, so
/// the import at the call site is unchanged.
#[wasm_bindgen(js_name = calculateSettlements)]
pub fn calculate_settlements_js(
    players: PlayerEntryArray,
    buy_in_amount: f64,
) -> Result<TransferArray, JsError> {
    // serde_wasm_bindgen walks the live JS values directly; there is no JSON
    // string in between.
    // Individual malformed players are tolerated by `js_number` above. A
    // completely unusable argument (not an array at all) still yields an empty
    // settlement rather than an exception, matching how the TS version would
    // have produced no transfers instead of taking the page down.
    let players: Vec<PlayerEntry> =
        serde_wasm_bindgen::from_value(players.into()).unwrap_or_default();

    let transfers = calculate_settlements(&players, buy_in_amount);

    let value = serde_wasm_bindgen::to_value(&transfers)
        .map_err(|e| JsError::new(&format!("failed to serialise transfers: {e}")))?;

    // The opaque TS type has no checked conversion by construction, so this
    // cast is the intended way to return it.
    Ok(value.unchecked_into())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(name: &str, buy_ins: f64, chips: f64) -> PlayerEntry {
        PlayerEntry {
            name: name.to_string(),
            buy_ins,
            chips,
        }
    }

    #[test]
    fn empty_game_settles_to_nothing() {
        assert!(calculate_settlements(&[], 20.0).is_empty());
    }

    #[test]
    fn everyone_even_needs_no_transfers() {
        let players = vec![entry("a", 1.0, 20.0), entry("b", 1.0, 20.0)];
        assert!(calculate_settlements(&players, 20.0).is_empty());
    }

    #[test]
    fn single_loser_pays_single_winner() {
        let players = vec![entry("winner", 1.0, 35.0), entry("loser", 1.0, 5.0)];
        let transfers = calculate_settlements(&players, 20.0);
        assert_eq!(
            transfers,
            vec![Transfer {
                from: "loser".into(),
                to: "winner".into(),
                amount: 15.0,
            }]
        );
    }

    #[test]
    fn one_debtor_split_across_two_creditors() {
        // big_loss bought in twice and busted: -40. The two winners are owed
        // 30 and 10, so the table balances and both get paid.
        let players = vec![
            entry("small_win", 1.0, 30.0),
            entry("big_win", 1.0, 50.0),
            entry("big_loss", 2.0, 0.0),
            entry("even", 1.0, 20.0),
        ];
        let transfers = calculate_settlements(&players, 20.0);
        // Largest creditor is matched first.
        assert_eq!(transfers.len(), 2);
        assert_eq!(transfers[0].to, "big_win");
        assert_eq!(transfers[0].amount, 30.0);
        assert_eq!(transfers[1].to, "small_win");
        assert_eq!(transfers[1].amount, 10.0);
        assert!(transfers.iter().all(|t| t.from == "big_loss"));
    }

    #[test]
    fn rebuys_count_toward_the_balance() {
        let players = vec![entry("grinder", 3.0, 100.0), entry("donor", 1.0, 0.0)];
        let transfers = calculate_settlements(&players, 20.0);
        // grinder: 100 - 60 = +40, donor: 0 - 20 = -20. Only 20 is payable.
        assert_eq!(transfers.len(), 1);
        assert_eq!(transfers[0].amount, 20.0);
    }

    #[test]
    fn transfers_never_exceed_player_count_minus_one() {
        let players = vec![
            entry("a", 1.0, 55.0),
            entry("b", 1.0, 30.0),
            entry("c", 1.0, 10.0),
            entry("d", 1.0, 5.0),
            entry("e", 1.0, 0.0),
        ];
        let transfers = calculate_settlements(&players, 20.0);
        assert!(transfers.len() <= players.len() - 1);
    }

    #[test]
    fn duplicate_name_overwrites_the_earlier_balance() {
        // Matches `balances[name] = ...`: the second "a" replaces the first
        // value rather than adding a second party. If we appended instead,
        // "a" would still be a 20 debtor and a transfer would be emitted.
        let players = vec![
            entry("a", 1.0, 0.0),  // -20, then discarded
            entry("b", 1.0, 40.0), // +20
            entry("a", 1.0, 40.0), // overwrite: a is now +20
        ];
        assert!(calculate_settlements(&players, 20.0).is_empty());
    }

    #[test]
    fn creditors_tied_on_amount_keep_insertion_order() {
        // b and c are both owed 20. A stable sort must leave b first, which is
        // what `Array.prototype.sort` does for the TS version.
        let players = vec![
            entry("a", 1.0, 0.0),
            entry("b", 1.0, 40.0),
            entry("c", 1.0, 40.0),
        ];
        let transfers = calculate_settlements(&players, 20.0);
        assert_eq!(transfers.len(), 1);
        assert_eq!(transfers[0].from, "a");
        assert_eq!(transfers[0].to, "b");
    }
}
