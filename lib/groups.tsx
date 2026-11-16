"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { type Group } from "@/lib/types";
import GroupGate from "@/components/GroupGate";


const ACTIVE_GROUP_STORAGE_KEY = "poker_active_group";

type SessionStatus = "loading" | "ready" | "failed";

interface GroupContextValue {
  status: SessionStatus;
  groups: Group[];
  activeGroup: Group | null;
  setActiveGroupId: (groupId: string) => void;
  createGroup: (name: string) => Promise<string | null>;
  joinGroup: (inviteCode: string) => Promise<string | null>;
}

const GroupContext = createContext<GroupContextValue | null>(null);


export function useGroups(): GroupContextValue {
  const value = useContext(GroupContext);
  if (!value) throw new Error("useGroups must be used inside GroupProvider");
  return value;
}


// Only valid on pages rendered behind the group gate, where a group is always chosen.
export function useActiveGroup(): Group {
  const { activeGroup } = useGroups();
  if (!activeGroup) throw new Error("useActiveGroup used before a group was chosen");
  return activeGroup;
}


async function ensureAnonymousSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  const { error } = await supabase.auth.signInAnonymously();
  return !error;
}


export function GroupProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      if (!(await ensureAnonymousSession())) {
        setStatus("failed");
        return;
      }
      const { data } = await supabase
        .from("groups")
        .select("id, name, invite_code")
        .order("created_at", { ascending: true });
      const memberGroups = (data as Group[]) ?? [];
      const storedGroupId = window.localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
      const stillMember = memberGroups.some((group) => group.id === storedGroupId);
      setGroups(memberGroups);
      setActiveGroupIdState(stillMember ? storedGroupId : memberGroups[0]?.id ?? null);
      setStatus("ready");
    }
    bootstrap();
  }, []);

  const setActiveGroupId = useCallback((groupId: string) => {
    window.localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, groupId);
    setActiveGroupIdState(groupId);
  }, []);

  const adoptGroup = useCallback((group: Group) => {
    setGroups((previous) => (previous.some((g) => g.id === group.id) ? previous : [...previous, group]));
    setActiveGroupId(group.id);
  }, [setActiveGroupId]);

  const createGroup = useCallback(async (name: string) => {
    const { data, error } = await supabase.rpc("create_group", { group_name: name });
    if (error || !data) return error?.message ?? "Could not create the group";
    adoptGroup(data as Group);
    return null;
  }, [adoptGroup]);

  const joinGroup = useCallback(async (inviteCode: string) => {
    const { data, error } = await supabase.rpc("join_group", { code: inviteCode });
    if (error || !data) return "That invite code doesn't match any group";
    adoptGroup(data as Group);
    return null;
  }, [adoptGroup]);

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null;
  const value = useMemo(
    () => ({ status, groups, activeGroup, setActiveGroupId, createGroup, joinGroup }),
    [status, groups, activeGroup, setActiveGroupId, createGroup, joinGroup]
  );

  const isJoinRoute = pathname.startsWith("/join/");
  let content: React.ReactNode;
  if (status === "loading") {
    content = (
      <main className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: "#F5F0E8" }}>
        <p className="text-black/40 text-sm font-bold">Loading…</p>
      </main>
    );
  } else if (status === "failed") {
    content = (
      <main className="min-h-dvh flex items-center justify-center px-6" style={{ backgroundColor: "#F5F0E8" }}>
        <p className="text-black font-bold text-sm text-center">
          Couldn&apos;t sign in. Check your connection and reload.
        </p>
      </main>
    );
  } else if (!activeGroup && !isJoinRoute) {
    content = <GroupGate />;
  } else {
    // Keyed by group so switching groups remounts every page and refetches its data.
    content = <Fragment key={activeGroup?.id ?? "none"}>{children}</Fragment>;
  }

  return <GroupContext.Provider value={value}>{content}</GroupContext.Provider>;
}
