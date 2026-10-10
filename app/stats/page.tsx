"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isTestEnvironment, type GameRow } from "@/lib/game";
import { type Player } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import { CumulativeChart, RadarChart } from "@/components/StatCharts";
import {
  computePlayerStats,
  computeAwards,
  computeCumulativeSeries,
  computeHeadToHead,
  computeRadar,
  winRate,
  type PlayerStats,
} from "@/lib/stats";


const BG = "#F5F0E8";
const MIN_AWARD_SESSIONS = 3;

type DateFilter = "all" | "30d";
type Tab = "leaderboard" | "season" | "h2h";


function formatNet(net: number): string {
  return (net > 0 ? "+" : "") + Math.round(net).toLocaleString();
}


function sessionPlayers(game: GameRow): { name: string; net: number }[] {
  return game.players
    .map((p: Player) => ({ name: p.name, net: Number(p.chips) - p.buyIns * game.buy_in }))
    .sort((a, b) => b.net - a.net);
}


function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}


const RANK_LABEL: Record<number, string> = { 0: "🏆", 1: "🥈", 2: "🥉" };


function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "leaderboard", label: "Board" },
    { id: "season", label: "Season" },
    { id: "h2h", label: "1v1" },
  ];
  return (
    <div className="flex mb-5 border-2 border-black" style={{ boxShadow: "3px 3px 0 #000" }}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`flex-1 py-2.5 text-xs font-black uppercase transition-colors touch-manipulation ${i > 0 ? "border-l-2 border-black" : ""}`}
          style={{ backgroundColor: tab === t.id ? "#000" : BG, color: tab === t.id ? "#fff" : "#000" }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}


function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2 border-black text-black">
      {children}
    </p>
  );
}


export default function StatsPage() {
  const router = useRouter();
  const [returnTo] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("returnTo");
  });
  const [allGames, setAllGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [nameA, setNameA] = useState<string>("");
  const [nameB, setNameB] = useState<string>("");

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .eq("settled", true)
      .eq("is_test", isTestEnvironment())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAllGames((data as GameRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const games = useMemo(() => (
    dateFilter === "30d"
      ? allGames.filter((g) => new Date(g.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      : allGames
  ), [allGames, dateFilter]);

  const playerStats = useMemo(() => computePlayerStats(games), [games]);
  const awards = useMemo(() => computeAwards(playerStats, MIN_AWARD_SESSIONS), [playerStats]);
  const seasonSeries = useMemo(() => computeCumulativeSeries(games), [games]);

  const names = useMemo(() => playerStats.map((s) => s.name), [playerStats]);

  useEffect(() => {
    if (names.length >= 2 && (!nameA || !names.includes(nameA))) setNameA(names[0]);
    if (names.length >= 2 && (!nameB || !names.includes(nameB))) setNameB(names[1]);
  }, [names, nameA, nameB]);

  const statByName = (name: string): PlayerStats | undefined => playerStats.find((s) => s.name === name);
  const statsA = statByName(nameA);
  const statsB = statByName(nameB);
  const h2h = statsA && statsB ? computeHeadToHead(games, nameA, nameB) : null;
  const radar = statsA && statsB ? computeRadar(statsA, statsB, playerStats) : null;
  const h2hSeries = statsA && statsB ? computeCumulativeSeries(games, [nameA, nameB]) : [];

  return (
    <main className="max-w-md mx-auto px-4 py-5 pb-24 min-h-dvh" style={{ backgroundColor: BG }}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black uppercase tracking-tight text-black">♣ Stats</h1>
        <div className="flex border-2 border-black overflow-hidden" style={{ boxShadow: "3px 3px 0 #000" }}>
          {(["all", "30d"] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className="px-3 py-1.5 text-xs font-black uppercase transition-colors"
              style={{ backgroundColor: dateFilter === f ? "#000" : BG, color: dateFilter === f ? "#fff" : "#000" }}
            >
              {f === "all" ? "All time" : "Last 30d"}
            </button>
          ))}
        </div>
      </div>

      <TabBar tab={tab} setTab={setTab} />

      {loading && <p className="text-black/40 text-sm text-center py-12">Loading…</p>}

      {!loading && games.length === 0 && (
        <p className="text-black/40 text-sm text-center py-12">
          {dateFilter === "30d" ? "No games in the last 30 days." : "No settled games yet."}
        </p>
      )}

      {!loading && games.length > 0 && tab === "leaderboard" && (
        <div className="space-y-6">
          {awards.length > 0 && (
            <section>
              <SectionLabel>Best of</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {awards.map((award) => (
                  <div key={award.key} className="border-2 border-black p-3" style={{ backgroundColor: BG, boxShadow: "4px 4px 0 #000" }}>
                    <p className="text-xs font-black uppercase text-black mb-2">{award.title}</p>
                    <div className="space-y-1">
                      {award.leaders.map((leader, i) => (
                        <div key={leader.name} className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-black/60 uppercase truncate">{i + 1}. {leader.name}</span>
                          <span className="text-xs font-black tabular-nums text-black shrink-0">{leader.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-black/30 font-bold mt-2">Min {MIN_AWARD_SESSIONS} sessions to qualify</p>
            </section>
          )}

          <section>
            <SectionLabel>Leaderboard</SectionLabel>
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
            <SectionLabel>Session history</SectionLabel>
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
                        style={{ backgroundColor: p.net > 0 ? "#22c55e" : p.net < 0 ? "#ef4444" : "#000", color: "#fff" }}
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

      {!loading && games.length > 0 && tab === "season" && (
        <section>
          <SectionLabel>Cumulative profit</SectionLabel>
          <div className="border-2 border-black p-3" style={{ backgroundColor: BG, boxShadow: "4px 4px 0 #000" }}>
            <CumulativeChart series={seasonSeries} />
          </div>
        </section>
      )}

      {!loading && games.length > 0 && tab === "h2h" && (
        <div className="space-y-5">
          {names.length < 2 ? (
            <p className="text-black/40 text-sm text-center py-12">Need at least two players.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={nameA}
                  onChange={(e) => setNameA(e.target.value)}
                  className="border-2 border-black px-3 py-2.5 text-sm font-black uppercase focus:outline-none"
                  style={{ backgroundColor: BG, boxShadow: "3px 3px 0 #000" }}
                >
                  {names.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <select
                  value={nameB}
                  onChange={(e) => setNameB(e.target.value)}
                  className="border-2 border-black px-3 py-2.5 text-sm font-black uppercase focus:outline-none"
                  style={{ backgroundColor: BG, boxShadow: "3px 3px 0 #000" }}
                >
                  {names.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {nameA === nameB ? (
                <p className="text-black/40 text-sm text-center py-8">Pick two different players.</p>
              ) : (
                <>
                  {h2h && (
                    <section>
                      <SectionLabel>Head to head</SectionLabel>
                      <div className="border-2 border-black p-4 text-center" style={{ backgroundColor: BG, boxShadow: "4px 4px 0 #000" }}>
                        <div className="flex items-center justify-center gap-4">
                          <span className="text-3xl font-black tabular-nums" style={{ color: "#2563eb" }}>{h2h.aWins}</span>
                          <span className="text-xl font-black text-black/40">–</span>
                          <span className="text-3xl font-black tabular-nums" style={{ color: "#ef4444" }}>{h2h.bWins}</span>
                        </div>
                        <p className="text-xs font-bold text-black/40 mt-2">{h2h.sharedGames} games played together</p>
                      </div>
                    </section>
                  )}

                  {radar && (
                    <section>
                      <SectionLabel>Comparison</SectionLabel>
                      <div className="border-2 border-black p-3" style={{ backgroundColor: BG, boxShadow: "4px 4px 0 #000" }}>
                        <RadarChart axes={radar} nameA={nameA} nameB={nameB} />
                      </div>
                    </section>
                  )}

                  <section>
                    <SectionLabel>Cumulative profit</SectionLabel>
                    <div className="border-2 border-black p-3" style={{ backgroundColor: BG, boxShadow: "4px 4px 0 #000" }}>
                      <CumulativeChart series={h2hSeries} />
                    </div>
                  </section>

                  <section>
                    <SectionLabel>Overview</SectionLabel>
                    <div className="grid grid-cols-2 gap-3">
                      {[statsA, statsB].map((s, i) => s && (
                        <div key={s.name} className="border-2 border-black p-3" style={{ backgroundColor: BG, boxShadow: "4px 4px 0 #000" }}>
                          <p className="text-sm font-black uppercase mb-2" style={{ color: i === 0 ? "#2563eb" : "#ef4444" }}>{s.name}</p>
                          <div className="space-y-1 text-xs font-bold text-black/60">
                            <div className="flex justify-between"><span>Games</span><span className="font-black text-black tabular-nums">{s.sessions}</span></div>
                            <div className="flex justify-between"><span>Profit</span><span className={`font-black tabular-nums ${s.totalNet > 0 ? "text-green-600" : s.totalNet < 0 ? "text-red-500" : "text-black"}`}>{formatNet(s.totalNet)}</span></div>
                            <div className="flex justify-between"><span>Total buy-in</span><span className="font-black text-black tabular-nums">{s.totalBuyIn.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Cashed out</span><span className="font-black text-black tabular-nums">{s.totalCashedOut.toLocaleString()}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      )}

      <BottomNav active="stats" gameCode={returnTo} />
    </main>
  );
}
