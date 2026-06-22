"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUY_IN_OPTIONS } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { generateGameCode } from "@/lib/game";


function BuyInStage({
  onConfirm,
  disabled,
}: {
  onConfirm: (amount: number) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<number>(200);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-10">
      <h1 className="text-3xl font-bold text-white tracking-tight">
        🃏 Poker Night
      </h1>

      <div className="w-full max-w-xs space-y-3">
        <p className="text-xs text-slate-400 uppercase tracking-widest text-center font-medium">
          Buy-in amount
        </p>
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

      <button
        disabled={disabled}
        onClick={() => onConfirm(selected)}
        className="w-full max-w-xs py-4 rounded-2xl bg-violet-600 text-white text-xl font-bold active:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? "Creating…" : "Let's play"}
      </button>
    </main>
  );
}


export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleConfirm(amount: number) {
    setCreating(true);

    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("games")
      .select("code")
      .eq("settled", false)
      .gte("created_at", today + "T00:00:00Z")
      .lte("created_at", today + "T23:59:59Z")
      .limit(1)
      .single();

    if (existing) {
      const resume = window.confirm("You have an unfinished game. Resume it instead?");
      if (resume) {
        router.push(`/game/${existing.code}`);
        return;
      }
    }

    const code = generateGameCode();
    await supabase.from("games").insert({
      code,
      buy_in: amount,
      players: [],
      settled: false,
    });
    router.push(`/game/${code}`);
  }

  return <BuyInStage onConfirm={handleConfirm} disabled={creating} />;
}
