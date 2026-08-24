import { useState, type FormEvent, useDeferredValue } from "react";
import { Link, useNavigate } from "react-router";
import {
  FileCheck2,
  Plus,
  Trash2,
  Clock,
  Search,
  Download,
  Printer,
  ChevronRight,
  X,
  BarChart3,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const KATEGORI_LABEL: Record<string, string> = {
  Kuis_Harian: "Kuis Harian",
  PTS_UTS: "Penilaian Tengah Semester (PTS)",
  PAS_UAS: "Penilaian Akhir Semester (PAS)",
  Tryout: "Tryout & Simulasi Ujian",
};

export default function GuruUjian() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const ujianListQuery = trpc.guru.listUjian.useQuery();
  const classesQuery = trpc.guru.myKelasMapel.useQuery();

  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("semua");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form Create State
  const [formKmgId, setFormKmgId] = useState("");
  const [formJudul, setFormJudul] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formKategori, setFormKategori] = useState<"Kuis_Harian" | "PTS_UTS" | "PAS_UAS" | "Tryout">("Kuis_Harian");
  const [formDurasi, setFormDurasi] = useState("30");
  const [formKkm] = useState("75");
  const [formMulai, setFormMulai] = useState(new Date().toISOString().slice(0, 10) + " 08:00");
  const [formSelesai, setFormSelesai] = useState("2026-08-31 23:59");
  const [formAcakSoal] = useState(false);
  const [formTampilkanHasil] = useState(true);
  const deferredSearch = useDeferredValue(search);

  const createMutation = trpc.guru.createUjian.useMutation({
    onSuccess: (res) => {
      utils.guru.listUjian.invalidate();
      setShowCreateModal(false);
      toast.success("Paket ujian baru berhasil dibuat. Silakan tambahkan butir soal.");
      navigate(`/guru/ujian/${res.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.guru.deleteUjian.useMutation({
    onSuccess: () => {
      utils.guru.listUjian.invalidate();
      toast.success("Paket ujian berhasil dihapus.");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formKmgId) {
      toast.error("Pilih rombel dan mata pelajaran terlebih dahulu.");
      return;
    }
    createMutation.mutate({
      kmgId: Number(formKmgId),
      judul: formJudul,
      deskripsi: formDeskripsi || undefined,
      kategori: formKategori,
      durasiMenit: Number(formDurasi) || 30,
      kkm: Number(formKkm) || 75,
      tanggalMulai: formMulai,
      tanggalSelesai: formSelesai,
      acakSoal: formAcakSoal,
      tampilkanHasil: formTampilkanHasil,
    });
  };

  const rows = ujianListQuery.data ?? [];
  const filteredRows = rows.filter((r) => {
    const matchKategori = kategoriFilter === "semua" || r.kategori === kategoriFilter;
    const matchSearch =
      r.judul.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      r.kelasNama.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      r.mapelNama.toLowerCase().includes(deferredSearch.toLowerCase());
    return matchKategori && matchSearch;
  });

  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      toast.error("Tidak ada data ujian untuk diekspor.");
      return;
    }
    const headers = [
      "No",
      "Judul Ujian",
      "Kelas",
      "Mata Pelajaran",
      "Kategori",
      "Durasi (Menit)",
      "KKM",
      "Jumlah Soal",
      "Siswa Selesai",
      "Rata-rata Nilai",
      "Periode Mulai",
      "Periode Selesai",
    ];
    const dataRows = filteredRows.map((r, idx) => [
      idx + 1,
      r.judul,
      r.kelasNama,
      r.mapelNama,
      KATEGORI_LABEL[r.kategori] || r.kategori,
      r.durasiMenit,
      r.kkm,
      r.totalSoal,
      r.totalSelesai,
      r.rataRataNilai ?? "-",
      r.tanggalMulai,
      r.tanggalSelesai,
    ]);
    exportToCSV("Daftar_Paket_Ujian_CBT_Guru", headers, dataRows);
    toast.success("Daftar ujian CBT berhasil diekspor!");
  };

  return (
    <SchoolLayout role="guru" title="Bank Ujian & Kuis CBT" nav={GURU_NAV}>
      {/* Top Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-primary" />
            Bank Ujian &amp; Kuis Online (CBT Engine)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pusat pembuatan ujian pilihan ganda terstandar, kuis interaktif, timer otomatis, dan auto-grading instan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-10 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold shadow-md"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Buat Ujian / Kuis Baru
          </Button>

          <Button
            type="button"
            onClick={handleExportCSV}
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
            Cetak Rekap
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Total Paket Ujian Aktif
          </span>
          <p className="text-2xl font-extrabold text-foreground mt-1">{rows.length}</p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            CBT Formatif &amp; Sumatif
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-green-600 dark:text-[#57F287] block">
            Total Peserta Selesai
          </span>
          <p className="text-2xl font-extrabold text-green-600 dark:text-[#57F287] mt-1">
            {rows.reduce((acc, r) => acc + r.totalSelesai, 0)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Siswa Tersinkronisasi
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-[#70B8FF] block">
            Rata-rata Nilai CBT
          </span>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-[#70B8FF] mt-1">
            {rows.filter((r) => r.rataRataNilai !== null).length > 0
              ? Math.round(
                  rows
                    .filter((r) => r.rataRataNilai !== null)
                    .reduce((a, b) => a + (b.rataRataNilai ?? 0), 0) /
                    rows.filter((r) => r.rataRataNilai !== null).length,
                )
              : "—"}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Batas KKM Standar: 75
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-[#FEE75C] block">
            Bank Butir Soal
          </span>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-[#FEE75C] mt-1">
            {rows.reduce((acc, r) => acc + r.totalSoal, 0)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Soal Terverifikasi Kunci
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold font-brand text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Daftar Paket Ujian &amp; Kuis
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Menampilkan {filteredRows.length} dari {rows.length} total paket ujian
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 print:hidden">
              <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
                <SelectTrigger className="w-48 bg-background border-border text-foreground text-xs rounded-xl h-9">
                  <SelectValue placeholder="Kategori Ujian" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground text-xs">
                  <SelectItem value="semua">Semua Kategori</SelectItem>
                  <SelectItem value="Kuis_Harian">Kuis Harian</SelectItem>
                  <SelectItem value="PTS_UTS">PTS / UTS</SelectItem>
                  <SelectItem value="PAS_UAS">PAS / UAS</SelectItem>
                  <SelectItem value="Tryout">Tryout</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari ujian, kelas, mapel..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl focus:border-primary"
                />
              </div>
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
                  Paket Ujian
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Rombel &amp; Mapel
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Durasi &amp; KKM
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                  Butir Soal
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                  Peserta Selesai
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                  Rata-rata
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 print:hidden text-right pr-6">
                  Kelola
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    Belum ada paket ujian CBT yang dibuat. Klik tombol "Buat Ujian / Kuis Baru" di atas.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((r, idx) => (
                  <TableRow
                    key={r.id}
                    className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                  >
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/guru/ujian/${r.id}`}
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors"
                      >
                        {r.judul}
                      </Link>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-primary/15 text-blue-600 dark:text-[#70B8FF] font-semibold text-[10px] border border-blue-200 dark:border-primary/30 mr-1.5">
                          {KATEGORI_LABEL[r.kategori] || r.kategori}
                        </span>
                        Periode: {r.tanggalMulai} s/d {r.tanggalSelesai}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">Kelas {r.kelasNama}</div>
                      <div className="text-[11px] text-muted-foreground">{r.mapelNama}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.durasiMenit} Menit
                      </div>
                      <div className="text-[10px] text-muted-foreground">KKM: {r.kkm}</div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-foreground">
                      {r.totalSoal} Soal
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-xs text-green-600 dark:text-[#57F287]">
                        {r.totalSelesai} Siswa
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.rataRataNilai !== null ? (
                        <span
                          className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded ${
                            r.rataRataNilai >= r.kkm
                              ? "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287]"
                              : "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074]"
                          }`}
                        >
                          {r.rataRataNilai}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="print:hidden text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/guru/ujian/${r.id}`)}
                          className="h-8 rounded-lg bg-primary hover:bg-[#0873C4] text-white text-xs font-bold shadow-sm"
                        >
                          Kelola &amp; Bank Soal
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus paket ujian "${r.judul}" beserta seluruh soal dan data peserta?`)) {
                              deleteMutation.mutate({ ujianId: r.id });
                            }
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-[#FF7074] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 transition-all"
                          title="Hapus Ujian"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Buat Ujian Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-primary/20 text-primary">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-brand text-foreground">
                    Buat Paket Ujian CBT Baru
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tentukan rombel, kategori evaluasi, durasi, dan jadwal pelaksanaan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pilih Rombel &amp; Mata Pelajaran</Label>
                <Select value={formKmgId} onValueChange={setFormKmgId}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                    <SelectValue placeholder="Pilih Kelas & Mapel" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground text-xs">
                    {classesQuery.data?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        Kelas {c.kelasNama} &bull; {c.mapelNama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Judul Paket Ujian</Label>
                <Input
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  placeholder="Contoh: Penilaian Tengah Semester Ganjil 2026"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Kategori Evaluasi</Label>
                  <Select
                    value={formKategori}
                    onValueChange={(val: any) => setFormKategori(val)}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground text-xs">
                      <SelectItem value="Kuis_Harian">Kuis Harian</SelectItem>
                      <SelectItem value="PTS_UTS">PTS / UTS</SelectItem>
                      <SelectItem value="PAS_UAS">PAS / UAS</SelectItem>
                      <SelectItem value="Tryout">Tryout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Durasi (Menit)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={180}
                    value={formDurasi}
                    onChange={(e) => setFormDurasi(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Waktu Mulai Buka Ujian</Label>
                  <Input
                    value={formMulai}
                    onChange={(e) => setFormMulai(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    placeholder="2026-08-01 08:00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Batas Akhir Ujian</Label>
                  <Input
                    value={formSelesai}
                    onChange={(e) => setFormSelesai(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    placeholder="2026-08-31 23:59"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Deskripsi &amp; Petunjuk Ujian</Label>
                <Textarea
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="bg-background border-border text-foreground text-xs rounded-xl resize-none"
                  rows={2}
                  placeholder="Petunjuk: Pilih satu jawaban yang paling tepat. Dilarang membuka tab lain selama ujian."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="h-10 rounded-xl bg-background border-border text-muted-foreground text-xs font-semibold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="h-10 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold"
                >
                  {createMutation.isPending ? "Membuat..." : "Simpan & Susun Soal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
