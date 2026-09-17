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
  CheckCircleIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  QrCodeIcon,
  XMarkIcon,
  LockClosedIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";


const BG = "#F5F0E8";


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

  confetti({
    particleCount: 220,
    spread: 100,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.2 },
    colors: ["#fbbf24", "#f59e0b", "#fde68a", "#f1f5f9", "#10b981"],
    scalar: 1.2,
    gravity: 0.9,
  });

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
    <div className="flex items-center gap-2 py-2 border-b-2 border-black last:border-b-0">
      <select
        value={player.name}
        disabled={locked}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="w-24 shrink-0 border border-black text-black px-2 py-2 text-sm font-black uppercase disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: BG }}
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
          className="flex items-center justify-center border border-black text-black text-lg font-black disabled:opacity-30 active:bg-black active:text-white touch-manipulation"
          style={{ minWidth: 44, minHeight: 44, width: 32, height: 32, backgroundColor: BG }}
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-black tabular-nums text-black">
          {player.buyIns}
        </span>
        <button
          disabled={locked}
          onClick={() => { onUpdate({ buyIns: player.buyIns + 1 }); onRebuy(); }}
          className="flex items-center justify-center border border-black text-black text-lg font-black disabled:opacity-30 active:bg-black active:text-white touch-manipulation"
          style={{ minWidth: 44, minHeight: 44, width: 32, height: 32, backgroundColor: BG }}
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
        className="flex-1 min-w-0 border border-black text-black px-2 py-2 text-sm font-black placeholder:text-black/30 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-black"
        style={{ backgroundColor: BG }}
      />

      {!locked && (
        <button
          onClick={onRemove}
          className="flex items-center justify-center border border-black text-black/40 active:bg-red-500 active:text-white active:border-red-500 text-base leading-none shrink-0 touch-manipulation font-black"
          style={{ minWidth: 44, minHeight: 44, width: 28, height: 28, backgroundColor: BG }}
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
        <div className="border-2 border-black px-4 py-3 text-center" style={{ backgroundColor: "#fbbf24" }}>
          <p className="text-black text-xs font-black uppercase tracking-widest">Preview — not saved yet</p>
          <p className="text-black/60 text-xs mt-0.5 font-bold">Unlock to continue, or Final GG to save</p>
        </div>
      )}

      {!balanced && (
        <div className="border-2 border-black px-3 py-2 flex items-center gap-1.5" style={{ backgroundColor: "#fbbf24" }}>
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-black" />
          <p className="text-xs text-black font-black">
            Chips in ({totalIn.toLocaleString()} 🍭) ≠ out ({totalOut.toLocaleString()} 🍭) — double-check.
          </p>
        </div>
      )}

      <div className="border-2 border-black p-4 space-y-2" style={{ boxShadow: "4px 4px 0 #000" }}>
        <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Transfers</p>
        {transfers.length === 0 ? (
          <p className="text-black/60 text-sm flex items-center gap-1.5 font-bold">
            <FaceSmileIcon className="w-4 h-4" /> Everyone is even
          </p>
        ) : (
          transfers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 border border-black px-3 py-2.5" style={{ backgroundColor: BG }}>
              <span className="font-black text-red-500 text-sm uppercase">{t.from}</span>
              <span className="text-black/40 text-xs font-black">→</span>
              <span className="font-black text-green-600 text-sm uppercase">{t.to}</span>
              <span className="ml-auto font-black text-black tabular-nums text-sm">{t.amount.toLocaleString()} 🍭</span>
            </div>
          ))
        )}
      </div>

      <div className="border-2 border-black p-4 space-y-1" style={{ boxShadow: "4px 4px 0 #000" }}>
        <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Net result</p>
        {netResults.map((r) => (
          <div key={r.name} className="flex justify-between text-sm py-1 border-b border-black/10 last:border-0">
            <span className="text-black font-black uppercase">{r.name}</span>
            <span className={`font-black tabular-nums ${r.net > 0 ? "text-green-600" : r.net < 0 ? "text-red-500" : "text-black/40"}`}>
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
        className="border-4 border-black p-6 flex flex-col items-center gap-4 w-full max-w-xs"
        style={{ backgroundColor: BG, boxShadow: "8px 8px 0 #000" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <p className="text-black font-black text-sm uppercase">Scan to join</p>
          <button onClick={onClose} className="text-black/40 active:text-black">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-white p-4 border-2 border-black">
          <QRCodeSVG value={url} size={200} />
        </div>
        <p className="text-black/40 text-xs font-mono">{url}</p>
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
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-6" style={{ backgroundColor: BG }}>
      <LockClosedIcon className="w-12 h-12 text-black" />
      <div className="text-center">
        <h2 className="text-2xl font-black uppercase text-black">Game is locked</h2>
        <p className="text-black/50 text-sm mt-1 font-bold">Enter the password to join</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Password"
          className={`w-full border-2 text-black px-4 py-3 text-sm font-bold placeholder:text-black/30 focus:outline-none ${error ? "border-red-500" : "border-black"}`}
          style={{ backgroundColor: BG }}
          autoFocus
        />
        {error && <p className="text-red-500 text-xs text-center font-black uppercase">Wrong password</p>}
        <button
          onClick={handleSubmit}
          className="w-full py-4 border-2 border-black text-white text-base font-black uppercase active:translate-x-0.5 active:translate-y-0.5 transition-transform"
          style={{ backgroundColor: "#22c55e", boxShadow: "4px 4px 0 #000" }}
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
      <main className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: BG }}>
        <p className="text-black/40 text-sm font-bold">Loading game…</p>
      </main>
    );
  }

  if (pageState === "password") {
    return <PasswordGate onUnlock={(input: string) => handlePasswordUnlock(input)} />;
  }

  if (pageState === "not-found") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6" style={{ backgroundColor: BG }}>
        <p className="text-black font-black text-2xl uppercase">Game not found</p>
        <p className="text-black/50 text-sm text-center font-bold">Check the code or start a new game.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-4 border-2 border-black text-white font-black uppercase active:translate-x-0.5 active:translate-y-0.5 transition-transform"
          style={{ backgroundColor: "#22c55e", boxShadow: "4px 4px 0 #000" }}
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
      <main className="max-w-md mx-auto px-4 pt-5 pb-32 min-h-dvh" style={{ backgroundColor: BG }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-black uppercase text-black">
              {game.title ?? "Poker Night"}
            </h1>
            <p className="text-xs text-black/40 font-bold mt-0.5">
              {game.buy_in} 🍭 · <span className="font-mono">{code}</span>
              {game.password && <LockClosedIcon className="inline w-3 h-3 ml-1" />}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyGameLink}
              className="h-9 px-3 border-2 border-black text-sm font-black touch-manipulation active:translate-x-0.5 active:translate-y-0.5 transition-transform"
              style={{
                backgroundColor: hasCopiedLink ? "#22c55e" : BG,
                color: "#000",
                boxShadow: "2px 2px 0 #000",
              }}
            >
              {hasCopiedLink
                ? <CheckCircleIcon className="w-5 h-5" />
                : <LinkIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="h-9 px-3 border-2 border-black text-black text-sm font-black active:translate-x-0.5 active:translate-y-0.5 transition-transform touch-manipulation flex items-center justify-center"
              style={{ backgroundColor: BG, boxShadow: "2px 2px 0 #000" }}
            >
              <QrCodeIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Total pot */}
        <div className="border-2 border-black px-4 py-3 mb-4" style={{ boxShadow: "4px 4px 0 #000" }}>
          <div className="flex items-center justify-between">
            <p className="text-black text-2xl font-black tabular-nums">{totalPot.toLocaleString()} 🍭</p>
            <p className="text-xs text-black/40 font-black uppercase tabular-nums">{totalBuyIns.toLocaleString()} buy-ins</p>
          </div>
        </div>

        {/* Add player */}
        {availableToAdd.length > 0 && !locked && (
          <div className="border-2 border-black p-2 flex items-center gap-2 mb-4" style={{ boxShadow: "3px 3px 0 #000" }}>
            <select
              value={addingName}
              onChange={(e) => setAddingName(e.target.value)}
              className="flex-1 min-w-0 border border-black text-black px-3 py-3 text-sm font-black uppercase focus:outline-none"
              style={{ backgroundColor: BG }}
            >
              {availableToAdd.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              onClick={addPlayer}
              className="px-4 h-11 flex items-center justify-center border-2 border-black text-white text-sm font-black uppercase active:translate-x-0.5 active:translate-y-0.5 transition-transform touch-manipulation shrink-0"
              style={{ backgroundColor: "#22c55e", boxShadow: "2px 2px 0 #000" }}
            >
              Add
            </button>
          </div>
        )}

        {game.players.length === 0 && (
          <p className="text-center text-black/40 text-sm py-12 font-bold">
            Hit Add to add players as they sit down
          </p>
        )}

        {game.players.length > 0 && (
          <div className="border-2 border-black px-3" style={{ boxShadow: "4px 4px 0 #000" }}>
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

        {/* Bottom action bars */}
        {pageState === "settled" && (
          <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4" style={{ background: `linear-gradient(to top, ${BG} 70%, transparent)` }}>
            <button
              onClick={handleShare}
              className="w-full py-4 border-2 border-black text-white text-lg font-black uppercase active:translate-x-1 active:translate-y-1 transition-transform flex items-center justify-center gap-2 max-w-md mx-auto"
              style={{ backgroundColor: "#3b82f6", boxShadow: "5px 5px 0 #000" }}
            >
              <ShareIcon className="w-5 h-5" /> Share results
            </button>
          </div>
        )}

        {pageState === "active" && !locked && (
          <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4" style={{ background: `linear-gradient(to top, ${BG} 70%, transparent)` }}>
            {chipsUnbalanced && (
              <p className="text-center text-xs text-black font-black uppercase mb-2 flex items-center justify-center gap-1">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                In ({totalPotValue.toLocaleString()}) ≠ out ({totalChipsOut.toLocaleString()})
              </p>
            )}
            <div className="flex gap-3 max-w-md mx-auto">
              <button
                onClick={handleDiscard}
                className="px-5 py-4 border-2 border-black text-red-500 text-base font-black uppercase active:bg-red-500 active:text-white active:translate-x-0.5 active:translate-y-0.5 transition-transform shrink-0"
                style={{ backgroundColor: BG, boxShadow: "3px 3px 0 #000" }}
              >
                Discard
              </button>
              <button
                disabled={!canSettle}
                onClick={handleGG}
                className="flex-1 py-4 border-2 border-black text-white text-xl font-black uppercase disabled:opacity-30 disabled:cursor-not-allowed active:translate-x-1 active:translate-y-1 transition-transform"
                style={{ backgroundColor: "#22c55e", boxShadow: "5px 5px 0 #000" }}
              >
                GG
              </button>
            </div>
            {!canSettle && game.players.length > 0 && (
              <p className="text-center text-xs text-black/40 font-bold mt-2 uppercase">
                Fill in chip counts for all players to settle
              </p>
            )}
          </div>
        )}

        {pageState === "preview" && (
          <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 pt-4" style={{ background: `linear-gradient(to top, ${BG} 70%, transparent)` }}>
            <div className="flex gap-3 max-w-md mx-auto">
              <button
                onClick={handleUnlock}
                className="flex-1 py-4 border-2 border-black text-black text-base font-black uppercase active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                style={{ backgroundColor: "#fbbf24", boxShadow: "4px 4px 0 #000" }}
              >
                Unlock
              </button>
              <button
                onClick={handleFinalGG}
                className="flex-1 py-4 border-2 border-black text-white text-base font-black uppercase active:translate-x-1 active:translate-y-1 transition-transform"
                style={{ backgroundColor: "#22c55e", boxShadow: "4px 4px 0 #000" }}
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
