"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { type KnownPlayer } from "@/lib/types";
import { UserGroupIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import BottomNav from "@/components/BottomNav";


export default function PlayersPage() {
  const [players, setPlayers] = useState<KnownPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    supabase
      .from("known_players")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data }) => {
        setPlayers((data as KnownPlayer[]) ?? []);
        setLoading(false);
      });
  }, []);

  async function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      alert(`${name} is already in the list.`);
      return;
    }
    setAdding(true);
    const { data, error } = await supabase
      .from("known_players")
      .insert({ name })
      .select()
      .single();
    if (!error && data) {
      setPlayers((prev) => [...prev, data as KnownPlayer].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    }
    setAdding(false);
  }

  async function removePlayer(id: number, name: string) {
    if (!window.confirm(`Remove ${name}?`)) return;
    await supabase.from("known_players").delete().eq("id", id);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-8 pb-28">
      <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
        <UserGroupIcon className="w-6 h-6 text-red-400" />
        Players
      </h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          placeholder="Add a name…"
          className="flex-1 bg-slate-800 text-white rounded-2xl px-4 py-3 text-sm placeholder-slate-600"
        />
        <button
          onClick={addPlayer}
          disabled={adding || !newName.trim()}
          className="px-4 h-12 rounded-2xl bg-red-600 text-white font-bold active:bg-red-700 disabled:opacity-50 flex items-center justify-center"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading…</p>}

      {!loading && players.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-12">No players yet. Add some above.</p>
      )}

      {!loading && players.length > 0 && (
        <div className="rounded-2xl bg-slate-800 divide-y divide-slate-700">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-white font-semibold text-sm">{player.name}</span>
              <button
                onClick={() => removePlayer(player.id, player.name)}
                className="text-slate-600 active:text-red-400 touch-manipulation flex items-center justify-center"
                style={{ minWidth: 36, minHeight: 36 }}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <BottomNav active="players" gameCode={null} />
    </main>
  );
}
