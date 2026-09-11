"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { type GameRow } from "@/lib/game";
import { type Player } from "@/lib/types";
import { ChartBarIcon, TrashIcon } from "@heroicons/react/24/outline";
import BottomNav from "@/components/BottomNav";


interface PlayerStats {
  name: string;
  totalNet: number;
  sessions: number;
  wins: number;
  biggestWin: number;
  biggestLoss: number;
}


function computePlayerStats(games: GameRow[]): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();

  for (const game of games) {
    for (const player of game.players) {
      const net = Number(player.chips) - player.buyIns * game.buy_in;
      const existing = statsMap.get(player.name) ?? {
        name: player.name,
        totalNet: 0,
        sessions: 0,
        wins: 0,
        biggestWin: 0,
        biggestLoss: 0,
      };

      statsMap.set(player.name, {
        name: player.name,
        totalNet: existing.totalNet + net,
        sessions: existing.sessions + 1,
        wins: existing.wins + (net > 0 ? 1 : 0),
        biggestWin: Math.max(existing.biggestWin, net > 0 ? net : 0),
        biggestLoss: Math.min(existing.biggestLoss, net < 0 ? net : 0),
      });
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => b.totalNet - a.totalNet);
}


function winRate(stats: PlayerStats): number {
  if (stats.sessions === 0) return 0;
  return Math.round((stats.wins / stats.sessions) * 100);
}


function formatNet(net: number): string {
  return (net > 0 ? "+" : "") + net.toLocaleString();
}


function sessionPlayers(game: GameRow): { name: string; net: number }[] {
  return game.players
    .map((p: Player) => ({
      name: p.name,
      net: Number(p.chips) - p.buyIns * game.buy_in,
    }))
    .sort((a, b) => b.net - a.net);
}


function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


export default function StatsPage() {
  const [returnTo] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("returnTo");
  });
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .eq("settled", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setGames((data as GameRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  async function deleteGame(code: string) {
    if (!window.confirm("Delete this session? This can't be undone.")) return;
    await supabase.from("games").delete().eq("code", code);
    setGames((prev) => prev.filter((g) => g.code !== code));
  }

  async function clearAllHistory() {
    if (!window.confirm("Clear ALL session history? This deletes every settled game and can't be undone.")) return;
    setClearing(true);
    await supabase.from("games").delete().eq("settled", true);
    setGames([]);
    setClearing(false);
  }

  const playerStats = computePlayerStats(games);

  return (
    <main className="max-w-md mx-auto px-4 py-5 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ChartBarIcon className="w-6 h-6 text-blue-400" /> Stats
        </h1>
        {games.length > 0 && (
          <button
            onClick={clearAllHistory}
            disabled={clearing}
            className="text-xs text-red-400 active:text-red-300 disabled:opacity-50 px-3 py-2 rounded-lg bg-slate-800 active:bg-red-900/30"
          >
            {clearing ? "Clearing…" : "Clear all"}
          </button>
        )}
      </div>

      {loading && (
        <p className="text-slate-400 text-sm text-center py-12">Loading…</p>
      )}

      {!loading && games.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-12">No settled games yet.</p>
      )}

      {!loading && games.length > 0 && (
        <div className="space-y-6">
          <section>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Leaderboard</p>
            <div className="rounded-lg bg-slate-800 divide-y divide-slate-700">
              {playerStats.map((stats, index) => (
                <div key={stats.name} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-slate-500 text-sm w-5 shrink-0 tabular-nums">{index + 1}</span>
                  <span className="flex-1 text-white font-semibold text-sm">{stats.name}</span>
                  <div className="text-right">
                    <p className={`font-bold text-sm tabular-nums ${stats.totalNet > 0 ? "text-emerald-400" : stats.totalNet < 0 ? "text-red-400" : "text-slate-400"}`}>
                      {formatNet(stats.totalNet)} 🍭
                    </p>
                    <p className="text-xs text-slate-500">
                      {stats.sessions} sessions · {winRate(stats)}% win
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Session history</p>
            <div className="space-y-3">
              {games.map((game) => (
                <div key={game.code} className="rounded-lg bg-slate-800 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-sm text-white font-semibold">{game.title ?? `Game ${game.code}`}</span>
                      <span className="text-xs text-slate-400 ml-2">{formatDate(game.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{game.buy_in} 🍭</span>
                      <button
                        onClick={() => deleteGame(game.code)}
                        className="text-slate-600 active:text-red-400 touch-manipulation flex items-center justify-center"
                        style={{ minWidth: 32, minHeight: 32 }}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sessionPlayers(game).map((p) => (
                      <span
                        key={p.name}
                        className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                          p.net > 0
                            ? "bg-emerald-900/50 text-emerald-400"
                            : p.net < 0
                            ? "bg-red-900/50 text-red-400"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {p.name} {formatNet(p.net)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <BottomNav active="stats" gameCode={returnTo} />
    </main>
  );
}
