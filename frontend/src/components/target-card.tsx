import { Lucide } from "@react-native-vector-icons/lucide";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Chip, ChipWrap, MONO, MoneyInput } from "@/src/components/ui";
import { rupiah, shortNominal } from "@/src/format";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const PRESETS = [50000, 100000, 150000, 200000, 300000, 500000];

export function TargetHero({ profit, count, omzet }: { profit: number; count: number; omzet: number }) {
  const s = useS();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, saveSettings, toast } = useStore();
  const target = settings.dailyTarget;
  const pct = target > 0 ? Math.max(0, Math.round((profit / target) * 100)) : 0;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(target);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(100, pct), duration: 600, useNativeDriver: false }).start();
  }, [pct, anim]);

  const remaining = Math.max(0, target - profit);

  return (
    <View style={s.hero} testID="today-profit-card">
      <View style={s.topRow}>
        <Text style={s.heroLabel}>UNTUNG HARI INI</Text>
        <Pressable
          testID="target-edit-button"
          hitSlop={8}
          onPress={() => {
            setDraft(target);
            setOpen(true);
          }}
          style={s.editBtn}
        >
          <Lucide name="target" size={14} color={colors.onBrandPrimary} />
          <Text style={s.editText}>Atur Target</Text>
        </Pressable>
      </View>
      <Text style={s.heroValue} testID="today-profit-value">{rupiah(profit)}</Text>
      <Text style={s.heroSub} testID="today-summary">
        {count} transaksi · omzet {rupiah(omzet)}
      </Text>

      {target > 0 && (
        <View style={{ marginTop: 16 }}>
          <View style={s.progRow}>
            <Text style={s.progLabel} testID="target-label">Target {rupiah(target)}</Text>
            <Text style={s.pct} testID="target-percent">{pct}%</Text>
          </View>
          <View style={s.track}>
            <Animated.View
              style={[s.fill, { width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]}
            />
          </View>
          <Text style={s.progHint} testID="target-remaining">
            {remaining > 0 ? `Kurang ${rupiah(remaining)} lagi` : "Target hari ini tercapai!"}
          </Text>
        </View>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <Pressable style={s.overlay} onPress={() => setOpen(false)} testID="target-overlay">
            <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
              <Text style={s.sheetTitle}>Target Laba Harian</Text>
              <Text style={s.sheetMsg}>Progress bar di depan menghitung persen untung hari ini dari target ini.</Text>
              <View style={{ marginTop: 16 }}>
                <MoneyInput big value={draft} onChange={setDraft} testID="target-input" />
              </View>
              <ChipWrap>
                {PRESETS.map((p) => (
                  <Chip key={p} label={shortNominal(p)} active={draft === p} onPress={() => setDraft(p)} testID={`target-chip-${p}`} />
                ))}
              </ChipWrap>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                <Button label="Batal" variant="outline" onPress={() => setOpen(false)} testID="target-cancel-button" style={{ flex: 1 }} />
                <Button
                  label="Simpan"
                  onPress={() => {
                    saveSettings({ ...settings, dailyTarget: draft });
                    setOpen(false);
                    toast(draft ? `Target harian ${rupiah(draft)} disimpan` : "Target harian dimatikan");
                  }}
                  testID="target-save-button"
                  style={{ flex: 1 }}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const useS = makeStyles((c) => ({
  hero: { backgroundColor: c.brandPrimary, borderRadius: 20, padding: 20 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { color: c.onBrandMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)" },
  editText: { color: c.onBrandPrimary, fontSize: 12, fontWeight: "700" },
  heroValue: { color: c.onBrandPrimary, fontSize: 32, fontWeight: "800", fontFamily: MONO, marginTop: 6 },
  heroSub: { color: c.onBrandMuted, fontSize: 14, marginTop: 4 },
  progRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 },
  progLabel: { color: c.onBrandMuted, fontSize: 13, fontWeight: "600" },
  pct: { color: c.onBrandPrimary, fontSize: 18, fontWeight: "800", fontFamily: MONO },
  track: { height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.22)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6, backgroundColor: c.onBrandPrimary },
  progHint: { color: c.onBrandMuted, fontSize: 12, marginTop: 8 },
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  sheetMsg: { fontSize: 14, color: c.muted, marginTop: 6, lineHeight: 20 },
}));
