"use client";

import { useState } from "react";
import { useGroups } from "@/lib/groups";


const INPUT_CLASS = "flex-1 min-w-0 border-2 border-black px-3 py-3 text-black font-bold bg-white";
const BUTTON_CLASS = "border-2 border-black px-4 py-3 font-black uppercase text-sm disabled:opacity-40";


export default function GroupForms({ onDone }: { onDone?: () => void }) {
  const { createGroup, joinGroup } = useGroups();
  const [inviteCode, setInviteCode] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(action: () => Promise<string | null>) {
    setBusy(true);
    setErrorMessage(null);
    const failure = await action();
    setBusy(false);
    if (failure) setErrorMessage(failure);
    else onDone?.();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-2 text-black">Join with invite code</p>
        <div className="flex gap-2">
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="ABC123DEF0"
            autoCapitalize="characters"
            className={INPUT_CLASS}
          />
          <button
            disabled={busy || !inviteCode.trim()}
            onClick={() => submit(() => joinGroup(inviteCode))}
            className={BUTTON_CLASS}
            style={{ backgroundColor: "#000", color: "#F5F0E8" }}
          >
            Join
          </button>
        </div>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-2 text-black">Or start a new group</p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Group name"
            className={INPUT_CLASS}
          />
          <button
            disabled={busy || !newName.trim()}
            onClick={() => submit(() => createGroup(newName))}
            className={BUTTON_CLASS}
            style={{ backgroundColor: "#22c55e", color: "#000" }}
          >
            Create
          </button>
        </div>
      </div>
      {errorMessage && <p className="text-sm font-bold text-red-600">{errorMessage}</p>}
    </div>
  );
}
