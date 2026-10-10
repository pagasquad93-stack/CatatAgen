import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PiutangRecent } from "@/src/components/piutang-recent";
import { ExpenseVsProfit, PeakHours, ProfitRanking } from "@/src/components/rekap-sections";
import { AppHeader, Button, Card, MONO, ScreenTitle, Segmented } from "@/src/components/ui";
import { rupiah, todayISO } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { buildReport, exportXlsx, Mode, periodOf, shiftRef } from "@/src/report";
import { TxType, TYPE_LABEL, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

export default function RekapScreen() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { transactions, expenses, toast } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("day");
  const [ref, setRef] = useState(todayISO());
  const [exporting, setExporting] = useState(false);

  const { start, end, label } = periodOf(mode, ref);
  const shift = (dir: number) => setRef(shiftRef(mode, ref, dir));
  const data = useMemo(() => buildReport(transactions, expenses, start, end), [transactions, expenses, start, end]);

  const doExport = async () => {
    setExporting(true);
    try {
      await exportXlsx(data, label, start, end);
      toast("Laporan Excel siap");
    } catch {
      toast("Gagal membuat laporan Excel", "err");
    } finally {
      setExporting(false);
    }
  };

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
            { key: "week", label: "Mingguan" },
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

        <PiutangRecent />
        <ExpenseVsProfit r={data} onManage={() => router.push("/pengeluaran")} />
        <PeakHours r={data} />
        <ProfitRanking r={data} />

        <Button
          label={exporting ? "Membuat laporan..." : "Export Laporan ke Excel (.xlsx)"}
          icon="file-spreadsheet"
          onPress={doExport}
          disabled={exporting}
          testID="export-xlsx-button"
        />
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
