export interface PlayerEntry {
  name: string;
  buyIns: number;
  chips: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export function calculateSettlements(
  players: PlayerEntry[],
  buyInAmount: number
): Transfer[] {
  // Net balance per player: positive = they are owed, negative = they owe
  const balances: Record<string, number> = {};
  for (const player of players) {
    balances[player.name] = player.chips - player.buyIns * buyInAmount;
  }

  // Greedy algorithm: repeatedly match the biggest debtor with biggest creditor
  // This minimises the number of transfers
  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0)
    .map(([name, amount]) => ({ name, amount }));

  const debtors = Object.entries(balances)
    .filter(([, b]) => b < 0)
    .map(([name, amount]) => ({ name, amount: -amount }));

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);

    transfers.push({ from: debtor.name, to: creditor.name, amount });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return transfers;
}
