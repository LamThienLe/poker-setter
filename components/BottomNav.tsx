"use client";

import { useRouter } from "next/navigation";
import { HomeIcon, PlayCircleIcon, ChartBarIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { HomeIcon as HomeIconSolid, PlayCircleIcon as PlayCircleIconSolid, ChartBarIcon as ChartBarIconSolid, UserGroupIcon as UserGroupIconSolid } from "@heroicons/react/24/solid";


type ActiveTab = "home" | "game" | "stats" | "players";

interface BottomNavProps {
  active: ActiveTab;
  gameCode: string | null;
}


export default function BottomNav({ active, gameCode }: BottomNavProps) {
  const router = useRouter();

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; activeIcon: React.ReactNode; href: string }[] = [
    {
      id: "home",
      label: "Home",
      icon: <HomeIcon className="w-6 h-6" />,
      activeIcon: <HomeIconSolid className="w-6 h-6" />,
      href: "/",
    },
    {
      id: "game",
      label: "Game",
      icon: <PlayCircleIcon className="w-6 h-6" />,
      activeIcon: <PlayCircleIconSolid className="w-6 h-6" />,
      href: gameCode ? `/game/${gameCode}` : "/",
    },
    {
      id: "stats",
      label: "Stats",
      icon: <ChartBarIcon className="w-6 h-6" />,
      activeIcon: <ChartBarIconSolid className="w-6 h-6" />,
      href: gameCode ? `/stats?returnTo=${gameCode}` : "/stats",
    },
    {
      id: "players",
      label: "Players",
      icon: <UserGroupIcon className="w-6 h-6" />,
      activeIcon: <UserGroupIconSolid className="w-6 h-6" />,
      href: "/players",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex border-t-2 border-black"
      style={{ backgroundColor: "#F5F0E8" }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const isGame = tab.id === "game";
        const disabled = isGame && !gameCode;

        return (
          <button
            key={tab.id}
            onClick={() => !disabled && router.push(tab.href)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors font-black uppercase text-xs tracking-widest ${
              isActive
                ? "text-black"
                : disabled
                ? "text-black/20 cursor-not-allowed"
                : "text-black/40 active:text-black"
            }`}
          >
            {isActive ? tab.activeIcon : tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
