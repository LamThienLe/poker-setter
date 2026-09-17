"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { type GameRow } from "@/lib/game";
import { type Player } from "@/lib/types";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";


const BG = "#F5F0E8";


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
    <main className="max-w-md mx-auto px-4 py-5 pb-16 min-h-dvh" style={{ backgroundColor: BG }}>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-black/40 active:text-black mb-6 font-black uppercase text-xs tracking-widest"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        Back
      </button>

      <div className="mb-6 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tight text-black">{name}</h1>
        <p className="text-xs font-bold text-black/40 mt-1 uppercase tracking-widest">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </p>
      </div>

      {loading && <p className="text-black/40 text-sm text-center py-12">Loading…</p>}

      {!loading && sessions.length === 0 && (
        <p className="text-black/40 text-sm text-center py-12">{name} hasn&apos;t played any settled games yet.</p>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="border-2 border-black px-4 py-3" style={{ boxShadow: "3px 3px 0 #000" }}>
              <p className="text-xs font-black uppercase text-black/40 mb-1">All-time net</p>
              <p className={`text-lg font-black tabular-nums ${totalNet > 0 ? "text-green-600" : totalNet < 0 ? "text-red-500" : "text-black/40"}`}>
                {formatNet(totalNet)} 🍭
              </p>
            </div>
            <div className="border-2 border-black px-4 py-3" style={{ boxShadow: "3px 3px 0 #000" }}>
              <p className="text-xs font-black uppercase text-black/40 mb-1">Win rate</p>
              <p className="text-lg font-black text-black">{winRate}%</p>
              <p className="text-xs font-bold text-black/30">{wins}W / {sessions.length - wins}L</p>
            </div>
            <div className="border-2 border-black px-4 py-3" style={{ boxShadow: "3px 3px 0 #000" }}>
              <p className="text-xs font-black uppercase text-black/40 mb-1">Best session</p>
              <p className="text-lg font-black text-green-600 tabular-nums">
                {biggestWin > 0 ? `+${biggestWin.toLocaleString()} 🍭` : "—"}
              </p>
            </div>
            <div className="border-2 border-black px-4 py-3" style={{ boxShadow: "3px 3px 0 #000" }}>
              <p className="text-xs font-black uppercase text-black/40 mb-1">Worst session</p>
              <p className="text-lg font-black text-red-500 tabular-nums">
                {biggestLoss < 0 ? `${biggestLoss.toLocaleString()} 🍭` : "—"}
              </p>
            </div>
          </div>

          {streak.type && streak.count >= 2 && (
            <div
              className="border-2 border-black px-4 py-3 text-sm font-black uppercase tracking-widest"
              style={{ backgroundColor: streak.type === "win" ? "#22c55e" : "#ef4444", color: "#fff", boxShadow: "3px 3px 0 #000" }}
            >
              {streak.count} {streak.type === "win" ? "win" : "loss"} streak 🔥
            </div>
          )}

          <section>
            <p className="text-xs font-black uppercase tracking-widest mb-3 pb-1 border-b-2 border-black text-black">
              Session history
            </p>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.code}
                  className="border-2 border-black px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: BG, boxShadow: "3px 3px 0 #000" }}
                >
                  <div>
                    <p className="text-sm text-black font-black uppercase">{formatDate(s.date)}</p>
                    <p className="text-xs text-black/40 font-bold mt-0.5">
                      {s.buyIns}× {s.buyInAmount} 🍭 · #{s.rank} of {s.totalPlayers}
                    </p>
                  </div>
                  <p className={`font-black text-sm tabular-nums ${s.net > 0 ? "text-green-600" : s.net < 0 ? "text-red-500" : "text-black/40"}`}>
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
