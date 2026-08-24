import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  LogOut,
  Menu,
  Shield,
  BookOpen,
  GraduationCap,
  Users,
  Sparkles,
  ChevronRight,
  ArrowRightLeft,
  X,
  Clock,
  CheckCircle2,
  Search,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { useSchoolAuth } from "@/hooks/useSchoolAuth";
import { ROLE_HOME, ROLE_LABEL, type SchoolRole } from "@/lib/lms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { trpc } from "@/providers/trpc";
import { useTheme } from "@/providers/ThemeProvider";
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";

export type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
  section?: string;
};

const ROLE_CONFIG: Record<
  SchoolRole,
  { icon: typeof Shield; color: string; badgeClass: string; gradient: string }
> = {
  admin: {
    icon: Shield,
    color: "#0984E3",
    badgeClass: "badge-info",
    gradient: "from-blue-600 to-indigo-600",
  },
  guru: {
    icon: BookOpen,
    color: "#23A559",
    badgeClass: "badge-success",
    gradient: "from-emerald-600 to-teal-600",
  },
  siswa: {
    icon: GraduationCap,
    color: "#8b5cf6",
    badgeClass: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
    gradient: "from-purple-600 to-pink-600",
  },
  orang_tua: {
    icon: Users,
    color: "#F0B232",
    badgeClass: "badge-warning",
    gradient: "from-amber-600 to-orange-600",
  },
};

const QUICK_SWITCH_ACCOUNTS: {
  name: string;
  email: string;
  role: SchoolRole;
  desc: string;
}[] = [
  {
    name: "Admin Sekolah",
    email: "admin@sekolah.demo",
    role: "admin",
    desc: "Akses penuh manajemen kurikulum, kelas & data pengguna",
  },
  {
    name: "Budi Santoso, S.Pd.",
    email: "budi@sekolah.demo",
    role: "guru",
    desc: "Guru Matematika & Wali Kelas 10 IPA 1",
  },
  {
    name: "Andi Pratama",
    email: "andi@sekolah.demo",
    role: "siswa",
    desc: "Siswa Kelas 10 IPA 1 (Submit tugas & cek nilai)",
  },
  {
    name: "Hartono Wibowo",
    email: "hartono@sekolah.demo",
    role: "orang_tua",
    desc: "Orang Tua 2 Siswa: Andi Pratama & Citra Lestari",
  },
];

function NavLinks({
  nav,
  onItemClick,
  isCollapsed,
}: {
  nav: NavItem[];
  onItemClick?: () => void;
  isCollapsed?: boolean;
}) {
  const groupedNav = nav.reduce((acc, item) => {
    const section = item.section || "Menu Utama";
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const groups = Object.entries(groupedNav).map(([title, items]) => ({ title, items }));

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {groups.map((group, idx) => (
          <div key={idx}>
            {!isCollapsed ? (
              <p className="mb-1 px-3 pb-1 pt-4 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                {group.title}
              </p>
            ) : (
              <div className="pt-4 pb-2 flex justify-center">
                <div className="h-px w-6 bg-border/50" />
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const linkObj = (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      `flex items-center ${isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5"} rounded-xl text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`
                    }
                  >
                    {item.icon}
                    {!isCollapsed && <span className="truncate font-semibold uppercase tracking-tight">{item.label}</span>}
                  </NavLink>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{linkObj}</TooltipTrigger>
                      <TooltipContent side="right" className="font-bold text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return linkObj;
              })}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

  
export function SchoolLayout({
  nav,
  children,
  title = "Dashboard",
}: {
  nav: NavItem[];
  children: ReactNode;
  title?: string;
  role: SchoolRole;
}) {
  const { user, isLoading, logout } = useSchoolAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
    const [currentTime, setCurrentTime] = useState<string>("");
  

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loginMutation = trpc.schoolAuth.login.useMutation({
    onSuccess: async (loggedInUser) => {
      await utils.invalidate();
      setShowSwitchModal(false);
      navigate(ROLE_HOME[loggedInUser.role as SchoolRole]);
    },
  });

  const handleQuickSwitch = (email: string) => {
    loginMutation.mutate({ email, password: "password123" });
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border shadow-xl animate-pulse">
            <img src="/brand/sokara-logomark-transparent-light.svg" className="h-8 w-8 opacity-50 hidden dark:block" />
            <img src="/brand/sokara-logomark-transparent-dark.svg" className="h-8 w-8 opacity-50 block dark:hidden" />
          </div>
          <p className="text-sm font-bold tracking-widest uppercase">Memuat...</p>
        </div>
      </div>
    );
  }

  const roleMeta = ROLE_CONFIG[user.role as SchoolRole] || ROLE_CONFIG.siswa;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-background/90 backdrop-blur-xl border-r border-border/50">
      {/* Brand Header */}
      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} px-4 py-5 border-b border-border/40 h-16`}>
        {isSidebarCollapsed ? (
          <img
            src={
              resolvedTheme === "light"
                ? "/brand/sokara-logomark-transparent-dark.svg"
                : "/brand/sokara-logomark-transparent-light.svg"
            }
            alt="Sokara"
            className="h-6 w-6"
          />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <img
                src={
                  resolvedTheme === "light"
                    ? "/brand/sokara-horizontal-light-bg.svg"
                    : "/brand/sokara-horizontal-dark-bg.svg"
                }
                alt="Sokara LMS"
                className="h-6 w-auto"
              />
            </div>
            <Badge className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${roleMeta.badgeClass}`}>
              {ROLE_LABEL[user.role]}
            </Badge>
          </>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
        <NavLinks nav={nav} onItemClick={() => setMobileOpen(false)} isCollapsed={isSidebarCollapsed} />
      </div>

      {/* User Footer Card */}
      <div className={`border-t border-border/50 ${isSidebarCollapsed ? "p-3 flex flex-col gap-3 items-center" : "p-4"} bg-card/40 transition-all`}>
        <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} mb-1 w-full`}>
          <div className="relative">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${roleMeta.gradient} text-foreground font-bold text-sm shadow-md`}
            >
              {user.name.charAt(0)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#23A559] border-2 border-background shadow-sm" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
        </div>

        {!isSidebarCollapsed ? (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg bg-card border-border text-xs font-semibold text-primary hover:bg-secondary hover:text-foreground"
              onClick={() => setShowSwitchModal(true)}
            >
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
              Switch
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg bg-card border-border text-xs font-semibold text-[#F23F43] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 hover:border-[#F23F43]/40"
              onClick={logout}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Keluar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2 w-full">
            <Button variant="ghost" size="icon" onClick={() => setShowSwitchModal(true)} className="h-9 w-9 rounded-xl hover:bg-secondary text-primary mx-auto">
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} className="h-9 w-9 rounded-xl hover:bg-red-100 dark:hover:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] mx-auto">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      {/* Sidebar Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden ${isSidebarCollapsed ? "w-20" : "w-64"} transition-all duration-300 ease-in-out lg:block print:hidden`}>
        {sidebarContent}
      </aside>

      {/* Topbar Mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/50 bg-background/75 backdrop-blur-xl px-4 py-3 lg:hidden print:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <SheetContent side="left" className="w-72 p-0 border-none">
              {sidebarContent}
            </SheetContent>
          </Sheet>

          <img
            src={
              resolvedTheme === "light"
                ? "/brand/sokara-horizontal-light-bg.svg"
                : "/brand/sokara-horizontal-dark-bg.svg"
            }
            alt="Sokara LMS"
            className="h-6 w-auto"
          />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-xl text-xs bg-card border-border text-primary font-semibold"
            onClick={() => setShowSwitchModal(true)}
          >
            <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
            Role
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"} flex flex-col min-h-screen transition-all duration-300 ease-in-out print:pl-0 print:m-0 print:w-full print:min-h-0`}>
        {/* Desktop Top Header Bar */}
        <header className="hidden lg:flex items-center justify-between h-16 border-b border-border/40 bg-card/75 backdrop-blur-xl px-8 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden lg:flex h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground">
                {isSidebarCollapsed ? <PanelRightClose className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            <span className="font-brand font-bold text-foreground tracking-wide">Sokara LMS</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize font-medium">{ROLE_LABEL[user.role]}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary font-semibold">{title}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Search & Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-all shadow-inner w-44 xl:w-56 justify-between"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">Cari fitur, menu...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-card text-[10px] font-mono text-muted-foreground border border-border">
                Ctrl+K
              </kbd>
            </button>

            {/* Live Clock Widget */}
            <div className="flex items-center gap-2 rounded-xl bg-background border border-border/70 px-3 py-1.5 text-xs text-muted-foreground font-mono shadow-inner">
              <Clock className="h-3.5 w-3.5 text-green-600 dark:text-[#57F287] animate-spin-slow" />
              <span>{currentTime || "..."}</span>
            </div>

            {/* Theme Toggle Button (Light / Dark Mode) */}
            <ThemeToggle />

            {/* Quick Demo Switcher Pill */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-xl bg-background border-border text-xs font-bold text-primary hover:bg-secondary hover:text-foreground transition-all shadow-sm"
              onClick={() => setShowSwitchModal(true)}
            >
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
              Ganti Role Demo
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto pb-20 sm:pb-8 print:p-0 print:m-0 print:max-w-none print:w-full">
          {/* Official Letterhead Header for Print / PDF Export */}
          <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold font-brand tracking-tight text-black">
                  SOKARA ACADEMY &bull; LMS SEKOLAH
                </h1>
                <p className="text-xs text-slate-700 font-medium">
                  Sistem Informasi Administrasi Kurikulum, Presensi, &amp; Penilaian Terpadu
                </p>
              </div>
              <div className="text-right text-[10pt] text-slate-800">
                <p className="font-bold uppercase tracking-wider">{title}</p>
                <p className="text-[8pt] text-slate-600">
                  Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} &bull; {user.name} ({ROLE_LABEL[user.role]})
                </p>
              </div>
            </div>
          </div>

          {children}

          {/* Official Print Signature Block for Physical Paper / Legal Records */}
          <div className="hidden print:flex justify-between mt-16">
            <div className="text-center text-xs w-48">
              <p className="text-slate-600 mb-14">Mengetahui,<br /><span className="font-semibold text-black">Kepala Sekolah / Kurikulum</span></p>
              <p className="border-t border-slate-900 pt-1 font-bold text-black">( ............................................ )</p>
              <p className="text-[9px] text-slate-600">NIP. ........................................</p>
            </div>

            <div className="text-center text-xs w-48">
              <p className="text-slate-600 mb-14">Petugas / Pengampu,<br /><span className="font-semibold text-black">{user.name}</span></p>
              <p className="border-t border-slate-900 pt-1 font-bold text-black">( {user.name} )</p>
              <p className="text-[9px] text-slate-600">ID Pengguna: #{user.id} &bull; {ROLE_LABEL[user.role]}</p>
            </div>
          </div>
        </main>

        {/* Mobile Floating Bottom Bar for Thumb Navigation */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border px-2 py-2 flex items-center justify-around shadow-2xl print:hidden">
          {nav.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split("/").length <= 2}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-card-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-lg transition-transform ${
                      isActive
                        ? "bg-blue-100 dark:bg-primary/20 scale-110 shadow-sm"
                        : ""
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[10px] tracking-tight truncate max-w-16">
                    {item.label.split(" ")[0]}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Quick Switch Role Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-primary/20 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-brand text-foreground">
                    Ganti Role Demo
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Pilih akun untuk langsung masuk tanpa logout manual
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-2.5 py-4">
              {QUICK_SWITCH_ACCOUNTS.map((acc) => {
                const meta = ROLE_CONFIG[acc.role];
                const Icon = meta.icon;
                const isCurrent = user.email === acc.email;

                return (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={loginMutation.isPending}
                    onClick={() => handleQuickSwitch(acc.email)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? "bg-secondary border-primary shadow-md"
                        : "bg-background border-border/70 hover:border-border hover:bg-secondary/70"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-foreground shadow-sm`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {acc.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${meta.badgeClass}`}
                          >
                            {ROLE_LABEL[acc.role]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {acc.desc}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {isCurrent ? (
                        <span className="text-xs font-bold text-green-600 dark:text-[#57F287] flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-primary hover:underline">
                          Pilih &rarr;
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Single-Tenant Demo Engine &bull; Password: <code className="text-card-foreground">password123</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        currentRole={user.role}
      />
    </div>
  );
}
