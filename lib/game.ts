import type { Player } from "./types";

export interface GameRow {
  code: string;
  buy_in: number;
  players: Player[];
  settled: boolean;
  created_at: string;
  password: string | null;
  title: string | null;
  is_test: boolean;
}


export function isTestEnvironment(): boolean {
  return process.env.NEXT_PUBLIC_IS_TEST_ENV === "true";
}

export function generateGameCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
