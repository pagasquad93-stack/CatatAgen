export const formatNum = (n: number) =>
  String(Math.round(Math.abs(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const rupiah = (n: number) => `${n < 0 ? "-" : ""}Rp ${formatNum(n)}`;

export const parseNum = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d ? parseInt(d, 10) : 0;
};

const pad = (n: number) => String(n).padStart(2, "0");

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

export const fromISODate = (s: string) => {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
};

export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const longDate = (s: string) => {
  const d = fromISODate(s);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const shortNominal = (n: number) => (n >= 1000000 ? `${n / 1000000}jt` : `${n / 1000}rb`);

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
