"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { type GameRow } from "@/lib/game";
import { type Player } from "@/lib/types";
import { ArrowLeftIcon, UserCircleIcon } from "@heroicons/react/24/outline";


interface SessionResult {
  code: string;
  date: string;
  net: number;
  buyIns: number;
  buyInAmount: number;
  rank: number;
  totalPlayers: number;
}


function formatNet(net: number): string {
  return (net > 0 ? "+" : "") + net.toLocaleString();
}


function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


function computeStreak(sessions: SessionResult[]): { type: "win" | "loss" | null; count: number } {
  if (sessions.length === 0) return { type: null, count: 0 };
  const sorted = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const first = sorted[0].net > 0 ? "win" : sorted[0].net < 0 ? "loss" : null;
  if (!first) return { type: null, count: 0 };
  let count = 0;
  for (const s of sorted) {
    const result = s.net > 0 ? "win" : s.net < 0 ? "loss" : null;
    if (result === first) count++;
    else break;
  }
  return { type: first, count };
}


export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .eq("settled", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const games = (data as GameRow[]) ?? [];
        const results: SessionResult[] = [];

        for (const game of games) {
          const me = game.players.find((p: Player) => p.name === name);
          if (!me) continue;
          const net = Number(me.chips) - me.buyIns * game.buy_in;
          const ranked = [...game.players]
            .map((p: Player) => Number(p.chips) - p.buyIns * game.buy_in)
            .sort((a, b) => b - a);
          results.push({
            code: game.code,
            date: game.created_at,
            net,
            buyIns: me.buyIns,
            buyInAmount: game.buy_in,
            rank: ranked.indexOf(net) + 1,
            totalPlayers: game.players.length,
          });
        }

        setSessions(results);
        setLoading(false);
      });
  }, [name]);

  const totalNet = sessions.reduce((s, r) => s + r.net, 0);
  const wins = sessions.filter((s) => s.net > 0).length;
  const winRate = sessions.length > 0 ? Math.round((wins / sessions.length) * 100) : 0;
  const biggestWin = sessions.reduce((max, s) => (s.net > max ? s.net : max), 0);
  const biggestLoss = sessions.reduce((min, s) => (s.net < min ? s.net : min), 0);
  const streak = computeStreak(sessions);

  return (
    <main className="max-w-md mx-auto px-4 py-5 pb-16">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 active:text-white mb-6"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        <span className="text-sm">Back</span>
      </button>

      <div className="flex items-center gap-3 mb-6">
        <UserCircleIcon className="w-10 h-10 text-blue-400 shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-white">{name}</h1>
          <p className="text-xs text-slate-500">{sessions.length} {sessions.length === 1 ? "session" : "sessions"}</p>
        </div>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading…</p>}

      {!loading && sessions.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-12">{name} hasn&apos;t played any settled games yet.</p>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-800 px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">All-time net</p>
              <p className={`text-lg font-bold tabular-nums ${totalNet > 0 ? "text-emerald-400" : totalNet < 0 ? "text-red-400" : "text-slate-400"}`}>
                {formatNet(totalNet)} 🍭
              </p>
            </div>
            <div className="rounded-lg bg-slate-800 px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Win rate</p>
              <p className="text-lg font-bold text-white">{winRate}%</p>
              <p className="text-xs text-slate-600">{wins}W / {sessions.length - wins}L</p>
            </div>
            <div className="rounded-lg bg-slate-800 px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Best session</p>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">
                {biggestWin > 0 ? `+${biggestWin.toLocaleString()} 🍭` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-800 px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Worst session</p>
              <p className="text-lg font-bold text-red-400 tabular-nums">
                {biggestLoss < 0 ? `${biggestLoss.toLocaleString()} 🍭` : "—"}
              </p>
            </div>
          </div>

          {streak.type && streak.count >= 2 && (
            <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${streak.type === "win" ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
              {streak.count} {streak.type === "win" ? "win" : "loss"} streak 🔥
            </div>
          )}

          <section>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Session history</p>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.code} className="rounded-lg bg-slate-800 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{formatDate(s.date)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.buyIns}× {s.buyInAmount} 🍭 buy-in · #{s.rank} of {s.totalPlayers}
                    </p>
                  </div>
                  <p className={`font-bold text-sm tabular-nums ${s.net > 0 ? "text-emerald-400" : s.net < 0 ? "text-red-400" : "text-slate-400"}`}>
                    {formatNet(s.net)} 🍭
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
