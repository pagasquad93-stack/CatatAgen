import { Lucide } from "@react-native-vector-icons/lucide";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatNum, fromISODate, longDate, parseNum, toISODate } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";

export const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

export function AppHeader() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[s.header, { paddingTop: insets.top + 10 }]} testID="app-header">
      <View style={s.logo}>
        <Lucide name="zap" size={18} color={colors.onBrandPrimary} />
      </View>
      <Text style={s.logoText}>
        Catat<Text style={{ color: colors.brandPrimary }}>Agen</Text>
      </Text>
    </View>
  );
}

export function Card({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  const s = useStyles();
  return (
    <View style={[s.card, style]} testID={testID}>
      {children}
    </View>
  );
}

export function Label({ children }: { children: string }) {
  const s = useStyles();
  return <Text style={s.label}>{children.toUpperCase()}</Text>;
}

export function MoneyInput({
  value,
  onChange,
  testID,
  big,
}: {
  value: number;
  onChange: (n: number) => void;
  testID: string;
  big?: boolean;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[s.inputBox, big && s.inputBig, focus && { borderColor: colors.brandPrimary }]}>
      <Text style={[s.rp, big && { fontSize: 18 }]}>Rp</Text>
      <TextInput
        testID={testID}
        value={value ? formatNum(value) : ""}
        onChangeText={(t) => onChange(parseNum(t))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.borderStrong}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.moneyText, big && s.moneyBig]}
      />
    </View>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  testID,
  multiline,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  testID: string;
  multiline?: boolean;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      multiline={multiline}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={[s.inputBox, s.textInput, multiline && s.multi, focus && { borderColor: colors.brandPrimary }]}
    />
  );
}

export function DateField({ value, onChange, testID }: { value: string; onChange: (s: string) => void; testID: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  if (Platform.OS === "web") {
    return (
      <View style={s.inputBox}>
        <Lucide name="calendar" size={18} color={colors.muted} />
        <TextInput testID={testID} value={value} onChangeText={onChange} style={[s.textPlain, { marginLeft: 10 }]} />
      </View>
    );
  }
  return (
    <>
      <Pressable testID={testID} onPress={() => setOpen(true)} style={s.inputBox}>
        <Lucide name="calendar" size={18} color={colors.muted} />
        <Text style={[s.textPlain, { marginLeft: 10 }]}>{longDate(value)}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={fromISODate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === "set" && d) onChange(toISODate(d));
          }}
        />
      )}
    </>
  );
}

export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID: string;
}) {
  const s = useStyles();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [s.chip, active && s.chipActive, pressed && { opacity: 0.7 }]}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>{children}</View>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testPrefix,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  testPrefix: string;
}) {
  const s = useStyles();
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          testID={`${testPrefix}-${o.key}`}
          onPress={() => onChange(o.key)}
          style={[s.segItem, value === o.key && s.segActive]}
        >
          <Text style={[s.segText, value === o.key && s.segTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  testID,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  icon?: React.ComponentProps<typeof Lucide>["name"];
  testID: string;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const fg = variant === "primary" ? colors.onBrandPrimary : variant === "danger" ? colors.error : colors.brandPrimary;
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        variant === "primary" ? s.btnPrimary : s.btnOutline,
        variant === "danger" && { borderColor: colors.error },
        (pressed || disabled) && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {icon && <Lucide name={icon} size={18} color={fg} />}
      <Text style={[s.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.overlay} onPress={onCancel} testID="confirm-overlay">
        <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
          <Text style={s.sheetTitle}>{title}</Text>
          <Text style={s.sheetMsg}>{message}</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            <Button label="Batal" variant="outline" onPress={onCancel} testID="confirm-cancel-button" style={{ flex: 1 }} />
            <Button label={confirmLabel} onPress={onConfirm} testID="confirm-ok-button" style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const s = useStyles();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

export const useStyles = makeStyles((c) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: c.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  logo: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 18, fontWeight: "800", color: c.onSurface, letterSpacing: -0.3 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16 },
  label: { fontSize: 11, fontWeight: "700", color: c.onSurfaceTertiary, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: c.surfaceSecondary,
  },
  inputBig: { minHeight: 56 },
  rp: { fontSize: 14, color: c.muted, marginRight: 8, fontWeight: "500" },
  moneyText: { flex: 1, fontSize: 16, fontFamily: MONO, fontWeight: "700", color: c.onSurface, paddingVertical: 10 },
  moneyBig: { fontSize: 22 },
  textInput: { fontSize: 15, color: c.onSurface, paddingVertical: 10 },
  multi: { minHeight: 72, textAlignVertical: "top" },
  textPlain: { flex: 1, fontSize: 15, color: c.onSurface },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontSize: 13, fontWeight: "600", color: c.onSurfaceSecondary },
  chipTextActive: { color: c.onBrandPrimary },
  seg: { flexDirection: "row", backgroundColor: c.surfaceTertiary, borderRadius: 14, padding: 4 },
  segItem: { flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  segActive: { backgroundColor: c.surfaceSecondary, shadowColor: c.onSurface, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 14, fontWeight: "600", color: c.muted },
  segTextActive: { color: c.brandPrimary },
  btn: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  btnPrimary: { backgroundColor: c.brandPrimary },
  btnOutline: { backgroundColor: c.surfaceSecondary, borderWidth: 1.5, borderColor: c.brandPrimary },
  btnText: { fontSize: 15, fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: c.onSurface },
  sheetMsg: { fontSize: 14, color: c.muted, marginTop: 6, lineHeight: 20 },
  title: { fontSize: 26, fontWeight: "800", color: c.onSurface, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: c.muted, marginTop: 4, lineHeight: 20 },
}));

export function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: "center" }} style={{ flexGrow: 0, height: 56 }}>
      {children}
    </ScrollView>
  );
}
