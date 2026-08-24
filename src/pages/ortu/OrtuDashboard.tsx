import { useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sparkles,
  Quote,
  MessageSquare,
  Phone,
  Search,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { NilaiBadge, ScheduleCard, StatCard } from "@/components/lms-shared";
import { AcademicCalendarWidget } from "@/components/AcademicCalendarWidget";
import {
  formatTanggalWaktu,
  hariIni,
  isDeadlineLewat,
  sisaWaktu,
} from "@/lib/lms";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ORTU_NAV } from "@/lib/nav";
import { EmptyState, TableSkeleton } from "@/components/lms-shared";
export { ORTU_NAV };

function ChildView({
  siswaId,
  childName,
}: {
  siswaId: number;
  childName: string;
}) {
  const dashboard = trpc.ortu.childDashboard.useQuery({ siswaId });
  const makeUpClassesQuery = trpc.ortu.childKelasPengganti.useQuery({ siswaId });
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");
  const [taskSearch, setTaskSearch] = useState("");

  if (!dashboard.data) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Memuat data perkembangan akademik anak...
      </div>
    );
  }
  const data = dashboard.data;
  const today = hariIni();
  const jadwalHariIni = data.jadwalList.filter((j) => j.hari === today);

  const totalTugas = data.tugasList.length;
  const belumSubmit = data.tugasList.filter(
    (t) => !t.submission && !isDeadlineLewat(t.deadline),
  ).length;
  const terlambat = data.tugasList.filter(
    (t) =>
      (!t.submission && isDeadlineLewat(t.deadline)) ||
      (t.submission?.terlambat ?? false),
  ).length;
  const tepatWaktu = data.tugasList.filter(
    (t) => t.submission && !t.submission.terlambat,
  ).length;
  const dinilai = data.tugasList.filter(
    (t) => t.nilai && t.nilai.nilai !== null,
  );
  const rataRata =
    dinilai.length > 0
      ? Math.round(
          dinilai.reduce((acc, t) => acc + (t.nilai!.nilai as number), 0) /
            dinilai.length,
        )
      : null;

  const disiplinRate =
    totalTugas > 0 ? Math.round((tepatWaktu / totalTugas) * 100) : 100;

  const upcomingMakeUp = makeUpClassesQuery.data?.filter((m) => m.status === "dijadwalkan") ?? [];

  const filteredTasks = data.tugasList.filter((t) => {
    const matchSearch =
      t.judul.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.mapelNama.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.guruNama.toLowerCase().includes(taskSearch.toLowerCase());
    if (!matchSearch) return false;

    if (taskFilter === "pending") return !t.submission;
    if (taskFilter === "submitted") return !!t.submission;
    if (taskFilter === "graded") return t.nilai && t.nilai.nilai !== null;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Class badge & Health Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Profil Siswa: {childName}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>Rombel:</span>
              <span className="font-bold text-foreground px-2.5 py-0.5 rounded-full bg-background border border-border">
                {data.kelasList.map((k) => `Kelas ${k.nama}`).join(", ")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Ketepatan Waktu Kumpul Tugas:</span>
          <span className="text-xs font-bold text-green-600 dark:text-[#57F287] px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-[#23A559]/20 border border-green-200 dark:border-[#23A559]/30">
            {disiplinRate}% Tepat Waktu
          </span>
        </div>
      </div>

      {/* Sesi Pengganti Alert for Parents */}
      {upcomingMakeUp.length > 0 && (
        <div className="p-4 rounded-2xl bg-blue-100 dark:bg-primary/15 border border-blue-200 dark:border-primary/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-md">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 dark:text-[#70B8FF] uppercase tracking-wider">
                  Pemberitahuan Sesi Kelas Pengganti
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                  Ananda Wajib Hadir
                </span>
              </div>
              <p className="text-xs text-foreground font-semibold mt-0.5">
                {upcomingMakeUp[0]!.mapelNama} &bull; {upcomingMakeUp[0]!.tanggalPengganti} ({upcomingMakeUp[0]!.jamMulai} - {upcomingMakeUp[0]!.jamSelesai} WIB)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Ruang: <span className="text-foreground font-medium">{upcomingMakeUp[0]!.ruang || "Ruang Kelas"}</span> &bull; Pengampu: {upcomingMakeUp[0]!.guruNama} &bull; {upcomingMakeUp[0]!.alasan}
              </p>
            </div>
          </div>

          <a
            href="/ortu/jadwal"
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-primary hover:bg-[#0873c4] text-white text-xs font-bold transition-all shadow-sm shrink-0"
          >
            Lihat Jadwal Lengkap
          </a>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Tugas Aktif"
          value={belumSubmit}
          icon={<BookOpen className="h-5 w-5" />}
          colorScheme="blue"
        />
        <StatCard
          label="Terlambat / Lewat"
          value={terlambat}
          icon={<AlertCircle className="h-5 w-5" />}
          colorScheme={terlambat > 0 ? "red" : "green"}
        />
        <StatCard
          label="Tugas Dinilai"
          value={dinilai.length}
          icon={<CheckCircle2 className="h-5 w-5" />}
          colorScheme="green"
        />
        <StatCard
          label="Rata-rata Nilai"
          value={rataRata ?? "—"}
          icon={<GraduationCap className="h-5 w-5" />}
          colorScheme={
            rataRata !== null && rataRata >= 80
              ? "green"
              : rataRata !== null && rataRata >= 65
                ? "amber"
                : "blue"
          }
        />
      </div>

      {/* Main Grid: Tasks Table & Schedule */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Tasks Status Table */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold font-brand text-foreground">
                    Daftar Tugas & Penilaian Akademik
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Status pengerjaan tugas, deadline, dan nilai dari guru
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari tugas..."
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-background border border-border rounded-xl flex-wrap mt-3">
                <button
                  type="button"
                  onClick={() => setTaskFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "all"
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua ({totalTugas})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("pending")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "pending"
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Belum Kumpul ({belumSubmit})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("submitted")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "submitted"
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sudah Kumpul ({tepatWaktu})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("graded")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "graded"
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sudah Dinilai ({dinilai.length})
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader className="bg-background sticky top-0 z-10">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Tugas & Mapel
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Deadline
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                      Nilai
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {dashboard.isLoading ? (
                    <TableSkeleton rows={4} columns={4} />
                  ) : filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0 border-none">
                        <EmptyState 
                          icon={Search} 
                          title="Data Kosong" 
                          description="Tidak ada tugas yang sesuai dengan filter." 
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((t) => (
                      <TableRow
                        key={t.id}
                        className="hover:bg-secondary/80 transition-colors"
                      >
                        <TableCell className="py-3.5">
                          <p className="text-sm font-semibold text-foreground">
                            {t.judul}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.mapelNama} &bull; {t.guruNama}
                          </p>
                          {t.nilai?.feedback && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-[#70B8FF] bg-primary/10 p-2 rounded-lg border border-primary/20">
                              <Quote className="h-3 w-3 shrink-0" />
                              <span className="italic">"{t.nilai.feedback}"</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTanggalWaktu(t.deadline)}
                          {!t.submission && !isDeadlineLewat(t.deadline) && (
                            <span className="block text-[11px] font-bold text-primary mt-0.5">
                              {sisaWaktu(t.deadline)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {t.submission ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30">
                              <CheckCircle2 className="h-3 w-3" />
                              {t.submission.terlambat ? "Terlambat" : "Tepat Waktu"}
                            </span>
                          ) : isDeadlineLewat(t.deadline) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border border-red-200 dark:border-[#F23F43]/30">
                              <AlertCircle className="h-3 w-3" />
                              Lewat Batas
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-background text-muted-foreground border border-border">
                              Belum Kumpul
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <NilaiBadge nilai={t.nilai?.nilai} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right 4 Columns: Today's Class and Timetable */}
        <div className="lg:col-span-4 space-y-6">
          {/* Today's Schedule Card */}
          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-[#F0B232]" />
                  <CardTitle className="text-sm font-bold font-brand text-foreground">
                    Jadwal Hari Ini ({today})
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {dashboard.isLoading ? (
                <TableSkeleton rows={3} columns={1} />
              ) : jadwalHariIni.length === 0 ? (
                <EmptyState 
                  icon={Clock} 
                  title="Kosong" 
                  description="Tidak ada jadwal mata pelajaran hari ini." 
                />
              ) : (
                jadwalHariIni.map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-background border border-border"
                  >
                    <div>
                      <span className="font-semibold text-xs text-foreground block">
                        {j.mapelNama}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {j.guruNama}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-green-600 dark:text-[#57F287] bg-green-100 dark:bg-[#23A559]/10 px-2 py-0.5 rounded font-bold border border-green-200 dark:border-[#23A559]/20">
                      {j.jamMulai} - {j.jamSelesai}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Full Schedule */}
          <ScheduleCard
            items={data.jadwalList}
            title="Jadwal Mingguan Lengkap"
          />

          {/* Academic Calendar & Events */}
          <AcademicCalendarWidget />
        </div>
      </div>

      {/* Homeroom Teacher / Wali Kelas Direct Consultation Card */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center font-bold shadow-inner">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-green-600 dark:text-[#57F287] block">
              Layanan Konsultasi Wali Kelas {data.kelasList[0]?.nama ?? "10 IPA 1"}
            </span>
            <p className="text-xs text-foreground font-semibold">
              Budi Santoso, S.Pd. &bull; <span className="text-muted-foreground font-normal">Wali Kelas Resmi</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Hubungi wali kelas untuk diskusi capaian akademik, presensi, atau bimbingan ananda.
            </p>
          </div>
        </div>

        <a
          href={`https://wa.me/6281234567890?text=Halo%20Pak%20Budi%20Santoso,%20saya%20orang%20tua%20dari%20${encodeURIComponent(childName)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#23A559] hover:bg-[#1f934e] text-white text-xs font-bold transition-all shadow-sm shrink-0"
        >
          <MessageSquare className="h-4 w-4" />
          Hubungi via WhatsApp
        </a>
      </div>
    </div>
  );
}

export default function OrtuDashboard() {
  const childrenQuery = trpc.ortu.myChildren.useQuery();
  const pengumumanList = trpc.ortu.listPengumuman.useQuery();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  useEffect(() => {
    if (
      childrenQuery.data &&
      childrenQuery.data.length > 0 &&
      selectedChildId === null
    ) {
      setSelectedChildId(childrenQuery.data[0]!.id);
    }
  }, [childrenQuery.data, selectedChildId]);

  return (
    <SchoolLayout role="orang_tua" title="Dashboard Orang Tua" nav={ORTU_NAV}>
      {/* Top Banner */}
      <div className="relative mb-6 rounded-2xl bg-card border border-border p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-background border border-border text-xs font-semibold text-card-foreground mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-[#F0B232]" />
              Monitoring Akademik Anak (Multi-Anak)
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-brand text-foreground">
              Pantau Progres Belajar Secara Transparan
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-xl">
              Lihat pengumpulan tugas, nilai terbaru, jadwal mata pelajaran harian, dan catatan apresiasi langsung dari guru.
            </p>
          </div>
        </div>
      </div>

      {/* Papan Pengumuman Sekolah untuk Wali Murid */}
      {pengumumanList.data && pengumumanList.data.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-card border border-border shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-[#FEE75C]" />
              <h3 className="text-sm font-bold font-brand text-foreground">
                Informasi &amp; Edaran Sekolah
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Pemberitahuan Resmi Sekolah
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {pengumumanList.data.slice(0, 2).map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-amber-200 dark:border-[#F0B232]/30">
                    {p.kategori}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{p.authorNama}</span>
                </div>
                <h4 className="text-xs font-bold text-foreground line-clamp-1">{p.judul}</h4>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {p.konten}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Child Selector Tabs (FR-15) */}
      {childrenQuery.data && childrenQuery.data.length > 0 && (
        <div className="mb-6 bg-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-600 dark:text-[#F0B232]" />
            <span className="text-xs font-bold uppercase tracking-wider text-card-foreground">
              Pilih Profil Anak:
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {childrenQuery.data.map((c) => {
              const isSelected = selectedChildId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedChildId(c.id)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-sm ring-1 ring-white/20"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
                    {c.name.charAt(0)}
                  </div>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {childrenQuery.isLoading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : childrenQuery.data?.length === 0 ? (
        <EmptyState 
          icon={Users} 
          title="Data Anak Kosong" 
          description="Belum ada anak yang terhubung ke akun ini. Silakan hubungi Admin Sekolah." 
        />
      ) : selectedChildId ? (
        <ChildView
          siswaId={selectedChildId}
          childName={
            childrenQuery.data?.find((c) => c.id === selectedChildId)?.name ??
            "Ananda"
          }
        />
      ) : null}
    </SchoolLayout>
  );
}
