import { useEffect, useState, useDeferredValue } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Plus,
  Trash2,
  Copy,
  Search,
  Download,
  Printer,
  ChevronLeft,
  Save,
  Users,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { GURU_NAV } from "@/lib/nav";
import { exportToCSV } from "@/lib/lms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface QuestionItem {
  id?: number;
  pertanyaan: string;
  pilihanA: string;
  pilihanB: string;
  pilihanC: string;
  pilihanD: string;
  kunciJawaban: "A" | "B" | "C" | "D";
  pembahasan?: string;
  poin: number;
}

export default function GuruUjianDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ujianId = Number(id);

  const utils = trpc.useUtils();
  const detailQuery = trpc.guru.ujianDetail.useQuery(
    { ujianId },
    { enabled: !isNaN(ujianId) },
  );
  const pesertaQuery = trpc.guru.listPesertaUjian.useQuery(
    { ujianId },
    { enabled: !isNaN(ujianId) },
  );

  const [activeTab, setActiveTab] = useState<"soal" | "peserta">("soal");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [searchStudent, setSearchStudent] = useState("");
  const deferredSearchStudent = useDeferredValue(searchStudent);

  useEffect(() => {
    if (detailQuery.data?.questions) {
      setQuestions(
        detailQuery.data.questions.map((q) => ({
          id: q.id,
          pertanyaan: q.pertanyaan,
          pilihanA: q.pilihanA,
          pilihanB: q.pilihanB,
          pilihanC: q.pilihanC,
          pilihanD: q.pilihanD,
          kunciJawaban: q.kunciJawaban as "A" | "B" | "C" | "D",
          pembahasan: q.pembahasan || "",
          poin: q.poin,
        })),
      );
    }
  }, [detailQuery.data]);

  const saveSoalMutation = trpc.guru.saveSoalUjian.useMutation({
    onSuccess: () => {
      utils.guru.ujianDetail.invalidate({ ujianId });
      utils.guru.listUjian.invalidate();
      toast.success("Bank soal ujian berhasil disimpan!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        pertanyaan: "",
        pilihanA: "",
        pilihanB: "",
        pilihanC: "",
        pilihanD: "",
        kunciJawaban: "A",
        pembahasan: "",
        poin: 20,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDuplicateQuestion = (index: number) => {
    setQuestions((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const clone = { ...target };
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
    toast.success(`Soal nomor ${index + 1} berhasil diduplikasi!`);
  };

  const handleQuestionChange = (index: number, field: keyof QuestionItem, value: any) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveQuestions = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.pertanyaan.trim()) {
        toast.error(`Pertanyaan soal nomor ${i + 1} tidak boleh kosong.`);
        return;
      }
      if (!q.pilihanA.trim() || !q.pilihanB.trim() || !q.pilihanC.trim() || !q.pilihanD.trim()) {
        toast.error(`Pilihan A, B, C, D soal nomor ${i + 1} wajib diisi lengkap.`);
        return;
      }
    }
    saveSoalMutation.mutate({
      ujianId,
      questions,
    });
  };

  const exam = detailQuery.data?.exam;
  const participantData = pesertaQuery.data;
  const studentRows = participantData?.rows ?? [];
  const stats = participantData?.stats ?? {
    totalSiswa: 0,
    totalSelesai: 0,
    rataRata: null,
    nilaiTertinggi: null,
    nilaiTerendah: null,
    tuntasCount: 0,
    tuntasRate: 0,
  };

  const filteredStudents = studentRows.filter(
    (s) =>
      s.siswaNama.toLowerCase().includes(deferredSearchStudent.toLowerCase()) ||
      s.siswaEmail.toLowerCase().includes(deferredSearchStudent.toLowerCase()),
  );

  const handleExportPesertaCSV = () => {
    if (!exam || studentRows.length === 0) return;
    const headers = [
      "No",
      "Nama Siswa",
      "Email Siswa",
      "Status Pengerjaan",
      "Nilai CBT (Skala 100)",
      "Status Ketuntasan",
      "Total Jawaban Benar",
      "Total Jawaban Salah",
      "Peringatan Pindah Tab",
    ];
    const dataRows = studentRows.map((s, idx) => [
      idx + 1,
      s.siswaNama,
      s.siswaEmail,
      s.status === "selesai" ? "Selesai" : "Belum Mengerjakan",
      s.nilai !== null ? s.nilai : "-",
      s.isTuntas ? "Tuntas KKM" : "Remedial",
      s.totalBenar,
      s.totalSalah,
      s.pelanggaranTab,
    ]);
    exportToCSV(`Hasil_CBT_${exam.judul.replace(/\s+/g, "_")}`, headers, dataRows);
    toast.success("Hasil CBT siswa berhasil diekspor!");
  };

  return (
    <SchoolLayout role="guru" title={exam ? exam.judul : "Detail Ujian CBT"} nav={GURU_NAV}>
      {/* Top Navigation Strip */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/guru/ujian")}
            className="h-9 w-9 p-0 rounded-xl bg-background border-border text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-bold font-brand text-foreground">
              {exam?.judul ?? "Memuat Ujian..."}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelas {exam?.kelasNama} &bull; {exam?.mapelNama} &bull; Durasi: {exam?.durasiMenit} Menit &bull; KKM: {exam?.kkm}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("soal")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === "soal"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bank Soal ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("peserta")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === "peserta"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Peserta &amp; Hasil ({stats.totalSelesai}/{stats.totalSiswa})
            </button>
          </div>

          {activeTab === "soal" ? (
            <Button
              type="button"
              onClick={handleSaveQuestions}
              disabled={saveSoalMutation.isPending}
              className="h-10 rounded-xl bg-[#23A559] hover:bg-[#1E8A4B] text-white text-xs font-bold shadow-md"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saveSoalMutation.isPending ? "Menyimpan..." : "Simpan Bank Soal"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={handleExportPesertaCSV}
                variant="outline"
                className="h-10 rounded-xl bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold"
              >
                <Download className="mr-1.5 h-4 w-4 text-[#23A559]" />
                Ekspor CSV
              </Button>
              <Button
                type="button"
                onClick={() => window.print()}
                variant="outline"
                className="h-10 rounded-xl bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold"
              >
                <Printer className="mr-1.5 h-4 w-4 text-blue-600 dark:text-[#70B8FF]" />
                Cetak Hasil
              </Button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: QUESTION BUILDER */}
      {activeTab === "soal" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">
              Daftar Butir Soal Pilihan Ganda (Skor Maksimal Total: {questions.reduce((a, b) => a + b.poin, 0)})
            </span>
            <Button
              type="button"
              onClick={handleAddQuestion}
              className="h-9 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold shadow-sm"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Tambah Butir Soal
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="bg-card border-border p-8 text-center rounded-2xl">
              <p className="text-xs text-muted-foreground mb-3">
                Belum ada butir soal pada paket ujian ini. Klik "Tambah Butir Soal" untuk mulai menyusun soal pilihan ganda.
              </p>
              <Button
                type="button"
                onClick={handleAddQuestion}
                className="h-9 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Buat Soal Pertama
              </Button>
            </Card>
          ) : (
            questions.map((q, idx) => (
              <Card
                key={idx}
                className="bg-card border-border shadow-lg rounded-2xl overflow-hidden"
              >
                <CardHeader className="bg-background py-3 px-5 border-b border-border flex flex-row items-center justify-between">
                  <span className="font-bold text-xs text-foreground flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-primary text-white flex items-center justify-center font-mono text-xs">
                      {idx + 1}
                    </span>
                    Soal Nomor {idx + 1}
                  </span>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Bobot Poin:</span>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={q.poin}
                        onChange={(e) =>
                          handleQuestionChange(idx, "poin", Number(e.target.value) || 20)
                        }
                        className="w-16 h-7 bg-card border-border text-foreground text-xs text-center rounded-lg"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDuplicateQuestion(idx)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-blue-600 dark:hover:text-[#70B8FF] hover:bg-blue-100 dark:hover:bg-primary/15 transition-all"
                      title="Duplikasi Butir Soal Ini"
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-[#FF7074] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 transition-all"
                      title="Hapus Soal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground">
                      Teks Pertanyaan / Soal:
                    </Label>
                    <Textarea
                      value={q.pertanyaan}
                      onChange={(e) =>
                        handleQuestionChange(idx, "pertanyaan", e.target.value)
                      }
                      className="bg-background border-border text-foreground text-xs rounded-xl resize-none"
                      rows={2}
                      placeholder="Tuliskan pertanyaan atau studi kasus di sini..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(["A", "B", "C", "D"] as const).map((opt) => (
                      <div
                        key={opt}
                        className={`p-3 rounded-xl border transition-all ${
                          q.kunciJawaban === opt
                            ? "bg-green-100 dark:bg-[#23A559]/10 border-green-300 dark:border-[#23A559]/50"
                            : "bg-background border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span
                              className={`h-5 w-5 rounded-md flex items-center justify-center font-bold text-[11px] ${
                                q.kunciJawaban === opt
                                  ? "bg-[#23A559] text-white"
                                  : "bg-card text-muted-foreground"
                              }`}
                            >
                              {opt}
                            </span>
                            Pilihan {opt}
                          </label>

                          <button
                            type="button"
                            onClick={() => handleQuestionChange(idx, "kunciJawaban", opt)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                              q.kunciJawaban === opt
                                ? "bg-[#23A559] text-white"
                                : "text-muted-foreground hover:text-foreground bg-card"
                            }`}
                          >
                            {q.kunciJawaban === opt ? "Kunci Jawaban" : "Set Jadi Kunci"}
                          </button>
                        </div>

                        <Input
                          value={
                            opt === "A"
                              ? q.pilihanA
                              : opt === "B"
                                ? q.pilihanB
                                : opt === "C"
                                  ? q.pilihanC
                                  : q.pilihanD
                          }
                          onChange={(e) =>
                            handleQuestionChange(
                              idx,
                              opt === "A"
                                ? "pilihanA"
                                : opt === "B"
                                  ? "pilihanB"
                                  : opt === "C"
                                    ? "pilihanC"
                                    : "pilihanD",
                              e.target.value,
                            )
                          }
                          className="bg-card border-border text-foreground text-xs rounded-lg h-9"
                          placeholder={`Isi pilihan ${opt}...`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Pembahasan &amp; Keterangan Jawaban (Tampil saat siswa review hasil):
                    </Label>
                    <Input
                      value={q.pembahasan || ""}
                      onChange={(e) =>
                        handleQuestionChange(idx, "pembahasan", e.target.value)
                      }
                      className="bg-background border-border text-foreground text-xs rounded-xl h-9"
                      placeholder="Contoh: Rumus invers matriks ordo 2x2 adalah 1/det(A) * adj(A)..."
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 2: PESERTA & HASIL EVALUASI */}
      {activeTab === "peserta" && (
        <div className="space-y-6">
          {/* Stats KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Partisipasi Siswa
              </span>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {stats.totalSelesai} / {stats.totalSiswa}
              </p>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                {stats.totalSiswa > 0
                  ? Math.round((stats.totalSelesai / stats.totalSiswa) * 100)
                  : 0}
                % Mengikuti
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-[#70B8FF] block">
                Rata-rata Rombel
              </span>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-[#70B8FF] mt-1">
                {stats.rataRata ?? "—"}
              </p>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                KKM: {exam?.kkm}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
              <span className="text-[10px] uppercase font-bold text-green-600 dark:text-[#57F287] block">
                Nilai Tertinggi / Terendah
              </span>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                <span className="text-green-600 dark:text-[#57F287]">{stats.nilaiTertinggi ?? "—"}</span> /{" "}
                <span className="text-red-600 dark:text-[#FF7074]">{stats.nilaiTerendah ?? "—"}</span>
              </p>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Sebaran Skor CBT
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-[#FEE75C] block">
                Tingkat Ketuntasan
              </span>
              <p className="text-2xl font-extrabold text-amber-600 dark:text-[#FEE75C] mt-1">
                {stats.tuntasRate}%
              </p>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                {stats.tuntasCount} Siswa Tuntas KKM
              </span>
            </div>
          </div>

          {/* Student Table */}
          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold font-brand text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Daftar Nilai &amp; Status Peserta CBT
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Menampilkan {filteredStudents.length} siswa rombel {exam?.kelasNama}
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-56 print:hidden">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari siswa atau email..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl focus:border-primary"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-[600px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader className="bg-background sticky top-0 z-10">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 w-12 text-center">
                      No
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Nama Siswa
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-green-600 dark:text-[#57F287] py-3.5 text-center">
                      Nilai CBT
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                      Benar / Salah
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                      Ketuntasan KKM
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                      Integritas (Tab Switch)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                        Tidak ada siswa yang sesuai pencarian.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((s, idx) => (
                      <TableRow
                        key={s.siswaId}
                        className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                      >
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-sm text-foreground">{s.siswaNama}</div>
                          <div className="text-[11px] text-muted-foreground">{s.siswaEmail}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          {s.status === "selesai" ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-[#23A559]/40">
                              Selesai
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40">
                              Belum Mengerjakan
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.nilai !== null ? (
                            <span className="font-mono text-base font-extrabold text-foreground">
                              {s.nilai}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {s.status === "selesai" ? (
                            <span>
                              <span className="text-green-600 dark:text-[#57F287] font-bold">{s.totalBenar}B</span> /{" "}
                              <span className="text-red-600 dark:text-[#FF7074] font-bold">{s.totalSalah}S</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.status === "selesai" ? (
                            s.isTuntas ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287]">
                                Tuntas
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074]">
                                Remedial
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.pelanggaranTab > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-[#F0B232]/40">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {s.pelanggaranTab}x Pindah Tab
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 dark:text-[#57F287] font-semibold">
                              Tertib (0)
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </SchoolLayout>
  );
}
