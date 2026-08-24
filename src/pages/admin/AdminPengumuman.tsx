import { useState, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  Pin,
  AlertCircle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ADMIN_NAV } from "@/lib/nav";
import { timeAgo } from "@/lib/lms";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const KATEGORI_BADGE: Record<string, string> = {
  Akademik: "bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border-primary/40",
  Ujian: "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border-[#F23F43]/40",
  Kegiatan: "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border-[#23A559]/40",
  Libur: "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border-[#F0B232]/40",
  Umum: "bg-[#80848E]/20 text-card-foreground border-[#80848E]/40",
};

export default function AdminPengumuman() {
  const utils = trpc.useUtils();
  const list = trpc.admin.listPengumuman.useQuery();
  const [open, setOpen] = useState(false);
  const [judul, setJudul] = useState("");
  const [konten, setKonten] = useState("");
  const [kategori, setKategori] = useState<"Akademik" | "Kegiatan" | "Ujian" | "Libur" | "Umum">("Umum");
  const [targetRole, setTargetRole] = useState<"semua" | "guru" | "siswa" | "orang_tua">("semua");
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterKategori, setFilterKategori] = useState<string>("Semua");

  const createMut = trpc.admin.createPengumuman.useMutation({
    onSuccess: async () => {
      await utils.admin.listPengumuman.invalidate();
      setOpen(false);
      setJudul("");
      setKonten("");
      setKategori("Umum");
      setTargetRole("semua");
      setPinned(false);
      toast.success("Pengumuman resmi berhasil diterbitkan!");
    },
    onError: (e) => setError(e.message),
  });

  const deleteMut = trpc.admin.deletePengumuman.useMutation({
    onSuccess: () => {
      utils.admin.listPengumuman.invalidate();
      toast.success("Pengumuman berhasil dihapus.");
    },
    onError: (e) => setError(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    createMut.mutate({ judul, konten, kategori, targetRole, pinned });
  };

  const filteredList = list.data?.filter(
    (p) => filterKategori === "Semua" || p.kategori === filterKategori,
  ) ?? [];

  return (
    <SchoolLayout role="admin" title="Papan Pengumuman Sekolah" nav={ADMIN_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Papan Pengumuman & Surat Edaran
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Publikasikan informasi resmi, jadwal ujian, edaran libur, dan agenda sekolah ke seluruh portal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => window.print()}
            variant="outline"
            className="h-10 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Printer className="mr-1.5 h-4 w-4 text-blue-600 dark:text-[#70B8FF]" />
            Cetak Papan Informasi
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold shadow-sm px-4">
                <Plus className="mr-1.5 h-4 w-4" /> Buat Pengumuman Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base font-bold font-brand text-foreground">
                  Buat Pengumuman Sekolah
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-card-foreground">
                    Judul Pengumuman
                  </Label>
                  <Input
                    placeholder="mis. Jadwal Penilaian Akhir Semester Ganjil"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-card-foreground">
                      Kategori
                    </Label>
                    <Select
                      value={kategori}
                      onValueChange={(val: "Akademik" | "Kegiatan" | "Ujian" | "Libur" | "Umum") =>
                        setKategori(val)
                      }
                    >
                      <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="Umum" className="text-xs">Umum</SelectItem>
                        <SelectItem value="Akademik" className="text-xs">Akademik</SelectItem>
                        <SelectItem value="Ujian" className="text-xs">Ujian & PTS/PAS</SelectItem>
                        <SelectItem value="Kegiatan" className="text-xs">Kegiatan & Acara</SelectItem>
                        <SelectItem value="Libur" className="text-xs">Hari Libur Sekolah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-card-foreground">
                      Target Audiens
                    </Label>
                    <Select
                      value={targetRole}
                      onValueChange={(val: "semua" | "guru" | "siswa" | "orang_tua") =>
                        setTargetRole(val)
                      }
                    >
                      <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="semua" className="text-xs">Semua Warga Sekolah</SelectItem>
                        <SelectItem value="guru" className="text-xs">Dewan Guru</SelectItem>
                        <SelectItem value="siswa" className="text-xs">Seluruh Siswa</SelectItem>
                        <SelectItem value="orang_tua" className="text-xs">Orang Tua Murid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-card-foreground">
                    Isi Dokumen / Konten Pengumuman
                  </Label>
                  <Textarea
                    placeholder="Tuliskan detail surat edaran, instruksi tata tertib, jadwal, atau pedoman pelaksanaan kegiatan sekolah..."
                    rows={6}
                    value={konten}
                    onChange={(e) => setKonten(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2 rounded-xl bg-background border border-border p-3">
                  <Checkbox
                    id="pin-post"
                    checked={pinned}
                    onCheckedChange={(checked) => setPinned(Boolean(checked))}
                  />
                  <label
                    htmlFor="pin-post"
                    className="text-xs text-card-foreground cursor-pointer font-medium"
                  >
                    Sematkan di baris paling atas (Pinned Post)
                  </label>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold h-10 shadow-sm"
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? "Menerbitkan..." : "Terbitkan Pengumuman"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="mb-6 flex items-center gap-2 p-1.5 bg-card rounded-2xl border border-border flex-wrap print:hidden">
        {["Semua", "Akademik", "Ujian", "Kegiatan", "Libur", "Umum"].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterKategori(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterKategori === cat
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredList.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border">
            Belum ada pengumuman dalam kategori {filterKategori}.
          </div>
        )}

        {filteredList.map((p) => (
          <div
            key={p.id}
            className={`p-5 rounded-2xl border bg-card shadow-lg transition-all ${
              p.pinned
                ? "border-primary bg-card"
                : "border-border"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white shadow-sm">
                      <Pin className="h-3 w-3" /> Disematkan
                    </span>
                  )}
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      KATEGORI_BADGE[p.kategori] ?? KATEGORI_BADGE.Umum
                    }`}
                  >
                    {p.kategori}
                  </span>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-background text-muted-foreground border border-border">
                    Target: {p.targetRole}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground mt-1">{p.judul}</h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {timeAgo(p.createdAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Hapus pengumuman "${p.judul}"?`)) {
                      deleteMut.mutate({ id: p.id });
                    }
                  }}
                  disabled={deleteMut.isPending}
                  className="h-8 text-red-600 dark:text-[#FF7074] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 rounded-lg text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-card-foreground bg-background p-4 rounded-xl border border-border/60 leading-relaxed whitespace-pre-wrap">
              {p.konten}
            </p>

            <div className="mt-3 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Diterbitkan oleh: <strong className="text-foreground">{p.authorNama}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </SchoolLayout>
  );
}
