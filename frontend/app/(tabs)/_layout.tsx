import { Lucide } from "@react-native-vector-icons/lucide";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

const TABS = [
  { name: "index", title: "Input", icon: "zap", sf: "bolt.fill" },
  { name: "riwayat", title: "Riwayat", icon: "history", sf: "clock.arrow.circlepath" },
  { name: "rekap", title: "Rekap", icon: "chart-column", sf: "chart.bar.fill" },
  { name: "admin", title: "Admin", icon: "sliders-horizontal", sf: "slider.horizontal.3" },
  { name: "backup", title: "Backup", icon: "hard-drive-download", sf: "externaldrive.fill" },
] as const;

export default function TabsLayout() {
  const { colors } = useTheme();
  if (usesNativeTabs) {
    return (
      <NativeTabs tintColor={colors.brandPrimary}>
        {TABS.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <NativeTabs.Trigger.Icon sf={t.sf} />
            <NativeTabs.Trigger.Label>{t.title}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarButtonTestID: `tab-${t.name}`,
            tabBarIcon: ({ color, size }) => <Lucide name={t.icon} size={size - 2} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
