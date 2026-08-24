import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  Download,
  Paperclip,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Send,
  Quote,
  X,
  Calendar,
  FileText,
  Flame,
  CheckCheck,
  ListFilter,
  Layers,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { NilaiBadge, ScheduleCard, EmptyState, TableSkeleton, ActionCenterWidget } from "@/components/lms-shared";
import { AcademicCalendarWidget } from "@/components/AcademicCalendarWidget";
import {
  downloadBase64,
  fileToBase64,
  formatTanggalWaktu,
  isDeadlineLewat,
  sisaWaktu,
} from "@/lib/lms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { SISWA_NAV } from "@/lib/nav";
export { SISWA_NAV };

const MAX_FILE_MB = 5;

type TugasItem = {
  id: number;
  judul: string;
  deskripsi: string | null;
  deadline: Date;
  hasLampiran: boolean;
  kelasNama: string;
  mapelNama: string;
  guruNama: string;
  submission: {
    id: number;
    waktuSubmit: Date;
    isiText: string | null;
    fileNama: string | null;
    terlambat: boolean;
  } | null;
  nilai: { nilai: number | null; feedback: string | null } | null;
};

function TugasCard({
  tugas,
  onChanged,
  isUrgentHighlight,
}: {
  tugas: TugasItem;
  onChanged: () => void;
  isUrgentHighlight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isiText, setIsiText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitMut = trpc.siswa.submitTugas.useMutation({
    onSuccess: async () => {
      setOpen(false);
      setIsiText("");
      setFile(null);
      onChanged();

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#23A559", "#0984E3", "#FEE75C"],
      });
    },
    onError: (e) => setError(e.message),
  });

  const utils = trpc.useUtils();
  const downloadLampiran = async (tugasId: number) => {
    const f = await utils.siswa.downloadLampiran.fetch({ tugasId });
    downloadBase64(f.fileNama, f.dataBase64);
  };
  const downloadOwn = async (tugasId: number) => {
    const f = await utils.siswa.downloadOwnFile.fetch({ tugasId });
    downloadBase64(f.fileNama, f.dataBase64, f.fileMime);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isiText.trim() && !file) {
      setError("Isi jawaban teks atau pilih file untuk diunggah.");
      return;
    }
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${MAX_FILE_MB}MB.`);
      return;
    }
    submitMut.mutate({
      tugasId: tugas.id,
      isiText: isiText || undefined,
      file: file
        ? {
            nama: file.name,
            mime: file.type || "application/octet-stream",
            dataBase64: await fileToBase64(file),
          }
        : undefined,
    });
  };

  const lewat = isDeadlineLewat(tugas.deadline);
  const sudahSubmit = !!tugas.submission;

  return (
    <div
      className={`rounded-2xl border bg-card p-5 shadow-lg space-y-3.5 transition-all ${
        isUrgentHighlight && !sudahSubmit
          ? "border-amber-500/50 dark:border-[#F0B232]/50 shadow-amber-500/5 hover:border-amber-500"
          : "border-border hover:border-primary"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-foreground">{tugas.judul}</h4>
            {tugas.hasLampiran && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadLampiran(tugas.id)}
                className="h-6 px-2 text-[10px] text-blue-600 dark:text-[#70B8FF] bg-blue-100 dark:bg-primary/15 hover:bg-primary/30 rounded-full font-semibold"
              >
                <Paperclip className="mr-1 h-3 w-3" /> Unduh Dokumen Soal
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-blue-600 dark:text-[#70B8FF] font-semibold">{tugas.mapelNama}</span> &bull; Guru Pengampu: {tugas.guruNama}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {sudahSubmit ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-[#23A559]/15 border border-green-200 dark:border-[#23A559]/30 text-xs font-bold text-green-600 dark:text-[#57F287]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sudah Dikumpulkan
              {tugas.submission?.terlambat && (
                <span className="ml-1 text-[10px] text-red-600 dark:text-[#FF7074] bg-red-100 dark:bg-[#F23F43]/20 px-1.5 py-0.2 rounded font-bold">
                  (Terlambat)
                </span>
              )}
            </div>
          ) : lewat ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-[#F23F43]/15 border border-red-200 dark:border-[#F23F43]/30 text-xs font-bold text-red-600 dark:text-[#FF7074] animate-pulse">
              <AlertCircle className="h-3.5 w-3.5" />
              Batas Waktu Lewat
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-[#F0B232]/15 border border-amber-200 dark:border-[#F0B232]/30 text-xs font-bold text-amber-600 dark:text-[#FEE75C]">
              <Clock className="h-3.5 w-3.5" />
              {sisaWaktu(tugas.deadline)}
            </div>
          )}
        </div>
      </div>

      {tugas.deskripsi && (
        <p className="text-xs text-card-foreground bg-background p-3 rounded-xl border border-border/60 leading-relaxed">
          {tugas.deskripsi}
        </p>
      )}

      {/* Submission Info & Grade Badge if present */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>Batas: {formatTanggalWaktu(tugas.deadline)}</span>
          {sudahSubmit && tugas.submission?.fileNama && (
            <button
              type="button"
              onClick={() => downloadOwn(tugas.id)}
              className="text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              <Download className="h-3 w-3" /> Berkas Terkirim ({tugas.submission.fileNama})
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {sudahSubmit && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status Nilai:</span>
              <NilaiBadge nilai={tugas.nilai?.nilai} />
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className={`h-9 rounded-xl text-xs font-bold px-4 ${
              sudahSubmit
                ? "bg-background hover:bg-secondary text-foreground border border-border"
                : "bg-primary hover:bg-[#0097E6] text-white shadow-sm"
            }`}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {sudahSubmit ? "Kirim Ulang Jawaban" : "Kumpulkan Tugas"}
          </Button>
        </div>
      </div>

      {/* Feedback Quote if graded */}
      {tugas.nilai?.feedback && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs">
          <Quote className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-blue-600 dark:text-[#70B8FF] block">Catatan &amp; Masukan Guru:</span>
            <span className="text-card-foreground italic">"{tugas.nilai.feedback}"</span>
          </div>
        </div>
      )}

      {/* Submit Assignment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-brand text-foreground">
              Kumpulkan Tugas: {tugas.judul}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-card-foreground">
                Jawaban Teks / Catatan Pengerjaan
              </Label>
              <Textarea
                placeholder="Tuliskan jawaban langsung, ringkasan, atau penjelasan langkah pengerjaan..."
                rows={4}
                value={isiText}
                onChange={(e) => setIsiText(e.target.value)}
                className="bg-background border-border text-foreground text-sm rounded-xl focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-card-foreground">
                Upload File / Tugas (Opsional, Maks 5MB)
              </Label>
              {file ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-primary/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs text-foreground truncate font-medium">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-muted-foreground hover:text-red-600 dark:hover:text-[#FF7074] p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative border-2 border-dashed border-border rounded-xl p-4 text-center bg-background hover:border-primary transition-colors">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">
                      Pilih dokumen file atau foto jawaban
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Format PDF, DOCX, JPG, PNG (Maks 5MB)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold h-10 shadow-sm"
              disabled={submitMut.isPending}
            >
              {submitMut.isPending ? "Mengunggah Jawaban..." : "Submit Tugas Sekarang"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SiswaDashboard() {
  const [taskListRef] = useAutoAnimate();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const overview = trpc.siswa.dashboard.useQuery();
  const pengumumanList = trpc.siswa.listPengumuman.useQuery();
  const makeUpClassesQuery = trpc.siswa.myKelasPengganti.useQuery();
  const holidaysQuery = trpc.siswa.listHariLibur.useQuery();
  const [viewMode, setViewMode] = useState<"priority" | "filter">("priority");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");

  const refetch = () => {
    utils.siswa.dashboard.invalidate();
  };

  const allTasks = overview.data?.tugasList ?? [];
  const pendingTasks = allTasks.filter((t) => !t.submission);
  const submittedTasks = allTasks.filter((t) => !!t.submission);
  const gradedTasks = allTasks.filter((t) => t.nilai?.nilai !== null && t.nilai?.nilai !== undefined);

  // Priority Queue Grouping (Google Classroom / Canvas Engine)
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const urgentTasks = pendingTasks.filter((t) => {
    const deadlineDate = new Date(t.deadline);
    return isDeadlineLewat(t.deadline) || deadlineDate.getTime() - now.getTime() <= oneDayMs;
  });

  const upcomingTasks = pendingTasks.filter((t) => {
    const deadlineDate = new Date(t.deadline);
    return !isDeadlineLewat(t.deadline) && deadlineDate.getTime() - now.getTime() > oneDayMs;
  });

  const completedTasks = allTasks.filter((t) => !!t.submission);

  const actionItems = pendingTasks.slice(0, 2).map((t) => ({
    id: t.id,
    label: `Tugas Belum Dikerjakan: ${t.judul}`,
    actionText: "Kerjakan",
    isUrgent: !isDeadlineLewat(t.deadline),
    onClick: () => navigate(`/siswa/tugas`),
  }));

  const filteredTasks = allTasks.filter((t) => {
    if (taskFilter === "pending") return !t.submission;
    if (taskFilter === "submitted") return !!t.submission;
    if (taskFilter === "graded") return t.nilai?.nilai !== null && t.nilai?.nilai !== undefined;
    return true;
  });

  const gradedList = allTasks.filter((t) => t.nilai?.nilai !== null && t.nilai?.nilai !== undefined);
  const averageGrade = gradedList.length > 0
    ? Math.round(gradedList.reduce((acc, t) => acc + (t.nilai!.nilai as number), 0) / gradedList.length)
    : null;

  const upcomingMakeUp = makeUpClassesQuery.data?.filter((m) => m.status === "dijadwalkan") ?? [];
  const upcomingHoliday = holidaysQuery.data?.at(0);

  return (
    <SchoolLayout role="siswa" title="Dashboard Siswa" nav={SISWA_NAV}>
      {/* Hero Welcome Banner */}
      <div className="relative mb-6 rounded-2xl bg-card border border-border p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-background border border-border text-xs font-semibold text-card-foreground mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Pusat Akademik Siswa
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-brand text-foreground">
              Semangat Belajar &amp; Pantau Tugas Sekolah
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-xl">
              Cek deadline tugas aktif, kumpulkan tugas tepat waktu, dan pantau nilai mata pelajaranmu secara transparan.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-background border border-border text-center shadow-inner">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Belum Submit
              </span>
              <span className="text-2xl font-extrabold text-amber-600 dark:text-[#FEE75C]">
                {pendingTasks.length}
              </span>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-background border border-border text-center shadow-inner">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Rata-rata Nilai
              </span>
              <span className="text-2xl font-extrabold text-green-600 dark:text-[#57F287]">
                {averageGrade ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ActionCenterWidget items={actionItems} />

      {/* Sesi Pengganti & Hari Libur Alert Strip */}
      {upcomingMakeUp.length > 0 ? (
        <div className="mb-6 p-4 rounded-2xl bg-blue-100 dark:bg-primary/15 border border-blue-200 dark:border-primary/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-md">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 dark:text-[#70B8FF] uppercase tracking-wider">
                  Sesi Kelas Pengganti Terjadwal
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                  Wajib Hadir
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
            href="/siswa/jadwal"
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-primary hover:bg-[#0873c4] text-white text-xs font-bold transition-all shadow-sm shrink-0"
          >
            Lihat Jadwal Lengkap
          </a>
        </div>
      ) : upcomingHoliday ? (
        <div className="mb-6 p-4 rounded-2xl bg-amber-100 dark:bg-[#F0B232]/15 border border-amber-200 dark:border-[#F0B232]/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#F0B232]/30 text-amber-600 dark:text-[#FEE75C] flex items-center justify-center font-bold shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-[#FEE75C] uppercase tracking-wider">
                Hari Libur Terdekat
              </span>
              <p className="text-xs text-foreground font-semibold mt-0.5">
                {upcomingHoliday.nama} ({upcomingHoliday.tanggal})
              </p>
              <p className="text-[11px] text-muted-foreground">
                {upcomingHoliday.keterangan || "Kegiatan belajar mengajar tatap muka diliburkan."}
              </p>
            </div>
          </div>

          <a
            href="/siswa/jadwal"
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-background border border-border text-foreground text-xs font-bold transition-all shadow-sm shrink-0 hover:bg-secondary"
          >
            Cek Kalender Libur
          </a>
        </div>
      ) : null}

      {/* Papan Pengumuman Mading Sekolah */}
      <div className="mb-8 p-4 rounded-2xl bg-card border border-border shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-[#70B8FF]" />
            <h3 className="text-sm font-bold font-brand text-foreground">
              Papan Pengumuman &amp; Informasi Sekolah
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Pengumuman Resmi Sekolah
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {pengumumanList.data?.slice(0, 2).map((p) => (
            <div
              key={p.id}
              className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border border-blue-200 dark:border-primary/30">
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

      {/* Grid: Tasks List & Schedule/Grades Sidebar */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 Columns: Assignments Priority Queue */}
        <div className="lg:col-span-7 space-y-4">
          {/* Header & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-md">
            <div>
              <h3 className="text-base font-bold font-brand text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Penugasan &amp; Alur Pengerjaan
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {pendingTasks.length > 0
                  ? `${pendingTasks.length} tugas masih menunggu penyelesaian Anda.`
                  : "Semua tugas telah diselesaikan dengan baik."}
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-background rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setViewMode("priority")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "priority"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-amber-300" /> Antrean Urgensi
              </button>
              <button
                type="button"
                onClick={() => setViewMode("filter")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "filter"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListFilter className="h-3.5 w-3.5" /> Filter Kategori
              </button>
            </div>
          </div>

          {overview.isLoading ? (
            <TableSkeleton rows={4} columns={1} />
          ) : viewMode === "priority" ? (
            /* Action-Oriented Priority Queue (Google Classroom Style) */
            <div ref={taskListRef} className="space-y-6">
              {/* Section 1: Urgent / Overdue Tasks */}
              {urgentTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-[#FF7074] flex items-center gap-1.5">
                      <Flame className="h-4 w-4" /> Mendesak &amp; Batas Lewat ({urgentTasks.length})
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Prioritas pengerjaan tertinggi
                    </span>
                  </div>
                  <div className="space-y-3">
                    {urgentTasks.map((t) => (
                      <TugasCard
                        key={t.id}
                        tugas={t}
                        onChanged={refetch}
                        isUrgentHighlight={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Upcoming Active Tasks */}
              {upcomingTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-[#70B8FF] flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> Tenggat Pekan Ini ({upcomingTasks.length})
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Tugas aktif terjadwal
                    </span>
                  </div>
                  <div className="space-y-3">
                    {upcomingTasks.map((t) => (
                      <TugasCard key={t.id} tugas={t} onChanged={refetch} />
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-[#57F287] flex items-center gap-1.5">
                      <CheckCheck className="h-4 w-4" /> Selesai &amp; Riwayat ({completedTasks.length})
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Tugas sudah dikumpulkan
                    </span>
                  </div>
                  <div className="space-y-3">
                    {completedTasks.map((t) => (
                      <TugasCard key={t.id} tugas={t} onChanged={refetch} />
                    ))}
                  </div>
                </div>
              )}

              {allTasks.length === 0 && (
                <EmptyState
                  icon={FileText}
                  title="Belum Ada Tugas"
                  description="Tidak ada penugasan aktif dari guru Anda saat ini."
                />
              )}
            </div>
          ) : (
            /* Traditional Filter Tab Mode */
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 p-1 bg-background rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setTaskFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "all"
                      ? "bg-secondary text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua ({allTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("pending")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "pending"
                      ? "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-amber-200 dark:border-[#F0B232]/30 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Belum ({pendingTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("submitted")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "submitted"
                      ? "bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border border-blue-200 dark:border-primary/30 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Submit ({submittedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("graded")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "graded"
                      ? "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dinilai ({gradedTasks.length})
                </button>
              </div>

              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Semua Selesai!"
                  description="Tidak ada tugas dalam kategori ini."
                />
              ) : (
                <div ref={taskListRef} className="space-y-3">
                  {filteredTasks.map((t) => (
                    <TugasCard key={t.id} tugas={t} onChanged={refetch} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 5 Columns: Grades and Schedule */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Grades Card */}
          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-600 dark:text-[#57F287]" />
                  <CardTitle className="text-base font-bold font-brand text-foreground">
                    Nilai Terbaru
                  </CardTitle>
                </div>
                {averageGrade !== null && (
                  <span className="text-xs font-bold text-green-600 dark:text-[#57F287]">
                    Rata-rata: {averageGrade}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {overview.isLoading ? (
                <TableSkeleton rows={3} columns={1} />
              ) : overview.data?.nilaiTerbaru.length === 0 ? (
                <EmptyState 
                  icon={BookOpen} 
                  title="Data Kosong" 
                  description="Belum ada nilai yang diinput oleh guru." 
                />
              ) : (
                overview.data?.nilaiTerbaru.map((n) => (
                  <div
                    key={n.tugasId}
                    className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/70"
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground">{n.judul}</p>
                      <p className="text-[11px] text-muted-foreground">{n.mapelNama}</p>
                    </div>
                    <NilaiBadge nilai={n.nilai} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <ScheduleCard
            items={overview.data?.jadwalList ?? []}
            title="Jadwal Kelas Saya"
          />

          {/* Academic Calendar & Event Planner */}
          <AcademicCalendarWidget />
        </div>
      </div>
    </SchoolLayout>
  );
}
