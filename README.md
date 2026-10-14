# Tugas Manager v3

Versi gabungan untuk tugas pribadi, sekolah, dan proyek; tersedia tampilan daftar, papan ala Kanban, kalender, statistik, subtugas, catatan, banyak tautan bernama, ekspor/impor JSON, dark mode, dan sinkronisasi Supabase opsional.

## File yang diganti / ditambahkan

- `app/page.tsx` — halaman utama (pengganti penuh).
- `app/globals.css` — stylesheet responsif (gunakan sebagai pengganti penuh jika proyek lama mengimpor file ini).
- `supabase/schema.sql` — tabel, Row Level Security, dan aturan akses lampiran.
- `.env.example` — contoh environment variable.

## 1. Pasang dependensi

Di folder proyek:

```bash
npm install @supabase/supabase-js
```

Gunakan versi Next.js yang sudah dipatch dan kompatibel dengan proyek Anda. Jika dashboard Vercel memberi peringatan kerentanan, ikuti versi perbaikan yang direkomendasikan Vercel/Next.js, lalu uji build sebelum deploy.

## 2. Pasang kode

1. Cadangkan proyek terlebih dahulu.
2. Ganti isi `app/page.tsx` dengan file dari paket ini.
3. Ganti isi `app/globals.css` dengan file dari paket ini. Jika proyek Anda memakai Tailwind v3, ubah baris pertama menjadi `@tailwind base; @tailwind components; @tailwind utilities;` alih-alih `@import "tailwindcss";`.
4. Pastikan `app/layout.tsx` mengimpor `./globals.css`.
5. Pastikan `app/layout.tsx` memiliki `<html lang="id">` dan `<body>{children}</body>`.

## 3. Mode lokal

Tanpa environment Supabase, aplikasi tetap bisa dipakai. Data tugas disimpan di `localStorage` browser. Ekspor JSON secara berkala. Browser/perangkat berbeda tidak otomatis berbagi data.

## 4. Aktifkan sinkronisasi online dan lampiran

1. Buat proyek di Supabase.
2. Buka SQL Editor dan jalankan seluruh `supabase/schema.sql`.
3. Di Authentication > Providers, aktifkan Email. Untuk penggunaan nyata, sebaiknya biarkan verifikasi email aktif.
4. Di Project Settings > API, salin Project URL dan publishable/anon key. Jangan pernah memasukkan `service_role` key ke frontend.
5. Buat `.env.local` dari `.env.example`, isi dua variabel tersebut.
6. Tambahkan variabel yang sama di Vercel > Project > Settings > Environment Variables (Production, Preview, Development), lalu redeploy.
7. Login/daftar dari aplikasi dan tekan **Sinkronkan sekarang** di setiap perangkat setelah perubahan.

### Catatan sinkronisasi

Sinkronisasi saat ini bersifat manual (tombol) dan memakai `updatedAt` untuk memilih versi yang lebih baru. Ini bukan kolaborasi real-time; jika dua perangkat mengedit tugas yang sama bersamaan, versi terakhir dapat menang. Ekspor JSON tetap disarankan.

### Catatan lampiran

Bucket private dan signed URL digunakan agar file tidak menjadi publik. Upload lampiran dilakukan dari kartu tugas setelah tugas tersimpan dan pengguna login. Batas 10 MB per file. Metadata lampiran ikut sinkron saat menekan tombol sinkronisasi.

## 5. Deploy

```bash
npm run build
```

Jika build sukses, commit dan push ke GitHub atau deploy ulang melalui Vercel. Jangan commit `.env.local`.

## Migrasi dari v2

Halaman mencoba membaca kunci `task-manager-tasks` jika kunci v3 belum ada dan menerima impor JSON array maupun ekspor berbentuk `{ "tasks": [...] }`. Tetap ekspor cadangan v2 terlebih dahulu sebelum mengganti kode.
