---
sidebar_position: 1
---

# Keuangan (Uang)

Halaman **Uang** untuk melacak arus kas toko. Hanya bisa diakses oleh **admin**.

<!-- TODO: screenshot halaman Uang -->

## Kategori Uang (Money Kind)

Panel kiri menampilkan daftar kategori uang. Setiap kategori memiliki:

- **Nama** — label kategori (contoh: "Kas", "Tabungan", "Utang")
- **Tipe** — `absolute` (input manual) atau `change` (dihitung otomatis)
- **Urutan** — urutan tampilan (bisa di-reorder)

### Tipe Kategori

| Tipe | Deskripsi |
|------|-----------|
| **Absolute** | Nilai diinput manual. Untuk mencatat uang fisik yang dihitung. |
| **Change** | Nilai dihitung otomatis dari selisih kategori lain. Untuk menampilkan perubahan/pertumbuhan. |

### Kelola Kategori

- **Tambah** — buat kategori baru
- **Edit** — ganti nama, tipe, atau urutan
- **Hapus** — hapus kategori
- **Reorder** — atur ulang urutan tampilan

## Entri Uang (Money)

Panel kanan menampilkan entri uang yang dikelompokkan per kategori:

- **Nilai** — jumlah uang (bisa positif atau negatif)
- **Tanggal** — kapan dicatat
- **Catatan** — keterangan opsional

### Tambah Entri

Pilih kategori, isi nilai, dan catatan. Klik **Simpan**.

### Riwayat per Kategori

Klik kategori untuk melihat riwayat lengkap entri di kategori tersebut dengan grafik dan ringkasan.

## Sinkronisasi Cloud

Data kategori dan entri uang disinkronkan ke cloud backend untuk backup.
