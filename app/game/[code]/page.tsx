"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { type GameRow } from "@/lib/game";
import { type Player, type KnownPlayer } from "@/lib/types";
import { calculateSettlements } from "@/lib/settle";
import BottomNav from "@/components/BottomNav";
import {
  PlayCircleIcon,
  CheckCircleIcon,
  LinkIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  QrCodeIcon,
  XMarkIcon,
  LockClosedIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";


function generateId() {
  return Math.random().toString(36).slice(2, 9);
}


function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}


function playSound(url: string) {
  try {
    const audio = new Audio(url);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}


const SOUNDS = {
  gg: "https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3",
  rebuy: "/rebuy.webm",
  win: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
};


async function fireConfetti(topCount: number) {
  const { default: confetti } = await import("canvas-confetti");

  // 1st place — gold explosion from center top, big cannon burst
  confetti({
    particleCount: 220,
    spread: 100,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.2 },
    colors: ["#fbbf24", "#f59e0b", "#fde68a", "#f1f5f9", "#10b981"],
    scalar: 1.2,
    gravity: 0.9,
  });

  // 2nd place — blue/silver from left, slightly delayed
  if (topCount >= 2) {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 65,
        spread: 55,
        startVelocity: 45,
        origin: { x: 0.1, y: 0.4 },
        colors: ["#93c5fd", "#3b82f6", "#bfdbfe", "#f1f5f9"],
        scalar: 1.0,
      });
    }, 350);
  }

  // 3rd place — red/bronze from right, slightly more delayed
  if (topCount >= 3) {
    setTimeout(() => {
      confetti({
        particleCount: 70,
        angle: 115,
        spread: 55,
        startVelocity: 38,
        origin: { x: 0.9, y: 0.4 },
        colors: ["#f87171", "#ef4444", "#fca5a5", "#f1f5f9"],
        scalar: 0.9,
      });
    }, 600);
  }

  // Winner follow-up burst — keeps the celebration going
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 120,
      startVelocity: 30,
      origin: { x: 0.5, y: 0.35 },
      colors: ["#fbbf24", "#10b981", "#3b82f6", "#ef4444"],
      gravity: 1.2,
      scalar: 0.8,
    });
  }, 900);
}


function PlayerRow({
  player,
  usedNames,
  availableNames,
  onUpdate,
  onRemove,
  onRebuy,
  locked,
}: {
  player: Player;
  usedNames: Set<string>;
  availableNames: string[];
  onUpdate: (updates: Partial<Player>) => void;
  onRemove: () => void;
  onRebuy: () => void;
  locked: boolean;
}) {
  const selectableNames = availableNames.filter(
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
        {selectableNames.map((name) => (
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
          onClick={() => { onUpdate({ buyIns: player.buyIns + 1 }); onRebuy(); }}
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
  preview,
}: {
  players: Player[];
  buyInAmount: number;
  preview?: boolean;
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
      {preview && (
        <div className="bg-amber-900/30 rounded-lg px-4 py-3 text-center">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest">Preview — not saved yet</p>
          <p className="text-amber-400/70 text-xs mt-0.5">Unlock to continue playing, or Final GG to save</p>
        </div>
      )}

      {!balanced && (
        <p className="text-xs text-amber-400 bg-amber-900/30 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          Chips in ({totalIn.toLocaleString()} 🍭) ≠ chips out ({totalOut.toLocaleString()} 🍭) — double-check counts.
        </p>
      )}

      <div className="rounded-lg bg-slate-800 p-4 space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Transfers</p>
        {transfers.length === 0 ? (
          <p className="text-slate-400 text-sm flex items-center gap-1.5"><FaceSmileIcon className="w-4 h-4" /> Everyone is even</p>
        ) : (
          transfers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-700/60 rounded-lg px-3 py-2.5">
              <span className="font-semibold text-red-400 text-sm">{t.from}</span>
              <span className="text-slate-500 text-xs">→</span>
              <span className="font-semibold text-emerald-400 text-sm">{t.to}</span>
              <span className="ml-auto font-bold text-white tabular-nums text-sm">{t.amount.toLocaleString()} 🍭</span>
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg bg-slate-800 p-4 space-y-1">
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


function QRModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-lg p-6 flex flex-col items-center gap-4 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <p className="text-white font-bold text-sm">Scan to join</p>
          <button onClick={onClose} className="text-slate-400 active:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg">
          <QRCodeSVG value={url} size={200} />
        </div>
        <p className="text-slate-400 text-xs font-mono">{url}</p>
      </div>
    </div>
  );
}


function PasswordGate({ onUnlock }: { onUnlock: (input: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit() {
    onUnlock(input);
    setError(true);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-6">
      <LockClosedIcon className="w-12 h-12 text-blue-400" />
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Game is locked</h2>
        <p className="text-slate-400 text-sm mt-1">Enter the password to join</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Password"
          className={`w-full bg-slate-800 text-white rounded-lg px-4 py-3 text-sm placeholder-slate-600 ${error ? "ring-2 ring-red-500" : ""}`}
          autoFocus
        />
        {error && <p className="text-red-400 text-xs text-center">Wrong password</p>}
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-lg bg-green-700 text-white font-bold active:bg-green-800"
        >
          Join game
        </button>
      </div>
    </main>
  );
}


function buildShareText(game: GameRow): string {
  const title = game.title ?? `Game ${game.code}`;
  const netResults = game.players
    .map((p) => ({ name: p.name, net: Number(p.chips) - p.buyIns * game.buy_in }))
    .sort((a, b) => b.net - a.net);

  const lines = netResults.map((r) => {
    const sign = r.net > 0 ? "+" : "";
    return `${r.name}: ${sign}${r.net.toLocaleString()} chips`;
  });

  const winner = netResults[0];
  const winnerLine = winner.net > 0 ? `🏆 ${winner.name} wins!\n\n` : "";

  return `${title}\n${winnerLine}${lines.join("\n")}`;
}


export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [pageState, setPageState] = useState<"loading" | "password" | "not-found" | "active" | "preview" | "settled">("loading");
  const [game, setGame] = useState<GameRow | null>(null);
  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);
  const [addingName, setAddingName] = useState<string>("");
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showShareHint, setShowShareHint] = useState(false);
  const pendingWrite = useRef(false);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordRef = useRef<string | null>(null);

  const applyGame = useCallback((row: GameRow) => {
    setGame(row);
    setPageState(row.settled ? "settled" : "active");
  }, []);

  useEffect(() => {
    supabase
      .from("known_players")
      .select("name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        const names = (data as KnownPlayer[] ?? []).map((p) => p.name);
        setKnownPlayers(names);
        if (names.length > 0) setAddingName(names[0]);
      });
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
        const row = data as GameRow;
        passwordRef.current = row.password;
        if (row.password) {
          const unlocked = sessionStorage.getItem(`game_unlocked_${code}`);
          if (!unlocked) {
            setGame(row);
            setPageState("password");
            return;
          }
        }
        applyGame(row);
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
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [code, applyGame]);

  function handlePasswordUnlock(input: string) {
    if (input === passwordRef.current) {
      sessionStorage.setItem(`game_unlocked_${code}`, "1");
      applyGame(game!);
    }
  }

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
    if (!game || !addingName) return;
    const usedNames = new Set(game.players.map((p) => p.name));
    if (usedNames.has(addingName)) return;
    vibrate(30);
    const newPlayers = [
      ...game.players,
      { id: generateId(), name: addingName, buyIns: 1, chips: "", submitted: false },
    ];
    pushPlayers(newPlayers);
    const remaining = knownPlayers.filter((n) => !usedNames.has(n) && n !== addingName);
    if (remaining.length > 0) setAddingName(remaining[0]);
  }

  function updatePlayer(id: string, updates: Partial<Player>) {
    if (!game) return;
    pushPlayers(game.players.map((p) => p.id === id ? { ...p, ...updates } : p));
  }

  function removePlayer(id: string) {
    if (!game) return;
    pushPlayers(game.players.filter((p) => p.id !== id));
  }

  function handleGG() {
    if (!game) return;
    vibrate([50, 30, 50]);
    playSound(SOUNDS.gg);
    setPageState("preview");
  }

  function handleUnlock() {
    vibrate([80, 40, 80, 40, 80]);
    setPageState("active");
  }

  async function handleFinalGG() {
    if (!game) return;
    vibrate([100, 50, 200]);
    playSound(SOUNDS.win);

    const netResults = game.players
      .map((p) => ({ name: p.name, net: Number(p.chips) - p.buyIns * game.buy_in }))
      .sort((a, b) => b.net - a.net);
    const winners = netResults.filter((r) => r.net > 0);
    if (winners.length > 0) {
      fireConfetti(Math.min(winners.length, 3));
    }

    await pushPlayers(game.players, true);

    setShowShareHint(true);
  }

  async function handleShare() {
    if (!game) return;
    const text = buildShareText(game);
    try {
      await navigator.share({ title: game.title ?? "Poker Night", text });
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        alert("Results copied to clipboard!");
      } catch {
        alert(text);
      }
    }
  }

  async function copyGameLink() {
    const gameUrl = `${window.location.origin}/game/${code}`;
    try {
      await navigator.clipboard.writeText(gameUrl);
      setHasCopiedLink(true);
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
      copyResetTimeoutRef.current = setTimeout(() => setHasCopiedLink(false), 1800);
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

  if (pageState === "password") {
    return (
      <PasswordGate
        onUnlock={(input: string) => handlePasswordUnlock(input)}
      />
    );
  }

  if (pageState === "not-found") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white font-bold text-lg">Game not found</p>
        <p className="text-slate-400 text-sm text-center">Check the code or start a new game.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-lg bg-green-700 text-white font-bold active:bg-green-800"
        >
          New game
        </button>
      </main>
    );
  }

  if (!game) return null;

  const usedNames = new Set(game.players.map((p) => p.name));
  const availableToAdd = knownPlayers.filter((n) => !usedNames.has(n));
  const totalBuyIns = game.players.reduce((sum, p) => sum + p.buyIns, 0);
  const totalPot = totalBuyIns * game.buy_in;
  const canSettle = game.players.length >= 2 && game.players.every((p) => p.chips !== "");
  const locked = pageState === "settled" || pageState === "preview";

  const gameUrl = typeof window !== "undefined" ? `${window.location.origin}/game/${code}` : "";
  const totalChipsOut = game.players.reduce((s, p) => s + Number(p.chips || 0), 0);
  const totalPotValue = game.players.reduce((s, p) => s + p.buyIns * game.buy_in, 0);
  const chipsUnbalanced = canSettle && totalChipsOut !== totalPotValue;

  return (
    <>
      {showQR && <QRModal url={gameUrl} onClose={() => setShowQR(false)} />}
      <main className="max-w-md mx-auto px-4 pt-5 pb-32">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
              <PlayCircleIcon className="w-5 h-5 text-blue-400" />
              {game.title ?? "Poker Night"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {game.buy_in} 🍭 · <span className="font-mono">{code}</span>
              {game.password && <LockClosedIcon className="inline w-3 h-3 ml-1" />}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyGameLink}
              className={`h-9 px-3 rounded-lg text-sm font-semibold touch-manipulation ${
                hasCopiedLink
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-300 active:bg-slate-700"
              }`}
            >
              {hasCopiedLink
                ? <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                : <LinkIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="h-9 px-3 rounded-lg bg-slate-800 text-slate-300 text-sm font-semibold active:bg-slate-700 touch-manipulation flex items-center justify-center"
            >
              <QrCodeIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push(`/stats?returnTo=${code}`)}
              className="h-9 px-3 rounded-lg bg-slate-800 text-slate-300 text-sm font-semibold active:bg-slate-700 touch-manipulation flex items-center justify-center"
            >
              <ChartBarIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-slate-800 px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-white text-2xl font-bold tabular-nums">{totalPot.toLocaleString()} 🍭</p>
            <p className="text-xs text-slate-400 tabular-nums">{totalBuyIns.toLocaleString()} buy-ins</p>
          </div>
        </div>

        {availableToAdd.length > 0 && !locked && (
          <div className="rounded-lg bg-slate-800 p-2 flex items-center gap-2 mb-4">
            <select
              value={addingName}
              onChange={(e) => setAddingName(e.target.value)}
              className="flex-1 min-w-0 bg-slate-900 text-white rounded-lg px-3 py-3 text-sm font-semibold"
            >
              {availableToAdd.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              onClick={addPlayer}
              className="px-4 h-11 flex items-center justify-center rounded-lg bg-green-700 text-white text-sm font-bold active:bg-green-800 touch-manipulation shrink-0"
            >
              Add
            </button>
          </div>
        )}

        {game.players.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-12">
            Hit Add to add players as they sit down
          </p>
        )}

        {game.players.length > 0 && (
          <div className="rounded-lg bg-slate-900 px-3">
            {game.players.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                usedNames={usedNames}
                availableNames={knownPlayers}
                onUpdate={(updates) => updatePlayer(player.id, updates)}
                onRemove={() => removePlayer(player.id)}
                onRebuy={() => { vibrate(40); playSound(SOUNDS.rebuy); }}
                locked={locked}
              />
            ))}
          </div>
        )}

        {(pageState === "preview" || pageState === "settled") && (
          <div className="mt-6">
            <SettlementPanel
              players={game.players}
              buyInAmount={game.buy_in}
              preview={pageState === "preview"}
            />
          </div>
        )}

        {pageState === "settled" && (
          <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
            <button
              onClick={handleShare}
              className="w-full py-4 rounded-lg bg-blue-600 text-white text-lg font-bold active:bg-blue-700 flex items-center justify-center gap-2 max-w-md mx-auto"
            >
              <ShareIcon className="w-5 h-5" /> Share results
            </button>
          </div>
        )}

        {pageState === "active" && !locked && (
          <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
            {chipsUnbalanced && (
              <p className="text-center text-xs text-amber-400 mb-2 flex items-center justify-center gap-1">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                Total 🍭 in ({totalPotValue.toLocaleString()}) ≠ out ({totalChipsOut.toLocaleString()}) — check counts
              </p>
            )}
            <div className="flex gap-3 max-w-md mx-auto">
              <button
                onClick={handleDiscard}
                className="px-5 py-4 rounded-lg bg-slate-800 text-red-400 text-base font-bold active:bg-red-900 active:text-red-200 shrink-0"
              >
                Discard
              </button>
              <button
                disabled={!canSettle}
                onClick={handleGG}
                className="flex-1 py-4 rounded-lg bg-emerald-600 text-white text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed active:bg-emerald-700"
              >
                GG
              </button>
            </div>
            {!canSettle && game.players.length > 0 && (
              <p className="text-center text-xs text-slate-500 mt-2">
                Fill in chip counts for all players to settle
              </p>
            )}
          </div>
        )}

        {pageState === "preview" && (
          <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
            <div className="flex gap-3 max-w-md mx-auto">
              <button
                onClick={handleUnlock}
                className="flex-1 py-4 rounded-lg bg-slate-800 text-amber-400 text-base font-bold active:bg-amber-900/30 active:text-amber-200"
              >
                Unlock
              </button>
              <button
                onClick={handleFinalGG}
                className="flex-1 py-4 rounded-lg bg-emerald-600 text-white text-base font-bold active:bg-emerald-700"
              >
                Final GG
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav active="game" gameCode={code} />
    </>
  );
}
