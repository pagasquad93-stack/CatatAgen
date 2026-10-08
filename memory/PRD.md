# CatatAgen (React Native rebuild)

## Original problem statement
https://ppob-sales-tracker.emergent.host rebuild ke react nativ biar bisa deploy ke google play dan di install mandiri di hp dengan file apk

User choices: offline storage on phone only, same look as web (green CatatAgen), exact rebuild without extra features.

## Architecture
- Expo Router (SDK 57), no backend. Data in AsyncStorage via `@/src/utils/storage` (src/store.tsx context).
- Tabs: Input, Riwayat, Rekap, Admin, Backup (NativeTabs on iOS 26+, JS Tabs elsewhere).

## Implemented (Oct 2026)
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
