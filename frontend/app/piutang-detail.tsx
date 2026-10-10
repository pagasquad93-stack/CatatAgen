import { Lucide } from "@react-native-vector-icons/lucide";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CicilSheet, LunasStamp, StatusBadge } from "@/src/components/debt-ui";
import { Button, Card, ConfirmSheet, MONO } from "@/src/components/ui";
import { daysSince, OVERDUE_DAYS } from "@/src/debt";
import { longDate, rupiah } from "@/src/format";
import { txTitle } from "@/src/report";
import { debtOf, isDebtTx, PAY_LABEL, remainingOf, sameName, Tx, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

export default function PiutangDetailScreen() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name = "" } = useLocalSearchParams<{ name?: string }>();
  const { transactions, payments, settleTx, settleCustomer, payDebt, toast } = useStore();
  const [cicil, setCicil] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmTx, setConfirmTx] = useState<Tx | null>(null);

  const txs = useMemo(
    () => transactions.filter((t) => isDebtTx(t) && sameName(t.note, name)).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)),
    [transactions, name],
  );
  const pays = useMemo(() => payments.filter((p) => sameName(p.customer, name)), [payments, name]);
  const remaining = txs.reduce((a, t) => a + remainingOf(t), 0);
  const totalDebt = txs.reduce((a, t) => a + debtOf(t), 0);
  const paidTotal = totalDebt - remaining;

  const back = () => (router.canGoBack() ? router.back() : router.replace("/piutang"));

  return (
    <View style={s.root} testID="piutang-detail-screen">
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="piutang-detail-back" onPress={back} style={s.back} hitSlop={8}>
          <Lucide name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{name}</Text>
          <Text style={s.headerSub}>Riwayat piutang pelanggan</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <View style={s.hero}>
          <Text style={s.heroLabel}>SISA HUTANG</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
            <Text style={s.heroValue} testID="detail-remaining">{rupiah(remaining)}</Text>
            {remaining === 0 && txs.length > 0 && <LunasStamp style={{ borderColor: "#86EFAC" }} />}
          </View>
          <Text style={s.heroSub}>
            Total hutang {rupiah(totalDebt)} · sudah dibayar {rupiah(paidTotal)}
          </Text>
        </View>

        {remaining > 0 && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button label="Lunas Semua" icon="badge-check" onPress={() => setConfirmAll(true)} testID="detail-lunas-all" style={{ flex: 1 }} />
            <Button label="Cicil Bayar" icon="hand-coins" variant="outline" onPress={() => setCicil(true)} testID="detail-cicil" style={{ flex: 1 }} />
          </View>
        )}

        <Card>
          <Text style={s.cardTitle}>Riwayat Hutang ({txs.length})</Text>
          {txs.length === 0 && <Text style={s.empty}>Tidak ada catatan hutang</Text>}
          {txs.map((t, i) => {
            const rem = remainingOf(t);
            const lunas = rem === 0;
            const age = daysSince(t.date);
            return (
              <View key={t.id} style={[s.item, lunas && s.itemPaid]} testID={`detail-tx-${i}`}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemDate}>{longDate(t.date)}</Text>
                    <Text style={s.itemTitle} numberOfLines={2}>{txTitle(t)}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <StatusBadge kind={t.payStatus === "belum" ? "err" : "warn"} label={PAY_LABEL[t.payStatus ?? "belum"]} />
                      {!lunas && age >= OVERDUE_DAYS && <StatusBadge kind="err" label={`Lewat ${age} hari`} />}
                    </View>
                  </View>
                  {lunas && <LunasStamp testID={`detail-lunas-stamp-${i}`} style={{ alignSelf: "center" }} />}
                </View>
                <View style={s.amounts}>
                  <View style={s.amt}>
                    <Text style={s.amtLabel}>HUTANG AWAL</Text>
                    <Text style={s.amtVal}>{rupiah(debtOf(t))}</Text>
                  </View>
                  <View style={s.amt}>
                    <Text style={s.amtLabel}>DIBAYAR</Text>
                    <Text style={[s.amtVal, { color: colors.brandPrimary }]}>{rupiah(t.paid ?? 0)}</Text>
                  </View>
                  <View style={s.amt}>
                    <Text style={s.amtLabel}>BELUM BAYAR</Text>
                    <Text style={[s.amtVal, { color: rem ? colors.error : colors.muted }]} testID={`detail-tx-remaining-${i}`}>{rupiah(rem)}</Text>
                  </View>
                </View>
                {!lunas && (
                  <Pressable testID={`detail-tx-lunas-${i}`} onPress={() => setConfirmTx(t)} style={({ pressed }) => [s.itemBtn, pressed && { opacity: 0.6 }]}>
                    <Lucide name="check" size={16} color={colors.brandPrimary} />
                    <Text style={s.itemBtnText}>Tandai Lunas</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </Card>

        <Card>
          <Text style={s.cardTitle}>Riwayat Pembayaran</Text>
          {pays.length === 0 && <Text style={s.empty}>Belum ada pembayaran</Text>}
          {pays.map((p, i) => (
            <View key={p.id} style={[s.payRow, i > 0 && s.border]} testID={`detail-payment-${i}`}>
              <View style={s.payIcon}>
                <Lucide name={p.kind === "lunas" ? "badge-check" : "hand-coins"} size={16} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.payTitle}>{p.kind === "lunas" ? "Pelunasan" : "Cicilan"}</Text>
                <Text style={s.paySub}>
                  {longDate(p.createdAt.slice(0, 10))} · {new Date(p.createdAt).toTimeString().slice(0, 5)}
                </Text>
              </View>
              <Text style={s.payAmt}>+{rupiah(p.amount)}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      <ConfirmSheet
        visible={confirmAll}
        title={`Lunasi semua hutang ${name}?`}
        message={`Sisa ${rupiah(remaining)} ditandai LUNAS untuk semua produk.`}
        confirmLabel="Lunas"
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => {
          settleCustomer(name);
          setConfirmAll(false);
          toast(`${name} lunas`);
        }}
      />
      <ConfirmSheet
        visible={!!confirmTx}
        title="Tandai produk ini lunas?"
        message={confirmTx ? `${txTitle(confirmTx)} · sisa ${rupiah(remainingOf(confirmTx))}` : ""}
        confirmLabel="Lunas"
        onCancel={() => setConfirmTx(null)}
        onConfirm={() => {
          if (confirmTx) settleTx(confirmTx.id);
          setConfirmTx(null);
          toast("Produk ditandai LUNAS");
        }}
      />
      <CicilSheet
        visible={cicil}
        name={name}
        remaining={remaining}
        onCancel={() => setCicil(false)}
        onSubmit={(amt) => {
          const used = payDebt(name, amt);
          setCicil(false);
          toast(remaining - used > 0 ? `Cicilan ${rupiah(used)} dicatat · sisa ${rupiah(remaining - used)}` : `${name} lunas!`);
        }}
      />
    </View>
  );
}

const useS = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingBottom: 8, backgroundColor: c.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: c.border },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: c.onSurface },
  headerSub: { fontSize: 12, color: c.muted },
  hero: { backgroundColor: c.surfaceInverse, borderRadius: 20, padding: 20 },
  heroLabel: { color: "#FCA5A5", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  heroValue: { color: c.onSurfaceInverse, fontSize: 28, fontWeight: "800", fontFamily: MONO },
  heroSub: { color: "#C9CDC6", fontSize: 13, marginTop: 6 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  empty: { fontSize: 13, color: c.muted, marginTop: 10 },
  item: { marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.border },
  itemPaid: { backgroundColor: c.brandTertiary, borderColor: c.brandSecondary },
  itemDate: { fontSize: 12, fontWeight: "700", color: c.onSurfaceTertiary },
  itemTitle: { fontSize: 15, fontWeight: "800", color: c.onSurface, marginTop: 2 },
  amounts: { flexDirection: "row", gap: 6, marginTop: 12 },
  amt: { flex: 1, backgroundColor: c.surface, borderRadius: 10, padding: 8 },
  amtLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5, color: c.muted },
  amtVal: { fontSize: 13, fontWeight: "800", fontFamily: MONO, color: c.onSurface, marginTop: 2 },
  itemBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, marginTop: 10, borderRadius: 10, borderWidth: 1.2, borderColor: c.brandPrimary },
  itemBtnText: { fontSize: 13, fontWeight: "800", color: c.brandPrimary },
  payRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  border: { borderTopWidth: 1, borderTopColor: c.divider },
  payIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  payTitle: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  paySub: { fontSize: 12, color: c.muted, marginTop: 2 },
  payAmt: { fontSize: 14, fontWeight: "800", fontFamily: MONO, color: c.brandPrimary },
}));
