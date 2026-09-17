"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { type KnownPlayer } from "@/lib/types";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import BottomNav from "@/components/BottomNav";


const BG = "#F5F0E8";


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
    <main className="max-w-md mx-auto px-4 pt-8 pb-28 min-h-dvh" style={{ backgroundColor: BG }}>
      <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-6">♠ Players</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          placeholder="Add a name…"
          className="flex-1 border-2 border-black text-black px-4 py-3 text-sm font-bold placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-black"
          style={{ backgroundColor: BG }}
        />
        <button
          onClick={addPlayer}
          disabled={adding || !newName.trim()}
          className="px-4 h-12 border-2 border-black font-black active:translate-x-0.5 active:translate-y-0.5 transition-transform disabled:opacity-40 flex items-center justify-center"
          style={{ backgroundColor: "#22c55e", color: "#fff", boxShadow: "3px 3px 0 #000" }}
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      {loading && <p className="text-black/40 text-sm text-center py-12">Loading…</p>}

      {!loading && players.length === 0 && (
        <p className="text-black/40 text-sm text-center py-12">No players yet. Add some above.</p>
      )}

      {!loading && players.length > 0 && (
        <div className="border-2 border-black divide-y-2 divide-black" style={{ boxShadow: "4px 4px 0 #000" }}>
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: BG }}>
              <span className="text-black font-black text-sm uppercase">{player.name}</span>
              <button
                onClick={() => removePlayer(player.id, player.name)}
                className="text-black/30 active:text-red-500 touch-manipulation flex items-center justify-center"
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
