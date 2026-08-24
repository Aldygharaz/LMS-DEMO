import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import { Toaster } from "sonner";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PwaUpdater } from "./components/PwaUpdater";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Admin Routes (Lazy Loaded)
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminKelas = lazy(() => import("./pages/admin/AdminKelas"));
const AdminKelasDetail = lazy(() => import("./pages/admin/AdminKelasDetail"));
const AdminMapel = lazy(() => import("./pages/admin/AdminMapel"));
const AdminPengguna = lazy(() => import("./pages/admin/AdminPengguna"));
const AdminJadwal = lazy(() => import("./pages/admin/AdminJadwal"));
const AdminPengumuman = lazy(() => import("./pages/admin/AdminPengumuman"));
const AdminPresensi = lazy(() => import("./pages/admin/AdminPresensi"));
const AdminKeuangan = lazy(() => import("./pages/admin/AdminKeuangan"));

// Guru Routes (Lazy Loaded)
const GuruDashboard = lazy(() => import("./pages/guru/GuruDashboard"));
const GuruKelasList = lazy(() => import("./pages/guru/GuruKelasList"));
const GuruKelasMapel = lazy(() => import("./pages/guru/GuruKelasMapel"));
const GuruTugas = lazy(() => import("./pages/guru/GuruTugas"));
const GuruJadwal = lazy(() => import("./pages/guru/GuruJadwal"));
const GuruPresensi = lazy(() => import("./pages/guru/GuruPresensi"));
const GuruMateri = lazy(() => import("./pages/guru/GuruMateri"));
const GuruRekapNilai = lazy(() => import("./pages/guru/GuruRekapNilai"));
const GuruWaliKelas = lazy(() => import("./pages/guru/GuruWaliKelas"));
const GuruUjian = lazy(() => import("./pages/guru/GuruUjian"));
const GuruUjianDetail = lazy(() => import("./pages/guru/GuruUjianDetail"));

// Siswa Routes (Lazy Loaded)
const SiswaDashboard = lazy(() => import("./pages/siswa/SiswaDashboard"));
const SiswaTugas = lazy(() => import("./pages/siswa/SiswaTugas"));
const SiswaMateri = lazy(() => import("./pages/siswa/SiswaMateri"));
const SiswaNilai = lazy(() => import("./pages/siswa/SiswaNilai"));
const SiswaPresensi = lazy(() => import("./pages/siswa/SiswaPresensi"));
const SiswaJadwal = lazy(() => import("./pages/siswa/SiswaJadwal"));
const SiswaKeuangan = lazy(() => import("./pages/siswa/SiswaKeuangan"));
const SiswaUjian = lazy(() => import("./pages/siswa/SiswaUjian"));
const SiswaUjianPlayer = lazy(() => import("./pages/siswa/SiswaUjianPlayer"));
const SiswaRapor = lazy(() => import("./pages/siswa/SiswaRapor"));

// Orang Tua Routes (Lazy Loaded)
const OrtuDashboard = lazy(() => import("./pages/ortu/OrtuDashboard"));
const OrtuTugas = lazy(() => import("./pages/ortu/OrtuTugas"));
const OrtuNilai = lazy(() => import("./pages/ortu/OrtuNilai"));
const OrtuPresensi = lazy(() => import("./pages/ortu/OrtuPresensi"));
const OrtuJadwal = lazy(() => import("./pages/ortu/OrtuJadwal"));
const OrtuKeuangan = lazy(() => import("./pages/ortu/OrtuKeuangan"));
const OrtuUjian = lazy(() => import("./pages/ortu/OrtuUjian"));

function PageSuspenseFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-muted-foreground font-medium">Memuat modul halaman...</p>
      </div>
    </div>
  );
}

export default function App() {

  


  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="sokara_theme">
        <PwaUpdater />
        <Suspense fallback={<PageSuspenseFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/kelas" element={<AdminKelas />} />
            <Route path="/admin/kelas/:id" element={<AdminKelasDetail />} />
            <Route path="/admin/mapel" element={<AdminMapel />} />
            <Route path="/admin/pengguna" element={<AdminPengguna />} />
            <Route path="/admin/jadwal" element={<AdminJadwal />} />
            <Route path="/admin/pengumuman" element={<AdminPengumuman />} />
            <Route path="/admin/presensi" element={<AdminPresensi />} />
            <Route path="/admin/keuangan" element={<AdminKeuangan />} />

            {/* Guru Routes */}
            <Route path="/guru" element={<GuruDashboard />} />
            <Route path="/guru/kelas" element={<GuruKelasList />} />
            <Route path="/guru/kelas-mapel/:id" element={<GuruKelasMapel />} />
            <Route path="/guru/tugas/:id" element={<GuruTugas />} />
            <Route path="/guru/presensi" element={<GuruPresensi />} />
            <Route path="/guru/materi" element={<GuruMateri />} />
            <Route path="/guru/rekap-nilai" element={<GuruRekapNilai />} />
            <Route path="/guru/jadwal" element={<GuruJadwal />} />
            <Route path="/guru/wali-kelas" element={<GuruWaliKelas />} />
            <Route path="/guru/ujian" element={<GuruUjian />} />
            <Route path="/guru/ujian/:id" element={<GuruUjianDetail />} />

            {/* Siswa Routes */}
            <Route path="/siswa" element={<SiswaDashboard />} />
            <Route path="/siswa/tugas" element={<SiswaTugas />} />
            <Route path="/siswa/materi" element={<SiswaMateri />} />
            <Route path="/siswa/nilai" element={<SiswaNilai />} />
            <Route path="/siswa/presensi" element={<SiswaPresensi />} />
            <Route path="/siswa/jadwal" element={<SiswaJadwal />} />
            <Route path="/siswa/keuangan" element={<SiswaKeuangan />} />
            <Route path="/siswa/ujian" element={<SiswaUjian />} />
            <Route path="/siswa/ujian/:id" element={<SiswaUjianPlayer />} />
            <Route path="/siswa/rapor" element={<SiswaRapor role="siswa" />} />

            {/* Orang Tua Routes */}
            <Route path="/ortu" element={<OrtuDashboard />} />
            <Route path="/ortu/tugas" element={<OrtuTugas />} />
            <Route path="/ortu/nilai" element={<OrtuNilai />} />
            <Route path="/ortu/presensi" element={<OrtuPresensi />} />
            <Route path="/ortu/jadwal" element={<OrtuJadwal />} />
            <Route path="/ortu/keuangan" element={<OrtuKeuangan />} />
            <Route path="/ortu/ujian" element={<OrtuUjian />} />
            <Route path="/ortu/rapor" element={<SiswaRapor role="orang_tua" />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
