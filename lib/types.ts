export const PLAYER_NAMES = [
  "AJ",
  "Antoine",
  "Damien",
  "Dani",
  "Elliot",
  "Gaby",
  "Jack",
  "Kevin",
  "Lam",
  "Leon",
  "Nikita",
  "Pascal",
  "Remi",
  "Ronan",
  "Tarek",
] as const;

export const BUY_IN_OPTIONS = [200, 250, 500] as const;

export interface Player {
  id: string;
  name: string;
  buyIns: number;
  chips: string;
  submitted: boolean;
}
