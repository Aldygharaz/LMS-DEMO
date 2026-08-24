import { useState, useDeferredValue } from "react";
import { Link } from "react-router";
import {
  BookOpen,
  ClipboardList,
  School,
  Users,
  ArrowRight,
  Plus,
  GraduationCap,
  Sparkles,
  Search,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { StatCard, EmptyState, TableSkeleton } from "@/components/lms-shared";
import { AcademicCalendarWidget } from "@/components/AcademicCalendarWidget";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTanggal } from "@/lib/lms";

import { ADMIN_NAV } from "@/lib/nav";
export { ADMIN_NAV };

export default function AdminDashboard() {
  const stats = trpc.admin.stats.useQuery();
  const kelasList = trpc.admin.listKelas.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredKelas = kelasList.data?.filter(
    (k) =>
      k.nama.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      k.waliNama.toLowerCase().includes(deferredSearchTerm.toLowerCase()),
  );

  const siswaCount = stats.data?.siswaCount ?? 0;
  const guruCount = stats.data?.guruCount ?? 0;
  const kelasCount = stats.data?.kelasCount ?? 0;
  const rasioGuruSiswa = guruCount > 0 ? (siswaCount / guruCount).toFixed(1) : "—";
  const rataSiswaKelas = kelasCount > 0 ? Math.round(siswaCount / kelasCount) : "—";

  return (
    <SchoolLayout role="admin" title="Dashboard Admin" nav={ADMIN_NAV}>
      {/* Top Banner */}
      <div className="relative mb-8 rounded-2xl bg-card border border-border p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-background border border-border text-xs font-semibold text-card-foreground mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Pusat Kendali Akademik Terpadu
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-brand text-foreground">
              Panel Eksekutif Operasional Sekolah
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-2xl">
              Pantau seluruh rombongan belajar, alokasi guru pengampu, distribusi tugas aktif, dan relasi orang tua-siswa secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              asChild
              className="bg-primary hover:bg-[#0097E6] text-white rounded-xl shadow-lg shadow-[#0984E3]/25 text-xs font-bold h-10 px-4"
            >
              <Link to="/admin/kelas">
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Rombel
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-background border-border text-foreground hover:bg-secondary rounded-xl text-xs font-semibold h-10 px-4"
            >
              <Link to="/admin/pengguna">
                <Users className="mr-1.5 h-4 w-4 text-green-600 dark:text-[#57F287]" />
                Kelola Pengguna
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <StatCard
          label="Kelas Aktif"
          value={stats.data?.kelasCount ?? "—"}
          icon={<School className="h-5 w-5" />}
          colorScheme="blue"
        />
        <StatCard
          label="Guru Pengampu"
          value={stats.data?.guruCount ?? "—"}
          icon={<Users className="h-5 w-5" />}
          colorScheme="green"
        />
        <StatCard
          label="Total Siswa"
          value={stats.data?.siswaCount ?? "—"}
          icon={<GraduationCap className="h-5 w-5" />}
          colorScheme="purple"
        />
        <StatCard
          label="Orang Tua"
          value={stats.data?.ortuCount ?? "—"}
          icon={<Users className="h-5 w-5" />}
          colorScheme="amber"
        />
        <StatCard
          label="Mata Pelajaran"
          value={stats.data?.mapelCount ?? "—"}
          icon={<BookOpen className="h-5 w-5" />}
          colorScheme="blue"
        />
        <StatCard
          label="Total Tugas"
          value={stats.data?.tugasCount ?? "—"}
          icon={<ClipboardList className="h-5 w-5" />}
          colorScheme="green"
        />
      </div>

      {/* Academic Health & Ratio Highlights Bar */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center font-bold text-sm">
              1:{rasioGuruSiswa}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Rasio Guru terhadap Siswa</p>
              <p className="text-[11px] text-muted-foreground">Rata-rata {rasioGuruSiswa} siswa per 1 tenaga pendidik</p>
            </div>
          </div>
          <Badge className="bg-green-100 dark:bg-[#23A559]/15 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30 text-[10px]">
            Ideal
          </Badge>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold text-sm">
              {rataSiswaKelas}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Rata-rata Siswa per Rombel</p>
              <p className="text-[11px] text-muted-foreground">Kapasitas kelas terpantau seimbang</p>
            </div>
          </div>
          <Badge className="bg-blue-100 dark:bg-primary/15 text-blue-600 dark:text-[#70B8FF] border border-blue-200 dark:border-primary/30 text-[10px]">
            Optimal
          </Badge>
        </div>
      </div>

      {/* School Academic Calendar & Milestones */}
      <div className="mb-8">
        <AcademicCalendarWidget />
      </div>

      {/* Kelas Management Quick View */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold font-brand text-foreground">
                Rombongan Belajar (Rombel)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Daftar kelas aktif beserta wali kelas dan jumlah siswa terdaftar
              </CardDescription>
            </div>

            {/* Instant Filter Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kelas atau wali..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl focus:border-primary"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          {kelasList.isLoading ? (
            <TableSkeleton rows={3} columns={2} />
          ) : filteredKelas?.length === 0 ? (
            <EmptyState 
              icon={School} 
              title={searchTerm ? "Tidak ditemukan" : "Data Kosong"} 
              description={searchTerm ? "Tidak ditemukan kelas yang cocok dengan kata kunci." : "Belum ada kelas yang dibuat."} 
            />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredKelas?.map((k) => (
                <Link
                  key={k.id}
                  to={`/admin/kelas/${k.id}`}
                  className="group flex items-center justify-between p-4 rounded-xl bg-background border border-border/70 transition-all duration-200 hover:border-primary hover:bg-secondary/80 hover:shadow-lg"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] font-bold text-sm shadow-inner">
                      {k.nama.split(" ")[0]}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground group-hover:text-blue-600 dark:hover:text-[#70B8FF] transition-colors">
                        Kelas {k.nama}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Wali: <span className="text-card-foreground font-semibold">{k.waliNama}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Dibuat {formatTanggal(k.createdAt)}
                  </p>
                </div>

                <div className="text-right space-y-2">
                  <Badge className="bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30 text-xs font-bold px-2.5 py-1">
                    {k.jumlahSiswa} Siswa
                  </Badge>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-end gap-1 group-hover:text-foreground transition-colors">
                    Kelola Rombel <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </SchoolLayout>
  );
}
