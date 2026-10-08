import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader, Button, Card, ScreenTitle, Segmented, TextField } from "@/src/components/ui";
import { todayISO } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { AdminRange, Expense, Template, Tx, useStore } from "@/src/store";
import { makeStyles } from "@/src/theme";

type Mode = "merge" | "replace";

export default function BackupScreen() {
  const s = useS();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { transactions, templates, ranges, expenses, replaceAll, toast } = useStore();
  const [mode, setMode] = useState<Mode>("merge");
  const [text, setText] = useState("");

  const backupJson = () =>
    JSON.stringify({ app: "CatatAgen", version: 2, exportedAt: new Date().toISOString(), transactions, templates, adminRanges: ranges, expenses });

  const download = async () => {
    const json = backupJson();
    const name = `catatagen-backup-${todayISO()}.json`;
    try {
      if (Platform.OS === "web") {
        const doc = (globalThis as any).document;
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const a = doc.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.cache, name);
        if (file.exists) file.delete();
        file.create();
        file.write(json);
        await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Simpan / kirim file backup" });
      }
      toast("File backup siap");
    } catch {
      toast("Gagal membuat file backup", "err");
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(backupJson());
    toast("Backup disalin, tempel di WhatsApp/catatan");
  };

  const restore = (raw: string) => {
    let data: { transactions?: Tx[]; templates?: Template[]; adminRanges?: AdminRange[]; expenses?: Expense[] };
    try {
      const parsed = JSON.parse(raw.trim());
      data = Array.isArray(parsed) ? { transactions: parsed } : parsed;
      if (!Array.isArray(data.transactions)) throw new Error("invalid");
    } catch {
      return toast("Format backup tidak valid", "err");
    }
    const inTx = data.transactions ?? [];
    const inTpl = data.templates ?? [];
    const inExp = data.expenses ?? [];
    if (mode === "replace") {
      replaceAll({ transactions: inTx, templates: inTpl, ranges: data.adminRanges?.length ? data.adminRanges : ranges, expenses: inExp });
    } else {
      const txIds = new Set(transactions.map((t) => t.id));
      const tplIds = new Set(templates.map((t) => t.id));
      const expIds = new Set(expenses.map((e) => e.id));
      replaceAll({
        transactions: [...transactions, ...inTx.filter((t) => !txIds.has(t.id))],
        templates: [...templates, ...inTpl.filter((t) => !tplIds.has(t.id))],
        ranges,
        expenses: [...expenses, ...inExp.filter((e) => !expIds.has(e.id))],
      });
    }
    setText("");
    toast(`Berhasil memulihkan ${inTx.length} transaksi`);
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    try {
      const asset = res.assets[0];
      const content = Platform.OS === "web" ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
      restore(content);
    } catch {
      toast("Gagal membaca file", "err");
    }
  };

  return (
    <View style={s.root} testID="backup-screen">
      <AppHeader />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomChrome + 24 }}
      >
        <ScreenTitle
          title="Backup & Pindah HP"
          subtitle={`Data tersimpan di HP ini (${transactions.length} transaksi). Backup untuk dipindah ke HP lain.`}
        />
        <Card>
          <Text style={s.cardTitle}>1. Simpan Backup</Text>
          <Button label="Unduh File Backup (.json)" icon="download" onPress={download} testID="backup-download-button" style={{ marginTop: 14 }} />
          <Button label="Salin sebagai Teks" icon="copy" variant="outline" onPress={copy} testID="backup-copy-button" style={{ marginTop: 10 }} />
        </Card>
        <Card>
          <Text style={[s.cardTitle, { marginBottom: 14 }]}>2. Pulihkan di HP Lain</Text>
          <Segmented
            testPrefix="restore-mode"
            value={mode}
            onChange={setMode}
            options={[
              { key: "merge", label: "Gabungkan" },
              { key: "replace", label: "Ganti Semua" },
            ]}
          />
          <Text style={s.help}>
            {mode === "merge" ? "Data backup ditambahkan ke data yang sudah ada." : "Semua data di HP ini diganti dengan isi backup."}
          </Text>
          <Button label="Pilih File Backup" icon="upload" onPress={pickFile} testID="restore-file-button" style={{ marginTop: 14 }} />
          <View style={{ marginTop: 14 }}>
            <TextField value={text} onChange={setText} placeholder="Tempel teks backup di sini" multiline testID="restore-text-input" />
          </View>
          <Button
            label="Pulihkan dari Teks"
            icon="clipboard-paste"
            variant="outline"
            onPress={() => (text.trim() ? restore(text) : toast("Tempel teks backup dulu", "err"))}
            testID="restore-text-button"
            style={{ marginTop: 10 }}
          />
        </Card>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useS = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  cardTitle: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  help: { fontSize: 13, color: c.muted, marginTop: 10, lineHeight: 19 },
}));
