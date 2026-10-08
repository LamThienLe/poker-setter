/* tslint:disable */
/* eslint-disable */

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



/**
 * JS entry point. `js_name` preserves the original camelCase export name, so
 * the import at the call site is unchanged.
 */
export function calculateSettlements(players: PlayerEntry[], buy_in_amount: number): Transfer[];
