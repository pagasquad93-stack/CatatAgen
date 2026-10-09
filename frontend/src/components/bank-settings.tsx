import { Lucide } from "@react-native-vector-icons/lucide";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Card } from "@/src/components/ui";
import { Settings, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

function BankList({ field, title, desc }: { field: "agentBanks" | "customerBanks"; title: string; desc: string }) {
  const s = useS();
  const { colors } = useTheme();
  const { settings, saveSettings, toast } = useStore();
  const [name, setName] = useState("");
  const list = settings[field];

  const save = (v: string[]) => saveSettings({ ...settings, [field]: v } as Settings);
  const add = () => {
    const n = name.trim();
    if (!n) return;
    if (list.some((x) => x.toLowerCase() === n.toLowerCase())) return toast(`${n} sudah ada`, "err");
    save([...list, n]);
    setName("");
    toast(`${n} ditambahkan`);
  };

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={s.sub}>{title}</Text>
      <Text style={s.desc}>{desc}</Text>
      <View style={s.wrap}>
        {list.map((b) => (
          <View key={b} style={s.chip} testID={`${field}-item-${b}`}>
            <Text style={s.chipText}>{b}</Text>
            <Pressable testID={`${field}-remove-${b}`} hitSlop={8} onPress={() => save(list.filter((x) => x !== b))} style={s.x}>
              <Lucide name="x" size={14} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        {list.length === 0 && <Text style={s.desc}>Belum ada, tambahkan di bawah</Text>}
      </View>
      <View style={s.addRow}>
        <TextInput
          testID={`${field}-input`}
          value={name}
          onChangeText={setName}
          placeholder="mis. SeaBank"
          placeholderTextColor={colors.muted}
          onSubmitEditing={add}
          returnKeyType="done"
          style={s.input}
        />
        <Pressable testID={`${field}-add-button`} onPress={add} style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.7 }]}>
          <Lucide name="plus" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

export function BankSettingsCard() {
  const s = useS();
  return (
    <Card testID="bank-settings-card">
      <Text style={s.title}>Bank / E-Wallet</Text>
      <Text style={s.desc}>Tombol pilihan di Input Cepat untuk Transfer & Tarik Tunai.</Text>
      <BankList field="agentBanks" title="Milik Agen" desc="Rekening / e-wallet yang agen pakai" />
      <BankList field="customerBanks" title="Pelanggan / Tujuan" desc="Bank tujuan (transfer) atau sumber dana (tarik tunai)" />
    </Card>
  );
}

const useS = makeStyles((c) => ({
  title: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  sub: { fontSize: 14, fontWeight: "800", color: c.brandPrimary },
  desc: { fontSize: 12, color: c.muted, marginTop: 2 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { flexDirection: "row", alignItems: "center", height: 36, paddingLeft: 12, borderRadius: 18, backgroundColor: c.brandTertiary, borderWidth: 1, borderColor: c.brandSecondary },
  chipText: { fontSize: 13, fontWeight: "700", color: c.onBrandSecondary },
  x: { width: 32, height: 36, alignItems: "center", justifyContent: "center" },
  addRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  input: { flex: 1, height: 44, borderWidth: 1.5, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: c.onSurface },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
}));
