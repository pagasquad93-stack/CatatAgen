// Design tokens for CatatAgen (light theme, green brand, matching the web version).
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F6F7F4",
  onSurface: "#0F1A14",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1F2A23",
  surfaceTertiary: "#EEF0EC",
  onSurfaceTertiary: "#4B5563",
  surfaceInverse: "#0F1A14",
  onSurfaceInverse: "#FFFFFF",
  muted: "#6B7280",

  brand: "#17803D",
  onBrand: "#FFFFFF",
  brandPrimary: "#17803D",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#D7EEDF",
  onBrandSecondary: "#0F5A2A",
  brandTertiary: "#EAF6EE",
  onBrandTertiary: "#17803D",
  onBrandMuted: "#CFEBD8",

  success: "#17803D",
  onSuccess: "#FFFFFF",
  warning: "#B45309",
  onWarning: "#FFFFFF",
  error: "#DC2626",
  onError: "#FFFFFF",
  info: "#1D4ED8",
  onInfo: "#FFFFFF",

  border: "#E3E5E0",
  borderStrong: "#C9CDC6",
  divider: "#ECEEEA",
  overlay: "rgba(15,26,20,0.45)",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export const colors = light;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
