---
sidebar_position: 1
---

# Stok Barang

Halaman **Stok** adalah tempat mengelola inventori produk.

<!-- TODO: screenshot halaman Stok -->

## Daftar Produk

Halaman menampilkan daftar semua produk dengan informasi:

- **Gambar** (thumbnail)
- **Nama** produk
- **Barcode** (auto-generated jika kosong)
- **Harga** jual
- **Stok** saat ini
- **Harga Beli** (capital)

### Pencarian

Cari produk berdasarkan nama atau barcode menggunakan kolom pencarian di bagian atas.

### Tambah Produk

Klik tombol **+** (FAB) untuk membuat produk baru.

## Detail Produk

Klik produk untuk melihat dan mengedit detailnya. Halaman detail memiliki tiga tab:

### Tab Info

Formulir edit produk:
- **Nama** — nama produk
- **Barcode** — kode barcode (otomatis terisi jika dikosongkan)
- **Harga Jual** — harga satuan
- **Harga Beli** — modal/capital
- **Catatan** — catatan opsional

### Tab Riwayat Stok

Menampilkan timeline perubahan stok (event-sourced). Setiap perubahan dicatat sebagai:
- **Manual** — perubahan manual
- **Inc** — stok bertambah (dari transaksi beli)
- **Dec** — stok berkurang (dari transaksi jual)

Anda bisa menambah/kurangi stok secara manual dari tab ini.

### Tab Gambar

- Upload gambar dengan drag-and-drop atau file picker
- Format yang didukung: PNG, JPEG
- Urutan gambar bisa diatur (drag untuk reorder)
- Hapus gambar yang tidak diperlukan

## Extra (Biaya Tambahan)

Selain produk, halaman Stok juga mengelola **Extra** — biaya tambahan yang bisa dikenakan pada transaksi:

- **Nama** — nama biaya (contoh: "Pajak", "Biaya Layanan")
- **Nilai** — jumlah biaya
- **Jenis** — `number` (nominal tetap) atau `percent` (persentase dari subtotal)

### Tambah Extra

Klik tab **Extra** lalu tombol **+** untuk membuat extra baru.
