"use client";

import GroupForms from "@/components/GroupForms";


export default function GroupGate() {
  return (
    <main className="min-h-dvh max-w-md mx-auto px-4 pt-8 pb-8" style={{ backgroundColor: "#F5F0E8" }}>
      <div className="border-4 border-black p-5 mb-6" style={{ boxShadow: "6px 6px 0 #000" }}>
        <h1 className="text-4xl font-black uppercase tracking-tight text-black leading-none">
          Pick your<br />group
        </h1>
        <p className="mt-3 text-sm font-bold text-black/60">
          Each group has its own games, stats and players. Ask someone in your group for the invite code.
        </p>
      </div>
      <GroupForms />
    </main>
  );
}
