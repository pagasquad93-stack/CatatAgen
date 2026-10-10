import { fromISODate, todayISO } from "@/src/format";
import { debtOf, isDebtTx, remainingOf, Tx } from "@/src/store";

export type CustDebt = {
  key: string;
  name: string;
  txs: Tx[];
  remaining: number;
  debtTotal: number;
  openCount: number;
  oldestOpen?: string;
};

export const daysSince = (date: string, today = todayISO()) =>
  Math.max(0, Math.round((fromISODate(today).getTime() - fromISODate(date).getTime()) / 86400000));

export const OVERDUE_DAYS = 7;

/** Group debt transactions per customer (case-insensitive). */
export function groupDebts(transactions: Tx[]): CustDebt[] {
  const map = new Map<string, CustDebt>();
  transactions
    .filter(isDebtTx)
    .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt))
    .forEach((t) => {
      const name = t.note.trim() || "Tanpa Nama";
      const key = name.toLowerCase();
      const g = map.get(key) ?? { key, name, txs: [], remaining: 0, debtTotal: 0, openCount: 0 };
      g.name = name;
      g.txs.push(t);
      g.debtTotal += debtOf(t);
      const rem = remainingOf(t);
      g.remaining += rem;
      if (rem > 0) {
        g.openCount++;
        if (!g.oldestOpen) g.oldestOpen = t.date;
      }
      map.set(key, g);
    });
  return [...map.values()].sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));
}
