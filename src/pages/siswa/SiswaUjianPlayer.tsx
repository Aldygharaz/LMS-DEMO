import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  Award,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import confetti from "canvas-confetti";
import { SchoolLayout } from "@/components/SchoolLayout";
import { SISWA_NAV } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SiswaUjianPlayer() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ujianId = Number(id);
  const isReviewParam = searchParams.get("mode") === "review";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(30 * 60);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);

  const startMutation = trpc.siswa.startUjian.useMutation();
  const submitMutation = trpc.siswa.submitJawabanUjian.useMutation({
    onSuccess: (res) => {
      setExamResult(res);
      toast.success("Ujian CBT berhasil diselesaikan!");
      
      // Trigger Delightful Confetti
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#23A559', '#0984E3', '#FEE75C']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#23A559', '#0984E3', '#FEE75C']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    },
    onError: (err) => toast.error(err.message),
  });
  const tabViolationMutation = trpc.siswa.reportTabViolation.useMutation();

  const reviewQuery = trpc.siswa.ujianReviewDetail.useQuery(
    { ujianId },
    { enabled: !isNaN(ujianId) && isReviewParam },
  );

  const examData = startMutation.data;
  const questions = examData?.questions ?? [];
  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  // Inisialisasi Ujian jika belum review
  useEffect(() => {
    if (!isNaN(ujianId) && !isReviewParam) {
      startMutation.mutate(
        { ujianId },
        {
          onSuccess: (data) => {
            setRemainingSeconds(data.remainingSeconds);
            // Muat jawaban lokal atau tersimpan
            const cached = localStorage.getItem(`cbt_ans_${ujianId}`);
            if (cached) {
              try {
                setAnswers(JSON.parse(cached));
              } catch {
                setAnswers(data.savedAnswers || {});
              }
            } else if (data.savedAnswers) {
              setAnswers(data.savedAnswers);
            }
          },
          onError: (err) => {
            if (err.message.includes("sudah menyelesaikan")) {
              navigate(`/siswa/ujian/${ujianId}?mode=review`, { replace: true });
            }
          },
        },
      );
    }
  }, [ujianId, isReviewParam, startMutation, navigate]);

  // Simpan jawaban lokal saat berubah (bisa toggle hapus pilihan jika opsi yang sama diklik lagi)
  const handleSelectOption = (opt: "A" | "B" | "C" | "D") => {
    if (!currentQ || isReviewParam || examResult) return;
    setAnswers((prev) => {
      const isAlreadySelected = prev[String(currentQ.nomorUrut)] === opt;
      const updated = { ...prev };
      if (isAlreadySelected) {
        delete updated[String(currentQ.nomorUrut)];
      } else {
        updated[String(currentQ.nomorUrut)] = opt;
      }
      localStorage.setItem(`cbt_ans_${ujianId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearOption = () => {
    if (!currentQ || isReviewParam || examResult) return;
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[String(currentQ.nomorUrut)];
      localStorage.setItem(`cbt_ans_${ujianId}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Anti-Cheat Tab Switch Detection
    const handleSubmitExam = useCallback(() => {
    localStorage.removeItem(`cbt_ans_${ujianId}`);
    submitMutation.mutate({
      ujianId,
      jawaban: answersRef.current,
    });
  }, [ujianId, submitMutation]);

  useEffect(() => {
    if (isReviewParam || examResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabViolationMutation.mutate({ ujianId });
        toast.warning(
          "Peringatan Integritas: Berpindah tab / jendela telah dicatat ke log pengawas ujian!",
          { duration: 5000 },
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [ujianId, isReviewParam, examResult, tabViolationMutation]);

  // Countdown Timer Interval
  useEffect(() => {
    if (isReviewParam || examResult || !startMutation.isSuccess) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isReviewParam, examResult, startMutation.isSuccess, handleSubmitExam]);

  // Keyboard Shortcuts (A, B, C, D, Panah Kiri/Kanan)
  useEffect(() => {
    if (isReviewParam || examResult || showConfirmSubmit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      const key = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(key)) {
        handleSelectOption(key as "A" | "B" | "C" | "D");
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight" && questions.length > 0) {
        setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReviewParam, examResult, showConfirmSubmit, currentQ, questions.length, handleSelectOption]);

  
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // REVIEW MODE
  if (isReviewParam) {
    const reviewData = reviewQuery.data;
    if (reviewQuery.isLoading) {
      return (
        <SchoolLayout role="siswa" title="Review Hasil Ujian" nav={SISWA_NAV}>
          <div className="text-center py-20 text-xs text-muted-foreground">
            Memuat kunci jawaban dan pembahasan...
          </div>
        </SchoolLayout>
      );
    }

    if (!reviewData) {
      return (
        <SchoolLayout role="siswa" title="Review Hasil Ujian" nav={SISWA_NAV}>
          <div className="text-center py-20 text-xs text-muted-foreground">
            Data review belum tersedia.
          </div>
        </SchoolLayout>
      );
    }

    const { exam, record, questions } = reviewData;

    return (
      <SchoolLayout role="siswa" title={`Review: ${exam.judul}`} nav={SISWA_NAV}>
        {/* Header Strip */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/siswa/ujian")}
              className="h-9 w-9 p-0 rounded-xl bg-background border-border text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg font-bold font-brand text-foreground">
                Review Kunci Jawaban &amp; Pembahasan
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {exam.judul} &bull; {exam.mapelNama} &bull; KKM: {exam.kkm}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-background border border-border text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Skor Akhir
              </span>
              <span
                className={`font-mono text-xl font-extrabold ${
                  (record.nilai ?? 0) >= exam.kkm ? "text-green-600 dark:text-[#57F287]" : "text-red-600 dark:text-[#FF7074]"
                }`}
              >
                {record.nilai} / 100
              </span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                Hasil
              </span>
              <span className="text-xs font-bold text-foreground">
                {record.totalBenar} Benar / {record.totalSalah} Salah
              </span>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {questions.map((q, idx) => (
            <Card
              key={q.id}
              className={`bg-card border shadow-lg rounded-2xl overflow-hidden ${
                q.isCorrect ? "border-green-300 dark:border-[#23A559]/50" : "border-[#F23F43]/50"
              }`}
            >
              <CardHeader className="bg-background py-3 px-5 border-b border-border flex flex-row items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-2">
                  <span
                    className={`h-6 w-6 rounded-lg text-foreground flex items-center justify-center font-mono text-xs ${
                      q.isCorrect ? "bg-[#23A559]" : "bg-[#F23F43]"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  Soal Nomor {idx + 1}
                </span>

                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    q.isCorrect
                      ? "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287]"
                      : "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074]"
                  }`}
                >
                  {q.isCorrect ? "Jawaban Benar (+20 Poin)" : "Jawaban Salah"}
                </span>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  {q.pertanyaan}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const optText =
                      opt === "A"
                        ? q.pilihanA
                        : opt === "B"
                          ? q.pilihanB
                          : opt === "C"
                            ? q.pilihanC
                            : q.pilihanD;
                    const isKey = q.kunciJawaban === opt;
                    const isStudent = q.studentChoice === opt;

                    return (
                      <div
                        key={opt}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${
                          isKey
                            ? "bg-green-100 dark:bg-[#23A559]/20 border-[#23A559] text-white"
                            : isStudent
                              ? "bg-red-100 dark:bg-[#F23F43]/20 border-[#F23F43] text-white"
                              : "bg-background border-border text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`h-5 w-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                              isKey
                                ? "bg-[#23A559] text-white"
                                : isStudent
                                  ? "bg-[#F23F43] text-white"
                                  : "bg-card text-muted-foreground"
                            }`}
                          >
                            {opt}
                          </span>
                          <span className="text-xs mt-0.5">{optText}</span>
                        </div>

                        {isKey && (
                          <span className="text-[10px] font-bold text-green-600 dark:text-[#57F287] bg-[#23A559]/30 px-1.5 py-0.5 rounded shrink-0">
                            Kunci Sah
                          </span>
                        )}
                        {isStudent && !isKey && (
                          <span className="text-[10px] font-bold text-red-600 dark:text-[#FF7074] bg-[#F23F43]/30 px-1.5 py-0.5 rounded shrink-0">
                            Pilihan Kamu
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.pembahasan && (
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-blue-200 dark:border-primary/30 text-xs text-blue-600 dark:text-[#70B8FF]">
                    <strong className="block mb-1 text-foreground flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" />
                      Pembahasan &amp; Penjelasan:
                    </strong>
                    {q.pembahasan}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </SchoolLayout>
    );
  }

  // EXAM PLAYER (TEST TAKING MODE)
  if (startMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-semibold">
            Mempersiapkan sesi ujian CBT aman...
          </p>
        </div>
      </div>
    );
  }

  if (startMutation.isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md bg-card border-border p-6 text-center rounded-2xl">
          <AlertCircle className="h-10 w-10 text-red-600 dark:text-[#FF7074] mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground mb-1">Gagal Memulai Ujian</h3>
          <p className="text-xs text-muted-foreground mb-4">{startMutation.error.message}</p>
          <Button
            onClick={() => navigate("/siswa/ujian")}
            className="h-9 rounded-xl bg-primary text-white text-xs font-bold"
          >
            Kembali ke Daftar Ujian
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-card-foreground flex flex-col font-sans">
      {/* Floating HUD Top Bar */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-6 py-3 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold font-brand text-foreground flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#57F287] animate-pulse" />
            {examData?.exam.judul}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Kelas {examData?.exam.kelasNama} &bull; {examData?.exam.mapelNama} &bull; KKM: {examData?.exam.kkm}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-extrabold border ${
              remainingSeconds < 300
                ? "bg-red-100 dark:bg-[#F23F43]/20 border-[#F23F43] text-red-600 dark:text-[#FF7074] animate-pulse"
                : "bg-background border-border text-foreground"
            }`}
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          <Button
            type="button"
            onClick={() => setShowConfirmSubmit(true)}
            className="h-9 rounded-xl bg-[#23A559] hover:bg-[#1E8A4B] text-white text-xs font-bold shadow-md"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Kumpulkan Ujian
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Question Box */}
        <div className="lg:col-span-3 space-y-4">
          {currentQ ? (
            <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-background py-3.5 px-6 border-b border-border flex flex-row items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-2">
                  <span className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center font-mono text-sm font-bold">
                    {currentIndex + 1}
                  </span>
                  Soal Nomor {currentIndex + 1} dari {questions.length}
                </span>

                <span className="text-xs text-muted-foreground font-semibold">
                  Bobot: {currentQ.poin} Poin
                </span>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                  {currentQ.pertanyaan}
                </p>

                <div className="space-y-3">
                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const optText =
                      opt === "A"
                        ? currentQ.pilihanA
                        : opt === "B"
                          ? currentQ.pilihanB
                          : opt === "C"
                            ? currentQ.pilihanC
                            : currentQ.pilihanD;
                    const isSelected = answers[String(currentQ.nomorUrut)] === opt;

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          isSelected
                            ? "bg-blue-100 dark:bg-primary/20 border-primary text-white shadow-sm ring-1 ring-primary"
                            : "bg-background border-border text-card-foreground hover:border-border hover:bg-secondary/40"
                        }`}
                      >
                        <span
                          className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-card text-muted-foreground"
                          }`}
                        >
                          {opt}
                        </span>
                        <span className="text-xs sm:text-sm mt-0.5">{optText}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="h-10 rounded-xl bg-background border-border text-foreground text-xs font-semibold"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Sebelumnya
                  </Button>

                  <div className="flex items-center gap-3">
                    {answers[String(currentQ.nomorUrut)] && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearOption}
                        className="h-8 px-2.5 rounded-lg bg-background border-border text-red-600 dark:text-[#FF7074] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 text-[11px] font-semibold"
                      >
                        Hapus Jawaban
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {answeredCount} dari {questions.length} terjawab
                    </span>
                  </div>

                  {currentIndex < questions.length - 1 ? (
                    <Button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
                      }
                      className="h-10 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold"
                    >
                      Selanjutnya
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowConfirmSubmit(true)}
                      className="h-10 rounded-xl bg-[#23A559] hover:bg-[#1E8A4B] text-white text-xs font-bold"
                    >
                      Kumpulkan
                      <Send className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Keyboard Shortcut Assist Badge */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] text-foreground">A</span>
                    <span className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] text-foreground">B</span>
                    <span className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] text-foreground">C</span>
                    <span className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] text-foreground">D</span>
                    <span className="ml-1">Pilih Opsi</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] text-foreground">&larr;</span>
                    <span className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] text-foreground">&rarr;</span>
                    <span className="ml-1">Ganti Nomor</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right: Question Grid Navigator */}
        <div className="space-y-4">
          <Card className="bg-card border-border p-5 rounded-2xl shadow-xl">
            <h3 className="text-xs font-bold font-brand text-foreground uppercase tracking-wider mb-3">
              Nomor Soal ({answeredCount}/{questions.length})
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[String(q.nomorUrut)];
                const isCurrent = currentIndex === idx;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl font-bold font-mono text-xs transition-all ${
                      isCurrent
                        ? "border-2 border-white bg-primary text-white shadow-md"
                        : isAnswered
                          ? "bg-[#23A559] text-white"
                          : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-[#23A559]" />
                <span>Sudah Terjawab</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-background border border-border" />
                <span>Belum Terjawab</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md border border-white bg-primary" />
                <span>Soal Aktif</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Konfirmasi Kumpulkan */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-primary/20 text-primary flex items-center justify-center mx-auto mb-2">
                <Send className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold font-brand text-foreground">
                Kumpulkan Jawaban Ujian?
              </h3>
              <p className="text-xs text-muted-foreground">
                Anda telah menjawab <strong>{answeredCount}</strong> dari <strong>{questions.length}</strong> butir soal. Sisa waktu: <strong>{formatTimer(remainingSeconds)}</strong>.
              </p>

              {answeredCount < questions.length && (
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-[#F0B232]/15 text-amber-600 dark:text-[#FEE75C] border border-amber-200 dark:border-[#F0B232]/30 text-xs text-left flex items-start gap-2 mt-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-[#FEE75C]" />
                  <span>
                    <strong>Peringatan:</strong> Masih ada <strong>{questions.length - answeredCount} soal</strong> yang belum Anda jawab. Soal yang dikosongkan akan memperoleh nilai 0.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmSubmit(false)}
                className="h-10 rounded-xl bg-background border-border text-muted-foreground text-xs font-semibold"
              >
                Lanjut Mengerjakan
              </Button>
              <Button
                type="button"
                disabled={submitMutation.isPending}
                onClick={handleSubmitExam}
                className="h-10 rounded-xl bg-[#23A559] hover:bg-[#1E8A4B] text-white text-xs font-bold"
              >
                {submitMutation.isPending ? "Memproses Nilai..." : "Ya, Kumpulkan Sekarang"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hasil Ujian Instan (Scorecard) */}
      {examResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center mx-auto mb-1">
              <Award className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold font-brand text-foreground">
                Ujian CBT Selesai!
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nilai Anda telah otomatis dihitung dan disinkronkan ke buku nilai guru
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Skor Perolehan
              </span>
              <p className="text-4xl font-extrabold font-mono text-green-600 dark:text-[#57F287]">
                {examResult.nilai}
              </p>
              <p className="text-xs text-muted-foreground">
                {examResult.totalBenar} Jawaban Benar &bull; {examResult.totalSalah} Jawaban Salah
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                onClick={() => navigate(`/siswa/ujian/${ujianId}?mode=review`)}
                className="h-10 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold w-full"
              >
                Review Kunci &amp; Pembahasan
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
