import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  BookOpen,
  GraduationCap,
  Users,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { ROLE_HOME, ROLE_LABEL, type SchoolRole } from "@/lib/lms";
import { useTheme } from "@/providers/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS: {
  name: string;
  email: string;
  role: SchoolRole;
  note: string;
  detail: string;
  icon: typeof Shield;
  gradient: string;
  accentBadge: string;
}[] = [
  {
    name: "Admin Sekolah",
    email: "admin@sekolah.demo",
    role: "admin",
    note: "Kelola Sekolah & Kelas",
    detail: "Setup rombel, alokasi guru mapel, data siswa",
    icon: Shield,
    gradient: "from-blue-600 to-indigo-600",
    accentBadge: "badge-info",
  },
  {
    name: "Budi Santoso, S.Pd.",
    email: "budi@sekolah.demo",
    role: "guru",
    note: "Guru Matematika & Wali Kelas",
    detail: "10 IPA 1 & 10 IPA 2, buat tugas & input nilai",
    icon: BookOpen,
    gradient: "from-emerald-600 to-teal-600",
    accentBadge: "badge-success",
  },
  {
    name: "Andi Pratama",
    email: "andi@sekolah.demo",
    role: "siswa",
    note: "Siswa 10 IPA 1",
    detail: "Cek tugas aktif, submit PR, lihat nilai & jadwal",
    icon: GraduationCap,
    gradient: "from-purple-600 to-pink-600",
    accentBadge: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
  },
  {
    name: "Hartono Wibowo",
    email: "hartono@sekolah.demo",
    role: "orang_tua",
    note: "Orang Tua (Multi-Anak)",
    detail: "Pantau progres 2 anak (Andi Pratama & Citra Lestari)",
    icon: Users,
    gradient: "from-amber-600 to-orange-600",
    accentBadge: "badge-warning",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { resolvedTheme } = useTheme();
  const [email, setEmail] = useState("admin@sekolah.demo");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState<SchoolRole>("admin");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.schoolAuth.login.useMutation({
    onSuccess: async (user) => {
      await utils.invalidate();
      navigate(ROLE_HOME[user.role as SchoolRole]);
    },
    onError: (err) => setError(err.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate({ email, password });
  };

  const handleQuickLogin = (demoEmail: string, role: SchoolRole) => {
    setEmail(demoEmail);
    setPassword("password123");
    setSelectedRoleTab(role);
    setError(null);
    loginMutation.mutate({ email: demoEmail, password: "password123" });
  };

  const handleSelectRoleTab = (role: SchoolRole) => {
    setSelectedRoleTab(role);
    const target = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (target) {
      setEmail(target.email);
      setPassword("password123");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between text-white selection:bg-primary/30 selection:text-white">
      {/* Top Brand Bar */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={
                resolvedTheme === "light"
                  ? "/brand/sokara-horizontal-light-bg.svg"
                  : "/brand/sokara-horizontal-dark-bg.svg"
              }
              alt="Sokara LMS"
              className="h-7 w-auto"
            />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 dark:bg-primary/15 text-blue-600 dark:text-[#70B8FF] border border-blue-200 dark:border-primary/30">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Single-Tenant Demo
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Brand Pitch & Value Prop */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-card border border-border text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-[#F0B232]" />
              Platform Operasional Sekolah Modern
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold font-brand tracking-tight text-foreground leading-tight">
              Satu Sistem Untuk{" "}
              <span className="text-blue-600 dark:text-[#70B8FF]">
                Seluruh Ekosistem
              </span>{" "}
              Sekolah.
            </h1>

            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Solusi terpusat untuk mengelola rombel, tugas, penilaian terstruktur, dan
              jadwal mingguan tanpa spreadsheet manual yang tercecer.
            </p>

            {/* Feature Highlights List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-lg bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">4 Role Terintegrasi</p>
                  <p className="text-xs text-muted-foreground">
                    Admin, Guru Mapel & Wali Kelas, Siswa, dan Orang Tua multi-anak.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Penilaian Transparan (FR-12)</p>
                  <p className="text-xs text-muted-foreground">
                    Pembedaan tegas status "Belum Dinilai" (null) vs "Dinilai 0" eksplisit.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-lg bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Zero Cloud Dependency</p>
                  <p className="text-xs text-muted-foreground">
                    Berjalan mandiri di SQLite lokal dengan database terinisialisasi otomatis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login & Demo Switcher */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="bg-card/95 border-border shadow-2xl backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold font-brand text-foreground">
                      Masuk ke Sistem
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Pilih role atau masukkan kredensial akun Anda
                    </CardDescription>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center">
                    <img
                      src={
                        resolvedTheme === "light"
                          ? "/brand/sokara-logomark-transparent-dark.svg"
                          : "/brand/sokara-logomark-transparent-light.svg"
                      }
                      alt="Sokara"
                      className="h-6 w-6"
                    />
                  </div>
                </div>

                {/* Role Tabs Selector */}
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-background rounded-xl border border-border/60 mt-4">
                  {(["admin", "guru", "siswa", "orang_tua"] as SchoolRole[]).map((r) => {
                    const isActive = selectedRoleTab === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleSelectRoleTab(r)}
                        className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-secondary text-foreground shadow-md border border-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-card"
                        }`}
                      >
                        {ROLE_LABEL[r]}
                      </button>
                    );
                  })}
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-card-foreground">
                      Email Akun
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@sekolah.demo"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 bg-background border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="password"
                        className="text-xs font-semibold text-card-foreground"
                      >
                        Password
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Demo: <code className="text-card-foreground">password123</code>
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 bg-background border-border text-sm text-foreground pr-10 focus:border-primary focus:ring-primary/20 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-100 dark:bg-[#F23F43]/15 border border-red-200 dark:border-[#F23F43]/30 text-xs text-red-600 dark:text-[#FF7074]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary hover:bg-[#0097E6] text-white font-semibold rounded-xl shadow-sm transition-all text-sm"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      "Memverifikasi..."
                    ) : (
                      <>
                        Masuk ke Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Instant 1-Click Demo Accounts Grid */}
                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-semibold text-card-foreground">
                      Atau Masuk Cepat (1-Click Demo):
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Klik kartu untuk langsung login
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {DEMO_ACCOUNTS.map((acc) => {
                      const Icon = acc.icon;
                      return (
                        <button
                          key={acc.email}
                          type="button"
                          disabled={loginMutation.isPending}
                          onClick={() => handleQuickLogin(acc.email, acc.role)}
                          className="group relative flex flex-col p-3 rounded-xl bg-background border border-border/70 text-left transition-all hover:border-primary hover:bg-secondary/80 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-6 w-6 rounded-md bg-gradient-to-br ${acc.gradient} text-foreground flex items-center justify-center shrink-0`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:hover:text-[#70B8FF]">
                                {ROLE_LABEL[acc.role]}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              Masuk &rarr;
                            </span>
                          </div>
                          <p className="text-xs font-medium text-foreground truncate">
                            {acc.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {acc.detail}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; 2026 Sokara AI. LMS Sekolah Single-Tenant (Local Demo Engine).
        </p>
      </footer>
    </div>
  );
}
