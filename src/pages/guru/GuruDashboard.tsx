import { useNavigate } from "react-router";
import { Link } from "react-router";
import {
  ClipboardCheck,
  BookOpen,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ScheduleCard, EmptyState, TableSkeleton, ActionCenterWidget } from "@/components/lms-shared";
import { AcademicCalendarWidget } from "@/components/AcademicCalendarWidget";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatTanggalWaktu, sisaWaktu } from "@/lib/lms";

import { GURU_NAV } from "@/lib/nav";
export { GURU_NAV };

export default function GuruDashboard() {
  const navigate = useNavigate();
  const assignments = trpc.guru.myAssignments.useQuery();
  const schedule = trpc.guru.mySchedule.useQuery();

  const totalBelumDinilai =
    assignments.data?.assignments.reduce(
      (sum, a) => sum + (a.belumDinilai ?? 0),
      0,
    ) ?? 0;

  const actionItems = (assignments.data?.assignments ?? [])
    .filter((a) => a.belumDinilai > 0)
    .slice(0, 2)
    .map((a) => ({
      id: a.id,
      label: `${a.belumDinilai} tugas ${a.mapelNama} perlu dinilai`,
      actionText: "Nilai Sekarang",
      isUrgent: a.belumDinilai > 5,
      onClick: () => navigate(`/guru/kelas-mapel/${a.id}`),
    }));

  return (
    <SchoolLayout role="guru" title="Dashboard Guru" nav={GURU_NAV}>
      {/* Top Banner */}
      <div className="relative mb-8 rounded-2xl bg-card border border-border p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-background border border-border text-xs font-semibold text-card-foreground mb-2">
              <Sparkles className="h-3.5 w-3.5 text-[#23A559]" />
              Portal Pengajaran & Penilaian
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-brand text-foreground">
              Ruang Kerja Pengampu Mapel
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-2xl">
              Kelola tugas, periksa submission siswa, dan input nilai beserta feedback personal per kombinasi kelas &times; mata pelajaran.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {totalBelumDinilai > 0 ? (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-100 dark:bg-[#F0B232]/15 border border-amber-200 dark:border-[#F0B232]/30 text-xs text-amber-600 dark:text-[#FEE75C]">
                <ClipboardCheck className="h-5 w-5 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">
                    {totalBelumDinilai} Submission
                  </span>
                  <span>Menunggu penilaian Anda</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-green-100 dark:bg-[#23A559]/15 border border-green-200 dark:border-[#23A559]/30 text-xs text-green-600 dark:text-[#57F287]">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div>
                  <span className="font-bold block">Semua Dinilai</span>
                  <span>Tidak ada antrean submission</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ActionCenterWidget items={actionItems} />

      {/* Section: Kelas x Mapel Cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold font-brand text-foreground">
              Kelas &times; Mata Pelajaran yang Diampu
            </h3>
            <p className="text-xs text-muted-foreground">
              Pilih kelas-mapel untuk membuat tugas baru atau menilai tugas siswa
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {assignments.data?.assignments.length ?? 0} Penugasan Aktif
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.isLoading ? (
             <div className="col-span-full"><TableSkeleton rows={3} columns={2} /></div>
          ) : assignments.data?.assignments.length === 0 ? (
            <div className="col-span-full">
              <EmptyState 
                icon={BookOpen} 
                title="Belum Ada Penugasan" 
                description="Belum ada kelas-mapel yang dialokasikan ke akun Anda. Silakan hubungi Admin Sekolah." 
              />
            </div>
          ) : (
            assignments.data?.assignments.map((a) => {
            const hasPending = a.belumDinilai > 0;
            return (
              <Link
                key={a.id}
                to={`/guru/kelas-mapel/${a.id}`}
                className="group block rounded-2xl bg-card border border-border p-5 shadow-lg transition-all duration-200 hover:border-primary hover:bg-secondary/80 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] font-bold text-sm">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground group-hover:text-blue-600 dark:hover:text-[#70B8FF] transition-colors">
                        {a.mapelNama}
                      </h4>
                      <p className="text-xs font-medium text-muted-foreground">
                        Kelas {a.kelasNama}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 mt-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-background text-card-foreground border border-border">
                    {a.jumlahSiswa} Siswa
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-background text-card-foreground border border-border">
                    {a.jumlahTugas} Tugas
                  </span>

                  {hasPending ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-[#F0B232]/40 animate-pulse">
                      <ClipboardCheck className="h-3 w-3" />
                      {a.belumDinilai} Perlu Dinilai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-green-100 dark:bg-[#23A559]/15 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30">
                      <CheckCircle2 className="h-3 w-3" />
                      Rapi
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>Buka Lembar Kerja</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })
          )}
        </div>
      </div>

      {/* Grid: Upcoming Deadlines & Teaching Timetable */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Assignments Card */}
        <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600 dark:text-[#F0B232]" />
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Deadline Tugas Mendatang
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Tugas aktif yang batas pengumpulannya sedang berjalan
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {assignments.isLoading ? (
              <TableSkeleton rows={4} columns={1} />
            ) : assignments.data?.upcoming.length === 0 ? (
              <EmptyState 
                icon={Clock} 
                title="Santai Dulu" 
                description="Tidak ada tugas dengan deadline mendatang." 
              />
            ) : (
              assignments.data?.upcoming.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border/60 hover:border-primary transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{t.judul}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.mapelNama} &bull; Kelas {t.kelasNama}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-xs font-mono text-card-foreground">
                      {formatTanggalWaktu(t.deadline)}
                    </p>
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border border-blue-200 dark:border-primary/30">
                      {sisaWaktu(t.deadline)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Teacher's Schedule */}
        <ScheduleCard
          items={schedule.data ?? []}
          showKelas
          title="Jadwal Mengajar Saya"
        />

        {/* School Academic Calendar */}
        <div className="col-span-full">
          <AcademicCalendarWidget />
        </div>
      </div>
    </SchoolLayout>
  );
}
