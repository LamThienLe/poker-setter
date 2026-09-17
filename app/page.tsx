"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BUY_IN_OPTIONS } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { generateGameCode, type GameRow } from "@/lib/game";
import { ArrowRightCircleIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import BottomNav from "@/components/BottomNav";


const TAGLINES = [
  { text: "Bluffing Anonymous",          suit: "♥", color: "#ef4444" },
  { text: "Just One More Hand",          suit: "♦", color: "#3b82f6" },
  { text: "ATM Night",                   suit: "♣", color: "#22c55e" },
  { text: "Why Did I Call That",         suit: "♦", color: "#3b82f6" },
  { text: "Running It Twice Won't Help", suit: "♣", color: "#22c55e" },
];

const SUIT_COLORS = [
  { suit: "♠", color: "#22c55e", label: "200" },
  { suit: "♥", color: "#ef4444", label: "250" },
  { suit: "♦", color: "#3b82f6", label: "500" },
];


function AnimatedTagline() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");

  useEffect(() => {
    const hold = setTimeout(() => {
      setPhase("exit");
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % TAGLINES.length);
        setPhase("enter");
      }, 220);
      return () => clearTimeout(swap);
    }, 1600);
    return () => clearTimeout(hold);
  }, [index]);

  const { text, suit, color } = TAGLINES[index];

  return (
    <div className="overflow-hidden h-8 flex items-center justify-center">
      <span
        key={index}
        className={`flex items-center gap-2 text-sm font-black uppercase tracking-widest ${phase === "enter" ? "tagline-enter" : "tagline-exit"}`}
        style={{ color }}
      >
        {suit} {text} {suit}
      </span>
    </div>
  );
}


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}


export default function Home() {
  const router = useRouter();
  const [activeGames, setActiveGames] = useState<GameRow[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [selected, setSelected] = useState<number>(200);
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .eq("settled", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setActiveGames((data as GameRow[]) ?? []);
        setLoadingGames(false);
      });
  }, []);

  async function handleCreate() {
    setCreating(true);
    const code = generateGameCode();
    const gameDate = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const finalTitle = title.trim() || `Poker Night – ${gameDate}`;
    await supabase.from("games").insert({
      code,
      buy_in: selected,
      players: [],
      settled: false,
      password: password.trim() || null,
      title: finalTitle,
    });
    router.push(`/game/${code}`);
  }

  const selectedSuit = SUIT_COLORS[BUY_IN_OPTIONS.indexOf(selected as typeof BUY_IN_OPTIONS[number])];

  return (
    <main className="min-h-dvh max-w-md mx-auto px-4 pt-8 pb-28" style={{ backgroundColor: "#F5F0E8" }}>

      {/* Header */}
      <div
        className="border-4 border-black p-5 mb-6"
        style={{ boxShadow: "6px 6px 0 #000" }}
      >
        <div className="flex items-end justify-between">
          <h1 className="text-5xl font-black uppercase tracking-tight text-black leading-none">
            Poker<br />Settler
          </h1>
          <div className="text-right text-3xl leading-none font-black">
            <span style={{ color: "#000" }}>♠</span><span style={{ color: "#ef4444" }}>♥</span><br />
            <span style={{ color: "#3b82f6" }}>♦</span><span style={{ color: "#22c55e" }}>♣</span>
          </div>
        </div>
        <div className="mt-3 border-t-2 border-black/10 pt-3">
          <AnimatedTagline />
        </div>
      </div>

      {/* Active games */}
      {!loadingGames && activeGames.length > 0 && (
        <section className="mb-6">
          <p className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2 border-black text-black">
            ♦ Active games
          </p>
          <div className="space-y-3">
            {activeGames.map((game) => {
              const accentColor = game.buy_in === 200 ? "#22c55e" : game.buy_in === 250 ? "#ef4444" : "#3b82f6";
              return (
                <button
                  key={game.code}
                  onClick={() => router.push(`/game/${game.code}`)}
                  className="w-full flex items-center justify-between border-2 border-black px-4 py-4 active:translate-x-1 active:translate-y-1 transition-transform"
                  style={{ backgroundColor: accentColor, boxShadow: "4px 4px 0 #000" }}
                >
                  <div className="text-left">
                    <p className="text-white font-black text-sm uppercase">{game.title ?? `Game ${game.code}`}</p>
                    <p className="text-xs font-bold mt-0.5 text-white/70">
                      {game.buy_in} 🍭 · {formatDate(game.created_at)}
                      {game.password && <LockClosedIcon className="inline w-3 h-3 ml-1" />}
                    </p>
                  </div>
                  <ArrowRightCircleIcon className="w-6 h-6 shrink-0 text-white" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* New game */}
      <section>
        <p className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2 border-black text-black">
          ♣ New game
        </p>

        <div className="space-y-4">
          {/* Buy-in */}
          <div>
            <p className="text-xs font-bold uppercase text-black/50 mb-2">Buy-in amount</p>
            <div className="flex gap-3">
              {BUY_IN_OPTIONS.map((amount, i) => {
                const sc = SUIT_COLORS[i];
                const isSelected = selected === amount;
                return (
                  <button
                    key={amount}
                    onClick={() => setSelected(amount)}
                    className="flex-1 py-4 border-2 border-black text-xl font-black uppercase active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                    style={{
                      color: isSelected ? "#fff" : sc.color,
                      backgroundColor: isSelected ? sc.color : "#F5F0E8",
                      boxShadow: "4px 4px 0 #000",
                    }}
                  >
                    <span className="block text-lg">{sc.suit}</span>
                    {amount}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-bold uppercase text-black/50 mb-2">
              Game title <span className="normal-case font-normal">(optional)</span>
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Revenge Game"
              className="w-full border-2 border-black text-black px-4 py-3 text-sm font-bold placeholder:text-black/30 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-black"
              style={{ backgroundColor: "#F5F0E8" }}
            />
          </div>

          {/* Password */}
          <div>
            <p className="text-xs font-bold uppercase text-black/50 mb-2">
              Password <span className="normal-case font-normal">(optional)</span>
            </p>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for no password"
              className="w-full border-2 border-black text-black px-4 py-3 text-sm font-bold placeholder:text-black/30 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-black"
              style={{ backgroundColor: "#F5F0E8" }}
            />
          </div>

          {/* CTA */}
          <button
            disabled={creating}
            onClick={handleCreate}
            className="w-full py-5 border-2 border-black text-black text-xl font-black uppercase tracking-wider active:translate-x-1 active:translate-y-1 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: selectedSuit?.color ?? "#22c55e",
              borderColor: "#000",
              boxShadow: "5px 5px 0 #000",
              color: "#fff",
            }}
          >
            {creating ? "Creating…" : `${selectedSuit?.suit ?? "♣"} Let's Play`}
          </button>
        </div>
      </section>

      <BottomNav active="home" gameCode={null} />
    </main>
  );
}
