"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BUY_IN_OPTIONS } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { generateGameCode, type GameRow } from "@/lib/game";
import { ArrowRightCircleIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import BottomNav from "@/components/BottomNav";


const TAGLINES = [
  { text: "Bluffing Anonymous",          suit: "♥" },
  { text: "Just One More Hand",          suit: "♦" },
  { text: "ATM Night",                   suit: "♣" },
  { text: "All In or Shots",             suit: "♥" },
  { text: "Why Did I Call That",         suit: "♦" },
  { text: "Running It Twice Won't Help", suit: "♣" },
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

  const { text, suit } = TAGLINES[index];

  return (
    <div className="overflow-hidden h-8 flex items-center justify-center">
      <span
        key={index}
        className={`flex items-center gap-2 text-base font-black uppercase tracking-widest text-black ${phase === "enter" ? "tagline-enter" : "tagline-exit"}`}
      >
        <span className="text-green-600">{suit}</span>
        {text}
        <span className="text-green-600">{suit}</span>
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

  return (
    <main className="min-h-dvh bg-white max-w-md mx-auto px-4 pt-8 pb-28">

      {/* Header */}
      <div className="border-4 border-black p-5 mb-6" style={{ boxShadow: "6px 6px 0 #000" }}>
        <h1 className="text-4xl font-black uppercase tracking-tight text-black leading-none">
          Poker<br />Settler
        </h1>
        <div className="mt-2">
          <AnimatedTagline />
        </div>
      </div>

      {/* Active games */}
      {!loadingGames && activeGames.length > 0 && (
        <section className="mb-6">
          <p className="text-xs font-black uppercase tracking-widest text-black mb-2 border-b-2 border-black pb-1">
            Active games
          </p>
          <div className="space-y-3">
            {activeGames.map((game) => (
              <button
                key={game.code}
                onClick={() => router.push(`/game/${game.code}`)}
                className="w-full flex items-center justify-between bg-yellow-300 border-2 border-black px-4 py-4 active:translate-x-1 active:translate-y-1 transition-transform"
                style={{ boxShadow: "4px 4px 0 #000" }}
              >
                <div className="text-left">
                  <p className="text-black font-black text-sm uppercase">{game.title ?? `Game ${game.code}`}</p>
                  <p className="text-black text-xs font-bold mt-0.5 opacity-60">
                    {game.buy_in} 🍭 · {formatDate(game.created_at)}
                    {game.password && <LockClosedIcon className="inline w-3 h-3 ml-1" />}
                  </p>
                </div>
                <ArrowRightCircleIcon className="w-6 h-6 text-black shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* New game */}
      <section>
        <p className="text-xs font-black uppercase tracking-widest text-black mb-2 border-b-2 border-black pb-1">
          New game
        </p>

        <div className="space-y-4">
          {/* Buy-in */}
          <div>
            <p className="text-xs font-bold uppercase text-black mb-2">Buy-in amount</p>
            <div className="flex gap-3">
              {BUY_IN_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelected(amount)}
                  className={`flex-1 py-4 border-2 border-black text-xl font-black transition-all active:translate-x-0.5 active:translate-y-0.5 ${
                    selected === amount
                      ? "bg-green-500 text-black"
                      : "bg-white text-black"
                  }`}
                  style={{ boxShadow: selected === amount ? "4px 4px 0 #000" : "3px 3px 0 #000" }}
                >
                  {amount}
                  <span className="block text-xs font-bold mt-0.5">🍭</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-bold uppercase text-black mb-2">
              Game title <span className="opacity-40 normal-case font-normal">(optional)</span>
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Revenge Game"
              className="w-full bg-white border-2 border-black text-black px-4 py-3 text-sm font-bold placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Password */}
          <div>
            <p className="text-xs font-bold uppercase text-black mb-2">
              Password <span className="opacity-40 normal-case font-normal">(optional)</span>
            </p>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for no password"
              className="w-full bg-white border-2 border-black text-black px-4 py-3 text-sm font-bold placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* CTA */}
          <button
            disabled={creating}
            onClick={handleCreate}
            className="w-full py-5 bg-green-500 border-2 border-black text-black text-xl font-black uppercase tracking-wider active:translate-x-1 active:translate-y-1 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: "5px 5px 0 #000" }}
          >
            {creating ? "Creating…" : "Let's Play"}
          </button>
        </div>
      </section>

      <BottomNav active="home" gameCode={null} />
    </main>
  );
}
