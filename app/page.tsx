"use client";

import { useState } from "react";
import { PLAYER_NAMES, BUY_IN_OPTIONS, type Player } from "@/lib/types";
import { calculateSettlements } from "@/lib/settle";


function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}


function generateId() {
  return Math.random().toString(36).slice(2, 9);
}


function PlayerCard({
  player,
  usedNames,
  onUpdate,
  onRemove,
  locked,
}: {
  player: Player;
  usedNames: Set<string>;
  onUpdate: (updated: Partial<Player>) => void;
  onRemove: () => void;
  locked: boolean;
}) {
  const availableNames = PLAYER_NAMES.filter(
    (n) => n === player.name || !usedNames.has(n)
  );

  return (
    <div
      className={`rounded-2xl p-4 space-y-3 ${
        locked ? "bg-slate-800/50 opacity-70" : "bg-slate-800"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <select
          value={player.name}
          disabled={locked}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-slate-700 text-white rounded-xl px-3 py-3 text-base font-semibold disabled:cursor-not-allowed"
        >
          {availableNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        {!locked && (
          <button
            onClick={onRemove}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 text-slate-400 active:bg-red-900 active:text-red-300 text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-400 font-medium">
          Total buy-ins{" "}
          <span className="text-slate-500">(1 start + 2 rebuys = 3)</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            disabled={locked || player.buyIns <= 1}
            onClick={() => onUpdate({ buyIns: player.buyIns - 1 })}
            className="w-12 h-12 rounded-xl bg-slate-700 text-2xl font-bold disabled:opacity-30 active:bg-slate-600 flex items-center justify-center leading-none"
          >
            −
          </button>
          <span className="flex-1 text-center text-2xl font-bold tabular-nums">
            {player.buyIns}
          </span>
          <button
            disabled={locked}
            onClick={() => onUpdate({ buyIns: player.buyIns + 1 })}
            className="w-12 h-12 rounded-xl bg-slate-700 text-2xl font-bold disabled:opacity-30 active:bg-slate-600 flex items-center justify-center leading-none"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-slate-400 font-medium">
          Final chip count 🍭
        </label>
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={locked}
          value={player.chips}
          onChange={(e) => onUpdate({ chips: e.target.value })}
          placeholder="e.g. 350"
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-lg font-semibold placeholder-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {!locked && (
        <button
          disabled={!player.chips || Number(player.chips) < 0}
          onClick={() => onUpdate({ submitted: true })}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-base active:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      )}

      {locked && (
        <button
          onClick={() => onUpdate({ submitted: false })}
          className="w-full py-2 rounded-xl border border-slate-600 text-slate-400 text-sm active:bg-slate-700"
        >
          Edit
        </button>
      )}
    </div>
  );
}


function SettlementResult({
  players,
  buyInAmount,
}: {
  players: Player[];
  buyInAmount: number;
}) {
  const submitted = players.filter((p) => p.submitted && p.chips !== "");
  if (submitted.length < 2) return null;

  const transfers = calculateSettlements(
    submitted.map((p) => ({
      name: p.name,
      buyIns: p.buyIns,
      chips: Number(p.chips),
    })),
    buyInAmount
  );

  const totalChipsIn = submitted.reduce(
    (s, p) => s + p.buyIns * buyInAmount,
    0
  );
  const totalChipsOut = submitted.reduce((s, p) => s + Number(p.chips), 0);
  const balanced = totalChipsIn === totalChipsOut;

  return (
    <div className="rounded-2xl bg-slate-800 p-4 space-y-4">
      <h2 className="text-lg font-bold text-white">Settlement 💸</h2>

      {!balanced && (
        <p className="text-xs text-amber-400 bg-amber-900/30 rounded-lg px-3 py-2">
          ⚠️ Chips in ({totalChipsIn.toLocaleString()} 🍭) ≠ chips out (
          {totalChipsOut.toLocaleString()} 🍭). Check everyone&apos;s counts.
        </p>
      )}

      {transfers.length === 0 ? (
        <p className="text-slate-400 text-sm">Everyone is even 🎉</p>
      ) : (
        <div className="space-y-2">
          {transfers.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-slate-700/60 rounded-xl px-4 py-3"
            >
              <span className="font-semibold text-red-400">{t.from}</span>
              <span className="text-slate-500 text-xs">→</span>
              <span className="font-semibold text-emerald-400">{t.to}</span>
              <span className="ml-auto font-bold text-white tabular-nums">
                {t.amount.toLocaleString()} 🍭
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-700 pt-3 space-y-1">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
          Net result
        </p>
        {submitted
          .map((p) => ({
            name: p.name,
            net: Number(p.chips) - p.buyIns * buyInAmount,
          }))
          .sort((a, b) => b.net - a.net)
          .map((p) => (
            <div key={p.name} className="flex justify-between text-sm py-0.5">
              <span className="text-slate-300">{p.name}</span>
              <span
                className={
                  p.net > 0
                    ? "text-emerald-400 font-semibold"
                    : p.net < 0
                    ? "text-red-400 font-semibold"
                    : "text-slate-400"
                }
              >
                {p.net > 0 ? "+" : ""}
                {p.net.toLocaleString()} 🍭
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}


export default function Home() {
  const [buyInAmount, setBuyInAmount] = useState<number>(200);
  const [players, setPlayers] = useState<Player[]>([]);
  const [addingName, setAddingName] = useState<string>(PLAYER_NAMES[0]);

  const usedNames = new Set(players.map((p) => p.name));
  const availableToAdd = PLAYER_NAMES.filter((n) => !usedNames.has(n));

  function addPlayer() {
    const name = addingName || availableToAdd[0];
    if (!name) return;
    setPlayers((prev) => [
      ...prev,
      { id: generateId(), name, buyIns: 1, chips: "", submitted: false },
    ]);
    const remaining = availableToAdd.filter((n) => n !== name);
    if (remaining.length > 0) setAddingName(remaining[0]);
  }

  function updatePlayer(id: string, updates: Partial<Player>) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  const allSubmitted =
    players.length >= 2 && players.every((p) => p.submitted);
  const submittedCount = players.filter((p) => p.submitted).length;

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-5 pb-20">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold text-white">🃏 Poker Settler</h1>
        <p className="text-slate-400 text-sm">{todayLabel()}</p>
      </div>

      <div className="rounded-2xl bg-slate-800 p-4 space-y-2">
        <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">
          Buy-in amount
        </label>
        <div className="flex gap-2">
          {BUY_IN_OPTIONS.map((amount) => (
            <button
              key={amount}
              onClick={() => setBuyInAmount(amount)}
              className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
                buyInAmount === amount
                  ? "bg-violet-600 text-white"
                  : "bg-slate-700 text-slate-300 active:bg-slate-600"
              }`}
            >
              {amount} 🍭
            </button>
          ))}
        </div>
      </div>

      {players.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Players
            </h2>
            <span className="text-xs text-slate-500">
              {submittedCount}/{players.length} submitted
            </span>
          </div>
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              usedNames={usedNames}
              onUpdate={(updates) => updatePlayer(player.id, updates)}
              onRemove={() => removePlayer(player.id)}
              locked={player.submitted}
            />
          ))}
        </div>
      )}

      {availableToAdd.length > 0 && (
        <div className="rounded-2xl bg-slate-800 p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Add player to table
          </p>
          <div className="flex gap-2">
            <select
              value={addingName}
              onChange={(e) => setAddingName(e.target.value)}
              className="flex-1 bg-slate-700 text-white rounded-xl px-3 py-3 text-base font-semibold"
            >
              {availableToAdd.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              onClick={addPlayer}
              className="px-5 py-3 rounded-xl bg-violet-600 text-white font-bold text-base active:bg-violet-700"
            >
              + Add
            </button>
          </div>
        </div>
      )}

      {players.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-10">
          Add players as they sit down 👆
        </p>
      )}

      {!allSubmitted && submittedCount > 0 && submittedCount < players.length && (
        <p className="text-center text-slate-500 text-sm">
          Waiting for {players.length - submittedCount} more player
          {players.length - submittedCount > 1 ? "s" : ""} to submit…
        </p>
      )}

      {allSubmitted && (
        <SettlementResult players={players} buyInAmount={buyInAmount} />
      )}
    </main>
  );
}
