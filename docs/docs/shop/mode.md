---
sidebar_position: 1
---

# Toko (POS)

Halaman **Toko** adalah antarmuka utama Point of Sale untuk membuat transaksi. Halaman ini menggunakan sistem **tab** — setiap tab adalah satu transaksi independen.

<!-- TODO: screenshot halaman Toko -->

## Layout

Halaman terbagi dua panel:

### Panel Kiri: Daftar Barang

- **Pencarian**: Cari barang berdasarkan nama atau barcode
- **Daftar Produk**: Grid/kartu produk dengan gambar, nama, harga, stok
- **Daftar Extra**: Biaya tambahan yang bisa ditambahkan ke transaksi
- Klik produk untuk menambahkannya ke transaksi aktif

### Panel Kanan: Transaksi Aktif

- **Barang**: Daftar item yang dibeli dengan qty, harga, diskon, subtotal
- **Diskon**: Diskon per item — bisa nominal (Rp), persen (%), atau per-pcs
- **Extra**: Biaya tambahan transaksi — pajak, biaya layanan (nominal atau persen)
- **Ringkasan**: Subtotal, extra, pembulatan, total
- **Pembayaran**: Input jumlah bayar + hitung kembalian
- **Metode**: Pilih metode pembayaran (tunai, transfer, debit, QRIS)
- **Catatan**: Catatan opsional untuk transaksi

## Mode Transaksi

| Mode | Deskripsi |
|------|-----------|
| **Jual (Sell)** | Transaksi penjualan. Stok produk akan berkurang. |
| **Beli (Buy)** | Transaksi pembelian/restock. Stok produk akan bertambah. |

## Menyelesaikan Transaksi

1. Isi semua item dan extra
2. Masukkan jumlah pembayaran
3. Klik tombol **Bayar**
4. Dialog selesai muncul menampilkan:
   - Jumlah kembalian
   - Opsi **Cetak Struk** — mencetak struk ke printer thermal (Windows)
   - Opsi **Selesai** — menutup tab transaksi

:::info
Transaksi disimpan sebagai satu blok atomik (BEGIN/COMMIT) — jika terjadi error di tengah, semua perubahan dibatalkan.
:::

## Cetak Struk

Struk dibuat dalam format PDF menggunakan pdf-lib, lalu dikirim ke printer thermal Windows melalui winprint. Struk berisi:

- Header toko (nama, alamat, tanggal)
- Daftar produk (nama, qty, harga, diskon, subtotal)
- Extra/biaya tambahan
- Total, bayar, kembalian
- Metode pembayaran
- Footer (dapat dikustomisasi di Pengaturan)

## Pintasan Keyboard

- `Alt+0` — Buka halaman Toko
- `Alt+1` — Buka halaman Stok
- `Alt+2` — Buka halaman Riwayat
- `Alt+3` — Buka halaman Uang
- `Alt+4` — Buka halaman Pengaturan

Tekan `Alt` untuk menampilkan petunjuk pintasan.
