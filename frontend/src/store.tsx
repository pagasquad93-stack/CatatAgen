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
  kategori: string;
  produk: string;
  modal: number;
  jual: number;
  note: string;
  createdAt: string;
};

export type Template = Omit<Tx, "id" | "date" | "note" | "createdAt"> & { id: string; name: string };

export type AdminRange = { min: number; max: number; transfer: number; tarik: number };

export type Expense = { id: string; date: string; category: string; amount: number; note: string; createdAt: string };

export const EXPENSE_CATEGORIES = ["Listrik", "Internet/Pulsa", "Sewa", "Gaji", "Transport", "Makan/Minum", "ATK", "Lainnya"];

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

const KEYS = { tx: "catatagen.transactions", tpl: "catatagen.templates", ranges: "catatagen.adminRanges", exp: "catatagen.expenses" };

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
  addExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  addTx: (t: Tx) => void;
  updateTx: (t: Tx) => void;
  deleteTx: (id: string) => void;
  addTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  saveRanges: (r: AdminRange[]) => void;
  replaceAll: (d: { transactions: Tx[]; templates: Template[]; ranges: AdminRange[]; expenses: Expense[] }) => void;
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
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  useEffect(() => {
    (async () => {
      setTx(await load(KEYS.tx, [] as Tx[]));
      setTpl(await load(KEYS.tpl, [] as Template[]));
      setRanges(await load(KEYS.ranges, DEFAULT_RANGES));
      setExp(await load(KEYS.exp, [] as Expense[]));
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
      addExpense: (e) => persistExp([e, ...expenses]),
      deleteExpense: (id) => persistExp(expenses.filter((e) => e.id !== id)),
      addTx: (t) => persistTx([t, ...transactions]),
      updateTx: (t) => persistTx(transactions.map((x) => (x.id === t.id ? t : x))),
      deleteTx: (id) => persistTx(transactions.filter((t) => t.id !== id)),
      addTemplate: (t) => persistTpl([...templates, t]),
      deleteTemplate: (id) => persistTpl(templates.filter((t) => t.id !== id)),
      saveRanges: persistRanges,
      replaceAll: (d) => {
        persistTx(d.transactions);
        persistTpl(d.templates);
        persistRanges(d.ranges);
        persistExp(d.expenses);
      },
      toast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, transactions, templates, ranges, expenses, toast],
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
