import { Lucide } from "@react-native-vector-icons/lucide";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BankSettingsCard, PpobCategoryCard } from "@/src/components/bank-settings";
import { CustomerSettingsCard } from "@/src/components/customer-settings";
import { AppHeader, Button, Card, Label, MoneyInput, ScreenTitle } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { AdminRange, DEFAULT_RANGES, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

export default function AdminScreen() {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { ranges, saveRanges, toast } = useStore();
  const [draft, setDraft] = useState<AdminRange[]>(ranges);

  useEffect(() => setDraft(ranges), [ranges]);

  const update = (i: number, k: keyof AdminRange, v: number) =>
    setDraft((d) => d.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const add = () => {
    const last = draft[draft.length - 1];
    setDraft([...draft, { min: last ? last.max + 1 : 1, max: 0, transfer: 0, tarik: 0 }]);
  };

  const save = () => {
    const bad = draft.find((r) => r.max < r.min);
    if (bad) return toast("Nominal maks harus ≥ nominal min", "err");
    saveRanges([...draft].sort((a, b) => a.min - b.min));
    toast("Pengaturan biaya admin disimpan");
  };

  const field = (i: number, k: keyof AdminRange, label: string) => (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <MoneyInput value={draft[i][k]} onChange={(n) => update(i, k, n)} testID={`range-${i}-${k}`} />
    </View>
  );

  return (
    <View style={s.root} testID="admin-screen">
      <AppHeader />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomChrome + 24 }}
      >
        <ScreenTitle title="Atur Biaya Admin" subtitle="Admin otomatis terisi sesuai rentang nominal saat input Transfer & Tarik Tunai." />
        {draft.map((_, i) => (
          <Card key={i} testID={`range-card-${i}`}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Rentang {i + 1}</Text>
              <Pressable testID={`range-delete-${i}`} hitSlop={8} onPress={() => setDraft(draft.filter((__, j) => j !== i))} style={s.del}>
                <Lucide name="trash-2" size={18} color={colors.error} />
              </Pressable>
            </View>
            <View style={s.row}>
              {field(i, "min", "Nominal Min")}
              {field(i, "max", "Nominal Maks")}
            </View>
            <View style={s.row}>
              {field(i, "transfer", "Admin Transfer")}
              {field(i, "tarik", "Admin Tarik Tunai")}
            </View>
          </Card>
        ))}
        <View style={s.row}>
          <Button label="Tambah" icon="plus" variant="outline" onPress={add} testID="range-add-button" style={{ flex: 1 }} />
          <Button
            label="Default"
            icon="rotate-ccw"
            variant="outline"
            onPress={() => {
              setDraft(DEFAULT_RANGES);
              toast("Dikembalikan ke default, tekan Simpan");
            }}
            testID="range-default-button"
            style={{ flex: 1 }}
          />
        </View>
        <Button label="Simpan Pengaturan" icon="check" onPress={save} testID="range-save-button" />
        <BankSettingsCard />
        <PpobCategoryCard />
        <CustomerSettingsCard />
      </KeyboardAwareScrollView>
    </View>
  );
}

const useS = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  del: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: 12 },
}));
