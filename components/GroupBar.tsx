"use client";

import { useState } from "react";
import { UserGroupIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useActiveGroup, useGroups } from "@/lib/groups";
import GroupForms from "@/components/GroupForms";


export default function GroupBar() {
  const activeGroup = useActiveGroup();
  const { groups, setActiveGroupId } = useGroups();
  const [isOpen, setIsOpen] = useState(false);
  const [hasCopiedInvite, setHasCopiedInvite] = useState(false);

  async function copyInviteLink() {
    const inviteUrl = `${window.location.origin}/join/${activeGroup.invite_code}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setHasCopiedInvite(true);
      setTimeout(() => setHasCopiedInvite(false), 1800);
    } catch {
      window.prompt("Copy this invite link:", inviteUrl);
    }
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between border-2 border-black px-4 py-3 bg-white"
        style={{ boxShadow: "4px 4px 0 #000" }}
      >
        <span className="flex items-center gap-2 font-black uppercase text-sm text-black">
          <UserGroupIcon className="w-5 h-5" />
          {activeGroup.name}
        </span>
        <ChevronDownIcon className={`w-5 h-5 text-black transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="border-2 border-t-0 border-black p-4 space-y-5 bg-white">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2 text-black">Invite to {activeGroup.name}</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 border-2 border-black px-3 py-3 font-black tracking-widest text-black text-center">
                {activeGroup.invite_code}
              </span>
              <button
                onClick={copyInviteLink}
                className="border-2 border-black px-4 py-3 font-black uppercase text-sm"
                style={{ backgroundColor: "#000", color: "#F5F0E8" }}
              >
                {hasCopiedInvite ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          {groups.length > 1 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-2 text-black">Switch group</p>
              <div className="space-y-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => { setActiveGroupId(group.id); setIsOpen(false); }}
                    className="w-full text-left border-2 border-black px-3 py-2 font-black uppercase text-sm text-black"
                    style={group.id === activeGroup.id ? { backgroundColor: "#22c55e" } : undefined}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <GroupForms onDone={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
}
