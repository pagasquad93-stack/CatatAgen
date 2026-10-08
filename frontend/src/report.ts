import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import * as XLSX from "xlsx";

import { fromISODate, longDate, MONTHS, toISODate } from "@/src/format";
import { Expense, omzetOf, profitOf, Tx, TxType, TYPE_LABEL } from "@/src/store";

export type Mode = "day" | "week" | "month" | "year";

const SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function periodOf(mode: Mode, ref: string) {
  const d = fromISODate(ref);
  let start = new Date(d);
  let end = new Date(d);
  if (mode === "week") {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    start.setDate(d.getDate() - dow);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (mode === "month") {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  } else if (mode === "year") {
    start = new Date(d.getFullYear(), 0, 1);
    end = new Date(d.getFullYear(), 11, 31);
  }
  const label =
    mode === "day"
      ? longDate(ref)
      : mode === "week"
        ? `${start.getDate()} ${SHORT[start.getMonth()]} – ${end.getDate()} ${SHORT[end.getMonth()]} ${end.getFullYear()}`
        : mode === "month"
          ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
          : String(d.getFullYear());
  return { start: toISODate(start), end: toISODate(end), label };
}

export function shiftRef(mode: Mode, ref: string, dir: number) {
  const n = fromISODate(ref);
  if (mode === "day") n.setDate(n.getDate() + dir);
  else if (mode === "week") n.setDate(n.getDate() + 7 * dir);
  else if (mode === "month") n.setMonth(n.getMonth() + dir, 1);
  else n.setFullYear(n.getFullYear() + dir, 0, 1);
  return toISODate(n);
}

export const hourOf = (t: Tx) => new Date(t.createdAt).getHours();

export function buildReport(transactions: Tx[], expenses: Expense[], start: string, end: string) {
  const inRange = (d: string) => d >= start && d <= end;
  const list = transactions.filter((t) => inRange(t.date));
  const exp = expenses.filter((e) => inRange(e.date));
  const per: Record<TxType, { count: number; profit: number; omzet: number }> = {
    transfer: { count: 0, profit: 0, omzet: 0 },
    tarik: { count: 0, profit: 0, omzet: 0 },
    ppob: { count: 0, profit: 0, omzet: 0 },
  };
  const hours = Array.from({ length: 24 }, () => ({ count: 0, profit: 0 }));
  list.forEach((t) => {
    per[t.type].count++;
    per[t.type].profit += profitOf(t);
    per[t.type].omzet += omzetOf(t);
    const h = hourOf(t);
    hours[h].count++;
    hours[h].profit += profitOf(t);
  });
  const profit = list.reduce((a, t) => a + profitOf(t), 0);
  const expenseTotal = exp.reduce((a, e) => a + e.amount, 0);
  const expByCat = new Map<string, number>();
  exp.forEach((e) => expByCat.set(e.category, (expByCat.get(e.category) ?? 0) + e.amount));
  const byProfit = [...list].sort((a, b) => profitOf(b) - profitOf(a));
  return {
    list,
    exp,
    count: list.length,
    profit,
    omzet: list.reduce((a, t) => a + omzetOf(t), 0),
    per,
    hours,
    expenseTotal,
    expByCat: [...expByCat.entries()].sort((a, b) => b[1] - a[1]),
    net: profit - expenseTotal,
    top: byProfit.slice(0, 5),
    bottom: [...byProfit].reverse().slice(0, 5),
  };
}

export type Report = ReturnType<typeof buildReport>;

export const txTitle = (t: Tx) =>
  t.type === "ppob" ? `${t.kategori}${t.produk ? ` · ${t.produk}` : ""}` : `${TYPE_LABEL[t.type]}${t.bank ? ` · ${t.bank}` : ""}`;

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export async function exportXlsx(r: Report, label: string, start: string, end: string) {
  const wb = XLSX.utils.book_new();
  const summary = [
    ["Laporan CatatAgen"],
    ["Periode", label],
    ["Dari", start, "Sampai", end],
    [],
    ["Jumlah Transaksi", r.count],
    ["Total Omzet", r.omzet],
    ["Laba Kotor", r.profit],
    ["Pengeluaran Operasional", r.expenseTotal],
    ["Laba Bersih", r.net],
    [],
    ["Jenis", "Jumlah", "Omzet", "Laba"],
    ...(Object.keys(r.per) as TxType[]).map((k) => [TYPE_LABEL[k], r.per[k].count, r.per[k].omzet, r.per[k].profit]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Ringkasan");

  const txRows = [...r.list]
    .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt))
    .map((t) => ({
      Tanggal: t.date,
      Jam: new Date(t.createdAt).toTimeString().slice(0, 5),
      Jenis: TYPE_LABEL[t.type],
      "Bank/Kategori": t.type === "ppob" ? t.kategori : t.bank,
      Produk: t.produk,
      Nominal: t.type === "ppob" ? 0 : t.nominal,
      Admin: t.type === "ppob" ? 0 : t.admin,
      Modal: t.type === "ppob" ? t.modal : 0,
      "Harga Jual": t.type === "ppob" ? t.jual : 0,
      "Total Bayar": omzetOf(t),
      Laba: profitOf(t),
      Pelanggan: t.note,
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows.length ? txRows : [{ Info: "Tidak ada transaksi" }]), "Transaksi");

  const expRows = r.exp.map((e) => ({ Tanggal: e.date, Kategori: e.category, Jumlah: e.amount, Catatan: e.note }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows.length ? expRows : [{ Info: "Tidak ada pengeluaran" }]), "Pengeluaran");

  const hourRows = r.hours.map((h, i) => ({ Jam: `${hh(i)} - ${hh((i + 1) % 24)}`, Transaksi: h.count, Laba: h.profit }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hourRows), "Jam Ramai");

  const rank = (list: Tx[]) => list.map((t, i) => ({ No: i + 1, Tanggal: t.date, Transaksi: txTitle(t), Pelanggan: t.note, Laba: profitOf(t) }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.top.length ? rank(r.top) : [{ Info: "-" }]), "Laba Terbesar");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.bottom.length ? rank(r.bottom) : [{ Info: "-" }]), "Laba Terendah");

  const name = `laporan-catatagen-${start}_${end}.xlsx`;
  const data: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (Platform.OS === "web") {
    const doc = (globalThis as any).document;
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const a = doc.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(data));
  await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: "Simpan / kirim laporan Excel", UTI: "org.openxmlformats.spreadsheetml.sheet" });
}
