"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BUY_IN_OPTIONS } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { generateGameCode, type GameRow } from "@/lib/game";
import { PlayCircleIcon, ArrowRightCircleIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import BottomNav from "@/components/BottomNav";


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}


export default function Home() {
  const router = useRouter();
  const [activeGames, setActiveGames] = useState<GameRow[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [selected, setSelected] = useState<number>(200);
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
    await supabase.from("games").insert({
      code,
      buy_in: selected,
      players: [],
      settled: false,
      password: password.trim() || null,
      title: `Poker Night – ${gameDate}`,
    });
    router.push(`/game/${code}`);
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-8 pb-28">
      <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2 mb-8">
        <PlayCircleIcon className="w-8 h-8 text-violet-400" />
        Poker Night
      </h1>

      {!loadingGames && activeGames.length > 0 && (
        <section className="mb-8">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Active games</p>
          <div className="space-y-2">
            {activeGames.map((game) => (
              <button
                key={game.code}
                onClick={() => router.push(`/game/${game.code}`)}
                className="w-full flex items-center justify-between bg-slate-800 rounded-2xl px-4 py-4 active:bg-slate-700"
              >
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">{game.title ?? `Game ${game.code}`}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {game.buy_in} 🍭 buy-in · {formatDate(game.created_at)}
                    {game.password && <LockClosedIcon className="inline w-3 h-3 ml-1 text-slate-500" />}
                  </p>
                </div>
                <ArrowRightCircleIcon className="w-5 h-5 text-violet-400 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">New game</p>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-2">Buy-in amount</p>
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

          <div>
            <p className="text-xs text-slate-400 mb-2">Password <span className="text-slate-600">(optional)</span></p>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for no password"
              className="w-full bg-slate-800 text-white rounded-2xl px-4 py-3 text-sm placeholder-slate-600"
            />
          </div>

          <button
            disabled={creating}
            onClick={handleCreate}
            className="w-full py-4 rounded-2xl bg-violet-600 text-white text-xl font-bold active:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {creating ? "Creating…" : "Let's play"}
          </button>
        </div>
      </section>

      <BottomNav active="home" gameCode={null} />
    </main>
  );
}
