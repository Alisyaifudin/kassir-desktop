---
sidebar_position: 2
---

# Instalasi

## Windows

### Persyaratan
- Windows 10 atau lebih baru
- Tidak ada dependensi tambahan (aplikasi standalone)

### Unduh

1. Buka halaman [GitHub Releases](https://github.com/Alisyaifudin/kassir-desktop/releases)
2. Pilih versi terbaru (paling atas)

<!-- TODO: screenshot halaman releases -->

3. Unduh file `.msi`

### Instalasi

1. *Double click* file `.msi` yang sudah diunduh
2. Jika muncul peringatan Windows SmartScreen:

<!-- TODO: screenshot peringatan SmartScreen 1 -->

- Klik **More info**

<!-- TODO: screenshot peringatan SmartScreen 2 -->

- Klik **Run anyway**

3. Ikuti wizard instalasi (klik Next)

<!-- TODO: screenshot wizard instalasi 1-5 -->

4. Klik **Finish** — aplikasi siap digunakan 🥳

### Update Otomatis

Aplikasi mendukung update otomatis via Tauri updater. Saat ada versi baru:
- Aplikasi akan mendeteksi update secara otomatis
- Update diinstal secara *passive* (tanpa mengganggu)
- Restart aplikasi untuk menggunakan versi baru

### Lokasi Data

Semua data disimpan di:
```
%LOCALAPPDATA%/com.kassir.app/
```
Termasuk database SQLite (`data.db`, `tx.db`), file konfigurasi (`store.json`), dan log aplikasi.
