"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { type GameRow } from "@/lib/game";
import { PLAYER_NAMES, type Player } from "@/lib/types";
import { calculateSettlements } from "@/lib/settle";


function generateId() {
  return Math.random().toString(36).slice(2, 9);
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
          className="flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 text-lg font-bold disabled:opacity-30 active:bg-slate-700 touch-manipulation"
          style={{ minWidth: 44, minHeight: 44, width: 32, height: 32 }}
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-bold tabular-nums text-white">
          {player.buyIns}
        </span>
        <button
          disabled={locked}
          onClick={() => onUpdate({ buyIns: player.buyIns + 1 })}
          className="flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 text-lg font-bold disabled:opacity-30 active:bg-slate-700 touch-manipulation"
          style={{ minWidth: 44, minHeight: 44, width: 32, height: 32 }}
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
          className="flex items-center justify-center rounded-full bg-slate-800 text-slate-500 active:bg-red-900 active:text-red-300 text-base leading-none shrink-0 touch-manipulation"
          style={{ minWidth: 44, minHeight: 44, width: 28, height: 28 }}
        >
          ×
        </button>
      )}

      {locked && <div style={{ minWidth: 44, width: 28 }} className="shrink-0" />}
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
    players.map((p) => ({ name: p.name, buyIns: p.buyIns, chips: Number(p.chips) })),
    buyInAmount
  );

  const totalIn = players.reduce((s, p) => s + p.buyIns * buyInAmount, 0);
  const totalOut = players.reduce((s, p) => s + Number(p.chips), 0);
  const balanced = totalIn === totalOut;

  const netResults = players
    .map((p) => ({ name: p.name, net: Number(p.chips) - p.buyIns * buyInAmount }))
    .sort((a, b) => b.net - a.net);

  return (
    <div className="space-y-4 pt-2 pb-8">
      {!balanced && (
        <p className="text-xs text-amber-400 bg-amber-900/30 rounded-xl px-3 py-2">
          ⚠️ Chips in ({totalIn.toLocaleString()} 🍭) ≠ chips out ({totalOut.toLocaleString()} 🍭) — double-check counts.
        </p>
      )}

      <div className="rounded-2xl bg-slate-800 p-4 space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Transfers</p>
        {transfers.length === 0 ? (
          <p className="text-slate-400 text-sm">Everyone is even 🎉</p>
        ) : (
          transfers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-700/60 rounded-xl px-3 py-2.5">
              <span className="font-semibold text-red-400 text-sm">{t.from}</span>
              <span className="text-slate-500 text-xs">→</span>
              <span className="font-semibold text-emerald-400 text-sm">{t.to}</span>
              <span className="ml-auto font-bold text-white tabular-nums text-sm">{t.amount.toLocaleString()} 🍭</span>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl bg-slate-800 p-4 space-y-1">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Net result</p>
        {netResults.map((r) => (
          <div key={r.name} className="flex justify-between text-sm py-1">
            <span className="text-slate-300">{r.name}</span>
            <span className={r.net > 0 ? "text-emerald-400 font-semibold" : r.net < 0 ? "text-red-400 font-semibold" : "text-slate-400"}>
              {r.net > 0 ? "+" : ""}{r.net.toLocaleString()} 🍭
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [pageState, setPageState] = useState<"loading" | "not-found" | "active" | "settled">("loading");
  const [game, setGame] = useState<GameRow | null>(null);
  const [addingName, setAddingName] = useState<string>(PLAYER_NAMES[0]);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const pendingWrite = useRef(false);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyGame = useCallback((row: GameRow) => {
    setGame(row);
    setPageState(row.settled ? "settled" : "active");
  }, []);

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .eq("code", code)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setPageState("not-found");
          return;
        }
        applyGame(data as GameRow);
      });

    const channel = supabase
      .channel(`game:${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `code=eq.${code}` },
        (payload) => {
          if (pendingWrite.current) {
            pendingWrite.current = false;
            return;
          }
          applyGame(payload.new as GameRow);
        }
      )
      .subscribe();

    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [code, applyGame]);

  async function pushPlayers(updatedPlayers: Player[], settled = false) {
    if (!game) return;
    pendingWrite.current = true;
    setGame((prev) => prev ? { ...prev, players: updatedPlayers, settled } : prev);
    if (settled) setPageState("settled");
    await supabase
      .from("games")
      .update({ players: updatedPlayers, settled })
      .eq("code", code);
  }

  function addPlayer() {
    if (!game) return;
    const usedNames = new Set(game.players.map((p) => p.name));
    const available = PLAYER_NAMES.filter((n) => !usedNames.has(n));
    const name = available.includes(addingName as typeof PLAYER_NAMES[number]) ? addingName : available[0];
    if (!name) return;
    const newPlayers = [
      ...game.players,
      { id: generateId(), name, buyIns: 1, chips: "", submitted: false },
    ];
    pushPlayers(newPlayers);
    const remaining = available.filter((n) => n !== name);
    if (remaining.length > 0) setAddingName(remaining[0]);
  }

  function updatePlayer(id: string, updates: Partial<Player>) {
    if (!game) return;
    const newPlayers = game.players.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    pushPlayers(newPlayers);
  }

  function removePlayer(id: string) {
    if (!game) return;
    const newPlayers = game.players.filter((p) => p.id !== id);
    pushPlayers(newPlayers);
  }

  function handleSettle() {
    if (!game) return;
    pushPlayers(game.players, true);
  }

  function openStats() {
    router.push(`/stats?returnTo=${code}`);
  }

  async function copyGameLink() {
    const gameUrl = `${window.location.origin}/game/${code}`;

    try {
      await navigator.clipboard.writeText(gameUrl);
      setHasCopiedLink(true);
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = setTimeout(() => {
        setHasCopiedLink(false);
      }, 1800);
    } catch {
      window.prompt("Copy this game link:", gameUrl);
    }
  }

  async function handleDiscard() {
    if (!window.confirm("Discard this game? It won't be saved.")) return;
    await supabase.from("games").delete().eq("code", code);
    router.push("/");
  }

  if (pageState === "loading") {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading game…</p>
      </main>
    );
  }

  if (pageState === "not-found") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white font-bold text-lg">Game not found</p>
        <p className="text-slate-400 text-sm text-center">Check the code or start a new game.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-2xl bg-violet-600 text-white font-bold active:bg-violet-700"
        >
          New game
        </button>
      </main>
    );
  }

  if (!game) return null;

  const usedNames = new Set(game.players.map((p) => p.name));
  const availableToAdd = PLAYER_NAMES.filter((n) => !usedNames.has(n));
  const totalBuyIns = game.players.reduce((sum, player) => sum + player.buyIns, 0);
  const totalPot = totalBuyIns * game.buy_in;
  const canSettle = game.players.length >= 2 && game.players.every((p) => p.chips !== "");
  const locked = pageState === "settled";

  return (
    <main className="max-w-md mx-auto px-4 py-5 pb-32">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-white">🃏 Poker Night</h1>
          <p className="text-xs text-slate-500">
            {game.buy_in} 🍭 buy-in · code: <span className="font-mono text-slate-400">{code}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyGameLink}
            className={`px-3 h-10 flex items-center justify-center rounded-xl text-sm font-semibold touch-manipulation ${
              hasCopiedLink
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 active:bg-slate-700"
            }`}
          >
            {hasCopiedLink ? "✅ Copied" : "🔗 Copy"}
          </button>
          <button
            onClick={openStats}
            className="px-3 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold active:bg-slate-700 touch-manipulation"
          >
            📊 Stats
          </button>
          {availableToAdd.length > 0 && !locked && (
            <>
              <select
                value={addingName}
                onChange={(e) => setAddingName(e.target.value)}
                className="bg-slate-800 text-white rounded-lg px-2 py-2 text-sm font-semibold"
              >
                {availableToAdd.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button
                onClick={addPlayer}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600 text-white text-xl font-bold active:bg-violet-700 touch-manipulation"
              >
                +
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-800 px-4 py-3 mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Total pot</p>
          <p className="text-white text-xl font-bold tabular-nums">{totalPot.toLocaleString()} 🍭</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Buy-ins</p>
          <p className="text-slate-300 text-sm font-semibold tabular-nums">{totalBuyIns.toLocaleString()}</p>
        </div>
      </div>

      {game.players.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-12">
          Hit + to add players as they sit down
        </p>
      )}

      {game.players.length > 0 && (
        <div className="rounded-2xl bg-slate-900 px-3">
          {game.players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              usedNames={usedNames}
              onUpdate={(updates) => updatePlayer(player.id, updates)}
              onRemove={() => removePlayer(player.id)}
              locked={locked}
            />
          ))}
        </div>
      )}

      {pageState === "settled" && (
        <div className="mt-6">
          <SettlementPanel players={game.players} buyInAmount={game.buy_in} />
        </div>
      )}

      {!locked && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
          <div className="flex gap-3 max-w-md mx-auto">
            <button
              onClick={handleDiscard}
              className="px-5 py-4 rounded-2xl bg-slate-800 text-red-400 text-base font-bold active:bg-red-900 active:text-red-200 shrink-0"
            >
              Discard
            </button>
            <button
              disabled={!canSettle}
              onClick={handleSettle}
              className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed active:bg-emerald-700"
            >
              GG 🃏
            </button>
          </div>
          {!canSettle && game.players.length > 0 && (
            <p className="text-center text-xs text-slate-500 mt-2">
              Fill in chip counts for all players to settle
            </p>
          )}
        </div>
      )}
    </main>
  );
}
