# CatatAgen (React Native rebuild)

## Original problem statement
https://ppob-sales-tracker.emergent.host rebuild ke react nativ biar bisa deploy ke google play dan di install mandiri di hp dengan file apk

User choices: offline storage on phone only, same look as web (green CatatAgen), exact rebuild without extra features.

## Architecture
- Expo Router (SDK 57), no backend. Data in AsyncStorage via `@/src/utils/storage` (src/store.tsx context).
- Tabs: Input, Riwayat, Rekap, Admin, Backup (NativeTabs on iOS 26+, JS Tabs elsewhere).

## Implemented (Oct 2026)
- Piutang: Status Bayar (Lunas/Kurang Bayar/Belum Bayar) di Input; nominal kurang bayar; wajib nama pelanggan
- Saran nama pelanggan muncul di atas kolom saat mengetik (dari Daftar Pelanggan)
- Admin: Daftar Nama Pelanggan (otomatis tersimpan, isi manual, edit nama -> ikut ganti di transaksi, hapus)
- Tab Piutang: total hutang, Top 5 grafik (Nominal/Jumlah Transaksi), tabel belum lunas >7 hari, daftar pelanggan + cari, Detail/Lunas/Cicil/Hapus
- /piutang-detail: riwayat hutang per produk (tanggal, produk, hutang awal, dibayar, belum bayar), Tandai Lunas per produk, cap LUNAS, riwayat pembayaran
- Cicil dipotong FIFO (hutang terlama dulu); Hapus = hapus catatan hutang saja (transaksi tetap)
- Riwayat: badge status hutang; tombol filter kategori menjadi satu tabel pilihan (segmented) dengan jumlah
- Admin: Kategori PPOB bisa diatur sendiri (settings.ppobCategories)
- Backup v3 menyertakan customers & payments
- Target laba harian (atur sendiri) + progress bar persen di layar Input
- Riwayat per tanggal (default hari ini) dengan navigasi hari & pilih tanggal
- Transfer/Tarik: tombol Bank/E-Wallet Agen + Pelanggan (daftar diatur di Admin), alur ditampilkan di riwayat & Excel
- Rekap: Harian/Mingguan/Bulanan/Tahunan, analisis jam ramai, pengeluaran vs laba (laba bersih), laba terbesar vs terendah, export Excel (.xlsx, 6 sheet)
- Menu Pengeluaran Operasional (/pengeluaran): catat, kategori, hapus; ikut backup
- Chip nama pelanggan yang sering muncul di Input Cepat
- Edit transaksi from Riwayat (pencil → Input form prefilled, Simpan Perubahan / Batal)
- Input Cepat sorts nominal (per type), bank, kategori PPOB and Template Cepat by most used
- Input Cepat: Transfer / Tarik Tunai / PPOB, nominal chips, auto admin fee from ranges, bank chips, PPOB kategori/modal/jual, Untung hari ini card
- Template Cepat: save, apply, delete
- Riwayat: filters with counts, grouped by date, delete with confirm
- Rekap: Harian/Bulanan/Tahunan with period nav, totals, per-type
- Admin: editable fee ranges (add/delete/default/save)
- Backup: share .json file, copy as text, restore from file/text (merge/replace)
- Testing: all flows passed (iteration_1)

## Backlog
- P1: Build APK via Publish button
- P2: Export Rekap to PDF/Excel, share struk via WhatsApp
