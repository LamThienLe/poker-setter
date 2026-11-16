"use client";

import { useEffect, useState } from "react";
import { useGroups } from "@/lib/groups";
import { type Group } from "@/lib/types";


const INPUT_CLASS = "w-full border-2 border-black px-3 py-3 text-black font-bold bg-white";
const BUTTON_CLASS = "w-full border-2 border-black px-4 py-3 font-black uppercase text-sm disabled:opacity-40";


export default function GroupGate() {
  const { listGroups, joinGroup, createGroup } = useGroups();
  const [availableGroups, setAvailableGroups] = useState<Group[] | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    listGroups().then((groups) => {
      setAvailableGroups(groups);
      if (groups.length === 0) setIsCreating(true);
    });
  }, [listGroups]);

  async function submit() {
    setIsBusy(true);
    setErrorMessage(null);
    const failure = isCreating
      ? await createGroup(newName, password)
      : await joinGroup(selectedGroupId, password);
    setIsBusy(false);
    if (failure) setErrorMessage(failure);
  }

  const canSubmit = !isBusy && password.length > 0 && (isCreating ? newName.trim().length > 0 : selectedGroupId !== "");

  return (
    <main className="min-h-dvh max-w-md mx-auto px-4 pt-8 pb-8" style={{ backgroundColor: "#F5F0E8" }}>
      <div className="border-4 border-black p-5 mb-6" style={{ boxShadow: "6px 6px 0 #000" }}>
        <h1 className="text-4xl font-black uppercase tracking-tight text-black leading-none">
          Poker<br />Settler
        </h1>
        <p className="mt-3 text-sm font-bold text-black/60">
          {isCreating ? "Start a group with its own password." : "Pick your group and enter its password."}
        </p>
      </div>

      {availableGroups === null ? (
        <p className="text-black/40 text-sm font-bold">Loading groups…</p>
      ) : (
        <div className="space-y-4">
          {isCreating ? (
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Group name"
              className={INPUT_CLASS}
            />
          ) : (
            <select
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Select your group…</option>
              {availableGroups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          )}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isCreating ? "Choose a password (4+ characters)" : "Password"}
            className={INPUT_CLASS}
          />
          {errorMessage && <p className="text-sm font-bold text-red-600">{errorMessage}</p>}
          <button
            disabled={!canSubmit}
            onClick={submit}
            className={BUTTON_CLASS}
            style={{ backgroundColor: "#000", color: "#F5F0E8" }}
          >
            {isCreating ? "Create group" : "Enter"}
          </button>
          {availableGroups.length > 0 && (
            <button
              onClick={() => { setIsCreating((creating) => !creating); setErrorMessage(null); }}
              className="w-full text-xs font-black uppercase tracking-widest text-black/60 underline"
            >
              {isCreating ? "Back to pick a group" : "New group? Create one"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
