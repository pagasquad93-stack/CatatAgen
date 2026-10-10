import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CicilSheet, HBarChart, LunasStamp } from "@/src/components/debt-ui";
import { AppHeader, Card, ConfirmSheet, MONO, ScreenTitle, Segmented } from "@/src/components/ui";
import { CustDebt, daysSince, groupDebts, OVERDUE_DAYS } from "@/src/debt";
import { longDate, rupiah } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { txTitle } from "@/src/report";
import { remainingOf, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

type Pending = { kind: "lunas" | "hapus"; c: CustDebt } | null;

export default function PiutangScreen() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const router = useRouter();
  const { transactions, settleCustomer, payDebt, clearCustomerDebt, toast } = useStore();
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"open" | "all">("open");
  const [chartBy, setChartBy] = useState<"nominal" | "count">("nominal");
  const [pending, setPending] = useState<Pending>(null);
  const [cicil, setCicil] = useState<CustDebt | null>(null);

  const groups = useMemo(() => groupDebts(transactions), [transactions]);
  const openGroups = groups.filter((g) => g.remaining > 0);
  const totalDebt = openGroups.reduce((a, g) => a + g.remaining, 0);
  const openTx = openGroups.reduce((a, g) => a + g.openCount, 0);

  const overdue = useMemo(
    () =>
      transactions
        .filter((t) => remainingOf(t) > 0 && daysSince(t.date) >= OVERDUE_DAYS)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [transactions],
  );
  const overdueTotal = overdue.reduce((a, t) => a + remainingOf(t), 0);

  const chart = useMemo(
    () =>
      [...openGroups]
        .sort((a, b) => (chartBy === "nominal" ? b.remaining - a.remaining : b.openCount - a.openCount || b.remaining - a.remaining))
        .slice(0, 5)
        .map((g) => ({ label: g.name, value: chartBy === "nominal" ? g.remaining : g.openCount })),
    [openGroups, chartBy],
  );

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (show === "open" ? openGroups : groups).filter((g) => !qq || g.key.includes(qq));
  }, [groups, openGroups, show, q]);

  const openDetail = (name: string) => router.push({ pathname: "/piutang-detail", params: { name } });

  return (
    <View style={s.root} testID="piutang-screen">
      <AppHeader />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomChrome + 24 }}
      >
        <ScreenTitle title="Piutang Pelanggan" subtitle="Hutang dari transaksi Kurang Bayar & Belum Bayar." />

        <View style={s.hero} testID="piutang-hero">
          <Text style={s.heroLabel}>TOTAL HUTANG PELANGGAN</Text>
          <Text style={s.heroValue} testID="piutang-total">{rupiah(totalDebt)}</Text>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatVal} testID="piutang-customer-count">{openGroups.length}</Text>
              <Text style={s.heroStatLabel}>Pelanggan</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={s.heroStatVal} testID="piutang-tx-count">{openTx}</Text>
              <Text style={s.heroStatLabel}>Transaksi</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={s.heroStatVal} testID="piutang-overdue-count">{overdue.length}</Text>
              <Text style={s.heroStatLabel}>Lewat 7 hari</Text>
            </View>
          </View>
        </View>

        <Card testID="piutang-chart-card">
          <Text style={s.cardTitle}>Top 5 Hutang Tertinggi</Text>
          <View style={{ marginTop: 12 }}>
            <Segmented
              testPrefix="chart-by"
              value={chartBy}
              onChange={setChartBy}
              options={[
                { key: "nominal", label: "Nominal" },
                { key: "count", label: "Jumlah Transaksi" },
              ]}
            />
          </View>
          {chart.length === 0 ? (
            <Text style={s.empty}>Belum ada piutang aktif</Text>
          ) : (
            <HBarChart data={chart} format={chartBy === "nominal" ? rupiah : (n) => `${n} trx`} testID="piutang-chart" />
          )}
        </Card>

        <Card testID="overdue-card">
          <View style={s.rowHead}>
            <Lucide name="clock-alert" size={18} color={colors.error} />
            <Text style={[s.cardTitle, { flex: 1 }]}>Belum Lunas &gt; 7 Hari</Text>
            {overdue.length > 0 && <Text style={s.overdueTotal}>{rupiah(overdueTotal)}</Text>}
          </View>
          {overdue.length === 0 ? (
            <Text style={s.empty} testID="overdue-empty">Tidak ada hutang yang lewat 7 hari</Text>
          ) : (
            <View style={s.table}>
              <View style={[s.tr, s.th]}>
                <Text style={[s.thText, { flex: 1.3 }]}>PELANGGAN</Text>
                <Text style={[s.thText, { flex: 1.4 }]}>PRODUK</Text>
                <Text style={[s.thText, { width: 48, textAlign: "center" }]}>UMUR</Text>
                <Text style={[s.thText, { flex: 1, textAlign: "right" }]}>SISA</Text>
              </View>
              {overdue.map((t, i) => (
                <Pressable key={t.id} onPress={() => openDetail(t.note)} style={[s.tr, i % 2 === 1 && s.trAlt]} testID={`overdue-row-${i}`}>
                  <View style={{ flex: 1.3 }}>
                    <Text style={s.tdName} numberOfLines={1}>{t.note}</Text>
                    <Text style={s.tdSub}>{t.date.slice(8)}/{t.date.slice(5, 7)}</Text>
                  </View>
                  <Text style={[s.td, { flex: 1.4 }]} numberOfLines={2}>{txTitle(t)}</Text>
                  <View style={{ width: 48, alignItems: "center" }}>
                    <Text style={s.age}>{daysSince(t.date)}h</Text>
                  </View>
                  <Text style={[s.tdMoney, { flex: 1 }]} numberOfLines={1}>{rupiah(remainingOf(t))}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        <Card testID="piutang-customers-card">
          <View style={s.rowHead}>
            <Lucide name="users" size={18} color={colors.brandPrimary} />
            <Text style={[s.cardTitle, { flex: 1 }]}>Daftar Pelanggan Piutang</Text>
          </View>
          <View style={s.search}>
            <Lucide name="search" size={16} color={colors.muted} />
            <TextInput
              testID="piutang-search-input"
              value={q}
              onChangeText={setQ}
              placeholder="Cari nama pelanggan"
              placeholderTextColor={colors.muted}
              style={s.searchInput}
            />
            {!!q && (
              <Pressable onPress={() => setQ("")} hitSlop={8} testID="piutang-search-clear">
                <Lucide name="x" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>
          <View style={{ marginTop: 12 }}>
            <Segmented
              testPrefix="piutang-show"
              value={show}
              onChange={setShow}
              options={[
                { key: "open", label: `Belum Lunas (${openGroups.length})` },
                { key: "all", label: `Semua (${groups.length})` },
              ]}
            />
          </View>
          {list.length === 0 && (
            <Text style={s.empty} testID="piutang-list-empty">{q ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan berhutang"}</Text>
          )}
          {list.map((g, i) => {
            const lunas = g.remaining === 0;
            return (
              <View key={g.key} style={s.cust} testID={`piutang-customer-${i}`}>
                <View style={s.custTop}>
                  <View style={[s.avatar, lunas && { backgroundColor: colors.brandTertiary }]}>
                    <Text style={[s.avatarText, lunas && { color: colors.brandPrimary }]}>{g.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.custName} numberOfLines={1}>{g.name}</Text>
                    <Text style={s.tdSub}>
                      {lunas ? `${g.txs.length} transaksi · semua lunas` : `${g.openCount} belum lunas · sejak ${longDate(g.oldestOpen!).split(", ")[1]}`}
                    </Text>
                  </View>
                  {lunas ? <LunasStamp small /> : <Text style={s.custDebt} testID={`piutang-customer-debt-${i}`}>{rupiah(g.remaining)}</Text>}
                </View>
                <View style={s.actions}>
                  <ActBtn icon="list" label="Detail" onPress={() => openDetail(g.name)} testID={`piutang-detail-${i}`} />
                  {!lunas && (
                    <>
                      <ActBtn icon="badge-check" label="Lunas" tone="ok" onPress={() => setPending({ kind: "lunas", c: g })} testID={`piutang-lunas-${i}`} />
                      <ActBtn icon="hand-coins" label="Cicil" tone="warn" onPress={() => setCicil(g)} testID={`piutang-cicil-${i}`} />
                    </>
                  )}
                  <ActBtn icon="trash-2" label="Hapus" tone="err" onPress={() => setPending({ kind: "hapus", c: g })} testID={`piutang-hapus-${i}`} />
                </View>
              </View>
            );
          })}
        </Card>
      </KeyboardAwareScrollView>

      <ConfirmSheet
        visible={!!pending}
        title={pending?.kind === "lunas" ? `Lunasi hutang ${pending?.c.name}?` : `Hapus piutang ${pending?.c.name}?`}
        message={
          pending?.kind === "lunas"
            ? `Semua hutang ${rupiah(pending?.c.remaining ?? 0)} ditandai LUNAS.`
            : "Catatan hutang pelanggan ini dihapus dari daftar piutang. Transaksinya tetap ada di Riwayat."
        }
        confirmLabel={pending?.kind === "lunas" ? "Lunas" : "Hapus"}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === "lunas") {
            const n = settleCustomer(pending.c.name);
            toast(`${pending.c.name} lunas · ${rupiah(n)}`);
          } else {
            clearCustomerDebt(pending.c.name);
            toast(`Piutang ${pending.c.name} dihapus`);
          }
          setPending(null);
        }}
      />
      <CicilSheet
        visible={!!cicil}
        name={cicil?.name ?? ""}
        remaining={cicil?.remaining ?? 0}
        onCancel={() => setCicil(null)}
        onSubmit={(amt) => {
          if (!cicil) return;
          const used = payDebt(cicil.name, amt);
          const left = cicil.remaining - used;
          toast(left > 0 ? `Cicilan ${rupiah(used)} dicatat · sisa ${rupiah(left)}` : `${cicil.name} lunas!`);
          setCicil(null);
        }}
      />
    </View>
  );
}

function ActBtn({
  icon,
  label,
  onPress,
  testID,
  tone,
}: {
  icon: React.ComponentProps<typeof Lucide>["name"];
  label: string;
  onPress: () => void;
  testID: string;
  tone?: "ok" | "warn" | "err";
}) {
  const s = useS();
  const { colors } = useTheme();
  const fg = tone === "ok" ? colors.brandPrimary : tone === "warn" ? colors.warning : tone === "err" ? colors.error : colors.onSurfaceSecondary;
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [s.act, { borderColor: fg }, pressed && { opacity: 0.6 }]}>
      <Lucide name={icon} size={15} color={fg} />
      <Text style={[s.actText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const useS = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { backgroundColor: c.surfaceInverse, borderRadius: 20, padding: 20 },
  heroLabel: { color: "#FCA5A5", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  heroValue: { color: c.onSurfaceInverse, fontSize: 30, fontWeight: "800", fontFamily: MONO, marginTop: 6 },
  heroStats: { flexDirection: "row", gap: 8, marginTop: 16 },
  heroStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 },
  heroStatVal: { color: c.onSurfaceInverse, fontSize: 18, fontWeight: "800", fontFamily: MONO },
  heroStatLabel: { color: "#C9CDC6", fontSize: 11, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  overdueTotal: { fontSize: 14, fontWeight: "800", fontFamily: MONO, color: c.error },
  empty: { fontSize: 13, color: c.muted, marginTop: 12 },
  table: { marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 10, minHeight: 48 },
  trAlt: { backgroundColor: c.surface },
  th: { backgroundColor: "#FDECEC", minHeight: 36, paddingVertical: 8 },
  thText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, color: c.error },
  td: { fontSize: 12, color: c.onSurfaceSecondary },
  tdName: { fontSize: 13, fontWeight: "800", color: c.onSurface },
  tdSub: { fontSize: 11, color: c.muted, marginTop: 2 },
  tdMoney: { fontSize: 12, fontWeight: "800", fontFamily: MONO, color: c.error, textAlign: "right" },
  age: { fontSize: 11, fontWeight: "800", color: c.onError, backgroundColor: c.error, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, overflow: "hidden" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 46, marginTop: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.surfaceTertiary },
  searchInput: { flex: 1, fontSize: 14, color: c.onSurface, height: 46 },
  cust: { marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  custTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FDECEC", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "800", color: c.error },
  custName: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  custDebt: { fontSize: 15, fontWeight: "800", fontFamily: MONO, color: c.error },
  actions: { flexDirection: "row", gap: 6, marginTop: 12 },
  act: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1.2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  actText: { fontSize: 12, fontWeight: "800" },
}));
