"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  listGroups: () => Promise<Group[]>;
  createGroup: (name: string, password: string) => Promise<string | null>;
  joinGroup: (groupId: string, password: string) => Promise<string | null>;
  leaveGroup: () => Promise<void>;
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
        .select("id, name")
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

  const listGroups = useCallback(async () => {
    const { data } = await supabase.rpc("list_groups");
    return (data as Group[]) ?? [];
  }, []);

  const createGroup = useCallback(async (name: string, password: string) => {
    const { data, error } = await supabase.rpc("create_group", { group_name: name, group_password: password });
    const created = (data as Group[] | null)?.[0];
    if (error || !created) return error?.message ?? "Could not create the group";
    adoptGroup(created);
    return null;
  }, [adoptGroup]);

  const joinGroup = useCallback(async (groupId: string, password: string) => {
    const { data, error } = await supabase.rpc("join_group", { target_group: groupId, group_password: password });
    const joined = (data as Group[] | null)?.[0];
    if (error || !joined) return "Wrong password";
    adoptGroup(joined);
    return null;
  }, [adoptGroup]);

  const leaveGroup = useCallback(async () => {
    if (!activeGroupId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    await supabase.from("group_members").delete().eq("group_id", activeGroupId).eq("user_id", userId);
    const remaining = groups.filter((group) => group.id !== activeGroupId);
    window.localStorage.removeItem(ACTIVE_GROUP_STORAGE_KEY);
    setGroups(remaining);
    setActiveGroupIdState(remaining[0]?.id ?? null);
  }, [activeGroupId, groups]);

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null;
  const value = useMemo(
    () => ({ status, groups, activeGroup, setActiveGroupId, listGroups, createGroup, joinGroup, leaveGroup }),
    [status, groups, activeGroup, setActiveGroupId, listGroups, createGroup, joinGroup, leaveGroup]
  );

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
  } else if (!activeGroup) {
    content = <GroupGate />;
  } else {
    // Keyed by group so switching groups remounts every page and refetches its data.
    content = <Fragment key={activeGroup.id}>{children}</Fragment>;
  }

  return <GroupContext.Provider value={value}>{content}</GroupContext.Provider>;
}
