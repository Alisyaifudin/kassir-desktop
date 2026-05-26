---
sidebar_position: 1
---

# Pertama Kali

Saat pertama kali membuka aplikasi setelah instalasi, Anda akan melihat halaman **Buat Toko** untuk membuat akun admin pertama.

<!-- TODO: screenshot halaman Buat Toko -->

## Membuat Toko Baru

Masukkan tiga data berikut:

1. **Nama Toko** — nama toko Anda (akan muncul di struk dan judul aplikasi)
2. **Nama Pemilik** — nama Anda sebagai pemilik/admin
3. **Kata Sandi** — kata sandi untuk login

Klik tombol **Buat Toko** untuk menyelesaikan setup.

Aplikasi akan:
- Menyimpan akun admin ke database lokal
- Meng-hash kata sandi menggunakan bcrypt (dijalankan di Rust backend)
- Membuat sesi login (JWT dengan masa berlaku 5 hari)
- Mengarahkan ke halaman **Beranda**

:::info
Kata sandi disimpan dalam bentuk hash bcrypt, bukan teks biasa. Tidak ada yang bisa melihat kata sandi Anda, termasuk pembuat aplikasi.
:::

## Setelah Setup

Setelah setup selesai, Anda bisa langsung menggunakan aplikasi. Pada kunjungan berikutnya, halaman **Login** yang akan muncul.
