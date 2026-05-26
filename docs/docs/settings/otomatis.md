---
sidebar_position: 2
---

# Sinkronisasi Cloud

Aplikasi mendukung sinkronisasi data ke cloud backend untuk backup dan akses multi-perangkat.

## Cara Kerja

Sinkronisasi menggunakan model **timestamp-based pull/push**:

1. **Pull** — ambil data dari server yang berubah sejak sync terakhir
2. **Push** — kirim data lokal yang belum disinkronkan
3. **Grave** — sinkronisasi penghapusan (tombstone)

## Urutan Sinkronisasi

1. **Produk** — data produk disinkronkan lebih dulu
2. **Product Events** — riwayat stok
3. **Record** — transaksi
4. **Method** — metode pembayaran
5. **Grave** — data yang dihapus

## Setup

1. Buka **Pengaturan → Sinkronisasi**
2. Masukkan token dari cloud backend
3. Klik **Sinkronkan**

## Status

Setelah sinkronisasi, Anda akan melihat:
- Jumlah data yang dikirim (unsync)
- Jumlah data yang diterima (server)
- Total data di server

## Error

Jika terjadi error:
- **"Tidak bisa menghubungi server"** — periksa koneksi internet
- **Token invalid** — periksa token di pengaturan
- **Error validasi** — data lokal tidak sesuai format server
