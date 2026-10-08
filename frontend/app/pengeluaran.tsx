import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, Chip, ChipWrap, ConfirmSheet, DateField, Label, MONO, MoneyInput, TextField } from "@/src/components/ui";
import { longDate, rupiah, todayISO, uid } from "@/src/format";
import { periodOf } from "@/src/report";
import { Expense, EXPENSE_CATEGORIES, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

export default function PengeluaranScreen() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses, addExpense, deleteExpense, toast } = useStore();
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [toDelete, setToDelete] = useState<Expense | null>(null);

  const month = periodOf("month", todayISO());
  const monthTotal = useMemo(
    () => expenses.filter((e) => e.date >= month.start && e.date <= month.end).reduce((a, e) => a + e.amount, 0),
    [expenses, month.start, month.end],
  );
  const sorted = useMemo(
    () => [...expenses].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date))),
    [expenses],
  );

  const save = () => {
    if (!amount) return toast("Isi jumlah pengeluaran dulu", "err");
    addExpense({ id: uid(), date, category, amount, note: note.trim(), createdAt: new Date().toISOString() });
    toast(`Pengeluaran ${rupiah(amount)} disimpan`);
    setAmount(0);
    setNote("");
  };

  return (
    <View style={s.root} testID="pengeluaran-screen">
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="pengeluaran-back-button" onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Lucide name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={s.headerTitle}>Pengeluaran Operasional</Text>
      </View>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}
      >
        <View style={s.hero}>
          <Text style={s.heroLabel}>PENGELUARAN {month.label.toUpperCase()}</Text>
          <Text style={s.heroValue} testID="month-expense-total">{rupiah(monthTotal)}</Text>
        </View>

        <Card>
          <Text style={s.cardTitle}>Catat Pengeluaran</Text>
          <Label>Tanggal</Label>
          <DateField value={date} onChange={setDate} testID="expense-date-input" />
          <Label>Kategori</Label>
          <ChipWrap>
            {EXPENSE_CATEGORIES.map((c) => (
              <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} testID={`expense-cat-${c}`} />
            ))}
          </ChipWrap>
          <Label>Jumlah</Label>
          <MoneyInput big value={amount} onChange={setAmount} testID="expense-amount-input" />
          <Label>Catatan (opsional)</Label>
          <TextField value={note} onChange={setNote} placeholder="mis. token listrik toko" testID="expense-note-input" />
          <Button label="Simpan Pengeluaran" icon="check" onPress={save} testID="expense-save-button" style={{ marginTop: 16 }} />
        </Card>

        <Text style={s.section}>Riwayat Pengeluaran</Text>
        {sorted.length === 0 ? (
          <Text style={s.empty} testID="expenses-empty">Belum ada pengeluaran</Text>
        ) : (
          sorted.map((e) => (
            <View key={e.id} style={s.row} testID={`expense-item-${e.id}`}>
              <View style={s.icon}>
                <Lucide name="receipt" size={18} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{e.category}</Text>
                <Text style={s.rowSub} numberOfLines={1}>
                  {longDate(e.date)}{e.note ? ` · ${e.note}` : ""}
                </Text>
              </View>
              <Text style={s.rowAmount}>-{rupiah(e.amount)}</Text>
              <Pressable testID={`expense-delete-${e.id}`} hitSlop={8} onPress={() => setToDelete(e)} style={s.del}>
                <Lucide name="trash-2" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))
        )}
      </KeyboardAwareScrollView>
      <ConfirmSheet
        visible={!!toDelete}
        title="Hapus pengeluaran?"
        message="Pengeluaran ini akan dihapus permanen dari HP ini."
        confirmLabel="Hapus"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteExpense(toDelete.id);
          setToDelete(null);
          toast("Pengeluaran dihapus");
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
  hero: { backgroundColor: c.surfaceInverse, borderRadius: 20, padding: 20 },
  heroLabel: { color: c.onBrandMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  heroValue: { color: c.onSurfaceInverse, fontSize: 28, fontWeight: "800", fontFamily: MONO, marginTop: 6 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  section: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  empty: { fontSize: 14, color: c.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  rowSub: { fontSize: 12, color: c.muted, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: "800", color: c.error, fontFamily: MONO },
  del: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
}));
