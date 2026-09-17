"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { type GameRow } from "@/lib/game";
import { type Player } from "@/lib/types";
import BottomNav from "@/components/BottomNav";


const BG = "#F5F0E8";

type DateFilter = "all" | "30d";


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


const RANK_LABEL: Record<number, string> = { 0: "🏆", 1: "🥈", 2: "🥉" };


export default function StatsPage() {
  const router = useRouter();
  const [returnTo] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("returnTo");
  });
  const [allGames, setAllGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .eq("settled", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAllGames((data as GameRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const games = dateFilter === "30d"
    ? allGames.filter((g) => new Date(g.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    : allGames;

  const playerStats = computePlayerStats(games);

  return (
    <main className="max-w-md mx-auto px-4 py-5 pb-24 min-h-dvh" style={{ backgroundColor: BG }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-black">♣ Stats</h1>
        <div className="flex border-2 border-black overflow-hidden" style={{ boxShadow: "3px 3px 0 #000" }}>
          {(["all", "30d"] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className="px-3 py-1.5 text-xs font-black uppercase transition-colors"
              style={{
                backgroundColor: dateFilter === f ? "#000" : BG,
                color: dateFilter === f ? "#fff" : "#000",
              }}
            >
              {f === "all" ? "All time" : "Last 30d"}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="text-black/40 text-sm text-center py-12">Loading…</p>
      )}

      {!loading && games.length === 0 && (
        <p className="text-black/40 text-sm text-center py-12">
          {dateFilter === "30d" ? "No games in the last 30 days." : "No settled games yet."}
        </p>
      )}

      {!loading && games.length > 0 && (
        <div className="space-y-6">
          <section>
            <p className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2 border-black text-black">
              Leaderboard
            </p>
            <div className="border-2 border-black divide-y-2 divide-black" style={{ boxShadow: "4px 4px 0 #000" }}>
              {playerStats.map((stats, index) => (
                <div
                  key={stats.name}
                  className="px-4 py-3 cursor-pointer active:bg-black/5"
                  style={{ backgroundColor: BG }}
                  onClick={() => router.push(`/players/${encodeURIComponent(stats.name)}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base w-6 shrink-0 text-center">
                      {RANK_LABEL[index] ?? <span className="text-black/40 text-sm tabular-nums font-black">{index + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-black font-black text-sm uppercase">{stats.name}</p>
                      <p className="text-xs text-black/40 font-bold mt-0.5">
                        {stats.sessions} {stats.sessions === 1 ? "session" : "sessions"} · {winRate(stats)}% win rate
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-black text-sm tabular-nums ${stats.totalNet > 0 ? "text-green-600" : stats.totalNet < 0 ? "text-red-500" : "text-black/40"}`}>
                        {formatNet(stats.totalNet)} 🍭
                      </p>
                      <p className="text-xs text-black/30 mt-0.5 tabular-nums font-bold">
                        {stats.biggestWin > 0 && <span className="text-green-600">▲{stats.biggestWin.toLocaleString()}</span>}
                        {stats.biggestWin > 0 && stats.biggestLoss < 0 && <span> · </span>}
                        {stats.biggestLoss < 0 && <span className="text-red-500">▼{Math.abs(stats.biggestLoss).toLocaleString()}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2 border-black text-black">
              Session history
            </p>
            <div className="space-y-3">
              {games.map((game) => (
                <div key={game.code} className="border-2 border-black p-4" style={{ backgroundColor: BG, boxShadow: "4px 4px 0 #000" }}>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-sm text-black font-black uppercase">{game.title ?? `Game ${game.code}`}</span>
                      <span className="text-xs text-black/40 font-bold ml-2">{formatDate(game.created_at)}</span>
                    </div>
                    <span className="text-xs text-black/40 font-bold">{game.buy_in} 🍭</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sessionPlayers(game).map((p) => (
                      <span
                        key={p.name}
                        className="text-xs font-black px-2 py-1 border border-black uppercase"
                        style={{
                          backgroundColor: p.net > 0 ? "#22c55e" : p.net < 0 ? "#ef4444" : "#000",
                          color: "#fff",
                        }}
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
