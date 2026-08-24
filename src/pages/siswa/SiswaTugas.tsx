import { useState, type FormEvent, useDeferredValue } from "react";
import {
  Download,
  Paperclip,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Quote,
  X,
  Search,
  Sparkles,
  Flame,
  CheckCheck,
  Kanban,
  LayoutList,
  ChevronRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { SISWA_NAV } from "@/lib/nav";
import { NilaiBadge } from "@/components/lms-shared";
import {
  downloadBase64,
  fileToBase64,
  formatTanggalWaktu,
  isDeadlineLewat,
  sisaWaktu,
} from "@/lib/lms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function TaskRow({
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
      toast.success("Tugas berhasil dikumpulkan!");
      onChanged();

      confetti({
        particleCount: 100,
        spread: 70,
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
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-[#F23F43]/15 border border-red-200 dark:border-[#F23F43]/30 text-xs font-bold text-red-600 dark:text-[#FF7074]">
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
            onClick={() => {
              setIsiText(tugas.submission?.isiText || "");
              setFile(null);
              setError(null);
              setOpen(true);
            }}
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
        <div className="p-3 rounded-xl bg-background border border-border flex items-start gap-2.5">
          <Quote className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-foreground block mb-0.5">Catatan Evaluasi Guru:</span>
            <p className="text-card-foreground italic leading-relaxed">{tugas.nilai.feedback}</p>
          </div>
        </div>
      )}

      {/* Submission Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-brand">
              Pengumpulan Tugas: {tugas.judul}
            </DialogTitle>
          </DialogHeader>

          {lewat && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] border border-red-200 dark:border-[#F23F43]/30 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Perhatian:</strong> Batas waktu pengumpulan telah terlewati ({formatTanggalWaktu(tugas.deadline)}). Tugas yang dikirim akan dicatat sebagai <em>Terlambat</em>.
              </span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-card-foreground">
                Jawaban Teks / Catatan Pengerjaan
              </Label>
              <Textarea
                placeholder="Ketik ringkasan jawaban atau tautan dokumen pengerjaan di sini..."
                rows={4}
                value={isiText}
                onChange={(e) => setIsiText(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-card-foreground">
                Upload File Jawaban (PDF / Gambar / Dokumen)
              </Label>
              {file ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-primary/50">
                  <span className="text-xs text-foreground truncate font-medium">{file.name}</span>
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

function KanbanCard({
  tugas,
  onChanged,
}: {
  tugas: TugasItem;
  onChanged: () => void;
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
      toast.success("Tugas berhasil dikumpulkan!");
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isiText.trim() && !file) {
      setError("Isi jawaban teks atau pilih file.");
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

  const sudahSubmit = !!tugas.submission;
  const lewat = isDeadlineLewat(tugas.deadline);

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3 hover:border-primary/60 hover:shadow-md transition-all">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            {tugas.mapelNama}
          </span>
          {sudahSubmit ? (
            <NilaiBadge nilai={tugas.nilai?.nilai} />
          ) : lewat ? (
            <span className="text-[10px] font-bold text-red-600 dark:text-[#FF7074] bg-red-100 dark:bg-[#F23F43]/20 px-2 py-0.5 rounded">
              Lewat Batas
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-600 dark:text-[#FEE75C] bg-amber-100 dark:bg-[#F0B232]/20 px-2 py-0.5 rounded">
              {sisaWaktu(tugas.deadline)}
            </span>
          )}
        </div>
        <h4 className="text-xs font-bold text-foreground line-clamp-2 mt-1">
          {tugas.judul}
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Guru: {tugas.guruNama}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
        <span>Batas: {formatTanggalWaktu(tugas.deadline)}</span>

        <Button
          size="sm"
          onClick={() => {
            setIsiText(tugas.submission?.isiText || "");
            setOpen(true);
          }}
          className={`h-7 px-2.5 rounded-lg text-[11px] font-bold ${
            sudahSubmit
              ? "bg-secondary text-foreground hover:bg-secondary/80"
              : "bg-primary text-white hover:bg-[#0097E6]"
          }`}
        >
          {sudahSubmit ? "Detail" : "Kumpulkan"}
          <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>

      {/* Submission Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold font-brand">
              Pengerjaan Tugas: {tugas.judul}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-card-foreground">
                Jawaban Teks
              </Label>
              <Textarea
                placeholder="Tuliskan jawaban langsung..."
                rows={3}
                value={isiText}
                onChange={(e) => setIsiText(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-card-foreground">
                Unggah Berkas
              </Label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-[#FF7074]">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold h-9"
              disabled={submitMut.isPending}
            >
              {submitMut.isPending ? "Mengunggah..." : "Kirim Jawaban Sekarang"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SiswaTugas() {
  const [kanbanRef1] = useAutoAnimate();
  const [kanbanRef2] = useAutoAnimate();
  const [kanbanRef3] = useAutoAnimate();
  const [listRef] = useAutoAnimate();

  const utils = trpc.useUtils();
  const overview = trpc.siswa.dashboard.useQuery();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");
  const [selectedMapel, setSelectedMapel] = useState<string>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const refetch = () => {
    utils.siswa.dashboard.invalidate();
  };

  const allTasks = overview.data?.tugasList ?? [];
  const pendingTasks = allTasks.filter((t) => !t.submission);
  const submittedTasks = allTasks.filter((t) => !!t.submission);
  const gradedTasks = allTasks.filter((t) => t.nilai?.nilai !== null && t.nilai?.nilai !== undefined);

  const mapelList = Array.from(new Set(allTasks.map((t) => t.mapelNama)));

  const filteredTasks = allTasks.filter((t) => {
    const matchSearch =
      t.judul.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      t.mapelNama.toLowerCase().includes(deferredSearch.toLowerCase());
    if (!matchSearch) return false;

    if (selectedMapel !== "all" && t.mapelNama !== selectedMapel) return false;

    if (taskFilter === "pending") return !t.submission;
    if (taskFilter === "submitted") return !!t.submission;
    if (taskFilter === "graded") return t.nilai?.nilai !== null && t.nilai?.nilai !== undefined;
    return true;
  });

  // Kanban Columns Data
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const kanbanUrgent = filteredTasks.filter((t) => {
    if (t.submission) return false;
    const deadlineDate = new Date(t.deadline);
    return isDeadlineLewat(t.deadline) || deadlineDate.getTime() - now.getTime() <= oneDayMs;
  });

  const kanbanActive = filteredTasks.filter((t) => {
    if (t.submission) return false;
    const deadlineDate = new Date(t.deadline);
    return !isDeadlineLewat(t.deadline) && deadlineDate.getTime() - now.getTime() > oneDayMs;
  });

  const kanbanCompleted = filteredTasks.filter((t) => !!t.submission);

  return (
    <SchoolLayout role="siswa" title="Pusat Tugas &amp; PR" nav={SISWA_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Pusat Penugasan &amp; PR Siswa
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola pengumpulan tugas mandiri, cek batas waktu, dan pantau progres pengerjaan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-background border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban Urgensi
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> Daftar Lengkap
            </button>
          </div>

          <Select value={selectedMapel} onValueChange={setSelectedMapel}>
            <SelectTrigger className="w-44 bg-background border-border text-foreground text-xs rounded-xl h-9">
              <SelectValue placeholder="Pilih Mapel" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all" className="text-xs focus:bg-secondary">
                Semua Mapel
              </SelectItem>
              {mapelList.map((m) => (
                <SelectItem key={m} value={m} className="text-xs focus:bg-secondary">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari tugas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 bg-background border-border text-foreground text-xs rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Progress & Milestone Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-card border border-border shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Progres Pengumpulan: {submittedTasks.length} dari {allTasks.length} Tugas Selesai
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pendingTasks.length === 0
                ? "Luar biasa! Semua tugas akademik Anda telah dikumpulkan."
                : `${pendingTasks.length} tugas masih memerlukan pengumpulan.`}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-48 space-y-1.5 shrink-0">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
            <span>Penyelesaian</span>
            <span className="text-green-600 dark:text-[#57F287]">
              {allTasks.length > 0
                ? Math.round((submittedTasks.length / allTasks.length) * 100)
                : 100}
              %
            </span>
          </div>
          <div className="h-2 rounded-full bg-background overflow-hidden border border-border">
            <div
              className="h-full bg-[#23A559] transition-all duration-300 rounded-full"
              style={{
                width: `${
                  allTasks.length > 0
                    ? (submittedTasks.length / allTasks.length) * 100
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* View Content: Kanban vs List */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 overflow-x-auto pb-4">
          {/* Column 1: Urgent / Overdue */}
          <div className="bg-card/60 rounded-2xl border border-amber-500/30 p-4 space-y-3 min-w-[280px]">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] flex items-center justify-center font-bold">
                  <Flame className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-foreground">
                  Mendesak &amp; Lewat
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074]">
                {kanbanUrgent.length}
              </span>
            </div>

            <div ref={kanbanRef1} className="space-y-3">
              {kanbanUrgent.map((t) => (
                <KanbanCard key={t.id} tugas={t} onChanged={refetch} />
              ))}
              {kanbanUrgent.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Tidak ada tugas mendesak.
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Active / Need to do */}
          <div className="bg-card/60 rounded-2xl border border-blue-500/30 p-4 space-y-3 min-w-[280px]">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-foreground">
                  Perlu Dikerjakan
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF]">
                {kanbanActive.length}
              </span>
            </div>

            <div ref={kanbanRef2} className="space-y-3">
              {kanbanActive.map((t) => (
                <KanbanCard key={t.id} tugas={t} onChanged={refetch} />
              ))}
              {kanbanActive.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Semua tugas aktif sudah dikerjakan.
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="bg-card/60 rounded-2xl border border-green-500/30 p-4 space-y-3 min-w-[280px]">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center font-bold">
                  <CheckCheck className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-foreground">
                  Selesai &amp; Riwayat
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287]">
                {kanbanCompleted.length}
              </span>
            </div>

            <div ref={kanbanRef3} className="space-y-3">
              {kanbanCompleted.map((t) => (
                <KanbanCard key={t.id} tugas={t} onChanged={refetch} />
              ))}
              {kanbanCompleted.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Belum ada tugas yang diselesaikan.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-card rounded-2xl border border-border flex-wrap">
            <button
              type="button"
              onClick={() => setTaskFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                taskFilter === "all"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua Tugas ({allTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter("pending")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                taskFilter === "pending"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Belum Dikumpulkan ({pendingTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter("submitted")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                taskFilter === "submitted"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sudah Dikumpulkan ({submittedTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter("graded")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                taskFilter === "graded"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Telah Dinilai ({gradedTasks.length})
            </button>
          </div>

          {filteredTasks.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border">
              Tidak ada tugas pada filter yang dipilih.
            </div>
          )}

          <div ref={listRef} className="space-y-4">
            {filteredTasks.map((t) => (
              <TaskRow key={t.id} tugas={t} onChanged={refetch} />
            ))}
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
