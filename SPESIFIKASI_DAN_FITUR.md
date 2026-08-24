# Spesifikasi Teknis & Dokumentasi Fitur — Sokara LMS

Sistem Manajemen Pembelajaran Sekolah (Learning Management System) modern berbasis *Offline-First*, arsitektur *Type-Safe End-to-End*, dan antarmuka produktivitas tinggi (*God-Tier UX*).

---

## 1. Arsitektur & Tumpukan Teknologi (Tech Stack)

### Backend & API Layer
- **Runtime & Web Framework**: [Hono](https://hono.dev/) on Node.js (Ultra-fast, zero-overhead HTTP engine).
- **API Protocol**: [tRPC v11](https://trpc.io/) — Menjamin integritas tipe data 100% *type-safe* antara backend dan frontend tanpa perlu proses kompilasi OpenAPI manual.
- **Database & ORM**: SQLite engine dengan [Drizzle ORM](https://orm.drizzle.team/) untuk eksekusi query relasional terstruktur, idempotent migrations, dan performa I/O instan.
- **Autentikasi & Otorisasi**: Role-Based Access Control (RBAC) berbasis cookie sesi terenkripsi dengan validasi ketat 4 hak akses peran pengguna.

### Frontend & UI System
- **Framework**: [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/).
- **Build Tool**: [Vite 7](https://vitejs.dev/) dengan konfigurasi *manual chunking* dan *code-splitting* berbasis `React.lazy()`.
- **Styling & Design System**: Tailwind CSS, Radix UI Primitives, Lucide Icons, dan standar desain Sokara Brand Identity.
- **Motion & Visual Engine**: `@formkit/auto-animate` untuk transisi layout reflow 60 FPS dan `canvas-confetti` untuk micro-interaction feedback.
- **Notification System**: `sonner` toast stack terpadu.

### Progressive Web App (PWA) & Offline Engine
- **Service Worker Engine**: `vite-plugin-pwa` dengan `workbox-window`.
- **Caching Strategy**:
  - *Static Shell Precache*: Seluruh aset HTML, CSS, SVG, dan JavaScript diprecache sebesar ~1.5 MB untuk akses instan tanpa internet.
  - *Runtime API Cache*: Pola `NetworkFirst` dengan *timeout fallback* 5 detik untuk mempertahankan akses jadwal dan tugas ketika jaringan terputus.
  - *Background Auto-Update*: Modul `PwaUpdater` mendeteksi rilis versi baru di server dan memicu prompt update halus ke pengguna.

---

## 2. Matriks 4 Hak Akses Peran (Multi-Role RBAC)

Aplikasi mengimplementasikan segregasi hak akses hierarki 4 peran pengguna:

```
[Administrator] ──────► Pengelolaan Master Data, Rombel, Pengguna, Jadwal, & Keuangan
      │
      ├──────► [Guru] ──────► Materi, SpeedGrader™, Rekap Nilai KKM, Ujian CBT, & Presensi
      │          │
      │          └──────► [Siswa] ──────► Priority Queue Tugas, Kanban, Player CBT, & Rapor Digital
      │                     ▲
      └─────────────────────┴──────► [Orang Tua] ──────► Monitoring Realtime, Nilai Anak, & SPP
```

---

## 3. Rincian Fitur Per Modul & Peran

### A. Portal Administrator (`/admin`)
1. **Dashboard Eksekutif**: Ringkasan metrik statistik operasional sekolah (total siswa, guru, kelas aktif, transaksi keuangan, dan tingkat kehadiran harian).
2. **Manajemen Pengguna Terpadu (`AdminPengguna.tsx`)**:
   - CRUD pengguna (Admin, Guru, Siswa, Orang Tua).
   - Relasi Akun Orang Tua — Siswa (*Parent-Student Mapping*) dengan antarmuka relasi dinamis.
3. **Master Akademik & Rombel (`AdminKelas.tsx`, `AdminKelasDetail.tsx`, `AdminMapel.tsx`)**:
   - Pengaturan Kelas / Rombongan Belajar, penetapan Wali Kelas, dan alokasi mata pelajaran per guru.
4. **Penjadwalan & Kalender Akademik (`AdminJadwal.tsx`)**:
   - Penyusunan jadwal pelajaran mingguan per ruang kelas dan jam belajar.
   - Pengelolaan Sesi Kelas Pengganti (*Make-up Class Scheduling*).
   - Master Hari Libur Nasional & Agenda Akademik Sekolah.
5. **Presensi Global (`AdminPresensi.tsx`)**:
   - Rekapitulasi absensi seluruh kelas per tanggal (Hadir, Sakit, Izin, Alpa).
6. **Administrasi Keuangan SPP (`AdminKeuangan.tsx`)**:
   - Pembuatan tagihan SPP & iuran sekolah massal atau per kelas.
   - Input format mata uang universal otomatis (IDR `Rp` dengan pemisah ribuan titik).
   - Verifikasi bukti transfer pembayaran orang tua dan update status lunas instan.
   - *Context Menu Dropdown* untuk aksi tabel yang rapi dan cepat.

---

### B. Portal Guru (`/guru`)
1. **Dashboard Mengajar (`GuruDashboard.tsx`)**:
   - Agenda mengajar hari ini, status tugas yang perlu dinilai, dan shortcut operasional.
2. **SpeedGrader™ Rapid Review Engine (`GuruTugas.tsx`)**:
   - *Split-View Interface*: Panel berkas/teks jawaban siswa di sebelah kiri dan rubrik penilaian di sebelah kanan.
   - *Keyboard Shortcuts*: Tombol `J` (Siswa Berikutnya), `K` (Siswa Sebelumnya), dan `Ctrl+Enter` (Simpan & Auto-Advance ke siswa berikutnya).
   - *Preset Skor Instan*: Tombol nilai 1-klik (100, 95, 90, 85, 80, 75, 50, 0).
   - *Feedback Templates*: Preset catatan evaluasi yang dapat diakumulasikan ke textarea bimbingan.
   - Ekspor lembar nilai kelas ke format CSV / Excel.
3. **Buku Nilai & Rekapitulasi Rombel (`GuruRekapNilai.tsx`)**:
   - Matriks nilai seluruh tugas per siswa lengkap dengan peringkat (#1 Juara, #2, dst.).
   - *Student Mini-Sparkline*: Visualisasi grafik garis tren kenaikan/penurunan performa tugas siswa.
   - *Milestone KKM 75 Bar*: Indikator visual ambang batas Kriteria Ketuntasan Minimal pada setiap baris rata-rata.
   - *Mastery Distribution Bar*: Visualisasi rasio ketuntasan rombel (% siswa tuntas KKM).
4. **Manajemen Materi & Tugas (`GuruMateri.tsx`, `GuruKelasMapel.tsx`)**:
   - Publikasi materi pembelajaran (teks kaya, link video/dokumen, berkas unduhan).
5. **CBT Exam Builder & Manager (`GuruUjian.tsx`, `GuruUjianDetail.tsx`)**:
   - Pembuatan paket soal ujian pilihan ganda (opsi A, B, C, D) dengan kunci jawaban dan bobot poin.
   - Pengaturan durasi timer (menit), waktu mulai, dan batas akhir pengerjaan.
   - Rekap nilai ujian CBT otomatis setelah siswa menyelesaikan tes.
6. **Presensi Siswa Realtime (`GuruPresensi.tsx`)**:
   - Input absensi tatap muka harian per mapel dengan satu klik tombol status (H/S/I/A).
7. **Portal Wali Kelas (`GuruWaliKelas.tsx`)**:
   - Rekap performa akademik komprehensif untuk seluruh siswa di kelas perwaliannya.

---

### C. Portal Siswa (`/siswa`)
1. **Pusat Akademik Siswa (`SiswaDashboard.tsx`)**:
   - *Action-Oriented Priority Queue*: Pengelompokan tugas otomatis menjadi:
     - **Mendesak & Lewat Batas** (Sisa waktu < 24 jam / overdue).
     - **Tenggat Pekan Ini** (Tugas aktif terjadwal).
     - **Selesai & Riwayat** (Tugas yang sudah dikumpulkan/dinilai).
   - Metrik rata-rata nilai kumulatif dan kartu jadwal harian.
2. **Pusat Penugasan & Kanban Board (`SiswaTugas.tsx`)**:
   - *Kanban Urgensi 3 Kolom*: Kolom Mendesak, Perlu Dikerjakan, dan Selesai.
   - *In-Place Quick Submit Dialog*: Pengumpulan tugas teks dan lampiran file (PDF, DOCX, JPG, PNG) langsung dari kartu tanpa reload halaman.
   - Animasi konfeti perayaan saat berhasil mengumpulkan tugas.
3. **Player Ujian CBT Anti-Cheat (`SiswaUjianPlayer.tsx`)**:
   - *Countdown Timer Realtime*: Auto-submit otomatis jika waktu habis.
   - *Anti-Cheat Visibility Detection*: Perekaman log peringatan integritas saat siswa berpindah tab/jendela browser.
   - *Local Cache Persistence*: Jawaban tersimpan aman di storage lokal browser; tidak hilang saat koneksi terputus atau halaman tidak sengaja di-refresh.
   - *Navigasi Keyboard*: Tombol `A`, `B`, `C`, `D` untuk memilih opsi, panah kiri/kanan untuk navigasi nomor soal.
4. **Rapor Digital & Capaian Nilai (`SiswaNilai.tsx`, `SiswaRapor.tsx`)**:
   - *Lightweight SVG Sparklines*: Grafik tren capaian nilai per mata pelajaran.
   - *KKM 75 Mastery Gauge*: Indikator visual status ketuntasan per mata pelajaran.
   - *Clean Print Layout*: Format cetak rapor resmi A4 fisik (blok tanda tangan dan QR seal otomatis hanya muncul saat perintah print `Ctrl+P`).
5. **Jadwal, Materi & Tagihan (`SiswaJadwal.tsx`, `SiswaMateri.tsx`, `SiswaKeuangan.tsx`)**:
   - Akses materi terpusat, pengunduhan lampiran soal, dan status pembayaran SPP siswa.

---

### D. Portal Orang Tua (`/ortu`)
1. **Dashboard Monitoring Anak (`OrtuDashboard.tsx`)**:
   - Pemantauan perkembangan akademik harian anak, absensi kehadiran, dan pengumuman sekolah.
   - Dukungan akun dengan banyak anak (*Multi-child Switcher*).
2. **Buku Nilai & Evaluasi Guru (`OrtuNilai.tsx`)**:
   - Laporan capaian nilai per mapel dengan Sparklines tren belajar anak dan bar KKM.
   - Ulasan catatan evaluasi dan bimbingan guru mata pelajaran.
3. **Pemantauan Tugas & Ujian (`OrtuTugas.tsx`, `OrtuUjian.tsx`)**:
   - Notifikasi tugas yang belum dikerjakan anak dan skor ujian CBT yang telah selesai.
4. **Portal Keuangan & Pembayaran SPP (`OrtuKeuangan.tsx`)**:
   - Riwayat tagihan SPP anak.
   - Form konfirmasi pembayaran dengan unggah bukti transfer dan input nominal berformat IDR.

---

## 4. Keunggulan Desain UI & Standar Kualitas (God-Tier Standard)

1. **Mini-Sidebar Adaptif (Arc UI Style)**:
   - Sidebar dapat diciutkan (*collapsed*) menjadi mode mini ikon 80px dengan *Radix Tooltip Provider* saat hover.
   - Tata letak konten utama melakukan *fluid reflow* yang mulus.
2. **Zero Hardcoded Colors & Dark Mode Murni**:
   - Warna semantik Tailwind terintegrasi penuh (`bg-card`, `text-foreground`, `border-border`).
   - Kontras warna tinggi dan nyaman di mata baik pada mode Terang (*Light Mode*) maupun mode Gelap (*Dark Mode*).
3. **Mobile Responsiveness Global (24 Tabel)**:
   - Seluruh tabel data dibungkus dalam *container* `overflow-x-auto`, menjamin tidak ada kerusakan *viewport* saat dibuka melalui smartphone.
4. **Poka-Yoke Input & Currency Guardrail**:
   - Input nominal keuangan otomatis memformat pemisah ribuan titik (`350.000`), menonaktifkan browser spinner panah, dan menyertakan prefix `Rp`.
5. **Ultra-Lightweight Bundle**:
   - Ukuran *First Contentful Paint* vendor React hanya **16.48 kB** (gzip) dan vendor query **23.43 kB** (gzip).

---

## 5. Panduan Instalasi & Menjalankan Aplikasi

### Kebutuhan Lingkungan
- Node.js versi 18.x atau lebih tinggi.
- npm atau pnpm.

### Langkah Instalasi
1. Masuk ke direktori aplikasi:
   ```bash
   cd app
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Inisialisasi basis data SQLite & seeding data demo:
   ```bash
   npm run db:push
   ```
4. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000/`.

5. Verifikasi tipe data & build produksi:
   ```bash
   npm run check   # TypeScript verification (0 Error)
   npm run build   # Production Vite & Workbox build
   ```

---

## 6. Kredensial Akun Demo Bawaan

| Peran | Email | Kata Sandi | Halaman Utama |
|---|---|---|---|
| **Administrator** | `admin@sekolah.demo` | `admin123` | `/admin` |
| **Guru Mata Pelajaran** | `budi@sekolah.demo` | `guru123` | `/guru` |
| **Siswa** | `andi@sekolah.demo` | `siswa123` | `/siswa` |
| **Orang Tua / Wali** | `orangtua@sekolah.demo` | `ortu123` | `/ortu` |
