import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Sparkles,
  Users,
  School,
  FileText,
  Shield,
  GraduationCap,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { ROLE_HOME, type SchoolRole } from "@/lib/lms";

type CommandItem = {
  id: string;
  category: "Navigasi Cepat" | "Ganti Role Demo" | "Mata Pelajaran & Fitur";
  title: string;
  subtitle?: string;
  icon: typeof Search;
  action: () => void;
  badge?: string;
};

export function CommandPalette({
  isOpen,
  onClose,
  currentRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentRole: SchoolRole;
}) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");

  const loginMutation = trpc.schoolAuth.login.useMutation({
    onSuccess: async (user) => {
      await utils.invalidate();
      onClose();
      navigate(ROLE_HOME[user.role as SchoolRole]);
    },
  });

  const handleSwitch = (email: string) => {
    loginMutation.mutate({ email, password: "password123" });
  };

  const commands: CommandItem[] = [
    // Switch Role
    {
      id: "switch-admin",
      category: "Ganti Role Demo",
      title: "Masuk sebagai Admin Sekolah",
      subtitle: "admin@sekolah.demo — Manajemen kurikulum, rombel & user",
      icon: Shield,
      badge: "Admin",
      action: () => handleSwitch("admin@sekolah.demo"),
    },
    {
      id: "switch-guru",
      category: "Ganti Role Demo",
      title: "Masuk sebagai Budi Santoso, S.Pd.",
      subtitle: "budi@sekolah.demo — Guru Matematika & Wali Kelas 10 IPA 1",
      icon: BookOpen,
      badge: "Guru",
      action: () => handleSwitch("budi@sekolah.demo"),
    },
    {
      id: "switch-siswa",
      category: "Ganti Role Demo",
      title: "Masuk sebagai Andi Pratama",
      subtitle: "andi@sekolah.demo — Siswa Kelas 10 IPA 1",
      icon: GraduationCap,
      badge: "Siswa",
      action: () => handleSwitch("andi@sekolah.demo"),
    },
    {
      id: "switch-ortu",
      category: "Ganti Role Demo",
      title: "Masuk sebagai Hartono Wibowo",
      subtitle: "hartono@sekolah.demo — Orang Tua Andi & Citra",
      icon: Users,
      badge: "Orang Tua",
      action: () => handleSwitch("hartono@sekolah.demo"),
    },

    // Navigation based on Role
    ...(currentRole === "admin"
      ? [
          {
            id: "nav-admin-dash",
            category: "Navigasi Cepat" as const,
            title: "Dashboard Eksekutif Admin",
            subtitle: "Ringkasan metrik sekolah & rombel",
            icon: LayoutDashboard,
            action: () => {
              navigate("/admin");
              onClose();
            },
          },
          {
            id: "nav-admin-kelas",
            category: "Navigasi Cepat" as const,
            title: "Kelola Rombongan Belajar (Kelas)",
            subtitle: "Daftar kelas 10 IPA 1, 10 IPA 2, dll.",
            icon: School,
            action: () => {
              navigate("/admin/kelas");
              onClose();
            },
          },
          {
            id: "nav-admin-presensi",
            category: "Navigasi Cepat" as const,
            title: "Presensi Harian Seluruh Sekolah",
            subtitle: "Monitoring kehadiran seluruh rombel",
            icon: Calendar,
            action: () => {
              navigate("/admin/presensi");
              onClose();
            },
          },
          {
            id: "nav-admin-pengumuman",
            category: "Navigasi Cepat" as const,
            title: "Papan Pengumuman & Surat Edaran",
            subtitle: "Publikasi edaran resmi sekolah",
            icon: Sparkles,
            action: () => {
              navigate("/admin/pengumuman");
              onClose();
            },
          },
        ]
      : []),

    ...(currentRole === "guru"
      ? [
          {
            id: "nav-guru-dash",
            category: "Navigasi Cepat" as const,
            title: "Dashboard Guru & Antrean Koreksi",
            subtitle: "Daftar tugas yang memerlukan penilaian",
            icon: LayoutDashboard,
            action: () => {
              navigate("/guru");
              onClose();
            },
          },
          {
            id: "nav-guru-presensi",
            category: "Navigasi Cepat" as const,
            title: "Lembar Presensi Sesi Mengajar",
            subtitle: "Tandai kehadiran siswa 1-klik",
            icon: Calendar,
            action: () => {
              navigate("/guru/presensi");
              onClose();
            },
          },
          {
            id: "nav-guru-rekap",
            category: "Navigasi Cepat" as const,
            title: "Buku Nilai Matriks & Ekspor CSV",
            subtitle: "Rekapitulasi nilai seluruh siswa per kelas",
            icon: FileText,
            action: () => {
              navigate("/guru/rekap-nilai");
              onClose();
            },
          },
          {
            id: "nav-guru-wali",
            category: "Navigasi Cepat" as const,
            title: "Ruang Perwalian Kelas (Wali Kelas)",
            subtitle: "Direktori siswa & kontak wali murid",
            icon: Users,
            action: () => {
              navigate("/guru/wali-kelas");
              onClose();
            },
          },
        ]
      : []),

    ...(currentRole === "siswa"
      ? [
          {
            id: "nav-siswa-dash",
            category: "Navigasi Cepat" as const,
            title: "Beranda Akademik Siswa",
            subtitle: "Ringkasan deadline tugas & nilai",
            icon: LayoutDashboard,
            action: () => {
              navigate("/siswa");
              onClose();
            },
          },
          {
            id: "nav-siswa-tugas",
            category: "Navigasi Cepat" as const,
            title: "Pusat Tugas & Pengumpulan PR",
            subtitle: "Dropzone berkas tugas aktif",
            icon: FileText,
            action: () => {
              navigate("/siswa/tugas");
              onClose();
            },
          },
          {
            id: "nav-siswa-materi",
            category: "Navigasi Cepat" as const,
            title: "E-Library & Modul Pembelajaran",
            subtitle: "Unduh materi ajar dan slide guru",
            icon: BookOpen,
            action: () => {
              navigate("/siswa/materi");
              onClose();
            },
          },
          {
            id: "nav-siswa-presensi",
            category: "Navigasi Cepat" as const,
            title: "Riwayat Presensi Saya",
            subtitle: "Log kehadiran per sesi mata pelajaran",
            icon: Calendar,
            action: () => {
              navigate("/siswa/presensi");
              onClose();
            },
          },
        ]
      : []),

    ...(currentRole === "orang_tua"
      ? [
          {
            id: "nav-ortu-dash",
            category: "Navigasi Cepat" as const,
            title: "Dashboard Monitoring Anak",
            subtitle: "Pantau progres tugas & capaian belajar",
            icon: LayoutDashboard,
            action: () => {
              navigate("/ortu");
              onClose();
            },
          },
          {
            id: "nav-ortu-nilai",
            category: "Navigasi Cepat" as const,
            title: "Laporan Rapor Nilai Anak",
            subtitle: "Transparansi nilai & catatan guru",
            icon: GraduationCap,
            action: () => {
              navigate("/ortu/nilai");
              onClose();
            },
          },
          {
            id: "nav-ortu-presensi",
            category: "Navigasi Cepat" as const,
            title: "Monitoring Kehadiran Anak",
            subtitle: "Deteksi kehadiran harian di sekolah",
            icon: Calendar,
            action: () => {
              navigate("/ortu/presensi");
              onClose();
            },
          },
        ]
      : []),
  ];

  const filtered = commands.filter((c) => {
    const term = query.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      (c.subtitle?.toLowerCase().includes(term) ?? false) ||
      c.category.toLowerCase().includes(term)
    );
  });

  const categories = Array.from(new Set(filtered.map((f) => f.category)));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-card/95 backdrop-blur-3xl border border-border/70 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ring-1 ring-white/10">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/70 bg-background/50">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Ketik navigasi atau fitur..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-50">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 min-h-[100px]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tidak ditemukan hasil untuk &ldquo;{query}&rdquo;
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1.5 block">
                  {cat}
                </span>
                {filtered
                  .filter((f) => f.category === cat)
                  .map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={cmd.action}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-primary hover:text-white text-left transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-background/80 border border-border text-muted-foreground flex items-center justify-center shrink-0 group-hover:bg-white/20 group-hover:border-transparent group-hover:text-foreground shadow-sm">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-card-foreground block group-hover:text-foreground">
                              {cmd.title}
                            </span>
                            {cmd.subtitle && (
                              <span className="text-[11px] text-muted-foreground block group-hover:text-foreground/80">
                                {cmd.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {cmd.badge && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border border-blue-200 dark:border-primary/30 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30">
                              {cmd.badge}
                            </span>
                          )}
                          <kbd className="hidden group-hover:inline-flex h-5 items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-bold text-foreground shadow-sm">
                            <span className="text-xs">↵</span>
                          </kbd>
                        </div>
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2.5 bg-background border-t border-border/70 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Gunakan panah untuk navigasi &bull; Enter untuk pilih</span>
          <span className="font-mono bg-card px-2 py-0.5 rounded text-foreground border border-border">
            Ctrl + K
          </span>
        </div>
      </div>
    </div>
  );
}
