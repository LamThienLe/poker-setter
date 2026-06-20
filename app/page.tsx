"use client";

import { useState } from "react";
import { PLAYER_NAMES, BUY_IN_OPTIONS, type Player } from "@/lib/types";
import { calculateSettlements } from "@/lib/settle";


function generateId() {
  return Math.random().toString(36).slice(2, 9);
}


function BuyInStage({
  onConfirm,
}: {
  onConfirm: (amount: number) => void;
}) {
  const [selected, setSelected] = useState<number>(200);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-10">
      <h1 className="text-3xl font-bold text-white tracking-tight">
        🃏 Poker Night
      </h1>

      <div className="w-full max-w-xs space-y-3">
        <p className="text-xs text-slate-400 uppercase tracking-widest text-center font-medium">
          Buy-in amount
        </p>
        <div className="flex gap-3">
          {BUY_IN_OPTIONS.map((amount) => (
            <button
              key={amount}
              onClick={() => setSelected(amount)}
              className={`flex-1 py-4 rounded-2xl text-lg font-bold transition-colors ${
                selected === amount
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-300 active:bg-slate-700"
              }`}
            >
              {amount}
              <span className="block text-xs font-normal mt-0.5 opacity-70">🍭</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onConfirm(selected)}
        className="w-full max-w-xs py-4 rounded-2xl bg-violet-600 text-white text-xl font-bold active:bg-violet-700"
      >
        Let&apos;s play
      </button>
    </main>
  );
}


function PlayerRow({
  player,
  usedNames,
  onUpdate,
  onRemove,
  locked,
}: {
  player: Player;
  usedNames: Set<string>;
  onUpdate: (updates: Partial<Player>) => void;
  onRemove: () => void;
  locked: boolean;
}) {
  const availableNames = PLAYER_NAMES.filter(
    (name) => name === player.name || !usedNames.has(name)
  );

  return (
    <div className="flex items-center gap-2 py-2 border-b border-slate-800 last:border-b-0">
      <select
        value={player.name}
        disabled={locked}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="w-24 shrink-0 bg-slate-800 text-white rounded-lg px-2 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {availableNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1 shrink-0">
        <button
          disabled={locked || player.buyIns <= 1}
          onClick={() => onUpdate({ buyIns: player.buyIns - 1 })}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 text-lg font-bold disabled:opacity-30 active:bg-slate-700 touch-manipulation"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-bold tabular-nums text-white">
          {player.buyIns}
        </span>
        <button
          disabled={locked}
          onClick={() => onUpdate({ buyIns: player.buyIns + 1 })}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 text-lg font-bold disabled:opacity-30 active:bg-slate-700 touch-manipulation"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          +
        </button>
      </div>

      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={locked}
        value={player.chips}
        onChange={(e) => onUpdate({ chips: e.target.value })}
        placeholder="chips"
        className="flex-1 min-w-0 bg-slate-800 text-white rounded-lg px-2 py-2 text-sm font-semibold placeholder-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
      />

      {!locked && (
        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 text-slate-500 active:bg-red-900 active:text-red-300 text-base leading-none shrink-0 touch-manipulation"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          ×
        </button>
      )}

      {locked && (
        <div className="w-7 shrink-0" style={{ minWidth: 44 }} />
      )}
    </div>
  );
}


function SettlementPanel({
  players,
  buyInAmount,
}: {
  players: Player[];
  buyInAmount: number;
}) {
  const transfers = calculateSettlements(
    players.map((player) => ({
      name: player.name,
      buyIns: player.buyIns,
      chips: Number(player.chips),
    })),
    buyInAmount
  );

  const totalChipsIn = players.reduce(
    (sum, player) => sum + player.buyIns * buyInAmount,
    0
  );
  const totalChipsOut = players.reduce(
    (sum, player) => sum + Number(player.chips),
    0
  );
  const isBalanced = totalChipsIn === totalChipsOut;

  const netResults = players
    .map((player) => ({
      name: player.name,
      net: Number(player.chips) - player.buyIns * buyInAmount,
    }))
    .sort((a, b) => b.net - a.net);

  return (
    <div className="space-y-4 pt-2">
      {!isBalanced && (
        <p className="text-xs text-amber-400 bg-amber-900/30 rounded-xl px-3 py-2">
          Chips in ({totalChipsIn.toLocaleString()} 🍭) does not equal chips out (
          {totalChipsOut.toLocaleString()} 🍭) — double-check counts.
        </p>
      )}

      <div className="rounded-2xl bg-slate-800 p-4 space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">
          Transfers
        </p>
        {transfers.length === 0 ? (
          <p className="text-slate-400 text-sm">Everyone is even 🎉</p>
        ) : (
          transfers.map((transfer, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-slate-700/60 rounded-xl px-3 py-2.5"
            >
              <span className="font-semibold text-red-400 text-sm">
                {transfer.from}
              </span>
              <span className="text-slate-500 text-xs">→</span>
              <span className="font-semibold text-emerald-400 text-sm">
                {transfer.to}
              </span>
              <span className="ml-auto font-bold text-white tabular-nums text-sm">
                {transfer.amount.toLocaleString()} 🍭
              </span>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl bg-slate-800 p-4 space-y-1">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">
          Net result
        </p>
        {netResults.map((result) => (
          <div
            key={result.name}
            className="flex justify-between text-sm py-1"
          >
            <span className="text-slate-300">{result.name}</span>
            <span
              className={
                result.net > 0
                  ? "text-emerald-400 font-semibold"
                  : result.net < 0
                  ? "text-red-400 font-semibold"
                  : "text-slate-400"
              }
            >
              {result.net > 0 ? "+" : ""}
              {result.net.toLocaleString()} 🍭
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


function GameStage({ buyInAmount }: { buyInAmount: number }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [settled, setSettled] = useState(false);

  const usedNames = new Set(players.map((player) => player.name));
  const availableNames = PLAYER_NAMES.filter((name) => !usedNames.has(name));

  function addPlayer() {
    const nextName = availableNames[0];
    if (!nextName) return;
    setPlayers((previous) => [
      ...previous,
      { id: generateId(), name: nextName, buyIns: 1, chips: "", submitted: false },
    ]);
  }

  function updatePlayer(id: string, updates: Partial<Player>) {
    setPlayers((previous) =>
      previous.map((player) => (player.id === id ? { ...player, ...updates } : player))
    );
  }

  function removePlayer(id: string) {
    setPlayers((previous) => previous.filter((player) => player.id !== id));
  }

  function handleSettle() {
    setPlayers((previous) =>
      previous.map((player) => ({ ...player, submitted: true }))
    );
    setSettled(true);
  }

  const canSettle =
    players.length >= 2 &&
    players.every((player) => player.chips !== "" && Number(player.chips) >= 0);

  const settledPlayers = players.filter((player) => player.submitted);

  return (
    <main className="max-w-md mx-auto px-4 pt-4 pb-24 min-h-dvh">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-500 font-medium">
          Buy-in: {buyInAmount} 🍭
        </span>
        <button
          onClick={addPlayer}
          disabled={availableNames.length === 0 || settled}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-violet-600 text-white text-xl font-bold disabled:opacity-30 active:bg-violet-700 touch-manipulation"
          style={{ minWidth: 44, minHeight: 44 }}
          aria-label="Add player"
        >
          +
        </button>
      </div>

      {players.length === 0 ? (
        <p className="text-center text-slate-600 text-sm py-16">
          Tap + to add players as they sit down
        </p>
      ) : (
        <div className="mb-6">
          <div className="flex items-center gap-2 px-0 py-1 mb-1">
            <span className="w-24 shrink-0 text-xs text-slate-600 font-medium">Name</span>
            <span className="w-28 shrink-0 text-xs text-slate-600 font-medium text-center">Buy-ins</span>
            <span className="flex-1 text-xs text-slate-600 font-medium">Chips</span>
          </div>
          {players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              usedNames={usedNames}
              onUpdate={(updates) => updatePlayer(player.id, updates)}
              onRemove={() => removePlayer(player.id)}
              locked={settled}
            />
          ))}
        </div>
      )}

      {settled && settledPlayers.length >= 2 ? (
        <SettlementPanel players={settledPlayers} buyInAmount={buyInAmount} />
      ) : (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent">
          <div className="max-w-md mx-auto">
            <button
              disabled={!canSettle}
              onClick={handleSettle}
              className="w-full py-4 rounded-2xl bg-violet-600 text-white text-xl font-bold disabled:opacity-25 disabled:cursor-not-allowed active:bg-violet-700 transition-opacity"
            >
              GG 🃏
            </button>
          </div>
        </div>
      )}
    </main>
  );
}


export default function Home() {
  const [buyInAmount, setBuyInAmount] = useState<number | null>(null);

  if (buyInAmount === null) {
    return <BuyInStage onConfirm={(amount) => setBuyInAmount(amount)} />;
  }

  return <GameStage buyInAmount={buyInAmount} />;
}
