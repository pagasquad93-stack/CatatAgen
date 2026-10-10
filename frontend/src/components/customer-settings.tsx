import { Lucide } from "@react-native-vector-icons/lucide";
import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Card, ConfirmSheet } from "@/src/components/ui";
import { Customer, sameName, useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

export function CustomerSettingsCard() {
  const s = useS();
  const { colors } = useTheme();
  const { customers, transactions, addCustomer, renameCustomer, deleteCustomer, toast } = useStore();
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [toDelete, setToDelete] = useState<Customer | null>(null);

  const txCount = (n: string) => transactions.filter((t) => sameName(t.note, n)).length;
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const ranked = [...customers].sort(
      (a, b) => txCount(b.name) - txCount(a.name) || a.name.localeCompare(b.name),
    );
    return qq ? ranked.filter((c) => c.name.toLowerCase().includes(qq)) : ranked.slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, transactions, q]);

  const add = () => {
    const n = name.trim();
    if (!n) return toast("Ketik nama pelanggan dulu", "err");
    if (!addCustomer(n)) return toast(`${n} sudah ada di daftar`, "err");
    setName("");
    toast(`Pelanggan ${n} ditambahkan`);
  };

  const saveEdit = () => {
    if (!editId) return;
    const n = editName.trim();
    if (!n) return toast("Nama tidak boleh kosong", "err");
    if (!renameCustomer(editId, n)) return toast(`Nama ${n} sudah dipakai`, "err");
    setEditId(null);
    toast("Nama pelanggan diperbarui di semua transaksi");
  };

  return (
    <Card testID="customer-settings-card">
      <View style={s.headRow}>
        <Lucide name="users" size={18} color={colors.brandPrimary} />
        <Text style={s.title}>Daftar Nama Pelanggan</Text>
        <Text style={s.count}>{customers.length}</Text>
      </View>
      <Text style={s.desc}>Nama otomatis tersimpan saat diketik di transaksi. Menampilkan 10 pelanggan dengan transaksi terbanyak.</Text>

      <Text style={s.sub}>Isi Manual</Text>
      <View style={s.addRow}>
        <TextInput
          testID="customer-add-input"
          value={name}
          onChangeText={setName}
          placeholder="Nama pelanggan baru"
          placeholderTextColor={colors.muted}
          onSubmitEditing={add}
          returnKeyType="done"
          style={s.input}
        />
        <Pressable testID="customer-add-button" onPress={add} style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.7 }]}>
          <Lucide name="user-plus" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>

      {customers.length > 5 && (
        <View style={s.search}>
          <Lucide name="search" size={16} color={colors.muted} />
          <TextInput
            testID="customer-search-input"
            value={q}
            onChangeText={setQ}
            placeholder="Cari pelanggan"
            placeholderTextColor={colors.muted}
            style={s.searchInput}
          />
        </View>
      )}

      <View style={{ marginTop: 8 }}>
        {list.length === 0 && <Text style={[s.desc, { marginTop: 8 }]}>{customers.length ? "Tidak ditemukan" : "Belum ada pelanggan"}</Text>}
        {list.map((c, i) => (
          <View key={c.id} style={[s.row, i > 0 && s.border]} testID={`customer-item-${i}`}>
            {editId === c.id ? (
              <>
                <TextInput
                  testID={`customer-edit-input-${i}`}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  onSubmitEditing={saveEdit}
                  returnKeyType="done"
                  style={[s.input, { height: 40 }]}
                />
                <Pressable testID={`customer-edit-save-${i}`} onPress={saveEdit} style={s.icon} hitSlop={6}>
                  <Lucide name="check" size={20} color={colors.brandPrimary} />
                </Pressable>
                <Pressable testID={`customer-edit-cancel-${i}`} onPress={() => setEditId(null)} style={s.icon} hitSlop={6}>
                  <Lucide name="x" size={20} color={colors.muted} />
                </Pressable>
              </>
            ) : (
              <>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{c.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{c.name}</Text>
                  <Text style={s.desc}>{txCount(c.name)} transaksi</Text>
                </View>
                <Pressable
                  testID={`customer-edit-${i}`}
                  onPress={() => {
                    setEditId(c.id);
                    setEditName(c.name);
                  }}
                  style={s.icon}
                  hitSlop={6}
                >
                  <Lucide name="pencil" size={18} color={colors.brandPrimary} />
                </Pressable>
                <Pressable testID={`customer-delete-${i}`} onPress={() => setToDelete(c)} style={s.icon} hitSlop={6}>
                  <Lucide name="trash-2" size={18} color={colors.error} />
                </Pressable>
              </>
            )}
          </View>
        ))}
      </View>
      <ConfirmSheet
        visible={!!toDelete}
        title={`Hapus ${toDelete?.name ?? ""}?`}
        message="Nama dihapus dari daftar saran. Transaksi & piutang pelanggan ini tetap tersimpan."
        confirmLabel="Hapus"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteCustomer(toDelete.id);
          setToDelete(null);
          toast("Pelanggan dihapus dari daftar");
        }}
      />
    </Card>
  );
}

const useS = makeStyles((c) => ({
  headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: c.onSurface },
  count: { fontSize: 13, fontWeight: "800", color: c.brandPrimary, backgroundColor: c.brandTertiary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },
  sub: { fontSize: 14, fontWeight: "800", color: c.brandPrimary, marginTop: 14 },
  desc: { fontSize: 12, color: c.muted, marginTop: 2 },
  addRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { flex: 1, height: 44, borderWidth: 1.5, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: c.onSurface },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, marginTop: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.surfaceTertiary },
  searchInput: { flex: 1, fontSize: 14, color: c.onSurface, height: 44 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  border: { borderTopWidth: 1, borderTopColor: c.divider },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontWeight: "800", color: c.brandPrimary },
  name: { fontSize: 15, fontWeight: "700", color: c.onSurface },
  icon: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
}));
