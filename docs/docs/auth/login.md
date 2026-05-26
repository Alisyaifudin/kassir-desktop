---
sidebar_position: 2
---

# Login

Setelah setup awal, setiap membuka aplikasi Anda akan melihat halaman **Login**.

<!-- TODO: screenshot halaman Login -->

## Cara Login

1. Pilih nama kasir dari daftar dropdown
2. Masukkan kata sandi
3. Klik **Masuk**

Aplikasi akan memverifikasi kata sandi dengan hash bcrypt yang tersimpan. Jika cocok, sesi login dibuat dan Anda diarahkan ke **Beranda**.

:::warning Kata Sandi Salah
Jika kata sandi salah, akan muncul pesan "Kata sandi salah". Silakan coba lagi.
:::

## Auto-Login

Jika sesi sebelumnya belum kadaluarsa (JWT berlaku 5 hari), aplikasi akan otomatis masuk ke Beranda tanpa perlu login ulang.
