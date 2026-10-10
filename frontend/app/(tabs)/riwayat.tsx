import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader, ConfirmSheet, DateField, MONO } from "@/src/components/ui";
import { longDate, rupiah, shiftDay, todayISO } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { LunasStamp, StatusBadge } from "@/src/components/debt-ui";
import { bankRoute, isDebtTx, isPaidOff, omzetOf, PAY_LABEL, profitOf, remainingOf, Tx, TxType, TYPE_LABEL, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

type Filter = "all" | TxType;
const ICON: Record<TxType, "send" | "banknote" | "smartphone"> = { transfer: "send", tarik: "banknote", ppob: "smartphone" };

type Row = { kind: "head"; date: string; profit: number } | { kind: "tx"; tx: Tx };

export default function RiwayatScreen() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const router = useRouter();
  const { transactions, deleteTx, toast } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [date, setDate] = useState(todayISO());
  const [toDelete, setToDelete] = useState<Tx | null>(null);

  const dayTx = useMemo(() => transactions.filter((t) => t.date === date), [transactions, date]);

  const counts = useMemo(() => {
    const c = { all: dayTx.length, transfer: 0, tarik: 0, ppob: 0 };
    dayTx.forEach((t) => c[t.type]++);
    return c;
  }, [dayTx]);

  const rows = useMemo<Row[]>(() => {
    const list = dayTx
      .filter((t) => filter === "all" || t.type === filter)
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
    const out: Row[] = [];
    let head: Extract<Row, { kind: "head" }> | null = null;
    list.forEach((t) => {
      if (!head || head.date !== t.date) {
        head = { kind: "head", date: t.date, profit: 0 };
        out.push(head);
      }
      head.profit += profitOf(t);
      out.push({ kind: "tx", tx: t });
    });
    return out;
  }, [dayTx, filter]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "transfer", label: "Transfer" },
    { key: "tarik", label: "Tarik Tunai" },
    { key: "ppob", label: "PPOB" },
  ];

  return (
    <View style={s.root} testID="riwayat-screen">
      <AppHeader />
      <View style={s.top}>
        <View style={s.titleRow}>
          <Text style={s.title}>Riwayat</Text>
          {date !== todayISO() && (
            <Pressable testID="riwayat-today-button" onPress={() => setDate(todayISO())} style={s.todayBtn} hitSlop={6}>
              <Text style={s.todayText}>Hari ini</Text>
            </Pressable>
          )}
        </View>
        <View style={s.dateRow}>
          <Pressable testID="riwayat-prev-day" onPress={() => setDate(shiftDay(date, -1))} style={s.navBtn}>
            <Lucide name="chevron-left" size={20} color={colors.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <DateField value={date} onChange={setDate} testID="riwayat-date-input" />
          </View>
          <Pressable testID="riwayat-next-day" onPress={() => setDate(shiftDay(date, 1))} style={s.navBtn}>
            <Lucide name="chevron-right" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>
      <View style={s.filterTable} testID="filter-table">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              testID={`filter-${f.key}`}
              onPress={() => setFilter(f.key)}
              style={[s.filterCell, active && s.filterCellActive]}
            >
              <Text style={[s.filterLabel, active && s.filterLabelActive]} numberOfLines={1}>
                {f.label}
              </Text>
              <Text style={[s.filterCount, active && s.filterCountActive]}>{counts[f.key]}</Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => (r.kind === "head" ? `h-${r.date}` : r.tx.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: bottomChrome + 24, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={s.empty} testID="riwayat-empty">
            <Lucide name="inbox" size={40} color={colors.borderStrong} />
            <Text style={s.emptyText}>Belum ada transaksi di {date === todayISO() ? "hari ini" : longDate(date)}</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === "head")
            return (
              <View style={s.head}>
                <Text style={s.headDate}>{longDate(item.date)}</Text>
                <Text style={s.headProfit}>+{rupiah(item.profit)}</Text>
              </View>
            );
          const t = item.tx;
          const title = t.type === "ppob" ? `${t.kategori}${t.produk ? ` · ${t.produk}` : ""}` : `${TYPE_LABEL[t.type]}${bankRoute(t) ? ` · ${bankRoute(t)}` : ""}`;
          return (
            <View style={s.row} testID={`tx-item-${t.id}`}>
              <View style={s.icon}>
                <Lucide name={ICON[t.type]} size={18} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
                <Text style={s.rowSub} numberOfLines={1}>
                  {t.note || "Tanpa catatan"} · {rupiah(omzetOf(t))}
                </Text>
                {isDebtTx(t) && (
                  <View style={{ marginTop: 4 }} testID={`tx-debt-${t.id}`}>
                    {isPaidOff(t) ? (
                      <LunasStamp small />
                    ) : (
                      <StatusBadge kind={t.payStatus === "belum" ? "err" : "warn"} label={`${PAY_LABEL[t.payStatus ?? "belum"]} · ${rupiah(remainingOf(t))}`} />
                    )}
                  </View>
                )}
              </View>
              <Text style={[s.rowProfit, profitOf(t) < 0 && { color: colors.error }]}>+{rupiah(profitOf(t))}</Text>
              <Pressable
                testID={`tx-edit-${t.id}`}
                hitSlop={8}
                onPress={() => router.navigate({ pathname: "/", params: { edit: t.id } })}
                style={s.del}
              >
                <Lucide name="pencil" size={18} color={colors.brandPrimary} />
              </Pressable>
              <Pressable testID={`tx-delete-${t.id}`} hitSlop={8} onPress={() => setToDelete(t)} style={s.del}>
                <Lucide name="trash-2" size={18} color={colors.error} />
              </Pressable>
            </View>
          );
        }}
      />
      <ConfirmSheet
        visible={!!toDelete}
        title="Hapus transaksi?"
        message="Transaksi ini akan dihapus permanen dari HP ini."
        confirmLabel="Hapus"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteTx(toDelete.id);
          setToDelete(null);
          toast("Transaksi dihapus");
        }}
      />
    </View>
  );
}

const useS = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  top: { paddingHorizontal: 16, paddingTop: 16 },
  filterTable: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: c.surfaceTertiary,
    borderRadius: 14,
    padding: 4,
  },
  filterCell: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  filterCellActive: { backgroundColor: c.surfaceSecondary, shadowColor: c.onSurface, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  filterLabel: { fontSize: 12, fontWeight: "600", color: c.muted },
  filterLabelActive: { color: c.brandPrimary, fontWeight: "800" },
  filterCount: { fontSize: 11, fontWeight: "700", color: c.muted, fontFamily: MONO, marginTop: 1 },
  filterCountActive: { color: c.brandPrimary },
  title: { fontSize: 26, fontWeight: "800", color: c.onSurface, letterSpacing: -0.5 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  todayBtn: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.brandTertiary, justifyContent: "center" },
  todayText: { fontSize: 13, fontWeight: "700", color: c.brandPrimary },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  navBtn: { width: 44, height: 48, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { color: c.muted, fontSize: 15 },
  head: { flexDirection: "row", justifyContent: "space-between", paddingTop: 12, paddingBottom: 8 },
  headDate: { fontSize: 13, fontWeight: "700", color: c.onSurfaceTertiary },
  headProfit: { fontSize: 13, fontWeight: "700", color: c.brandPrimary, fontFamily: MONO },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12, marginBottom: 8 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  rowSub: { fontSize: 12, color: c.muted, marginTop: 2 },
  rowProfit: { fontSize: 14, fontWeight: "800", color: c.brandPrimary, fontFamily: MONO },
  del: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
}));
