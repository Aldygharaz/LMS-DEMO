import { useState, type FormEvent, useDeferredValue } from "react";
import { Link, useParams } from "react-router";
import {
  Paperclip,
  Plus,
  ArrowLeft,
  Clock,
  AlertCircle,
  Upload,
  Edit3,
  Trash2,
  Search,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { GURU_NAV } from "@/lib/nav";
import { fileToBase64, formatTanggalWaktu, isDeadlineLewat } from "@/lib/lms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_FILE_MB = 5;

export default function GuruKelasMapel() {
  const { id } = useParams<{ id: string }>();
  const kmgId = Number(id);
  const utils = trpc.useUtils();
  const detail = trpc.guru.kelasMapelDetail.useQuery({ kmgId });

  const [open, setOpen] = useState(false);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [deadline, setDeadline] = useState("");
  const [lampiran, setLampiran] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit Task State
  const [editOpen, setEditOpen] = useState(false);
  const [editTugasId, setEditTugasId] = useState<number | null>(null);
  const [editJudul, setEditJudul] = useState("");
  const [editDeskripsi, setEditDeskripsi] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editLampiran, setEditLampiran] = useState<File | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Filter & Search State
  const [searchTugas, setSearchTugas] = useState("");
  const deferredSearchTugas = useDeferredValue(searchTugas);
  const [filterStatus, setFilterStatus] = useState<"all" | "ungraded" | "graded" | "overdue">("all");

  const createTugas = trpc.guru.createTugas.useMutation({
    onSuccess: async () => {
      await utils.guru.kelasMapelDetail.invalidate({ kmgId });
      await utils.guru.myAssignments.invalidate();
      setOpen(false);
      setJudul("");
      setDeskripsi("");
      setDeadline("");
      setLampiran(null);
      toast.success("Tugas baru berhasil dibuat dan dipublikasikan!");
    },
    onError: (e) => setError(e.message),
  });

  const updateTugas = trpc.guru.updateTugas.useMutation({
    onSuccess: async () => {
      await utils.guru.kelasMapelDetail.invalidate({ kmgId });
      await utils.guru.myAssignments.invalidate();
      setEditOpen(false);
      setEditTugasId(null);
      setEditJudul("");
      setEditDeskripsi("");
      setEditDeadline("");
      setEditLampiran(null);
      toast.success("Perubahan tugas berhasil disimpan!");
    },
    onError: (e) => setEditError(e.message),
  });

  const deleteTugas = trpc.guru.deleteTugas.useMutation({
    onSuccess: async () => {
      await utils.guru.kelasMapelDetail.invalidate({ kmgId });
      await utils.guru.myAssignments.invalidate();
      toast.success("Tugas berhasil dihapus.");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEditModal = (t: {
    id: number;
    judul: string;
    deskripsi: string | null;
    deadline: Date;
  }) => {
    setEditTugasId(t.id);
    setEditJudul(t.judul);
    setEditDeskripsi(t.deskripsi ?? "");
    const localIso = new Date(
      t.deadline.getTime() - t.deadline.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
    setEditDeadline(localIso);
    setEditLampiran(null);
    setEditError(null);
    setEditOpen(true);
  };

  const handleUpdateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTugasId) return;
    setEditError(null);
    if (!editDeadline) {
      setEditError("Deadline wajib ditentukan.");
      return;
    }
    if (editLampiran && editLampiran.size > MAX_FILE_MB * 1024 * 1024) {
      setEditError(`Ukuran lampiran maksimal ${MAX_FILE_MB}MB.`);
      return;
    }
    const lampiranPayload = editLampiran
      ? { nama: editLampiran.name, dataBase64: await fileToBase64(editLampiran) }
      : undefined;
    updateTugas.mutate({
      id: editTugasId,
      judul: editJudul,
      deskripsi: editDeskripsi || undefined,
      deadline: new Date(editDeadline),
      lampiran: lampiranPayload,
    });
  };

  const setQuickDeadline = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    target.setHours(23, 59, 0, 0);
    const localIso = new Date(
      target.getTime() - target.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
    setDeadline(localIso);
  };

  const setEditQuickDeadline = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    target.setHours(23, 59, 0, 0);
    const localIso = new Date(
      target.getTime() - target.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
    setEditDeadline(localIso);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!deadline) {
      setError("Deadline wajib ditentukan.");
      return;
    }
    if (lampiran && lampiran.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Ukuran lampiran maksimal ${MAX_FILE_MB}MB.`);
      return;
    }
    const lampiranPayload = lampiran
      ? { nama: lampiran.name, dataBase64: await fileToBase64(lampiran) }
      : undefined;
    createTugas.mutate({
      kmgId,
      judul,
      deskripsi: deskripsi || undefined,
      deadline: new Date(deadline),
      lampiran: lampiranPayload,
    });
  };

  if (!detail.data) {
    return (
      <SchoolLayout role="guru" title="Kelas-Mapel" nav={GURU_NAV}>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Memuat lembar kerja...
        </div>
      </SchoolLayout>
    );
  }

  const { kmg, siswaList, tugasList, jadwalList } = detail.data;

  return (
    <SchoolLayout
      role="guru"
      title={`${kmg.mapelNama} — Kelas ${kmg.kelasNama}`}
      nav={GURU_NAV}
    >
      {/* Header Info Banner */}
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
                {kmg.mapelNama} &bull; Kelas {kmg.kelasNama}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {siswaList.length} Siswa Terdaftar
              </span>
              <span className="text-muted-foreground">&bull;</span>
              {jadwalList.map((j) => (
                <span
                  key={j.id}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-green-600 dark:text-[#57F287] bg-green-100 dark:bg-[#23A559]/10 px-2 py-0.5 rounded border border-green-200 dark:border-[#23A559]/20"
                >
                  <Clock className="h-3 w-3" />
                  {j.hari} {j.jamMulai}–{j.jamSelesai}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Create Task Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#0984E3]/20">
              <Plus className="mr-1.5 h-4 w-4" /> Buat Tugas Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold font-brand text-foreground">
                Buat Tugas Baru ({kmg.mapelNama} — {kmg.kelasNama})
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={submit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-card-foreground">
                  Judul Tugas
                </Label>
                <Input
                  placeholder="mis. Latihan Bab 3: Matriks & Vektor"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="bg-background border-border text-foreground text-sm rounded-xl focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-card-foreground">
                  Petunjuk / Deskripsi Soal
                </Label>
                <Textarea
                  placeholder="Jelaskan instruksi pengerjaan, ketentuan format, atau halaman buku paket..."
                  rows={4}
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="bg-background border-border text-foreground text-sm rounded-xl focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-card-foreground">
                    Batas Waktu Pengumpulan (Deadline)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Pilih Cepat:</span>
                </div>
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-background border-border text-foreground text-sm rounded-xl focus:border-primary"
                  required
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(1)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-background hover:bg-secondary text-blue-600 dark:text-[#70B8FF] border border-border transition-colors font-medium"
                  >
                    +1 Hari (Besok)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(3)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-background hover:bg-secondary text-blue-600 dark:text-[#70B8FF] border border-border transition-colors font-medium"
                  >
                    +3 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(7)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-background hover:bg-secondary text-blue-600 dark:text-[#70B8FF] border border-border transition-colors font-medium"
                  >
                    +1 Minggu
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(14)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-background hover:bg-secondary text-blue-600 dark:text-[#70B8FF] border border-border transition-colors font-medium"
                  >
                    +2 Minggu
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-card-foreground">
                  Lampiran Materi / Dokumen Soal (Opsional, Maks 5MB)
                </Label>
                <div className="relative border-2 border-dashed border-border rounded-xl p-3 text-center bg-background hover:border-primary transition-colors">
                  <input
                    type="file"
                    onChange={(e) => setLampiran(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {lampiran ? lampiran.name : "Klik atau seret file PDF / Dokumen ke sini"}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-semibold h-10"
                disabled={createTugas.isPending}
              >
                {createTugas.isPending ? "Menyimpan..." : "Publikasikan Tugas ke Siswa"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold font-brand">
                Edit Tugas Pembelajaran
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-card-foreground">
                  Judul Tugas
                </Label>
                <Input
                  value={editJudul}
                  onChange={(e) => setEditJudul(e.target.value)}
                  className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-card-foreground">
                  Deskripsi / Petunjuk Pengerjaan
                </Label>
                <Textarea
                  rows={3}
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  className="bg-background border-border text-foreground text-xs rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-card-foreground">
                  Tenggat Pengumpulan (Deadline)
                </Label>
                <Input
                  type="datetime-local"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  required
                />
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground">Opsi Cepat:</span>
                  {[
                    { label: "+1 Hari", days: 1 },
                    { label: "+3 Hari", days: 3 },
                    { label: "+7 Hari", days: 7 },
                  ].map((btn) => (
                    <button
                      key={btn.days}
                      type="button"
                      onClick={() => setEditQuickDeadline(btn.days)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-background hover:bg-secondary text-muted-foreground border border-border"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-card-foreground">
                  Perbarui Lampiran Dokumen Soal (Opsional, Maks 5MB)
                </Label>
                {editLampiran ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-primary/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs text-foreground truncate font-medium">{editLampiran.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditLampiran(null)}
                      className="text-muted-foreground hover:text-red-600 dark:hover:text-[#FF7074] p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-border rounded-xl p-3 text-center bg-background hover:border-primary transition-colors">
                    <input
                      type="file"
                      onChange={(e) => setEditLampiran(e.target.files?.[0] ?? null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Pilih file baru untuk mengganti lampiran sebelumnya
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {editError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-semibold h-10"
                disabled={updateTugas.isPending}
              >
                {updateTugas.isPending ? "Menyimpan Perubahan..." : "Simpan Perubahan Tugas"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task List Grid with Search & Status Filters */}
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-lg">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-background border border-border rounded-xl">
            {[
              { id: "all", label: "Semua Tugas" },
              { id: "ungraded", label: "Belum Dinilai" },
              { id: "graded", label: "Sudah Dinilai" },
              { id: "overdue", label: "Deadline Lewat" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === st.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari judul tugas..."
              value={searchTugas}
              onChange={(e) => setSearchTugas(e.target.value)}
              className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
            />
          </div>
        </div>

        {tugasList.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border">
            Belum ada tugas untuk kelas ini. Klik tombol "Buat Tugas Baru" di atas.
          </div>
        )}

        <div className="grid gap-3">
          {tugasList
            .filter((t) => {
              const matchSearch =
                t.judul.toLowerCase().includes(deferredSearchTugas.toLowerCase()) ||
                (t.deskripsi?.toLowerCase() ?? "").includes(deferredSearchTugas.toLowerCase());
              const isOverdue = isDeadlineLewat(t.deadline);
              const matchStatus =
                filterStatus === "all" ||
                (filterStatus === "ungraded" && t.belumDinilai > 0) ||
                (filterStatus === "graded" && t.belumDinilai === 0 && t.jumlahSubmit > 0) ||
                (filterStatus === "overdue" && isOverdue);
              return matchSearch && matchStatus;
            })
            .map((t) => {
              const isOverdue = isDeadlineLewat(t.deadline);
              const hasUngraded = t.belumDinilai > 0;

              return (
                <div
                  key={t.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-lg hover:border-primary transition-all"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-foreground">{t.judul}</h4>
                      {t.hasLampiran && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-[#70B8FF] bg-blue-100 dark:bg-primary/15 px-2 py-0.5 rounded-full border border-blue-200 dark:border-primary/30">
                          <Paperclip className="h-3 w-3" />
                          Lampiran
                        </span>
                      )}
                    </div>

                    {t.deskripsi && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {t.deskripsi}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Deadline: {formatTanggalWaktu(t.deadline)}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] border border-red-200 dark:border-[#F23F43]/30">
                          Deadline Lewat
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right space-y-1">
                      <div className="text-xs font-semibold text-foreground">
                        {t.jumlahSubmit} / {t.totalSiswa} Siswa Submit
                      </div>
                      {hasUngraded ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-[#FEE75C] bg-amber-100 dark:bg-[#F0B232]/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-[#F0B232]/30">
                          {t.belumDinilai} Belum Dinilai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-[#57F287] bg-green-100 dark:bg-[#23A559]/15 px-2 py-0.5 rounded-full border border-green-200 dark:border-[#23A559]/30">
                          Semua Dinilai
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(t)}
                        className="h-9 w-9 bg-background hover:bg-secondary text-muted-foreground hover:text-foreground rounded-xl border border-border"
                        title="Edit Tugas"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Hapus tugas "${t.judul}"? Seluruh data submission dan nilai yang terhubung akan ikut terhapus.`)) {
                            deleteTugas.mutate({ id: t.id });
                          }
                        }}
                        disabled={deleteTugas.isPending}
                        className="h-9 w-9 bg-background hover:bg-red-100 dark:hover:bg-[#F23F43]/20 text-muted-foreground hover:text-red-600 dark:hover:text-[#FF7074] rounded-xl border border-border"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        asChild
                        className="h-9 bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-semibold px-3"
                      >
                        <Link to={`/guru/tugas/${t.id}`}>
                          Periksa & Nilai &rarr;
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </SchoolLayout>
  );
}
