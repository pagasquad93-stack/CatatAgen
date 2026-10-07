import { Lucide } from "@react-native-vector-icons/lucide";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader, Button, Card, Chip, ChipWrap, DateField, Label, MONO, MoneyInput, Segmented, TextField } from "@/src/components/ui";
import { formatNum, rupiah, shortNominal, todayISO, uid } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { adminFor, omzetOf, profitOf, Template, TxType, TYPE_LABEL, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const NOMINALS = [50000, 100000, 200000, 300000, 500000, 1000000, 1500000, 2000000];
const BANKS = ["BCA", "BRI", "Mandiri", "BNI", "BSI", "DANA", "OVO", "GoPay", "ShopeePay"];
const KATEGORI = ["Pulsa", "Paket Data", "Token PLN", "Tagihan PLN", "PDAM", "BPJS", "Game", "E-Wallet", "Lainnya"];

export default function InputScreen() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { transactions, templates, ranges, addTx, addTemplate, deleteTemplate, toast } = useStore();

  const [type, setType] = useState<TxType>("transfer");
  const [date, setDate] = useState(todayISO());
  const [nominal, setNominal] = useState(0);
  const [admin, setAdmin] = useState(0);
  const [bank, setBank] = useState("");
  const [kategori, setKategori] = useState("Pulsa");
  const [produk, setProduk] = useState("");
  const [modal, setModal] = useState(0);
  const [jual, setJual] = useState(0);
  const [note, setNote] = useState("");

  const today = todayISO();
  const stats = useMemo(() => {
    const list = transactions.filter((t) => t.date === today);
    return {
      count: list.length,
      profit: list.reduce((a, t) => a + profitOf(t), 0),
      omzet: list.reduce((a, t) => a + omzetOf(t), 0),
    };
  }, [transactions, today]);

  const changeNominal = (n: number, t: TxType = type) => {
    setNominal(n);
    setAdmin(adminFor(ranges, t, n));
  };
  const changeType = (t: TxType) => {
    setType(t);
    if (t !== "ppob") setAdmin(adminFor(ranges, t, nominal));
  };

  const draft = { type, nominal, admin, bank, kategori, produk, modal, jual };
  const valid = type === "ppob" ? jual > 0 : nominal > 0;

  const reset = () => {
    setNominal(0);
    setAdmin(0);
    setBank("");
    setProduk("");
    setModal(0);
    setJual(0);
    setNote("");
  };

  const save = () => {
    if (!valid) return toast(type === "ppob" ? "Isi harga jual dulu" : "Isi nominal dulu", "err");
    addTx({ ...draft, id: uid(), date, note: note.trim(), createdAt: new Date().toISOString() });
    toast(`Transaksi tersimpan · untung ${rupiah(profitOf(draft))}`);
    reset();
  };

  const saveTemplate = () => {
    if (!valid) return toast("Lengkapi form dulu sebelum simpan template", "err");
    const name =
      type === "ppob"
        ? `${kategori}${produk ? ` · ${produk}` : ""}`
        : `${TYPE_LABEL[type]} ${shortNominal(nominal)}${bank ? ` ${bank}` : ""}`;
    addTemplate({ ...draft, id: uid(), name });
    toast("Template Cepat disimpan");
  };

  const applyTemplate = (t: Template) => {
    setType(t.type);
    setNominal(t.nominal);
    setAdmin(t.admin);
    setBank(t.bank);
    setKategori(t.kategori);
    setProduk(t.produk);
    setModal(t.modal);
    setJual(t.jual);
    setNote("");
    toast(`Template "${t.name}" dipakai, isi nama pelanggan`);
  };

  const total = type === "ppob" ? jual : nominal + admin;
  const profit = profitOf(draft);

  return (
    <View style={s.root} testID="input-screen">
      <AppHeader />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: bottomChrome + 24 }]}
      >
        <View style={s.hero} testID="today-profit-card">
          <Text style={s.heroLabel}>UNTUNG HARI INI</Text>
          <Text style={s.heroValue} testID="today-profit-value">{rupiah(stats.profit)}</Text>
          <Text style={s.heroSub} testID="today-summary">
            {stats.count} transaksi · omzet {rupiah(stats.omzet)}
          </Text>
        </View>

        <Card>
          <Text style={s.cardTitle}>Template Cepat</Text>
          {templates.length === 0 ? (
            <Text style={s.help} testID="templates-empty">
              Belum ada template. Isi form di bawah lalu tekan &quot;Simpan jadi Template Cepat&quot;. Selanjutnya cukup tekan template dan isi nama pelanggan.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
              {templates.map((t, i) => (
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
          <Text style={[s.cardTitle, { marginBottom: 14 }]}>Input Cepat</Text>
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
                {NOMINALS.map((n) => (
                  <Chip key={n} label={shortNominal(n)} active={nominal === n} onPress={() => changeNominal(n)} testID={`nominal-chip-${n}`} />
                ))}
              </ChipWrap>

              <Label>Biaya Admin (otomatis)</Label>
              <MoneyInput value={admin} onChange={setAdmin} testID="admin-input" />
              <Text style={s.hint}>Terisi sesuai rentang nominal, bisa diubah manual</Text>

              <Label>Bank / E-Wallet (opsional)</Label>
              <ChipWrap>
                {BANKS.map((b) => (
                  <Chip key={b} label={b} active={bank === b} onPress={() => setBank(bank === b ? "" : b)} testID={`bank-chip-${b}`} />
                ))}
              </ChipWrap>
            </>
          ) : (
            <>
              <Label>Kategori</Label>
              <ChipWrap>
                {KATEGORI.map((k) => (
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
          <TextField value={note} onChange={setNote} placeholder="mis. Bu Sari" testID="note-input" />

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

          <Button label="Simpan Transaksi" icon="check" onPress={save} testID="save-transaction-button" style={{ marginTop: 16 }} />
          <Button
            label="Simpan jadi Template Cepat"
            icon="bookmark-plus"
            variant="outline"
            onPress={saveTemplate}
            testID="save-template-button"
            style={{ marginTop: 10 }}
          />
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
}));
