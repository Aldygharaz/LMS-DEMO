import { useState, type FormEvent, useDeferredValue } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Link as LinkIcon,
  Upload,
  BookOpen,
  AlertCircle,
  X,
  Search,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { GURU_NAV } from "@/lib/nav";
import { downloadBase64, fileToBase64, formatTanggalWaktu } from "@/lib/lms";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MAX_FILE_MB = 5;

export default function GuruMateri() {
  const assignments = trpc.guru.myAssignments.useQuery();
  const [selectedKmgId, setSelectedKmgId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchMateri, setSearchMateri] = useState("");
  const [filterType, setFilterType] = useState<"all" | "file" | "link">("all");

  // Edit Material State
  const [editOpen, setEditOpen] = useState(false);
  const [editMateriId, setEditMateriId] = useState<number | null>(null);
  const [editJudul, setEditJudul] = useState("");
  const [editDeskripsi, setEditDeskripsi] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const deferredSearchMateri = useDeferredValue(searchMateri);
  const [editError, setEditError] = useState<string | null>(null);

  const kmgList = assignments.data?.assignments ?? [];
  const currentKmgId = selectedKmgId ? Number(selectedKmgId) : kmgList[0]?.id;

  const utils = trpc.useUtils();
  const materiList = trpc.guru.listMateri.useQuery(
    { kmgId: currentKmgId ?? 0 },
    { enabled: !!currentKmgId },
  );

  const createMut = trpc.guru.createMateri.useMutation({
    onSuccess: async () => {
      await utils.guru.listMateri.invalidate({ kmgId: currentKmgId ?? 0 });
      setOpen(false);
      setJudul("");
      setDeskripsi("");
      setLinkUrl("");
      setFile(null);
      toast.success("Modul ajar berhasil diunggah ke E-Library!");
    },
    onError: (e) => setError(e.message),
  });

  const updateMut = trpc.guru.updateMateri.useMutation({
    onSuccess: async () => {
      await utils.guru.listMateri.invalidate({ kmgId: currentKmgId ?? 0 });
      setEditOpen(false);
      setEditMateriId(null);
      setEditJudul("");
      setEditDeskripsi("");
      setEditLinkUrl("");
      toast.success("Perubahan materi ajar berhasil disimpan!");
    },
    onError: (e) => setEditError(e.message),
  });

  const deleteMut = trpc.guru.deleteMateri.useMutation({
    onSuccess: () => {
      toast.success("Materi ajar berhasil dihapus.");
      utils.guru.listMateri.invalidate({ kmgId: currentKmgId ?? 0 });
    },
    onError: (e) => setError(e.message),
  });

  const openEditModal = (m: {
    id: number;
    judul: string;
    deskripsi: string | null;
    linkUrl: string | null;
  }) => {
    setEditMateriId(m.id);
    setEditJudul(m.judul);
    setEditDeskripsi(m.deskripsi ?? "");
    setEditLinkUrl(m.linkUrl ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const handleUpdateMateri = (e: FormEvent) => {
    e.preventDefault();
    if (!editMateriId) return;
    setEditError(null);
    updateMut.mutate({
      id: editMateriId,
      judul: editJudul,
      deskripsi: editDeskripsi || undefined,
      linkUrl: editLinkUrl || undefined,
    });
  };

  const downloadFile = async (materiId: number) => {
    const f = await utils.guru.downloadMateriFile.fetch({ materiId });
    downloadBase64(f.fileNama, f.dataBase64, f.fileMime);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentKmgId) return;
    setError(null);
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Ukuran file materi maksimal ${MAX_FILE_MB}MB.`);
      return;
    }

    createMut.mutate({
      kmgId: currentKmgId,
      judul,
      deskripsi: deskripsi || undefined,
      linkUrl: linkUrl || undefined,
      file: file
        ? {
            nama: file.name,
            mime: file.type || "application/octet-stream",
            dataBase64: await fileToBase64(file),
          }
        : undefined,
    });
  };

  const filteredMateri = (materiList.data ?? []).filter((m) => {
    const matchSearch =
      m.judul.toLowerCase().includes(deferredSearchMateri.toLowerCase()) ||
      (m.deskripsi?.toLowerCase() ?? "").includes(deferredSearchMateri.toLowerCase());
    const matchType =
      filterType === "all" ||
      (filterType === "file" && m.hasFile) ||
      (filterType === "link" && !!m.linkUrl);
    return matchSearch && matchType;
  });

  return (
    <SchoolLayout role="guru" title="Modul & Materi Ajar" nav={GURU_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            E-Library & Modul Pembelajaran
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unggah materi referensi, bahan tayang (slide), ringkasan bab, dan video pengayaan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={currentKmgId ? String(currentKmgId) : ""}
            onValueChange={setSelectedKmgId}
          >
            <SelectTrigger className="w-56 bg-background border-border text-foreground text-xs rounded-xl h-10">
              <SelectValue placeholder="Pilih Kelas & Mapel" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {kmgList.map((a) => (
                <SelectItem key={a.id} value={String(a.id)} className="text-xs focus:bg-secondary">
                  Kelas {a.kelasNama} - {a.mapelNama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 bg-primary hover:bg-[#0097E6] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#0984E3]/25 px-4">
                <Plus className="mr-1.5 h-4 w-4" /> Unggah Materi Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base font-bold font-brand text-foreground">
                  Unggah Modul Pembelajaran
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-card-foreground">
                    Judul Materi / Bab
                  </Label>
                  <Input
                    placeholder="mis. Bab 2: Hukum Termodinamika"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-card-foreground">
                    Deskripsi / Petunjuk Belajar (Opsional)
                  </Label>
                  <Textarea
                    placeholder="Ringkasan poin-poin penting atau instruksi membaca..."
                    rows={3}
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-card-foreground">
                    Tautan Eksternal / Video Youtube (Opsional)
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-card-foreground">
                    Lampiran Dokumen Modul (PDF/PPT/DOCX, Maks 5MB)
                  </Label>
                  {file ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-primary/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
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
                          Pilih berkas modul ajar
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold h-10"
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? "Mengunggah..." : "Simpan & Terbitkan Materi"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-lg">
        <div className="flex items-center gap-1.5 p-1 bg-background border border-border rounded-xl">
          {[
            { id: "all", label: "Semua Materi" },
            { id: "file", label: "Ada Dokumen" },
            { id: "link", label: "Tautan / Video" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterType(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === t.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari judul materi atau topik..."
            value={searchMateri}
            onChange={(e) => setSearchMateri(e.target.value)}
            className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMateri.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border">
            {searchMateri || filterType !== "all"
              ? "Tidak ada modul materi yang cocok dengan filter atau pencarian."
              : "Belum ada materi pembelajaran yang diunggah untuk kelas & mapel ini."}
          </div>
        )}

        {filteredMateri.map((m) => (
          <div
            key={m.id}
            className="p-5 rounded-2xl bg-card border border-border shadow-lg flex flex-col justify-between hover:border-primary transition-all space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground leading-snug">
                      {m.judul}
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTanggalWaktu(m.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(m)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
                    title="Edit Materi"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Hapus materi "${m.judul}"?`)) {
                        deleteMut.mutate({ id: m.id });
                      }
                    }}
                    disabled={deleteMut.isPending}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-[#FF7074] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 rounded-lg"
                    title="Hapus Materi"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {m.deskripsi && (
                <p className="text-xs text-card-foreground bg-background p-3 rounded-xl border border-border/60 leading-relaxed">
                  {m.deskripsi}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-border/50 space-y-2">
              {m.hasFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadFile(m.id)}
                  className="w-full h-8 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Unduh: {m.fileNama}
                </Button>
              )}

              {m.linkUrl && (
                <a
                  href={m.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full h-8 rounded-xl bg-blue-100 dark:bg-primary/15 hover:bg-primary/25 text-blue-600 dark:text-[#70B8FF] text-xs font-semibold border border-blue-200 dark:border-primary/30 transition-colors"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Buka Tautan Materi Pembelajaran
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Material Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-brand">
              Edit Modul & Materi Ajar
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateMateri} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-card-foreground">
                Judul Materi / Bab
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
                Deskripsi / Petunjuk Belajar
              </Label>
              <Textarea
                rows={3}
                value={editDeskripsi}
                onChange={(e) => setEditDeskripsi(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-card-foreground">
                Tautan Eksternal / Video Youtube (Opsional)
              </Label>
              <Input
                type="url"
                placeholder="https://..."
                value={editLinkUrl}
                onChange={(e) => setEditLinkUrl(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-xl h-10"
              />
            </div>

            {editError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold h-10"
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? "Menyimpan Perubahan..." : "Simpan Perubahan Materi"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </SchoolLayout>
  );
}
