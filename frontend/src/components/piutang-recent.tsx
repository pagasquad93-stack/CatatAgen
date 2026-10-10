import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { LunasStamp, StatusBadge } from "@/src/components/debt-ui";
import { Card, MONO } from "@/src/components/ui";
import { longDate, rupiah, shiftDay, todayISO } from "@/src/format";
import { txTitle } from "@/src/report";
import { isDebtTx, isPaidOff, PAY_LABEL, remainingOf, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

/** Piutang (kurang / belum bayar) 7 hari terakhir, dengan cap LUNAS bila sudah dilunasi. */
export function PiutangRecent() {
  const s = useS();
  const { colors } = useTheme();
  const router = useRouter();
  const { transactions } = useStore();
  const from = shiftDay(todayISO(), -6);
  const list = useMemo(
    () =>
      transactions
        .filter((t) => isDebtTx(t) && t.date >= from && t.date <= todayISO())
        .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)),
    [transactions, from],
  );
  const open = list.reduce((a, t) => a + remainingOf(t), 0);

  return (
    <Card testID="rekap-piutang-card">
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Piutang 7 Hari Terakhir</Text>
          <Text style={s.sub}>Pelanggan kurang bayar & belum bayar</Text>
        </View>
        <Pressable testID="rekap-piutang-open" onPress={() => router.navigate("/piutang")} style={s.link} hitSlop={8}>
          <Text style={s.linkText}>Kelola</Text>
          <Lucide name="chevron-right" size={16} color={colors.brandPrimary} />
        </Pressable>
      </View>
      {list.length === 0 ? (
        <Text style={s.empty} testID="rekap-piutang-empty">Tidak ada piutang dalam 7 hari terakhir</Text>
      ) : (
        <>
          <View style={s.total}>
            <Text style={s.totalLabel}>BELUM TERBAYAR</Text>
            <Text style={s.totalValue} testID="rekap-piutang-total">{rupiah(open)}</Text>
          </View>
          {list.map((t, i) => {
            const paid = isPaidOff(t);
            return (
              <View key={t.id} style={[s.row, i > 0 && s.border]} testID={`rekap-piutang-item-${i}`}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{t.note}</Text>
                  <Text style={s.rowSub} numberOfLines={1}>{longDate(t.date)} · {txTitle(t)}</Text>
                  <View style={{ marginTop: 6 }}>
                    {paid ? (
                      <StatusBadge kind="ok" label="Sudah dilunasi" />
                    ) : (
                      <StatusBadge kind={t.payStatus === "belum" ? "err" : "warn"} label={PAY_LABEL[t.payStatus ?? "belum"]} />
                    )}
                  </View>
                </View>
                {paid ? (
                  <LunasStamp testID={`rekap-piutang-lunas-${i}`} />
                ) : (
                  <Text style={s.money}>{rupiah(remainingOf(t))}</Text>
                )}
              </View>
            );
          })}
        </>
      )}
    </Card>
  );
}

const useS = makeStyles((c) => ({
  head: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  sub: { fontSize: 12, color: c.muted, marginTop: 2 },
  link: { flexDirection: "row", alignItems: "center", height: 36 },
  linkText: { fontSize: 14, fontWeight: "700", color: c.brandPrimary },
  empty: { fontSize: 13, color: c.muted, marginTop: 10 },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#FDECEC" },
  totalLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: c.error },
  totalValue: { fontSize: 16, fontWeight: "800", fontFamily: MONO, color: c.error },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  border: { borderTopWidth: 1, borderTopColor: c.divider },
  name: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  rowSub: { fontSize: 12, color: c.muted, marginTop: 2 },
  money: { fontSize: 14, fontWeight: "800", fontFamily: MONO, color: c.error },
}));
