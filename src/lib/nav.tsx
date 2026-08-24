import {
  LayoutDashboard,
  School,
  BookOpen,
  Users,
  ClipboardList,
  Calendar,
  CreditCard,
  Sparkles,
  FileText,
  FileCheck2,
  Table as TableIcon,
  Clock,
  Paperclip,
  GraduationCap,
  BarChart3,
} from "lucide-react";
import type { NavItem } from "@/components/SchoolLayout";

export const ADMIN_NAV: NavItem[] = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: <LayoutDashboard className="h-4 w-4" />,
    section: "Utama",
  },
  {
    label: "Rombel (Kelas)",
    path: "/admin/kelas",
    icon: <School className="h-4 w-4" />,
    section: "Akademik & Kurikulum",
  },
  {
    label: "Mata Pelajaran",
    path: "/admin/mapel",
    icon: <BookOpen className="h-4 w-4" />,
    section: "Akademik & Kurikulum",
  },
  {
    label: "Master Jadwal",
    path: "/admin/jadwal",
    icon: <ClipboardList className="h-4 w-4" />,
    section: "Akademik & Kurikulum",
  },
  {
    label: "Pengguna & Relasi",
    path: "/admin/pengguna",
    icon: <Users className="h-4 w-4" />,
    section: "Pengguna & Komunikasi",
  },
  {
    label: "Pengumuman",
    path: "/admin/pengumuman",
    icon: <Sparkles className="h-4 w-4" />,
    section: "Pengguna & Komunikasi",
  },
  {
    label: "Presensi Sekolah",
    path: "/admin/presensi",
    icon: <Calendar className="h-4 w-4" />,
    section: "Operasional & Finansial",
  },
  {
    label: "Keuangan & SPP",
    path: "/admin/keuangan",
    icon: <CreditCard className="h-4 w-4" />,
    section: "Operasional & Finansial",
  },
];

export const GURU_NAV: NavItem[] = [
  {
    label: "Dashboard",
    path: "/guru",
    icon: <LayoutDashboard className="h-4 w-4" />,
    section: "Utama",
  },
  {
    label: "Kelas & Tugas",
    path: "/guru/kelas",
    icon: <BookOpen className="h-4 w-4" />,
    section: "Pembelajaran & Materi",
  },
  {
    label: "Modul & Materi",
    path: "/guru/materi",
    icon: <FileText className="h-4 w-4" />,
    section: "Pembelajaran & Materi",
  },
  {
    label: "Ujian & Kuis CBT",
    path: "/guru/ujian",
    icon: <FileCheck2 className="h-4 w-4" />,
    section: "Evaluasi & Nilai",
  },
  {
    label: "Rekap Nilai",
    path: "/guru/rekap-nilai",
    icon: <TableIcon className="h-4 w-4" />,
    section: "Evaluasi & Nilai",
  },
  {
    label: "Presensi Siswa",
    path: "/guru/presensi",
    icon: <Calendar className="h-4 w-4" />,
    section: "Aktivitas & Perwalian",
  },
  {
    label: "Jadwal Mengajar",
    path: "/guru/jadwal",
    icon: <Clock className="h-4 w-4" />,
    section: "Aktivitas & Perwalian",
  },
  {
    label: "Ruang Wali Kelas",
    path: "/guru/wali-kelas",
    icon: <Users className="h-4 w-4" />,
    section: "Aktivitas & Perwalian",
  },
];

export const SISWA_NAV: NavItem[] = [
  {
    label: "Dashboard",
    path: "/siswa",
    icon: <LayoutDashboard className="h-4 w-4" />,
    section: "Utama",
  },
  {
    label: "Tugas & PR",
    path: "/siswa/tugas",
    icon: <Paperclip className="h-4 w-4" />,
    section: "Pembelajaran",
  },
  {
    label: "Materi Belajar",
    path: "/siswa/materi",
    icon: <FileText className="h-4 w-4" />,
    section: "Pembelajaran",
  },
  {
    label: "Ujian & Kuis CBT",
    path: "/siswa/ujian",
    icon: <FileCheck2 className="h-4 w-4" />,
    section: "Evaluasi & Prestasi",
  },
  {
    label: "Nilai & Progres",
    path: "/siswa/nilai",
    icon: <BookOpen className="h-4 w-4" />,
    section: "Evaluasi & Prestasi",
  },
  {
    label: "E-Rapor Resmi",
    path: "/siswa/rapor",
    icon: <GraduationCap className="h-4 w-4" />,
    section: "Evaluasi & Prestasi",
  },
  {
    label: "Presensi Saya",
    path: "/siswa/presensi",
    icon: <Calendar className="h-4 w-4" />,
    section: "Aktivitas & Keuangan",
  },
  {
    label: "Jadwal Pelajaran",
    path: "/siswa/jadwal",
    icon: <Clock className="h-4 w-4" />,
    section: "Aktivitas & Keuangan",
  },
  {
    label: "Keuangan & SPP",
    path: "/siswa/keuangan",
    icon: <CreditCard className="h-4 w-4" />,
    section: "Aktivitas & Keuangan",
  },
];

export const ORTU_NAV: NavItem[] = [
  {
    label: "Dashboard",
    path: "/ortu",
    icon: <LayoutDashboard className="h-4 w-4" />,
    section: "Utama",
  },
  {
    label: "Tugas & PR Anak",
    path: "/ortu/tugas",
    icon: <BookOpen className="h-4 w-4" />,
    section: "Monitoring Akademik",
  },
  {
    label: "Ujian & Kuis CBT",
    path: "/ortu/ujian",
    icon: <FileCheck2 className="h-4 w-4" />,
    section: "Monitoring Akademik",
  },
  {
    label: "Laporan Nilai",
    path: "/ortu/nilai",
    icon: <BarChart3 className="h-4 w-4" />,
    section: "Monitoring Akademik",
  },
  {
    label: "E-Rapor Resmi",
    path: "/ortu/rapor",
    icon: <GraduationCap className="h-4 w-4" />,
    section: "Monitoring Akademik",
  },
  {
    label: "Presensi Kehadiran",
    path: "/ortu/presensi",
    icon: <Calendar className="h-4 w-4" />,
    section: "Kehadiran & Jadwal",
  },
  {
    label: "Jadwal Sekolah",
    path: "/ortu/jadwal",
    icon: <Clock className="h-4 w-4" />,
    section: "Kehadiran & Jadwal",
  },
  {
    label: "Keuangan & SPP",
    path: "/ortu/keuangan",
    icon: <CreditCard className="h-4 w-4" />,
    section: "Administrasi Finansial",
  },
];
