import { Link, useNavigate } from "react-router";
import {
  Shield,
  BookOpen,
  GraduationCap,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Layers,
  Award,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { ROLE_HOME, type SchoolRole } from "@/lib/lms";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/providers/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

const PERSONAS: {
  role: SchoolRole;
  title: string;
  subtitle: string;
  name: string;
  email: string;
  desc: string;
  badge: string;
  icon: typeof Shield;
  color: string;
  features: string[];
}[] = [
  {
    role: "admin",
    title: "Portal Administrator",
    subtitle: "Pusat Operasional Sekolah",
    name: "Admin Sekolah",
    email: "admin@sekolah.demo",
    desc: "Kelola rombongan belajar, kurikulum mapel, akun pengguna, relasi orang tua-siswa, dan master jadwal terpadu.",
    badge: "bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border-primary/40",
    icon: Shield,
    color: "#0984E3",
    features: [
      "Manajemen Rombel, Pengguna & Relasi",
      "Administrasi Finansial & SPP Massal",
      "Master Jadwal & Kalender Akademik",
      "Papan Pengumuman & Mading Digital",
    ],
  },
  {
    role: "guru",
    title: "Portal Tenaga Pendidik",
    subtitle: "Guru Pengampu & Wali Kelas",
    name: "Budi Santoso, S.Pd.",
    email: "budi@sekolah.demo",
    desc: "Koreksi submission tugas, presensi batch 1-klik, bank ujian CBT & timer otomatis, serta pemetaan peringkat kelas.",
    badge: "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border-[#23A559]/40",
    icon: BookOpen,
    color: "#23A559",
    features: [
      "Preset Koreksi Cepat & Feedback",
      "Bank Soal & Ujian Online CBT",
      "Presensi Sesi & Kelas Pengganti",
      "Buku Nilai & Peringkat Rombel",
    ],
  },
  {
    role: "siswa",
    title: "Portal Siswa Aktif",
    subtitle: "Pusat Pembelajaran Mandiri",
    name: "Andi Pratama",
    email: "andi@sekolah.demo",
    desc: "Pantau deadline tugas aktif, kuis CBT dengan live timer & anti-curang, status administrasi SPP, dan lembar E-Rapor resmi.",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    icon: GraduationCap,
    color: "#8b5cf6",
    features: [
      "Player Ujian CBT & Countdown Timer",
      "Pengumpulan Berkas Tugas (Maks 5MB)",
      "E-Rapor Resmi Kurikulum Merdeka",
      "Status Bebas Administrasi & SPP",
    ],
  },
  {
    role: "orang_tua",
    title: "Portal Orang Tua Murid",
    subtitle: "Monitoring Akademik Multi-Anak",
    name: "Hartono Wibowo",
    email: "hartono@sekolah.demo",
    desc: "Pantau perkembangan akademik multi-anak secara terpadu. Cek tugas, hasil CBT, pembayaran SPP online, dan unduh kuitansi resmi.",
    badge: "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border-[#F0B232]/40",
    icon: Users,
    color: "#F0B232",
    features: [
      "Selector Multi-Anak (Andi & Citra)",
      "Riwayat Ujian CBT & Kuis Ananda",
      "Pembayaran SPP & Kuitansi Sah",
      "Lembar E-Rapor Digital Ananda",
    ],
  },
];

export default function Home() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { resolvedTheme } = useTheme();

  const loginMut = trpc.schoolAuth.login.useMutation({
    onSuccess: async (user) => {
      await utils.invalidate();
      navigate(ROLE_HOME[user.role as SchoolRole]);
    },
  });

  const handleInstantLogin = (email: string) => {
    loginMut.mutate({ email, password: "password123" });
  };

  return (
    <div className="min-h-screen bg-background text-card-foreground font-sans antialiased selection:bg-primary selection:text-white pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={
                resolvedTheme === "light"
                  ? "/brand/sokara-horizontal-light-bg.svg"
                  : "/brand/sokara-horizontal-dark-bg.svg"
              }
              alt="Sokara LMS"
              className="h-7 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="flex items-center gap-2">
              <span className="font-brand font-bold text-foreground text-base tracking-wide">
                LMS SEKOLAH
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border border-primary/40">
                Single-Tenant Demo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Button
              asChild
              className="h-9 bg-primary hover:bg-[#0097E6] text-white text-xs font-bold rounded-xl shadow-sm px-4"
            >
              <Link to="/login">
                Masuk ke Portal <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 pt-12 pb-16">
        <div className="max-w-5xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-secondary border border-border text-xs font-semibold text-card-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Sistem Operasional Akademik Sekolah Indonesia
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-brand text-foreground tracking-tight leading-tight">
            Manajemen Tugas, Nilai, Presensi &amp; Jadwal Sekolah Tanpa Hambatan
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Platform LMS sekolah terpadu yang dirancang khusus untuk memenuhi alur kerja nyata guru, siswa, orang tua, dan manajemen sekolah.
          </p>
        </div>
      </section>

      {/* 4 Personas Showcase (1-Click Instant Login Cards) */}
      <section className="px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/60">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-brand text-foreground">
              Eksplorasi Portal Per Role (1-Klik Masuk Demo)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih salah satu peran di bawah untuk langsung mencoba fungsionalitas sistem secara nyata
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.role}
                className="rounded-2xl bg-card border border-border p-6 shadow-xl flex flex-col justify-between hover:border-primary hover:bg-secondary transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-foreground shadow-md shadow-black/30"
                        style={{ backgroundColor: `${p.color}25`, color: p.color }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${p.badge}`}>
                          {p.title}
                        </span>
                        <h3 className="text-base font-bold text-foreground mt-1 group-hover:text-blue-600 dark:hover:text-[#70B8FF] transition-colors">
                          {p.name}
                        </h3>
                        <span className="text-xs text-muted-foreground font-mono">{p.email}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-card-foreground leading-relaxed bg-background p-3.5 rounded-xl border border-border/60">
                    {p.desc}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider block">
                      Fitur Utama Portal:
                    </span>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {p.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-card-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-[#57F287] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Password: <code className="text-card-foreground">password123</code>
                  </span>

                  <Button
                    type="button"
                    onClick={() => handleInstantLogin(p.email)}
                    disabled={loginMut.isPending}
                    className="h-9 bg-primary hover:bg-[#0097E6] text-white text-xs font-bold rounded-xl shadow-sm px-4"
                  >
                    Buka Dashboard {p.name.split(" ")[0]} &rarr;
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* School Highlights & Guardrails */}
      <section className="px-4 sm:px-8 max-w-7xl mx-auto mt-16">
        <div className="rounded-2xl bg-card border border-border p-8 shadow-xl">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
            <h3 className="text-xl font-bold font-brand text-foreground">
              Standar Rekayasa Perangkat Lunak Sokara AI
            </h3>
            <p className="text-xs text-muted-foreground">
              Dibangun dengan arsitektur tangguh, aman, dan dirancang khusus untuk kenyamanan pengguna
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-background border border-border space-y-2">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
                <Shield className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Poka-Yoke Error Proofing</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pencegahan eror input nilai, validasi ukuran file maksimal 5MB, dan isolasi izin akses antar role.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border space-y-2">
              <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center font-bold">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Idempotent Database</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Skema data LibSQL SQLite lokal yang otomatis dibuat dan disiapkan tanpa setup manual yang rumit.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border space-y-2">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] flex items-center justify-center font-bold">
                <Award className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Ergonomi Mobile Terdepan</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Navigasi bilah bawah satu-jempol (1-thumb) untuk akses cepat siswa dan orang tua melalui smartphone.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
