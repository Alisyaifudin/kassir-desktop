---
sidebar_position: 2
---

# Pencarian Otomatis

Panel kiri halaman Toko memiliki fitur pencarian otomatis untuk menemukan produk dengan cepat.

## Cara Kerja

Ketik nama produk atau barcode di kolom pencarian. Aplikasi akan mencari secara otomatis (fuzzy search) menggunakan dua engine:

- **fuzzysort** — pencarian fuzzy berdasarkan nama produk
- **@nozbe/microfuzz** — pencarian barcode

Hasil pencarian muncul secara real-time saat Anda mengetik.

## Tips

- Ketik sebagian nama produk (misal: "coc" untuk "Coca Cola")
- Scan barcode langsung — produk akan otomatis terpilih
- Gunakan mouse atau keyboard untuk memilih hasil pencarian
