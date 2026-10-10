import { type GameRow } from "./game";


export interface PlayerStats {
  name: string;
  totalNet: number;
  sessions: number;
  wins: number;
  biggestWin: number;
  biggestLoss: number;
  totalBuyIn: number;
  totalCashedOut: number;
  avgRank: number;
  avgNet: number;
  consistency: number;
  firstPlaces: number;
}


function playerNet(chips: string, buyIns: number, buyIn: number): number {
  return Number(chips) - buyIns * buyIn;
}


function rankWithinGame(game: GameRow): Map<string, number> {
  const ranked = [...game.players]
    .map((p) => ({ name: p.name, net: playerNet(p.chips, p.buyIns, game.buy_in) }))
    .sort((a, b) => b.net - a.net);
  const rankByName = new Map<string, number>();
  ranked.forEach((p, index) => rankByName.set(p.name, index + 1));
  return rankByName;
}


function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}


export function computePlayerStats(games: GameRow[]): PlayerStats[] {
  const netsByName = new Map<string, number[]>();
  const ranksByName = new Map<string, number[]>();
  const buyInByName = new Map<string, number>();
  const cashedOutByName = new Map<string, number>();
  const firstPlacesByName = new Map<string, number>();

  for (const game of games) {
    const rankByName = rankWithinGame(game);
    for (const player of game.players) {
      const net = playerNet(player.chips, player.buyIns, game.buy_in);
      const nets = netsByName.get(player.name) ?? [];
      nets.push(net);
      netsByName.set(player.name, nets);

      const ranks = ranksByName.get(player.name) ?? [];
      ranks.push(rankByName.get(player.name) ?? game.players.length);
      ranksByName.set(player.name, ranks);

      firstPlacesByName.set(player.name, (firstPlacesByName.get(player.name) ?? 0) + (rankByName.get(player.name) === 1 ? 1 : 0));

      buyInByName.set(player.name, (buyInByName.get(player.name) ?? 0) + player.buyIns * game.buy_in);
      cashedOutByName.set(player.name, (cashedOutByName.get(player.name) ?? 0) + Number(player.chips));
    }
  }

  const result: PlayerStats[] = [];
  for (const [name, nets] of netsByName) {
    const sessions = nets.length;
    const totalNet = nets.reduce((sum, v) => sum + v, 0);
    const ranks = ranksByName.get(name) ?? [];
    result.push({
      name,
      totalNet,
      sessions,
      wins: nets.filter((n) => n > 0).length,
      biggestWin: Math.max(0, ...nets),
      biggestLoss: Math.min(0, ...nets),
      totalBuyIn: buyInByName.get(name) ?? 0,
      totalCashedOut: cashedOutByName.get(name) ?? 0,
      avgRank: ranks.reduce((sum, r) => sum + r, 0) / sessions,
      avgNet: totalNet / sessions,
      consistency: standardDeviation(nets),
      firstPlaces: firstPlacesByName.get(name) ?? 0,
    });
  }

  return result.sort((a, b) => b.totalNet - a.totalNet);
}


export function winRate(stats: PlayerStats): number {
  if (stats.sessions === 0) return 0;
  return Math.round((stats.wins / stats.sessions) * 100);
}


export interface Award {
  key: string;
  title: string;
  leaders: { name: string; value: string }[];
}


function formatSigned(value: number): string {
  return (value > 0 ? "+" : "") + Math.round(value).toLocaleString();
}


export function computeAwards(stats: PlayerStats[], minSessions: number): Award[] {
  const qualified = stats.filter((s) => s.sessions >= minSessions);
  if (qualified.length === 0) return [];

  const top = (sorted: PlayerStats[], format: (s: PlayerStats) => string) =>
    sorted.slice(0, 3).map((s) => ({ name: s.name, value: format(s) }));

  return [
    {
      key: "winrate",
      title: "Best win rate",
      leaders: top([...qualified].sort((a, b) => b.wins / b.sessions - a.wins / a.sessions), (s) => `${winRate(s)}%`),
    },
    {
      key: "pergame",
      title: "Best per game",
      leaders: top([...qualified].sort((a, b) => b.avgNet - a.avgNet), (s) => `${formatSigned(s.avgNet)} 🍭`),
    },
    {
      key: "rank",
      title: "Best average rank",
      leaders: top([...qualified].sort((a, b) => a.avgRank - b.avgRank), (s) => s.avgRank.toFixed(1)),
    },
    {
      key: "consistent",
      title: "Most consistent",
      leaders: top([...qualified].sort((a, b) => a.consistency - b.consistency), (s) => `±${Math.round(s.consistency).toLocaleString()}`),
    },
  ];
}


export interface CumulativePoint {
  date: number;
  value: number;
}

export interface CumulativeSeries {
  name: string;
  points: CumulativePoint[];
  final: number;
}


export function computeCumulativeSeries(games: GameRow[], names?: string[]): CumulativeSeries[] {
  const ordered = [...games].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const runningByName = new Map<string, number>();
  const pointsByName = new Map<string, CumulativePoint[]>();

  for (const game of ordered) {
    const date = new Date(game.created_at).getTime();
    for (const player of game.players) {
      if (names && !names.includes(player.name)) continue;
      const net = playerNet(player.chips, player.buyIns, game.buy_in);
      const running = (runningByName.get(player.name) ?? 0) + net;
      runningByName.set(player.name, running);
      const points = pointsByName.get(player.name) ?? [];
      points.push({ date, value: running });
      pointsByName.set(player.name, points);
    }
  }

  const series: CumulativeSeries[] = [];
  for (const [name, points] of pointsByName) {
    series.push({ name, points, final: points[points.length - 1]?.value ?? 0 });
  }
  return series.sort((a, b) => b.final - a.final);
}


export interface HeadToHead {
  aWins: number;
  bWins: number;
  sharedGames: number;
}


export function computeHeadToHead(games: GameRow[], nameA: string, nameB: string): HeadToHead {
  let aWins = 0;
  let bWins = 0;
  let sharedGames = 0;

  for (const game of games) {
    const a = game.players.find((p) => p.name === nameA);
    const b = game.players.find((p) => p.name === nameB);
    if (!a || !b) continue;
    sharedGames += 1;
    const netA = playerNet(a.chips, a.buyIns, game.buy_in);
    const netB = playerNet(b.chips, b.buyIns, game.buy_in);
    if (netA > netB) aWins += 1;
    else if (netB > netA) bWins += 1;
  }

  return { aWins, bWins, sharedGames };
}


export interface RadarAxis {
  label: string;
  a: number;
  b: number;
}


export function computeRadar(a: PlayerStats, b: PlayerStats, allStats: PlayerStats[]): RadarAxis[] {
  const maxRank = Math.max(...allStats.map((s) => s.avgRank), 1);
  const maxNet = Math.max(...allStats.map((s) => Math.abs(s.avgNet)), 1);
  const maxConsistency = Math.max(...allStats.map((s) => s.consistency), 1);
  const maxRebuy = Math.max(...allStats.map((s) => s.totalBuyIn / s.sessions), 1);
  const scale = (value: number, max: number) => Math.max(0, Math.min(100, (value / max) * 100));

  return [
    { label: "Avg rank", a: scale(maxRank - a.avgRank + 1, maxRank), b: scale(maxRank - b.avgRank + 1, maxRank) },
    { label: "Win rate", a: winRate(a), b: winRate(b) },
    { label: "First place", a: (a.firstPlaces / a.sessions) * 100, b: (b.firstPlaces / b.sessions) * 100 },
    { label: "Profit", a: scale(a.avgNet, maxNet), b: scale(b.avgNet, maxNet) },
    { label: "Consistency", a: 100 - scale(a.consistency, maxConsistency), b: 100 - scale(b.consistency, maxConsistency) },
    { label: "Rebuys", a: 100 - scale(a.totalBuyIn / a.sessions, maxRebuy), b: 100 - scale(b.totalBuyIn / b.sessions, maxRebuy) },
  ];
}
