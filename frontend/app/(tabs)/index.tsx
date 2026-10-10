import { Lucide } from "@react-native-vector-icons/lucide";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TargetHero } from "@/src/components/target-card";
import { AppHeader, Button, Card, Chip, ChipWrap, DateField, Label, MONO, MoneyInput, Segmented, TextField } from "@/src/components/ui";
import { formatNum, rupiah, shortNominal, todayISO, uid } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { adminFor, bankRoute, omzetOf, PayStatus, profitOf, sameName, Template, TxType, TYPE_LABEL, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const NOMINALS = [50000, 100000, 200000, 300000, 500000, 1000000, 1500000, 2000000];
const KATEGORI = ["Pulsa", "Paket Data", "Token PLN", "Tagihan PLN", "PDAM", "BPJS", "Game", "E-Wallet", "Lainnya"];

// Most frequently used first; ties keep the original order.
function byFrequency<T>(items: T[], counts: Map<T, number>) {
  return items
    .map((v, i) => ({ v, i, n: counts.get(v) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.v);
}

function countBy<T>(values: T[]) {
  const m = new Map<T, number>();
  values.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  return m;
}

const tplKey = (t: { type: TxType; nominal: number; bank: string; agentBank?: string; kategori: string; produk: string }) =>
  t.type === "ppob" ? `ppob|${t.kategori}|${t.produk.trim().toLowerCase()}` : `${t.type}|${t.nominal}|${t.agentBank ?? ""}|${t.bank}`;

export default function InputScreen() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { transactions, templates, ranges, settings, customers, addTx, updateTx, addTemplate, deleteTemplate, toast } = useStore();
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = edit ? transactions.find((t) => t.id === edit) : undefined;

  const [type, setType] = useState<TxType>("transfer");
  const [date, setDate] = useState(todayISO());
  const [nominal, setNominal] = useState(0);
  const [admin, setAdmin] = useState(0);
  const [bank, setBank] = useState("");
  const [agentBank, setAgentBank] = useState("");
  const [kategori, setKategori] = useState("Pulsa");
  const [produk, setProduk] = useState("");
  const [modal, setModal] = useState(0);
  const [jual, setJual] = useState(0);
  const [note, setNote] = useState("");
  const [payStatus, setPayStatus] = useState<PayStatus>("lunas");
  const [kurang, setKurang] = useState(0);

  const today = todayISO();
  const stats = useMemo(() => {
    const list = transactions.filter((t) => t.date === today);
    return {
      count: list.length,
      profit: list.reduce((a, t) => a + profitOf(t), 0),
      omzet: list.reduce((a, t) => a + omzetOf(t), 0),
    };
  }, [transactions, today]);

  const sorted = useMemo(() => {
    const tf = transactions.filter((t) => t.type === type);
    const extraNominals = [...new Set(tf.map((t) => t.nominal))].filter((n) => n > 0 && !NOMINALS.includes(n));
    const tplCounts = countBy(transactions.map(tplKey));
    const nonPpob = transactions.filter((t) => t.type !== "ppob");
    return {
      nominals: byFrequency([...NOMINALS, ...extraNominals], countBy(tf.map((t) => t.nominal))).slice(0, 8),
      banks: byFrequency(settings.customerBanks, countBy(nonPpob.map((t) => t.bank))),
      agentBanks: byFrequency(settings.agentBanks, countBy(nonPpob.map((t) => t.agentBank ?? ""))),
      kategori: byFrequency(KATEGORI, countBy(transactions.filter((t) => t.type === "ppob").map((t) => t.kategori))),
      templates: [...templates].sort((a, b) => (tplCounts.get(tplKey(b)) ?? 0) - (tplCounts.get(tplKey(a)) ?? 0)),
      customers: [...countBy(transactions.map((t) => t.note.trim()).filter(Boolean)).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([n]) => n),
    };
  }, [transactions, templates, type, settings]);

  // Saran nama pelanggan saat mengetik (dari daftar pelanggan, urut sering dipakai)
  const suggestions = useMemo(() => {
    const q = note.trim().toLowerCase();
    if (!q) return [];
    const freq = countBy(transactions.map((t) => t.note.trim().toLowerCase()).filter(Boolean));
    return customers
      .map((c) => c.name)
      .filter((n) => n.toLowerCase().includes(q) && !sameName(n, note))
      .sort((a, b) => {
        const sa = a.toLowerCase().startsWith(q) ? 0 : 1;
        const sb = b.toLowerCase().startsWith(q) ? 0 : 1;
        return sa - sb || (freq.get(b.toLowerCase()) ?? 0) - (freq.get(a.toLowerCase()) ?? 0) || a.localeCompare(b);
      })
      .slice(0, 8);
  }, [note, customers, transactions]);

  useEffect(() => {
    if (!editing) return;
    setType(editing.type);
    setDate(editing.date);
    setNominal(editing.nominal);
    setAdmin(editing.admin);
    setBank(editing.bank);
    setAgentBank(editing.agentBank ?? "");
    setKategori(editing.kategori);
    setProduk(editing.produk);
    setModal(editing.modal);
    setJual(editing.jual);
    setNote(editing.note);
    setPayStatus(editing.payStatus ?? "lunas");
    setKurang(editing.payStatus === "kurang" ? editing.debt ?? 0 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, edit]);

  const exitEdit = () => {
    reset();
    router.setParams({ edit: "" });
  };

  const changeNominal = (n: number, t: TxType = type) => {
    setNominal(n);
    setAdmin(adminFor(ranges, t, n));
  };
  const changeType = (t: TxType) => {
    setType(t);
    if (t !== "ppob") setAdmin(adminFor(ranges, t, nominal));
  };

  const draft = { type, nominal, admin, bank, agentBank, kategori, produk, modal, jual };
  const valid = type === "ppob" ? jual > 0 : nominal > 0;
  const total = type === "ppob" ? jual : nominal + admin;
  const debtAmount = payStatus === "belum" ? total : payStatus === "kurang" ? kurang : 0;

  const payFields = () => {
    if (payStatus === "lunas") return { payStatus: undefined, debt: undefined, paid: undefined, paidOffAt: undefined, debtCleared: undefined };
    const prevPaid = editing?.debt ? Math.min(editing.paid ?? 0, debtAmount) : 0;
    return {
      payStatus,
      debt: debtAmount,
      paid: prevPaid,
      paidOffAt: prevPaid >= debtAmount ? editing?.paidOffAt ?? new Date().toISOString() : undefined,
      debtCleared: undefined,
    };
  };

  const reset = () => {
    setNominal(0);
    setAdmin(0);
    setBank("");
    setAgentBank("");
    setProduk("");
    setModal(0);
    setJual(0);
    setNote("");
    setPayStatus("lunas");
    setKurang(0);
  };

  const save = () => {
    if (!valid) return toast(type === "ppob" ? "Isi harga jual dulu" : "Isi nominal dulu", "err");
    if (payStatus !== "lunas" && !note.trim()) return toast("Isi nama pelanggan untuk transaksi hutang", "err");
    if (payStatus === "kurang" && kurang <= 0) return toast("Isi nominal kurang bayar dulu", "err");
    if (payStatus === "kurang" && kurang > total) return toast("Kurang bayar melebihi total bayar", "err");
    if (editing) {
      updateTx({ ...editing, ...draft, ...payFields(), date, note: note.trim() });
      toast("Perubahan transaksi disimpan");
      exitEdit();
      router.navigate("/riwayat");
      return;
    }
    addTx({ ...draft, ...payFields(), id: uid(), date, note: note.trim(), createdAt: new Date().toISOString() });
    toast(
      payStatus === "lunas"
        ? `Transaksi tersimpan · untung ${rupiah(profitOf(draft))}`
        : `Tersimpan · piutang ${note.trim()} ${rupiah(debtAmount)}`,
    );
    reset();
  };

  const saveTemplate = () => {
    if (!valid) return toast("Lengkapi form dulu sebelum simpan template", "err");
    const name =
      type === "ppob"
        ? `${kategori}${produk ? ` · ${produk}` : ""}`
        : `${TYPE_LABEL[type]} ${shortNominal(nominal)}${bankRoute(draft) ? ` ${bankRoute(draft)}` : ""}`;
    addTemplate({ ...draft, id: uid(), name });
    toast("Template Cepat disimpan");
  };

  const applyTemplate = (t: Template) => {
    setType(t.type);
    setNominal(t.nominal);
    setAdmin(t.admin);
    setBank(t.bank);
    setAgentBank(t.agentBank ?? "");
    setKategori(t.kategori);
    setProduk(t.produk);
    setModal(t.modal);
    setJual(t.jual);
    setNote("");
    toast(`Template "${t.name}" dipakai, isi nama pelanggan`);
  };

  const profit = profitOf(draft);
  const showFrequent = !note.trim() || sorted.customers.some((n) => n === note);

  return (
    <View style={s.root} testID="input-screen">
      <AppHeader />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: bottomChrome + 24 }]}
      >
        <TargetHero profit={stats.profit} count={stats.count} omzet={stats.omzet} />

        <Card>
          <Text style={s.cardTitle}>Template Cepat</Text>
          {templates.length === 0 ? (
            <Text style={s.help} testID="templates-empty">
              Belum ada template. Isi form di bawah lalu tekan &quot;Simpan jadi Template Cepat&quot;. Selanjutnya cukup tekan template dan isi nama pelanggan.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
              {sorted.templates.map((t, i) => (
                <View key={t.id} style={s.tpl}>
                  <Pressable testID={`template-apply-${i}`} onPress={() => applyTemplate(t)} style={s.tplBody}>
                    <Text style={s.tplName} numberOfLines={1}>{t.name}</Text>
                    <Text style={s.tplSub}>untung {rupiah(profitOf(t))}</Text>
                  </Pressable>
                  <Pressable testID={`template-delete-${i}`} hitSlop={8} onPress={() => deleteTemplate(t.id)} style={s.tplDel}>
                    <Lucide name="x" size={16} color={colors.muted} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </Card>

        <Card>
          {editing && (
            <View style={s.editBar} testID="edit-banner">
              <Lucide name="pencil" size={16} color={colors.onBrandSecondary} />
              <Text style={s.editText}>Mode edit transaksi</Text>
              <Pressable testID="edit-cancel-button" onPress={exitEdit} hitSlop={8} style={s.editCancel}>
                <Text style={s.editCancelText}>Batal</Text>
              </Pressable>
            </View>
          )}
          <Text style={[s.cardTitle, { marginBottom: 14 }]}>{editing ? "Edit Transaksi" : "Input Cepat"}</Text>
          <Segmented
            testPrefix="type-tab"
            value={type}
            onChange={changeType}
            options={[
              { key: "transfer", label: "Transfer" },
              { key: "tarik", label: "Tarik Tunai" },
              { key: "ppob", label: "PPOB" },
            ]}
          />

          <Label>Tanggal Transaksi</Label>
          <DateField value={date} onChange={setDate} testID="date-input" />

          {type !== "ppob" ? (
            <>
              <Label>{type === "transfer" ? "Nominal Transfer" : "Nominal Tarik Tunai"}</Label>
              <MoneyInput big value={nominal} onChange={(n) => changeNominal(n)} testID="nominal-input" />
              <ChipWrap>
                {sorted.nominals.map((n) => (
                  <Chip key={n} label={shortNominal(n)} active={nominal === n} onPress={() => changeNominal(n)} testID={`nominal-chip-${n}`} />
                ))}
              </ChipWrap>

              <Label>Biaya Admin (otomatis)</Label>
              <MoneyInput value={admin} onChange={setAdmin} testID="admin-input" />
              <Text style={s.hint}>Terisi sesuai rentang nominal, bisa diubah manual</Text>

              <Label>{type === "transfer" ? "Bank / E-Wallet Agen (pengirim)" : "Bank / E-Wallet Agen (penerima)"}</Label>
              <ChipWrap>
                {sorted.agentBanks.map((b) => (
                  <Chip key={b} label={b} active={agentBank === b} onPress={() => setAgentBank(agentBank === b ? "" : b)} testID={`agent-bank-chip-${b}`} />
                ))}
              </ChipWrap>

              <Label>{type === "transfer" ? "Bank / E-Wallet Tujuan Pelanggan" : "Bank / E-Wallet Pelanggan (sumber)"}</Label>
              <ChipWrap>
                {sorted.banks.map((b) => (
                  <Chip key={b} label={b} active={bank === b} onPress={() => setBank(bank === b ? "" : b)} testID={`bank-chip-${b}`} />
                ))}
              </ChipWrap>
              {(agentBank || bank) && (
                <Text style={s.hint} testID="bank-route-label">
                  {type === "transfer" ? "Alur: " : "Alur dana: "}
                  {bankRoute(draft)}
                </Text>
              )}
              <Text style={s.hint}>Atur daftar bank di menu Admin</Text>
            </>
          ) : (
            <>
              <Label>Kategori</Label>
              <ChipWrap>
                {sorted.kategori.map((k) => (
                  <Chip key={k} label={k} active={kategori === k} onPress={() => setKategori(k)} testID={`kategori-chip-${k}`} />
                ))}
              </ChipWrap>
              <Label>Produk / Keterangan</Label>
              <TextField value={produk} onChange={setProduk} placeholder="mis. Telkomsel 10rb" testID="produk-input" />
              <Label>Harga Modal</Label>
              <MoneyInput value={modal} onChange={setModal} testID="modal-input" />
              <Label>Harga Jual</Label>
              <MoneyInput value={jual} onChange={setJual} testID="jual-input" />
            </>
          )}

          <Label>Nama Pelanggan / Catatan</Label>
          {suggestions.length > 0 && (
            <View style={s.suggestWrap} testID="customer-suggestions">
              <Text style={s.suggestTitle}>Saran pelanggan</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
                {suggestions.map((n, i) => (
                  <Pressable
                    key={n}
                    testID={`customer-suggest-${i}`}
                    onPress={() => setNote(n)}
                    style={({ pressed }) => [s.suggest, pressed && { opacity: 0.7 }]}
                  >
                    <Lucide name="user-check" size={14} color={colors.onBrandPrimary} />
                    <Text style={s.suggestText} numberOfLines={1}>{n}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <TextField value={note} onChange={setNote} placeholder="Ketik nama, saran muncul otomatis" testID="note-input" />
          {showFrequent && sorted.customers.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
              {sorted.customers.map((n, i) => (
                <Pressable
                  key={n}
                  testID={`customer-chip-${i}`}
                  onPress={() => setNote(n)}
                  style={({ pressed }) => [s.cust, note === n && s.custActive, pressed && { opacity: 0.7 }]}
                >
                  <Lucide name="user" size={14} color={note === n ? colors.onBrandPrimary : colors.brandPrimary} />
                  <Text style={[s.custText, note === n && { color: colors.onBrandPrimary }]} numberOfLines={1}>{n}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Label>Status Bayar</Label>
          <View style={s.payRow}>
            {(
              [
                { key: "lunas", label: "Lunas", icon: "circle-check" },
                { key: "kurang", label: "Kurang Bayar", icon: "circle-minus" },
                { key: "belum", label: "Belum Bayar", icon: "circle-x" },
              ] as const
            ).map((o) => {
              const active = payStatus === o.key;
              const tone = o.key === "lunas" ? colors.brandPrimary : o.key === "kurang" ? colors.warning : colors.error;
              return (
                <Pressable
                  key={o.key}
                  testID={`pay-status-${o.key}`}
                  onPress={() => setPayStatus(o.key)}
                  style={({ pressed }) => [s.payBtn, active && { backgroundColor: tone, borderColor: tone }, pressed && { opacity: 0.75 }]}
                >
                  <Lucide name={o.icon} size={16} color={active ? colors.onBrandPrimary : tone} />
                  <Text style={[s.payText, { color: active ? colors.onBrandPrimary : tone }]} numberOfLines={1}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {payStatus === "kurang" && (
            <>
              <Label>Nominal Kurang Bayar</Label>
              <MoneyInput value={kurang} onChange={setKurang} testID="kurang-bayar-input" />
              <Text style={s.hint} testID="kurang-bayar-hint">
                {kurang > total ? "Melebihi total bayar" : `Dibayar sekarang ${rupiah(Math.max(0, total - kurang))} · hutang ${rupiah(kurang)}`}
              </Text>
            </>
          )}
          {payStatus === "belum" && (
            <Text style={s.hint} testID="belum-bayar-hint">Seluruh {rupiah(total)} dicatat sebagai piutang pelanggan</Text>
          )}
          {payStatus !== "lunas" && !note.trim() && (
            <Text style={[s.hint, { color: colors.error }]}>Wajib isi nama pelanggan untuk piutang</Text>
          )}

          <View style={s.summary}>
            <View style={{ flex: 1 }}>
              <Text style={s.sumLabel}>{type === "ppob" ? "HARGA JUAL" : "TOTAL BAYAR"}</Text>
              <Text style={s.sumValue} testID="total-value">{rupiah(total)}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={s.sumLabel}>{type === "ppob" ? "LABA" : "UNTUNG (ADMIN)"}</Text>
              <Text style={[s.sumValue, { color: profit < 0 ? colors.error : colors.brandPrimary }]} testID="profit-value">
                {rupiah(profit)}
              </Text>
            </View>
          </View>
          {debtAmount > 0 && (
            <View style={s.debtBox} testID="debt-summary">
              <Text style={s.debtLabel}>PIUTANG PELANGGAN</Text>
              <Text style={s.debtValue}>{rupiah(debtAmount)}</Text>
            </View>
          )}

          <Button label={editing ? "Simpan Perubahan" : "Simpan Transaksi"} icon="check" onPress={save} testID="save-transaction-button" style={{ marginTop: 16 }} />
          {!editing && <Button
            label="Simpan jadi Template Cepat"
            icon="bookmark-plus"
            variant="outline"
            onPress={saveTemplate}
            testID="save-template-button"
            style={{ marginTop: 10 }}
          />}
        </Card>
        <Text style={s.foot}>Data tersimpan offline di HP ini · {formatNum(transactions.length)} transaksi</Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useS = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { padding: 16, gap: 16 },
  hero: { backgroundColor: c.brandPrimary, borderRadius: 20, padding: 20 },
  heroLabel: { color: c.onBrandMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  heroValue: { color: c.onBrandPrimary, fontSize: 32, fontWeight: "800", fontFamily: MONO, marginTop: 6 },
  heroSub: { color: c.onBrandMuted, fontSize: 14, marginTop: 4 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  help: { fontSize: 13, color: c.muted, marginTop: 8, lineHeight: 19 },
  hint: { fontSize: 12, color: c.muted, marginTop: 6 },
  tpl: { flexDirection: "row", alignItems: "center", backgroundColor: c.brandTertiary, borderRadius: 14, borderWidth: 1, borderColor: c.brandSecondary, maxWidth: 240 },
  tplBody: { paddingVertical: 10, paddingLeft: 14, paddingRight: 4, flexShrink: 1 },
  tplName: { fontSize: 14, fontWeight: "700", color: c.onBrandSecondary },
  tplSub: { fontSize: 12, color: c.brandPrimary, marginTop: 2 },
  tplDel: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  summary: { flexDirection: "row", marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: c.brandTertiary },
  sumLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: c.onSurfaceTertiary },
  sumValue: { fontSize: 20, fontWeight: "800", fontFamily: MONO, color: c.onSurface, marginTop: 4 },
  foot: { textAlign: "center", fontSize: 12, color: c.muted },
  cust: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: c.brandTertiary, borderWidth: 1, borderColor: c.brandSecondary, flexShrink: 0, maxWidth: 180 },
  custActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  custText: { fontSize: 13, fontWeight: "600", color: c.onBrandSecondary },
  suggestWrap: { backgroundColor: c.brandTertiary, borderRadius: 12, padding: 8, marginBottom: 8, gap: 6, borderWidth: 1, borderColor: c.brandSecondary },
  suggestTitle: { fontSize: 11, fontWeight: "700", color: c.onBrandSecondary, letterSpacing: 0.5, marginLeft: 2 },
  suggest: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: c.brandPrimary, maxWidth: 200 },
  suggestText: { fontSize: 14, fontWeight: "700", color: c.onBrandPrimary },
  payRow: { flexDirection: "row", gap: 8 },
  payBtn: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 4, paddingVertical: 6 },
  payText: { fontSize: 12, fontWeight: "800" },
  debtBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, padding: 14, borderRadius: 14, backgroundColor: "#FDECEC" },
  debtLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: c.error },
  debtValue: { fontSize: 18, fontWeight: "800", fontFamily: MONO, color: c.error },
  editBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.brandSecondary, borderRadius: 12, paddingLeft: 12, marginBottom: 14 },
  editText: { flex: 1, fontSize: 13, fontWeight: "700", color: c.onBrandSecondary },
  editCancel: { height: 40, paddingHorizontal: 14, justifyContent: "center" },
  editCancelText: { fontSize: 13, fontWeight: "700", color: c.error },
}));
