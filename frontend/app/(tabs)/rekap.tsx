import { Lucide } from "@react-native-vector-icons/lucide";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader, Card, MONO, ScreenTitle, Segmented } from "@/src/components/ui";
import { fromISODate, longDate, MONTHS, rupiah, toISODate, todayISO } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { omzetOf, profitOf, TxType, TYPE_LABEL, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

type Mode = "day" | "month" | "year";

export default function RekapScreen() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { transactions } = useStore();
  const [mode, setMode] = useState<Mode>("day");
  const [ref, setRef] = useState(todayISO());

  const d = fromISODate(ref);
  const prefix = mode === "day" ? ref : mode === "month" ? ref.slice(0, 7) : ref.slice(0, 4);
  const label = mode === "day" ? longDate(ref) : mode === "month" ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : String(d.getFullYear());

  const shift = (dir: number) => {
    const n = new Date(d);
    if (mode === "day") n.setDate(n.getDate() + dir);
    else if (mode === "month") n.setMonth(n.getMonth() + dir, 1);
    else n.setFullYear(n.getFullYear() + dir, 0, 1);
    setRef(toISODate(n));
  };

  const data = useMemo(() => {
    const list = transactions.filter((t) => t.date.startsWith(prefix));
    const per: Record<TxType, { count: number; profit: number; omzet: number }> = {
      transfer: { count: 0, profit: 0, omzet: 0 },
      tarik: { count: 0, profit: 0, omzet: 0 },
      ppob: { count: 0, profit: 0, omzet: 0 },
    };
    list.forEach((t) => {
      per[t.type].count++;
      per[t.type].profit += profitOf(t);
      per[t.type].omzet += omzetOf(t);
    });
    return {
      count: list.length,
      profit: list.reduce((a, t) => a + profitOf(t), 0),
      omzet: list.reduce((a, t) => a + omzetOf(t), 0),
      per,
    };
  }, [transactions, prefix]);

  return (
    <View style={s.root} testID="rekap-screen">
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomChrome + 24 }}>
        <ScreenTitle title="Rekap" />
        <Segmented
          testPrefix="rekap-mode"
          value={mode}
          onChange={setMode}
          options={[
            { key: "day", label: "Harian" },
            { key: "month", label: "Bulanan" },
            { key: "year", label: "Tahunan" },
          ]}
        />
        <View style={s.nav}>
          <Pressable testID="rekap-prev" onPress={() => shift(-1)} style={s.navBtn}>
            <Lucide name="chevron-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={s.navLabel} testID="rekap-period-label">{label}</Text>
          <Pressable testID="rekap-next" onPress={() => shift(1)} style={s.navBtn}>
            <Lucide name="chevron-right" size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={s.hero}>
          <Text style={s.heroLabel}>TOTAL UNTUNG</Text>
          <Text style={s.heroValue} testID="rekap-total-profit">{rupiah(data.profit)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={s.smallLabel}>TOTAL OMZET</Text>
            <Text style={s.smallValue} testID="rekap-total-omzet">{rupiah(data.omzet)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={s.smallLabel}>JUMLAH TRANSAKSI</Text>
            <Text style={s.smallValue} testID="rekap-total-count">{data.count}</Text>
          </Card>
        </View>

        <Card>
          <Text style={s.cardTitle}>Per Jenis Transaksi</Text>
          {(Object.keys(data.per) as TxType[]).map((k, i) => (
            <View key={k} style={[s.perRow, i > 0 && s.perBorder]} testID={`rekap-type-${k}`}>
              <View>
                <Text style={s.perTitle}>
                  {TYPE_LABEL[k]} ({data.per[k].count}x)
                </Text>
                <Text style={s.perSub}>Omzet {rupiah(data.per[k].omzet)}</Text>
              </View>
              <Text style={s.perProfit}>{rupiah(data.per[k].profit)}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const useS = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  hero: { backgroundColor: c.brandPrimary, borderRadius: 20, padding: 20 },
  heroLabel: { color: c.onBrandMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  heroValue: { color: c.onBrandPrimary, fontSize: 30, fontWeight: "800", fontFamily: MONO, marginTop: 6 },
  smallLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: c.muted },
  smallValue: { fontSize: 18, fontWeight: "800", fontFamily: MONO, color: c.onSurface, marginTop: 6 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface, marginBottom: 4 },
  perRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  perBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  perTitle: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  perSub: { fontSize: 12, color: c.muted, marginTop: 2 },
  perProfit: { fontSize: 15, fontWeight: "800", fontFamily: MONO, color: c.brandPrimary },
}));
