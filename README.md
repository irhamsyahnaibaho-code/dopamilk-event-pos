# Dopamilk Event POS

Alat catat order untuk tenant Dopamilk di event. Tap menu = 1 cup tercatat lengkap dengan jam:menit:detik. Selesai event, total cup dan omset langsung kelihatan dan bisa diunduh jadi PDF.

**Cara kerjanya:** aplikasi ini web statis (HTML/JS biasa, tanpa build). Kode ada di GitHub dan tampil lewat GitHub Pages. Datanya disimpan di HP dulu (instan, aman walau sinyal jelek), lalu otomatis dikirim ke Supabase kalau ada sinyal.

## Fitur

- Tap kartu menu = +1 Regular. Tombol **+ Large** di tiap kartu = +1 Large (harga +Rp2.000).
- Tombol **−** di tiap kartu membatalkan pesanan terakhir menu itu. Setiap tap juga muncul notifikasi dengan tombol **Batal** (4,5 detik).
- **Riwayat**: semua pencatatan lengkap dengan jam:menit:detik, urut terbaru di atas. Tiap baris bisa **Hapus** atau **Pulihkan**. Pesanan yang dihapus tidak benar-benar hilang (hanya ditandai batal), jadi jejaknya tetap ada.
- Baris yang menu dan ukurannya sama dan masuk dalam 3 detik dari sebelumnya diberi tanda **⚠ mirip dobel**. Itu untuk mengecek tap dobel. Selang waktunya bisa diubah di `js/config.js`.
- Jam real-time dan tanggal di header, plus nama event dan tanggal event.
- **Rekap & PDF**: total cup, total omset, rekap per menu, rincian per pencatatan. PDF-nya berisi info event, ringkasan, rekap per menu, dan rincian jam. Baris yang dibatalkan ditandai BATAL dan tidak dihitung.
- **Tampilan menyesuaikan layar.** HP (portrait dan landscape), tablet, dan laptop punya tata letak sendiri. Di laptop atau tablet landscape besar, panel **Pencatatan terbaru** selalu terlihat di samping menu (lengkap dengan tombol Hapus), jadi tidak perlu buka popup Riwayat. Di HP dan tablet portrait, tombol Riwayat dan Rekap ada di bar bawah.
- Bisa dipakai tanpa sinyal setelah dibuka sekali (Add to Home Screen).
- Kalau dipakai di 2 HP sekaligus (login akun yang sama), angkanya tampil real-time di keduanya.

## Setup (sekali saja)

### 1. Supabase
1. Buat project baru di supabase.com.
2. Buka **SQL Editor > New query**, paste seluruh isi `supabase/schema.sql`, klik **Run**.
3. Buka **Authentication > Users > Add user > Create new user**. Isi email dan password, lalu centang *Auto Confirm User*. Ini akun login aplikasi, bisa dipakai bareng kasir lain.
4. Buka **Authentication > Sign In / Providers** dan matikan **Allow new users to sign up**, supaya orang lain tidak bisa mendaftar sendiri.
5. Buka **Project Settings > API**, lalu salin **Project URL** dan **anon public key**.

### 2. VS Code
1. Buka folder ini di VS Code.
2. Edit `js/config.js`, isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY`.
3. Coba di laptop: install ekstensi **Live Server**, klik kanan `index.html`, pilih **Open with Live Server**. Tanpa ekstensi, jalankan `python -m http.server 8000` di terminal lalu buka `http://localhost:8000`.
4. Anon key boleh ada di GitHub karena data dilindungi login dan RLS. Jangan pernah memasukkan `service_role` key.

### 3. GitHub Pages
1. Buat repo baru di GitHub (public atau private).
2. Di terminal VS Code jalankan:
   ```
   git init
   git add .
   git commit -m "Dopamilk Event POS"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
3. Buka repo > **Settings > Pages**. Pilih Source: **Deploy from a branch**, branch **main**, folder **/ (root)**, lalu Save.
4. Tunggu 1 sampai 2 menit. Alamatnya `https://USERNAME.github.io/NAMA-REPO/`.

### 4. Sebelum hari-H
1. Buka alamat Pages di HP kasir **saat ada wifi**, lalu login sekali.
2. Tambahkan ke layar utama: Chrome ke menu ⋮ > *Add to Home screen*, Safari ke Share > *Add to Home Screen*.
3. Buat event tes, coba tap beberapa menu, cek di **Table Editor** Supabase bahwa datanya masuk, lalu hapus event tes.
4. Pastikan jam HP diatur otomatis (Automatic date & time), karena jam pencatatan memakai jam HP.

## Pakai di event

1. Isi **nama event / tenant** dan tanggal, lalu **Mulai catat order**.
2. Tap menu setiap ada pesanan. Salah tap? Tekan **Batal** di notifikasi, atau **−** di kartu menu.
3. Ragu ada dobel? Buka **Riwayat** dan lihat jam serta tanda ⚠.
4. Selesai: **Rekap & PDF**, lalu **Unduh PDF**. Setelah itu **Akhiri event** (event bisa dibuka lagi kapan saja).

Kalau layar tiba-tiba ter-refresh atau aplikasi tertutup, aplikasi langsung kembali ke event yang sedang berjalan.

## Ubah menu atau harga

Semua ada di `js/menu.js` (nama, harga Regular, selisih Large). Untuk harga promo event, ubah angkanya sebelum event, lalu push ulang ke GitHub. Harga tiap pesanan disimpan saat di-tap, jadi laporan lama tidak berubah kalau harga diganti nanti.

## Catatan

- **Update aplikasi**: setelah push versi baru, perubahan muncul pada pembukaan kedua (karena cache offline).
- **Hapus event** hanya menyembunyikan dari daftar. Datanya tetap ada di Supabase.
- **Struktur**: `index.html`, `css/style.css`, `js/` (config, menu, util, store, cloud, pdf, app), `js/vendor/` (jsPDF dan supabase-js disimpan lokal supaya tetap jalan offline), `supabase/schema.sql`, `sw.js` + `manifest.webmanifest` (mode offline dan Add to Home Screen).
