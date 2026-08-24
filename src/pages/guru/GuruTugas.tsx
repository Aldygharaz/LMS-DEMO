import { useState, useDeferredValue, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router";
import {
  Download,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Search,
  Zap,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Check,
  Paperclip,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { GURU_NAV } from "@/lib/nav";
import { NilaiBadge } from "@/components/lms-shared";
import {
  downloadBase64,
  formatTanggalWaktu,
  exportToCSV,
} from "@/lib/lms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SubmissionInfo = {
  id: number;
  waktuSubmit: Date;
  isiText: string | null;
  fileNama: string | null;
  terlambat: boolean;
};

type RowItem = {
  siswaId: number;
  siswaNama: string;
  submission: SubmissionInfo | null;
  nilai: { nilai: number | null; feedback: string | null } | null;
};

const FEEDBACK_PRESETS = [
  "Penjelasan langkah pengerjaan sangat runtut dan tepat!",
  "Jawaban benar, perhatikan ketelitian rumus.",
  "Laporan rapi dan analisis data akurat.",
  "Tugas terlambat dikumpulkan, harap perhatikan batas waktu.",
  "Perbaiki kembali bagian kesimpulan dan pembahasan.",
];

function GradeRow({
  item,
  onSaved,
}: {
  item: RowItem;
  onSaved: () => void;
}) {
  const [nilaiInput, setNilaiInput] = useState(
    item.nilai?.nilai !== null && item.nilai?.nilai !== undefined
      ? String(item.nilai.nilai)
      : "",
  );
  const [feedback, setFeedback] = useState(item.nilai?.feedback ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const utils = trpc.useUtils();
  const grade = trpc.guru.gradeSubmission.useMutation({
    onSuccess: () => {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      toast.success(`Nilai untuk ${item.siswaNama} berhasil disimpan!`);
      onSaved();
    },
    onError: (e) => setError(e.message),
  });

  const downloadFile = async (submissionId: number) => {
    const f = await utils.guru.downloadSubmissionFile.fetch({ submissionId });
    downloadBase64(f.fileNama, f.dataBase64, f.fileMime);
  };

  const save = () => {
    setError(null);
    if (!item.submission) return;
    const trimmed = nilaiInput.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 100)) {
      setError("Nilai harus berupa angka antara 0 - 100.");
      return;
    }
    grade.mutate({
      submissionId: item.submission.id,
      nilai: parsed,
      feedback: feedback || undefined,
    });
  };

  const setScorePreset = (val: number) => {
    setNilaiInput(String(val));
  };

  const addFeedbackPreset = (text: string) => {
    setFeedback((prev) => (prev ? `${prev} ${text}` : text));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4 hover:border-primary/50 transition-all">
      {/* Student & Submission Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold text-sm flex items-center justify-center shadow-inner">
            {item.siswaNama.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">{item.siswaNama}</h4>
            {item.submission ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  Submit: {formatTanggalWaktu(item.submission.waktuSubmit)}
                </span>
                {item.submission.terlambat ? (
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border border-[#F23F43]/40">
                    Terlambat
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30">
                    Tepat Waktu
                  </span>
                )}
              </div>
            ) : (
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-background text-muted-foreground border border-border mt-0.5">
                Belum Submit
              </span>
            )}
          </div>
        </div>

        <NilaiBadge nilai={item.nilai?.nilai} />
      </div>

      {/* Submission Content Area */}
      {item.submission ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-background border border-border/70 p-4 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Isi Jawaban Siswa:
            </span>
            {item.submission.isiText ? (
              <p className="text-xs text-card-foreground whitespace-pre-wrap leading-relaxed">
                {item.submission.isiText}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                (Tidak menyertakan jawaban teks — lihat lampiran berkas di bawah)
              </p>
            )}

            {item.submission.fileNama && (
              <div className="pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadFile(item.submission!.id)}
                  className="h-8 bg-card border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Unduh Lampiran: {item.submission.fileNama}
                </Button>
              </div>
            )}
          </div>

          {/* Teacher Grading & Feedback Form */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Input Nilai (0 - 100):
                </span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="—"
                  value={nilaiInput}
                  onChange={(e) => setNilaiInput(e.target.value)}
                  className="w-20 h-9 bg-background border-border text-foreground text-center font-extrabold text-sm rounded-lg focus:border-primary"
                />
              </div>

              {/* Preset Score Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground">Preset Cepat:</span>
                {[100, 95, 90, 85, 80, 75, 50, 0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setScorePreset(preset)}
                    className="px-2 py-0.5 rounded text-xs font-bold bg-card hover:bg-primary hover:text-white text-muted-foreground border border-border transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Feedback Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  Catatan / Feedback untuk Siswa & Orang Tua:
                </label>
              </div>

              {/* Feedback Preset Chips */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {FEEDBACK_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addFeedbackPreset(preset)}
                    className="text-[10px] px-2 py-1 rounded-md bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Tuliskan apresiasi, koreksi langkah jawaban, atau masukan untuk siswa..."
                rows={2}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-lg focus:border-primary"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              {savedSuccess ? (
                <span className="text-xs font-bold text-green-600 dark:text-[#57F287] flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Nilai berhasil tersimpan!
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Nilai otomatis tersinkronisasi ke portal siswa & orang tua.
                </span>
              )}

              <Button
                size="sm"
                onClick={save}
                disabled={grade.isPending}
                className="h-8 bg-primary hover:bg-[#0097E6] text-white text-xs font-bold rounded-lg shadow-sm px-4"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {grade.isPending ? "Menyimpan..." : "Simpan Nilai"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-background/30 border border-border/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Siswa belum mengumpulkan tugas ini.
          </p>
        </div>
      )}
    </div>
  );
}

function SpeedGraderPanel({
  items,
  onSaved,
}: {
  items: RowItem[];
  onSaved: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem = items[currentIndex];
  const [nilaiInput, setNilaiInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  useEffect(() => {
    if (currentItem) {
      setNilaiInput(
        currentItem.nilai?.nilai !== null && currentItem.nilai?.nilai !== undefined
          ? String(currentItem.nilai.nilai)
          : "",
      );
      setFeedback(currentItem.nilai?.feedback ?? "");
      setError(null);
      setSavedSuccess(false);
    }
  }, [currentIndex, currentItem]);

  const gradeMutation = trpc.guru.gradeSubmission.useMutation({
    onSuccess: () => {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      toast.success(`Nilai untuk ${currentItem?.siswaNama} tersimpan!`);
      onSaved();
    },
    onError: (e) => setError(e.message),
  });

  const downloadFile = async (submissionId: number) => {
    const f = await utils.guru.downloadSubmissionFile.fetch({ submissionId });
    downloadBase64(f.fileNama, f.dataBase64, f.fileMime);
  };

  const handleSaveOnly = useCallback(() => {
    if (!currentItem?.submission) return;
    setError(null);
    const trimmed = nilaiInput.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 100)) {
      setError("Nilai harus berupa angka 0 - 100.");
      return;
    }
    gradeMutation.mutate({
      submissionId: currentItem.submission.id,
      nilai: parsed,
      feedback: feedback || undefined,
    });
  }, [currentItem, nilaiInput, feedback, gradeMutation]);

  const handleSaveAndNext = useCallback(() => {
    if (currentItem?.submission) {
      const trimmed = nilaiInput.trim();
      const parsed = trimmed === "" ? null : Number(trimmed);
      if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 100)) {
        setError("Nilai harus berupa angka 0 - 100.");
        return;
      }
      gradeMutation.mutate(
        {
          submissionId: currentItem.submission.id,
          nilai: parsed,
          feedback: feedback || undefined,
        },
        {
          onSuccess: () => {
            if (currentIndex < items.length - 1) {
              setCurrentIndex((prev) => prev + 1);
            } else {
              toast.info("Anda telah mencapai siswa terakhir dalam daftar!");
            }
          },
        },
      );
    } else {
      if (currentIndex < items.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }
  }, [currentItem, currentIndex, items.length, nilaiInput, feedback, gradeMutation]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement?.tagName.toLowerCase();
      const isTyping = activeEl === "input" || activeEl === "textarea";

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSaveAndNext();
        return;
      }

      if (!isTyping) {
        if (e.key === "ArrowLeft" || e.key === "k" || e.key === "K") {
          e.preventDefault();
          setCurrentIndex((prev) => Math.max(0, prev - 1));
        } else if (e.key === "ArrowRight" || e.key === "j" || e.key === "J") {
          e.preventDefault();
          setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length, handleSaveAndNext]);

  if (!currentItem) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border">
        Tidak ada data siswa untuk ditampilkan dalam SpeedGrader.
      </div>
    );
  }

  const isSubmitted = !!currentItem.submission;
  const isGraded = currentItem.nilai?.nilai !== null && currentItem.nilai?.nilai !== undefined;

  return (
    <div className="space-y-4">
      {/* SpeedGrader Floating Navigation & Status Bar */}
      <div className="bg-card rounded-2xl border border-border/80 p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-md">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Canvas SpeedGrader Mode
              </span>
              <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-mono font-semibold text-muted-foreground">
                Siswa {currentIndex + 1} dari {items.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gunakan shortcut keyboard: <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">J</kbd> / <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">K</kbd> untuk ganti siswa, <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">Ctrl+Enter</kbd> simpan & lanjut.
            </p>
          </div>
        </div>

        {/* Student Quick Selector & Paging Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="h-9 rounded-xl text-xs font-semibold bg-background hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev (K)
          </Button>

          <select
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="h-9 px-3 text-xs font-bold rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary max-w-[200px] truncate"
          >
            {items.map((it, idx) => {
              const statusIcon = it.nilai?.nilai !== null && it.nilai?.nilai !== undefined
                ? "[Dinilai]"
                : it.submission
                ? "[Kumpul]"
                : "[Belum]";
              return (
                <option key={it.siswaId} value={idx}>
                  {idx + 1}. {it.siswaNama} {statusIcon}
                </option>
              );
            })}
          </select>

          <Button
            variant="outline"
            size="sm"
            disabled={currentIndex === items.length - 1}
            onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
            className="h-9 rounded-xl text-xs font-semibold bg-background hover:bg-secondary"
          >
            Next (J) <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* SpeedGrader Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Submission & Document Viewer (7 Cols) */}
        <div className="lg:col-span-7 bg-card rounded-2xl border border-border p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary font-bold text-lg flex items-center justify-center shadow-inner border border-primary/20">
                {currentItem.siswaNama.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {currentItem.siswaNama}
                </h3>
                {isSubmitted ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Diserahkan: {formatTanggalWaktu(currentItem.submission!.waktuSubmit)}
                    </span>
                    {currentItem.submission!.terlambat ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border border-[#F23F43]/40">
                        Terlambat
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30">
                        Tepat Waktu
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-background text-muted-foreground border border-border mt-0.5">
                    Belum Mengumpulkan Tugas
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {isGraded ? "Sudah Dinilai" : "Menunggu Penilaian"}
              </span>
              <NilaiBadge nilai={currentItem.nilai?.nilai} />
            </div>
          </div>

          {/* Submission Text Content */}
          {isSubmitted ? (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Lembar Jawaban Teks Siswa:
                </span>
                <div className="rounded-xl bg-background border border-border/80 p-4 min-h-[160px] max-h-[360px] overflow-y-auto">
                  {currentItem.submission!.isiText ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                      {currentItem.submission!.isiText}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      (Siswa tidak menyertakan jawaban teks, periksa berkas lampiran di bawah)
                    </p>
                  )}
                </div>
              </div>

              {/* File Attachment Card */}
              {currentItem.submission!.fileNama ? (
                <div className="p-4 rounded-xl bg-background border border-primary/40 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block truncate">
                        {currentItem.submission!.fileNama}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Berkas lampiran pengerjaan tugas
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadFile(currentItem.submission!.id)}
                    className="h-8 rounded-xl bg-card border-border hover:bg-secondary text-xs font-semibold shrink-0"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5 text-primary" /> Unduh Berkas
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-background/50 border border-border text-center text-xs text-muted-foreground">
                  Tidak ada file dokumen lampiran yang diunggah.
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-background/40 rounded-xl border border-dashed border-border">
              <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Belum Mengumpulkan</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Siswa ini belum mengirimkan jawaban tugas. Anda dapat melewati siswa ini atau memberi catatan peringatan.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Rapid Grading Rubric & Feedback Box (5 Cols) */}
        <div className="lg:col-span-5 bg-card rounded-2xl border border-border p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Rubrik & Nilai Cepat
            </h4>
            <span className="text-[11px] text-muted-foreground">Skala 0 - 100</span>
          </div>

          {/* Grade Input Big Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border">
              <span className="text-xs font-bold text-muted-foreground">Nilai Akhir:</span>
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0"
                  disabled={!isSubmitted}
                  value={nilaiInput}
                  onChange={(e) => setNilaiInput(e.target.value)}
                  className="w-24 h-11 bg-card border-border text-foreground text-center font-extrabold text-xl rounded-xl focus:border-primary shadow-inner"
                />
                <span className="text-sm font-bold text-muted-foreground">/ 100</span>
              </div>
            </div>

            {/* Score Preset Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">Preset Nilai Cepat:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[100, 95, 90, 85, 80, 75, 50, 0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={!isSubmitted}
                    onClick={() => setNilaiInput(String(preset))}
                    className="py-1.5 rounded-lg text-xs font-bold bg-background hover:bg-primary hover:text-white text-foreground border border-border transition-all disabled:opacity-40"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              Catatan Evaluasi / Feedback Guru:
            </label>

            {/* Quick Feedback Presets */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {FEEDBACK_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={!isSubmitted}
                  onClick={() => setFeedback((prev) => (prev ? `${prev} ${preset}` : preset))}
                  className="text-[10px] text-left px-2 py-1 rounded-md bg-background hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors disabled:opacity-40"
                >
                  + {preset}
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Tuliskan catatan apresiasi, koreksi, atau saran perbaikan..."
              rows={3}
              disabled={!isSubmitted}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="bg-background border-border text-foreground text-xs rounded-xl focus:border-primary"
            />
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Nilai berhasil disimpan & disinkronkan!</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Button
              onClick={handleSaveAndNext}
              disabled={!isSubmitted || gradeMutation.isPending}
              className="w-full h-11 bg-primary hover:bg-[#0097E6] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#0984E3]/25 transition-all"
            >
              <Check className="mr-1.5 h-4 w-4" />
              {gradeMutation.isPending
                ? "Menyimpan Nilai..."
                : "Simpan & Lanjut Siswa Berikutnya (Ctrl+Enter)"}
            </Button>

            <Button
              variant="outline"
              onClick={handleSaveOnly}
              disabled={!isSubmitted || gradeMutation.isPending}
              className="w-full h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Simpan Nilai Saja
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuruTugas() {
  const { id } = useParams<{ id: string }>();
  const tugasId = Number(id);
  const utils = trpc.useUtils();
  const subs = trpc.guru.tugasSubmissions.useQuery({ tugasId });
  const [viewMode, setViewMode] = useState<"speedgrader" | "list">("speedgrader");
  const [filter, setFilter] = useState<"all" | "submitted" | "pending" | "ungraded">("all");
  const [searchSiswa, setSearchSiswa] = useState("");
  const deferredSearchSiswa = useDeferredValue(searchSiswa);

  const refetch = () => {
    utils.guru.tugasSubmissions.invalidate({ tugasId });
  };

  const downloadLampiran = async () => {
    const f = await utils.guru.downloadLampiran.fetch({ tugasId });
    downloadBase64(f.fileNama, f.dataBase64);
  };

  if (!subs.data) {
    return (
      <SchoolLayout role="guru" title="Penilaian Tugas" nav={GURU_NAV}>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Memuat data submission...
        </div>
      </SchoolLayout>
    );
  }

  const { tugas, kelasNama, mapelNama, items } = subs.data;
  const totalSub = items.filter((i) => i.submission !== null).length;
  const gradedSub = items.filter(
    (i) => i.nilai?.nilai !== null && i.nilai?.nilai !== undefined,
  ).length;

  const percentGraded = totalSub > 0 ? Math.round((gradedSub / totalSub) * 100) : 100;

  const filteredItems = items.filter((it) => {
    const matchSearch = it.siswaNama.toLowerCase().includes(deferredSearchSiswa.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "submitted") return it.submission !== null;
    if (filter === "pending") return it.submission === null;
    if (filter === "ungraded")
      return (
        it.submission !== null &&
        (it.nilai?.nilai === null || it.nilai?.nilai === undefined)
      );
    return true;
  });

  const exportScoresCSV = () => {
    const headers = [
      "No",
      "Nama Siswa",
      "Status Pengumpulan",
      "Waktu Submit",
      "Nilai",
      "Feedback Guru",
    ];
    const rows = items.map((it, idx) => [
      idx + 1,
      it.siswaNama,
      it.submission
        ? it.submission.terlambat
          ? "Terlambat"
          : "Tepat Waktu"
        : "Belum Mengumpulkan",
      it.submission ? formatTanggalWaktu(it.submission.waktuSubmit) : "-",
      it.nilai?.nilai !== null && it.nilai?.nilai !== undefined
        ? it.nilai.nilai
        : "-",
      it.nilai?.feedback || "-",
    ]);
    exportToCSV(`Nilai_Tugas_${tugas.judul}_Kelas_${kelasNama}`, headers, rows);
    toast.success(`Lembar nilai tugas "${tugas.judul}" berhasil diekspor!`);
  };

  return (
    <SchoolLayout
      role="guru"
      title={`Penilaian: ${tugas.judul}`}
      nav={GURU_NAV}
    >
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-10 w-10 bg-background border-border text-foreground hover:bg-secondary rounded-xl shrink-0"
          >
            <Link to="/guru">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-brand text-foreground">
                {tugas.judul}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mapelNama} &bull; Kelas {kelasNama} &bull; Deadline:{" "}
              <span className="text-card-foreground font-semibold">
                {formatTanggalWaktu(tugas.deadline)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-background border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("speedgrader")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "speedgrader"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="h-3.5 w-3.5" /> SpeedGrader
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
              <LayoutList className="h-3.5 w-3.5" /> Daftar Siswa
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportScoresCSV}
            className="h-9 bg-background border-border text-foreground hover:bg-secondary rounded-xl text-xs font-semibold"
          >
            <Download className="mr-1.5 h-4 w-4 text-[#23A559]" />
            Ekspor Nilai (CSV)
          </Button>

          {tugas.hasLampiran && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLampiran}
              className="h-9 bg-background border-border text-foreground hover:bg-secondary rounded-xl text-xs font-semibold"
            >
              <Download className="mr-1.5 h-4 w-4 text-blue-600 dark:text-[#70B8FF]" />
              Unduh Dokumen Soal
            </Button>
          )}
        </div>
      </div>

      {/* Progress Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl bg-card border border-border p-4 text-center">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Siswa
          </span>
          <p className="text-2xl font-extrabold text-foreground mt-1">
            {items.length}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 text-center">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Sudah Submit
          </span>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-[#70B8FF] mt-1">
            {totalSub}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 text-center">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Sudah Dinilai
          </span>
          <p className="text-2xl font-extrabold text-green-600 dark:text-[#57F287] mt-1">
            {gradedSub}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 text-center">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Progress Penilaian
          </span>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-[#FEE75C] mt-1">
            {percentGraded}%
          </p>
        </div>
      </div>

      {/* SpeedGrader vs List View Content */}
      {viewMode === "speedgrader" ? (
        <SpeedGraderPanel
          items={items}
          onSaved={refetch}
        />
      ) : (
        /* Filter Tabs & Submissions List */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-lg">
            <div className="flex items-center gap-1.5 p-1 bg-background border border-border rounded-xl flex-wrap">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === "all"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("submitted")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === "submitted"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sudah Kumpul ({totalSub})
              </button>
              <button
                type="button"
                onClick={() => setFilter("ungraded")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === "ungraded"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Belum Dinilai ({totalSub - gradedSub})
              </button>
              <button
                type="button"
                onClick={() => setFilter("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === "pending"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Belum Kumpul ({items.length - totalSub})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama siswa..."
                value={searchSiswa}
                onChange={(e) => setSearchSiswa(e.target.value)}
                className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredItems.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border">
                Tidak ada data siswa yang cocok dengan filter terpilih.
              </div>
            )}
            {filteredItems.map((it) => (
              <GradeRow key={it.siswaId} item={it} onSaved={refetch} />
            ))}
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
