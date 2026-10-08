import { Lucide } from "@react-native-vector-icons/lucide";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { Card, MONO } from "@/src/components/ui";
import { rupiah } from "@/src/format";
import { Report, txTitle } from "@/src/report";
import { profitOf, Tx } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function PeakHours({ r }: { r: Report }) {
  const s = useS();
  const max = Math.max(1, ...r.hours.map((h) => h.count));
  const peak = r.hours.reduce((best, h, i) => (h.count > r.hours[best].count ? i : best), 0);
  const top3 = r.hours
    .map((h, i) => ({ ...h, i }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  // Show 06:00–23:00 window, plus any active hours outside it.
  const visible = r.hours.map((h, i) => ({ ...h, i })).filter((h) => (h.i >= 6 && h.i <= 23) || h.count > 0);
  return (
    <Card testID="peak-hours-card">
      <Text style={s.title}>Analisis Jam Ramai</Text>
      {r.count === 0 ? (
        <Text style={s.empty}>Belum ada transaksi di periode ini</Text>
      ) : (
        <>
          <Text style={s.sub} testID="peak-hour-label">
            Paling ramai jam <Text style={s.strong}>{hh(peak)}–{hh((peak + 1) % 24)}</Text> ({r.hours[peak].count} transaksi)
          </Text>
          <View style={s.chart}>
            {visible.map((h) => (
              <View key={h.i} style={s.barCol}>
                <View style={s.barTrack}>
                  <View style={[s.bar, { height: `${(h.count / max) * 100}%` }, h.i === peak && s.barPeak]} />
                </View>
                <Text style={s.barLabel}>{h.i % 3 === 0 ? String(h.i) : ""}</Text>
              </View>
            ))}
          </View>
          {top3.map((h, idx) => (
            <View key={h.i} style={[s.row, idx > 0 && s.border]}>
              <Text style={s.rowTitle}>
                #{idx + 1}  {hh(h.i)}–{hh((h.i + 1) % 24)}
              </Text>
              <Text style={s.rowSub}>
                {h.count}x · <Text style={s.money}>{rupiah(h.profit)}</Text>
              </Text>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

export function ExpenseVsProfit({ r, onManage }: { r: Report; onManage: () => void }) {
  const s = useS();
  const { colors } = useTheme();
  const total = Math.max(1, r.profit, r.expenseTotal);
  return (
    <Card testID="expense-vs-profit-card">
      <View style={s.head}>
        <Text style={s.title}>Pengeluaran vs Laba</Text>
        <Pressable testID="manage-expenses-button" onPress={onManage} style={s.link} hitSlop={8}>
          <Text style={s.linkText}>Kelola</Text>
          <Lucide name="chevron-right" size={16} color={colors.brandPrimary} />
        </Pressable>
      </View>
      <View style={s.cmpRow}>
        <Text style={s.cmpLabel}>Laba Kotor</Text>
        <Text style={s.money}>{rupiah(r.profit)}</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${(Math.max(0, r.profit) / total) * 100}%`, backgroundColor: colors.brandPrimary }]} />
      </View>
      <View style={s.cmpRow}>
        <Text style={s.cmpLabel}>Pengeluaran Operasional</Text>
        <Text style={[s.money, { color: colors.error }]} testID="expense-total-value">{rupiah(r.expenseTotal)}</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${(r.expenseTotal / total) * 100}%`, backgroundColor: colors.error }]} />
      </View>
      {r.expByCat.slice(0, 4).map(([c, v]) => (
        <View key={c} style={s.catRow}>
          <Text style={s.rowSub}>{c}</Text>
          <Text style={s.rowSub}>{rupiah(v)}</Text>
        </View>
      ))}
      <View style={[s.netBox, { backgroundColor: r.net < 0 ? colors.surfaceTertiary : colors.brandTertiary }]}>
        <Text style={s.netLabel}>LABA BERSIH</Text>
        <Text style={[s.netValue, { color: r.net < 0 ? colors.error : colors.brandPrimary }]} testID="net-profit-value">
          {rupiah(r.net)}
        </Text>
      </View>
    </Card>
  );
}

export function ProfitRanking({ r }: { r: Report }) {
  const s = useS();
  const { colors } = useTheme();
  const list = (items: Tx[], prefix: string, color: string) =>
    items.map((t, i) => (
      <View key={t.id} style={[s.row, i > 0 && s.border]} testID={`${prefix}-${i}`}>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle} numberOfLines={1}>
            {i + 1}. {txTitle(t)}
          </Text>
          <Text style={s.rowSub} numberOfLines={1}>
            {t.date} · {t.note || "Tanpa catatan"}
          </Text>
        </View>
        <Text style={[s.money, { color }]}>{rupiah(profitOf(t))}</Text>
      </View>
    ));
  return (
    <Card testID="profit-ranking-card">
      <Text style={s.title}>Laba Terbesar vs Terendah</Text>
      {r.count === 0 ? (
        <Text style={s.empty}>Belum ada transaksi di periode ini</Text>
      ) : (
        <>
          <View style={s.badgeRow}>
            <Lucide name="trending-up" size={16} color={colors.brandPrimary} />
            <Text style={[s.badge, { color: colors.brandPrimary }]}>Laba Terbesar</Text>
          </View>
          {list(r.top, "top-profit", colors.brandPrimary)}
          <View style={s.badgeRow}>
            <Lucide name="trending-down" size={16} color={colors.error} />
            <Text style={[s.badge, { color: colors.error }]}>Laba Terendah</Text>
          </View>
          {list(r.bottom, "low-profit", colors.error)}
        </>
      )}
    </Card>
  );
}

const useS = makeStyles((c) => ({
  title: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  sub: { fontSize: 13, color: c.muted, marginTop: 6 },
  strong: { fontWeight: "800", color: c.brandPrimary },
  empty: { fontSize: 13, color: c.muted, marginTop: 8 },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 120, marginTop: 16, marginBottom: 8, gap: 2 },
  barCol: { flex: 1, alignItems: "center", height: "100%" },
  barTrack: { flex: 1, width: "100%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 3, backgroundColor: c.brandSecondary, minHeight: 2 },
  barPeak: { backgroundColor: c.brandPrimary },
  barLabel: { fontSize: 9, color: c.muted, marginTop: 4, height: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 12 },
  border: { borderTopWidth: 1, borderTopColor: c.divider },
  rowTitle: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  rowSub: { fontSize: 12, color: c.muted, marginTop: 2 },
  money: { fontSize: 14, fontWeight: "800", fontFamily: MONO, color: c.brandPrimary },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { flexDirection: "row", alignItems: "center", height: 36 },
  linkText: { fontSize: 14, fontWeight: "700", color: c.brandPrimary },
  cmpRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  cmpLabel: { fontSize: 13, fontWeight: "600", color: c.onSurfaceSecondary },
  track: { height: 10, borderRadius: 5, backgroundColor: c.surfaceTertiary, marginTop: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  catRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  netBox: { marginTop: 16, borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  netLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: c.onSurfaceTertiary },
  netValue: { fontSize: 18, fontWeight: "800", fontFamily: MONO },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, marginBottom: 2 },
  badge: { fontSize: 13, fontWeight: "800" },
}));
