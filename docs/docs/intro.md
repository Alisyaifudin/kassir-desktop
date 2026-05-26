---
sidebar_position: 1
---

# Selayang Pandang

**Kassir** adalah aplikasi desktop Point of Sale (POS) untuk Windows yang membantu pemilik toko mencatat transaksi jual-beli, mengelola stok, melacak keuangan, dan menganalisis performa toko. Aplikasi bekerja secara offline-first dan dapat menyinkronkan data ke cloud backend.

<!-- TODO: screenshot beranda aplikasi -->

## Fitur Utama

### Transaksi (Toko)
- Membuat transaksi penjualan (`sell`) dan pembelian (`buy`)
- Mendukung multi-tab untuk transaksi bersamaan
- Pencarian produk otomatis berdasarkan nama atau barcode
- Diskon per item (nominal, persen, atau per-pcs)
- Biaya tambahan (extra) per transaksi (pajak, biaya layanan)
- Pembulatan otomatis
- Pilihan metode pembayaran: tunai, transfer, debit, QRIS
- Cetak struk via printer thermal (Windows)

### Stok
- Manajemen inventori barang lengkap
- Barcode otomatis atau manual
- Gambar produk (drag-drop, reorder)
- Riwayat perubahan stok (event-sourced)
- Biaya tambahan/extra (pajak, biaya layanan)

### Riwayat
- Daftar semua transaksi dengan filter (tanggal, metode, pelanggan, mode)
- Detail transaksi lengkap
- Edit catatan, mode, metode pembayaran, status kredit
- Pencarian lanjutan

### Keuangan (Uang)
- Manajemen kategori uang (kas, tabungan, utang, dll)
- Tipe kategori: absolut (input manual) dan change (dihitung otomatis)
- Entri uang masuk/keluar dengan catatan
- Pengurutan kategori

### Analisis
- **Arus Kas**: Grafik pemasukan vs pengeluaran
- **Laba Bersih**: Analisis keuntungan
- **Keramaian**: Distribusi penjualan per jam
- **Produk**: Analisis per produk (terjual, pendapatan, laba)
- **Utang**: Pelacakan utang/pelanggan kredit

### Pengaturan
- Profil pengguna dan ganti kata sandi
- Info toko (nama, alamat, header/footer struk)
- Manajemen data (ekspor, impor, hapus)
- Log aplikasi
- Pengaturan printer
- Sinkronisasi manual

### Manajemen (Admin)
- **Kasir**: Kelola akun kasir (admin/user)
- **Pelanggan**: Data pelanggan (nama, telepon)
- **Metode**: Metode pembayaran
- **Kontak**: Profil toko dan media sosial

## Teknologi

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Radix UI
- **Backend**: Tauri v2 (Rust)
- **Database**: SQLite (offline-first)
- **Sync**: Timestamp-based pull/push ke cloud API
- **Print**: winprint (Windows PDF printing)
