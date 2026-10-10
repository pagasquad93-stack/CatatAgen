import React, { useEffect, useState } from "react";
import { Modal, Pressable, Text, View, ViewStyle } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Label, MONO, MoneyInput } from "@/src/components/ui";
import { rupiah } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";

export function LunasStamp({ small, style, testID }: { small?: boolean; style?: ViewStyle; testID?: string }) {
  const s = useS();
  return (
    <View style={[s.stamp, small && s.stampSmall, style]} testID={testID}>
      <Text style={[s.stampText, small && { fontSize: 11 }]}>LUNAS</Text>
    </View>
  );
}

export function StatusBadge({ label, kind, testID }: { label: string; kind: "warn" | "err" | "ok"; testID?: string }) {
  const s = useS();
  const { colors } = useTheme();
  const fg = kind === "ok" ? colors.brandPrimary : kind === "err" ? colors.error : colors.warning;
  const bg = kind === "ok" ? colors.brandTertiary : kind === "err" ? "#FDECEC" : "#FDF3E7";
  return (
    <View style={[s.badge, { backgroundColor: bg }]} testID={testID}>
      <Text style={[s.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function CicilSheet({
  visible,
  name,
  remaining,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  name: string;
  remaining: number;
  onCancel: () => void;
  onSubmit: (amount: number) => void;
}) {
  const s = useS();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState(0);
  useEffect(() => {
    if (visible) setAmount(0);
  }, [visible]);
  const over = amount > remaining;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={s.overlay} onPress={onCancel} testID="cicil-overlay">
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <Text style={s.sheetTitle}>Cicil Bayar · {name}</Text>
            <Text style={s.sheetMsg}>
              Sisa hutang <Text style={s.strong}>{rupiah(remaining)}</Text>. Pembayaran dipotong ke hutang paling lama dulu.
            </Text>
            <Label>Nominal Dibayar</Label>
            <MoneyInput big value={amount} onChange={setAmount} testID="cicil-amount-input" />
            {amount > 0 && (
              <Text style={[s.hint, over && s.err]} testID="cicil-remaining-after">
                {over ? "Melebihi sisa hutang" : `Sisa setelah dibayar: ${rupiah(remaining - amount)}`}
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <Button label="Batal" variant="outline" onPress={onCancel} testID="cicil-cancel-button" style={{ flex: 1 }} />
              <Button
                label="Simpan Cicilan"
                icon="check"
                disabled={!amount || over}
                onPress={() => onSubmit(amount)}
                testID="cicil-submit-button"
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function HBarChart({ data, format, testID }: { data: { label: string; value: number }[]; format: (n: number) => string; testID?: string }) {
  const s = useS();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 12, marginTop: 14 }} testID={testID}>
      {data.map((d, i) => (
        <View key={d.label} testID={`${testID}-row-${i}`}>
          <View style={s.barHead}>
            <Text style={s.barLabel} numberOfLines={1}>
              {i + 1}. {d.label}
            </Text>
            <Text style={s.barValue}>{format(d.value)}</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.max(4, (d.value / max) * 100)}%`, opacity: 1 - i * 0.14 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const useS = makeStyles((c) => ({
  stamp: {
    borderWidth: 2,
    borderColor: c.brandPrimary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    transform: [{ rotate: "-12deg" }],
    alignSelf: "flex-start",
    backgroundColor: "rgba(23,128,61,0.06)",
  },
  stampSmall: { borderWidth: 1.5, paddingHorizontal: 6, paddingVertical: 1 },
  stampText: { fontSize: 14, fontWeight: "900", letterSpacing: 2, color: c.brandPrimary },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "800" },
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  sheetMsg: { fontSize: 14, color: c.muted, marginTop: 6, lineHeight: 20 },
  strong: { fontWeight: "800", color: c.error },
  hint: { fontSize: 12, color: c.muted, marginTop: 6 },
  err: { color: c.error, fontWeight: "700" },
  barHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  barLabel: { flex: 1, fontSize: 13, fontWeight: "700", color: c.onSurface },
  barValue: { fontSize: 13, fontWeight: "800", fontFamily: MONO, color: c.error },
  track: { height: 14, borderRadius: 7, backgroundColor: c.surfaceTertiary, marginTop: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 7, backgroundColor: c.error },
}));
