---
sidebar_position: 3
---

# Metode Pembayaran

Halaman **Metode** untuk mengelola metode pembayaran. Hanya bisa diakses oleh **admin**.

<!-- TODO: screenshot halaman Metode -->

## Metode Bawaan

Aplikasi memiliki 4 metode bawaan:

| ID | Metode | Deskripsi |
|----|--------|-----------|
| `1000` | **Tunai** | Pembayaran cash |
| `1001` | **Transfer** | Transfer bank |
| `1002` | **Debit** | Kartu debit |
| `1003` | **QRIS** | Pembayaran QR code |

## Kustomisasi

### Tambah Metode

Buat metode baru dengan:
- **Nama** — label metode (contoh: "GoPay", "ShopeePay")
- **Jenis** — pilih dari 4 jenis yang tersedia

### Edit & Hapus

- Edit nama metode
- Hapus metode (soft delete — data transaksi tetap ada)

:::info
Metode yang sudah digunakan dalam transaksi tidak bisa dihapus permanen. Sistem menggunakan soft delete (method_deleted_at).
:::

## Sinkronisasi

Metode pembayaran disinkronkan ke cloud backend.
