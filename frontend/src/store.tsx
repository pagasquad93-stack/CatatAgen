import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

export type TxType = "transfer" | "tarik" | "ppob";

export type Tx = {
  id: string;
  type: TxType;
  date: string; // YYYY-MM-DD
  nominal: number; // transfer / tarik nominal
  admin: number;
  bank: string;
  agentBank?: string; // bank / e-wallet milik agen yang dipakai
  kategori: string;
  produk: string;
  modal: number;
  jual: number;
  note: string;
  createdAt: string;
  payStatus?: PayStatus; // undefined = lunas
  debt?: number; // nominal hutang awal (belum / kurang bayar)
  paid?: number; // sudah dibayar dari hutang
  paidOffAt?: string; // waktu hutang lunas
  debtCleared?: boolean; // catatan hutang dihapus manual
};

export type PayStatus = "lunas" | "kurang" | "belum";
export const PAY_LABEL: Record<PayStatus, string> = { lunas: "Lunas", kurang: "Kurang Bayar", belum: "Belum Bayar" };

export type Customer = { id: string; name: string; createdAt: string };
export type Payment = { id: string; customer: string; amount: number; kind: "cicil" | "lunas"; createdAt: string };

export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
export const debtOf = (t: Tx) => (t.payStatus && t.payStatus !== "lunas" ? t.debt ?? 0 : 0);
export const isDebtTx = (t: Tx) => debtOf(t) > 0 && !t.debtCleared;
export const remainingOf = (t: Tx) => (isDebtTx(t) ? Math.max(0, debtOf(t) - (t.paid ?? 0)) : 0);
export const isPaidOff = (t: Tx) => isDebtTx(t) && remainingOf(t) === 0;
const txOrder = (a: Tx, b: Tx) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt);

export type Template = Omit<Tx, "id" | "date" | "note" | "createdAt"> & { id: string; name: string };

export type AdminRange = { min: number; max: number; transfer: number; tarik: number };

export type Expense = { id: string; date: string; category: string; amount: number; note: string; createdAt: string };

export const EXPENSE_CATEGORIES = ["Listrik", "Internet/Pulsa", "Sewa", "Gaji", "Transport", "Makan/Minum", "ATK", "Lainnya"];

export type Settings = { dailyTarget: number; agentBanks: string[]; customerBanks: string[]; ppobCategories: string[] };

export const PPOB_CATEGORIES = ["Pulsa", "Paket Data", "Token PLN", "Tagihan PLN", "PDAM", "BPJS", "Game", "E-Wallet", "Lainnya"];

export const DEFAULT_SETTINGS: Settings = {
  dailyTarget: 100000,
  ppobCategories: PPOB_CATEGORIES,
  agentBanks: ["BRI", "BCA", "DANA"],
  customerBanks: ["BCA", "BRI", "Mandiri", "BNI", "BSI", "DANA", "OVO", "GoPay", "ShopeePay"],
};

export const bankRoute = (t: Pick<Tx, "type" | "bank" | "agentBank">) => {
  const a = t.agentBank || "";
  const c = t.bank || "";
  if (!a && !c) return "";
  if (!a) return c;
  if (!c) return a;
  return t.type === "tarik" ? `${c} → ${a}` : `${a} → ${c}`;
};

export const DEFAULT_RANGES: AdminRange[] = [
  { min: 1, max: 500000, transfer: 3000, tarik: 5000 },
  { min: 500001, max: 1000000, transfer: 5000, tarik: 7000 },
  { min: 1000001, max: 2000000, transfer: 7000, tarik: 10000 },
  { min: 2000001, max: 5000000, transfer: 10000, tarik: 15000 },
  { min: 5000001, max: 10000000, transfer: 15000, tarik: 20000 },
];

export const TYPE_LABEL: Record<TxType, string> = { transfer: "Transfer", tarik: "Tarik Tunai", ppob: "PPOB" };

export const profitOf = (t: Pick<Tx, "type" | "admin" | "jual" | "modal">) =>
  t.type === "ppob" ? t.jual - t.modal : t.admin;
export const omzetOf = (t: Pick<Tx, "type" | "admin" | "jual" | "nominal">) =>
  t.type === "ppob" ? t.jual : t.nominal + t.admin;

export const adminFor = (ranges: AdminRange[], type: TxType, nominal: number) => {
  const r = ranges.find((x) => nominal >= x.min && nominal <= x.max);
  if (!r) return 0;
  return type === "tarik" ? r.tarik : r.transfer;
};

const KEYS = {
  tx: "catatagen.transactions",
  tpl: "catatagen.templates",
  ranges: "catatagen.adminRanges",
  exp: "catatagen.expenses",
  settings: "catatagen.settings",
  cust: "catatagen.customers",
  pay: "catatagen.payments",
};

const customersFromTx = (txs: Tx[], existing: Customer[] = []) => {
  const out = [...existing];
  txs.forEach((t) => {
    const n = t.note.trim();
    if (n && !out.some((c) => sameName(c.name, n))) out.push({ id: `${out.length}-${n}`.replace(/\s/g, ""), name: n, createdAt: t.createdAt });
  });
  return out;
};

async function load<T>(key: string, fallback: T): Promise<T> {
  const raw = await storage.getItem(key, null);
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type Ctx = {
  ready: boolean;
  transactions: Tx[];
  templates: Template[];
  ranges: AdminRange[];
  expenses: Expense[];
  settings: Settings;
  saveSettings: (s: Settings) => void;
  addExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  addTx: (t: Tx) => void;
  updateTx: (t: Tx) => void;
  deleteTx: (id: string) => void;
  addTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  saveRanges: (r: AdminRange[]) => void;
  customers: Customer[];
  payments: Payment[];
  addCustomer: (name: string) => boolean;
  renameCustomer: (id: string, name: string) => boolean;
  deleteCustomer: (id: string) => void;
  payDebt: (customer: string, amount: number) => number;
  settleTx: (id: string) => void;
  settleCustomer: (customer: string) => number;
  clearCustomerDebt: (customer: string) => void;
  replaceAll: (d: {
    transactions: Tx[];
    templates: Template[];
    ranges: AdminRange[];
    expenses: Expense[];
    customers?: Customer[];
    payments?: Payment[];
  }) => void;
  toast: (msg: string, kind?: "ok" | "err") => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [transactions, setTx] = useState<Tx[]>([]);
  const [templates, setTpl] = useState<Template[]>([]);
  const [ranges, setRanges] = useState<AdminRange[]>(DEFAULT_RANGES);
  const [expenses, setExp] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [customers, setCust] = useState<Customer[]>([]);
  const [payments, setPay] = useState<Payment[]>([]);
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  useEffect(() => {
    (async () => {
      const txs = await load(KEYS.tx, [] as Tx[]);
      setTx(txs);
      const savedCust = await load<Customer[] | null>(KEYS.cust, null);
      if (savedCust) setCust(savedCust);
      else {
        const seeded = customersFromTx(txs);
        setCust(seeded);
        storage.setItem(KEYS.cust, JSON.stringify(seeded));
      }
      setPay(await load(KEYS.pay, [] as Payment[]));
      setTpl(await load(KEYS.tpl, [] as Template[]));
      setRanges(await load(KEYS.ranges, DEFAULT_RANGES));
      setExp(await load(KEYS.exp, [] as Expense[]));
      setSettings({ ...DEFAULT_SETTINGS, ...(await load(KEYS.settings, {} as Partial<Settings>)) });
      setReady(true);
    })();
  }, []);

  const persistTx = (v: Tx[]) => {
    setTx(v);
    storage.setItem(KEYS.tx, JSON.stringify(v));
  };
  const persistTpl = (v: Template[]) => {
    setTpl(v);
    storage.setItem(KEYS.tpl, JSON.stringify(v));
  };
  const persistRanges = (v: AdminRange[]) => {
    setRanges(v);
    storage.setItem(KEYS.ranges, JSON.stringify(v));
  };
  const persistExp = (v: Expense[]) => {
    setExp(v);
    storage.setItem(KEYS.exp, JSON.stringify(v));
  };
  const persistCust = (v: Customer[]) => {
    setCust(v);
    storage.setItem(KEYS.cust, JSON.stringify(v));
  };
  const persistPay = (v: Payment[]) => {
    setPay(v);
    storage.setItem(KEYS.pay, JSON.stringify(v));
  };
  const ensureCustomer = (name: string) => {
    const n = name.trim();
    if (n && !customers.some((c) => sameName(c.name, n)))
      persistCust([...customers, { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: n, createdAt: new Date().toISOString() }]);
  };
  const openDebts = (customer: string) =>
    transactions.filter((t) => sameName(t.note, customer) && remainingOf(t) > 0).sort(txOrder);
  const logPayment = (customer: string, amount: number, kind: Payment["kind"]) =>
    persistPay([
      { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, customer: customer.trim(), amount, kind, createdAt: new Date().toISOString() },
      ...payments,
    ]);

  const toast = useCallback(
    (msg: string, kind: "ok" | "err" = "ok") => {
      if (timer.current) clearTimeout(timer.current);
      setToastMsg({ msg, kind });
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToastMsg(null));
      }, 2200);
    },
    [anim],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      transactions,
      templates,
      ranges,
      expenses,
      settings,
      saveSettings: (v) => {
        setSettings(v);
        storage.setItem(KEYS.settings, JSON.stringify(v));
      },
      addExpense: (e) => persistExp([e, ...expenses]),
      deleteExpense: (id) => persistExp(expenses.filter((e) => e.id !== id)),
      addTx: (t) => {
        persistTx([t, ...transactions]);
        ensureCustomer(t.note);
      },
      updateTx: (t) => {
        persistTx(transactions.map((x) => (x.id === t.id ? t : x)));
        ensureCustomer(t.note);
      },
      deleteTx: (id) => persistTx(transactions.filter((t) => t.id !== id)),
      addTemplate: (t) => persistTpl([...templates, t]),
      deleteTemplate: (id) => persistTpl(templates.filter((t) => t.id !== id)),
      saveRanges: persistRanges,
      customers,
      payments,
      addCustomer: (name) => {
        const n = name.trim();
        if (!n || customers.some((c) => sameName(c.name, n))) return false;
        ensureCustomer(n);
        return true;
      },
      renameCustomer: (id, name) => {
        const n = name.trim();
        const cur = customers.find((c) => c.id === id);
        if (!cur || !n) return false;
        if (customers.some((c) => c.id !== id && sameName(c.name, n))) return false;
        const old = cur.name;
        persistCust(customers.map((c) => (c.id === id ? { ...c, name: n } : c)));
        persistTx(transactions.map((t) => (sameName(t.note, old) ? { ...t, note: n } : t)));
        persistPay(payments.map((p) => (sameName(p.customer, old) ? { ...p, customer: n } : p)));
        return true;
      },
      deleteCustomer: (id) => persistCust(customers.filter((c) => c.id !== id)),
      payDebt: (customer, amount) => {
        let left = amount;
        const now = new Date().toISOString();
        const upd = new Map<string, Tx>();
        openDebts(customer).forEach((t) => {
          if (left <= 0) return;
          const pay = Math.min(left, remainingOf(t));
          left -= pay;
          const paid = (t.paid ?? 0) + pay;
          upd.set(t.id, { ...t, paid, paidOffAt: paid >= debtOf(t) ? now : t.paidOffAt });
        });
        const used = amount - left;
        if (used > 0) {
          persistTx(transactions.map((t) => upd.get(t.id) ?? t));
          logPayment(customer, used, "cicil");
        }
        return used;
      },
      settleTx: (id) => {
        const t = transactions.find((x) => x.id === id);
        if (!t || remainingOf(t) <= 0) return;
        const rem = remainingOf(t);
        const now = new Date().toISOString();
        persistTx(transactions.map((x) => (x.id === id ? { ...x, paid: debtOf(x), paidOffAt: now } : x)));
        logPayment(t.note, rem, "lunas");
      },
      settleCustomer: (customer) => {
        const open = openDebts(customer);
        const total = open.reduce((a, t) => a + remainingOf(t), 0);
        if (!total) return 0;
        const ids = new Set(open.map((t) => t.id));
        const now = new Date().toISOString();
        persistTx(transactions.map((t) => (ids.has(t.id) ? { ...t, paid: debtOf(t), paidOffAt: now } : t)));
        logPayment(customer, total, "lunas");
        return total;
      },
      clearCustomerDebt: (customer) => {
        persistTx(transactions.map((t) => (isDebtTx(t) && sameName(t.note, customer) ? { ...t, debtCleared: true } : t)));
        persistPay(payments.filter((p) => !sameName(p.customer, customer)));
      },
      replaceAll: (d) => {
        persistTx(d.transactions);
        persistTpl(d.templates);
        persistRanges(d.ranges);
        persistExp(d.expenses);
        persistCust(customersFromTx(d.transactions, d.customers ?? customers));
        persistPay(d.payments ?? payments);
      },
      toast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, transactions, templates, ranges, expenses, settings, customers, payments, toast],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      {toastMsg && (
        <Animated.View
          testID="toast"
          style={[
            styles.toast,
            {
              pointerEvents: "none",
              top: insets.top + 12,
              backgroundColor: toastMsg.kind === "ok" ? colors.surfaceInverse : colors.error,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            },
          ]}
        >
          <Text style={[styles.toastText, { color: colors.onSurfaceInverse }]}>{toastMsg.msg}</Text>
        </Animated.View>
      )}
    </StoreContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: { position: "absolute", left: 16, right: 16, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  toastText: { fontSize: 14, fontWeight: "600" },
});
