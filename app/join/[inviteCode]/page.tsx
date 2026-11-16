"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGroups } from "@/lib/groups";


export default function JoinPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = use(params);
  const router = useRouter();
  const { joinGroup } = useGroups();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    joinGroup(decodeURIComponent(inviteCode)).then((failure) => {
      if (failure) {
        setErrorMessage(failure);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      const isLocalPath = next !== null && next.startsWith("/") && !next.startsWith("//");
      router.replace(isLocalPath ? next : "/");
    });
  }, [inviteCode, joinGroup, router]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6" style={{ backgroundColor: "#F5F0E8" }}>
      {errorMessage ? (
        <>
          <p className="text-black font-bold text-sm text-center">{errorMessage}</p>
          <button
            onClick={() => router.replace("/")}
            className="border-2 border-black px-4 py-3 font-black uppercase text-sm text-black"
          >
            Continue
          </button>
        </>
      ) : (
        <p className="text-black/40 text-sm font-bold">Joining group…</p>
      )}
    </main>
  );
}
