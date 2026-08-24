import { useState, useDeferredValue } from "react";
import { useNavigate } from "react-router";
import {
  FileCheck2,
  Clock,
  Search,
  Download,
  Printer,
  BarChart3,
  PlayCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { SISWA_NAV } from "@/lib/nav";
import { exportToCSV, isDeadlineLewat } from "@/lib/lms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function SiswaUjian() {
  const navigate = useNavigate();
  const ujianQuery = trpc.siswa.myUjianList.useQuery();
  const [tab, setTab] = useState<"all" | "active" | "finished">("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const rows = ujianQuery.data ?? [];
  const filteredRows = rows.filter((r) => {
    if (tab === "active") return r.status !== "selesai";
    if (tab === "finished") return r.status === "selesai";
    return true;
  }).filter((r) => {
    return (
      r.judul.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      r.mapelNama.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      r.guruNama.toLowerCase().includes(deferredSearch.toLowerCase())
    );
  });

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("Tidak ada data ujian untuk diekspor.");
      return;
    }
    const headers = [
      "No",
      "Judul Ujian",
      "Mata Pelajaran",
      "Guru Pengampu",
      "Kategori",
      "Durasi (Menit)",
      "Status",
      "Nilai CBT",
      "Ketuntasan KKM (75)",
    ];
    const dataRows = rows.map((r, idx) => [
      idx + 1,
      r.judul,
      r.mapelNama,
      r.guruNama,
      KATEGORI_LABEL[r.kategori] || r.kategori,
      r.durasiMenit,
      r.status === "selesai" ? "Selesai" : "Belum Mengerjakan",
      r.nilai !== null ? r.nilai : "-",
      r.status === "selesai" ? (r.isTuntas ? "Tuntas" : "Remedial") : "-",
    ]);
    exportToCSV("Riwayat_Ujian_CBT_Siswa", headers, dataRows);
    toast.success("Riwayat ujian berhasil diekspor!");
  };

  return (
    <SchoolLayout role="siswa" title="Ujian & Kuis CBT" nav={SISWA_NAV}>
      {/* Top Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-primary" />
            Portal Ujian &amp; Kuis Online (CBT)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pelaksanaan evaluasi pembelajaran mandiri dengan timer akurat, auto-grading instan, dan review kunci jawaban
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Total Paket Ujian Tersedia
          </span>
          <p className="text-2xl font-extrabold text-foreground mt-1">{rows.length}</p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Format Pilihan Ganda CBT
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-green-600 dark:text-[#57F287] block">
            Sudah Diselesaikan
          </span>
          <p className="text-2xl font-extrabold text-green-600 dark:text-[#57F287] mt-1">
            {rows.filter((r) => r.status === "selesai").length}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Hasil Nilai Terbit
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-[#70B8FF] block">
            Rata-rata Nilai CBT Kamu
          </span>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-[#70B8FF] mt-1">
            {rows.filter((r) => r.nilai !== null).length > 0
              ? Math.round(
                  rows
                    .filter((r) => r.nilai !== null)
                    .reduce((a, b) => a + (b.nilai ?? 0), 0) /
                    rows.filter((r) => r.nilai !== null).length,
                )
              : "—"}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Standar KKM: 75
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
                Daftar Ujian &amp; Kuis Semester Ini
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Menampilkan {filteredRows.length} dari {rows.length} total ujian
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 print:hidden">
              <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl text-xs">
                {[
                  { id: "all", label: "Semua" },
                  { id: "active", label: "Perlu Dikerjakan" },
                  { id: "finished", label: "Riwayat Selesai" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id as any)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      tab === t.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari ujian, mapel, guru..."
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
                  Mata Pelajaran &amp; Guru
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Durasi &amp; Periode
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-green-600 dark:text-[#57F287] py-3.5 text-center">
                  Nilai CBT
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 print:hidden text-right pr-6">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    Tidak ada paket ujian pada kategori ini.
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
                      <div className="font-bold text-sm text-foreground">{r.judul}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-primary/15 text-blue-600 dark:text-[#70B8FF] font-semibold text-[10px] border border-blue-200 dark:border-primary/30 mr-1.5">
                          {KATEGORI_LABEL[r.kategori] || r.kategori}
                        </span>
                        KKM: {r.kkm}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{r.mapelNama}</div>
                      <div className="text-[11px] text-muted-foreground">{r.guruNama}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.durasiMenit} Menit
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Batas: {r.tanggalSelesai}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.status === "selesai" ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-[#23A559]/40">
                          Selesai
                        </span>
                      ) : isDeadlineLewat(r.tanggalSelesai) ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border border-[#F23F43]/40">
                          Waktu Berakhir
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-[#F0B232]/40">
                          Tersedia
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.nilai !== null ? (
                        <div>
                          <span
                            className={`font-mono text-base font-extrabold ${
                              r.isTuntas ? "text-green-600 dark:text-[#57F287]" : "text-red-600 dark:text-[#FF7074]"
                            }`}
                          >
                            {r.nilai}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {r.isTuntas ? "Tuntas" : "Remedial"} ({r.totalBenar} Benar)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="print:hidden text-right pr-6">
                      {r.status === "selesai" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/siswa/ujian/${r.id}?mode=review`)}
                          className="h-8 rounded-lg bg-background border-border text-blue-600 dark:text-[#70B8FF] hover:bg-secondary text-xs font-semibold"
                        >
                          <HelpCircle className="mr-1 h-3.5 w-3.5" />
                          Review Kunci &amp; Pembahasan
                        </Button>
                      ) : isDeadlineLewat(r.tanggalSelesai) ? (
                        <Button
                          size="sm"
                          disabled
                          className="h-8 rounded-lg bg-background border border-border text-muted-foreground text-xs font-semibold cursor-not-allowed"
                        >
                          Sesi Berakhir
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/siswa/ujian/${r.id}`)}
                          className="h-8 rounded-lg bg-primary hover:bg-[#0873C4] text-white text-xs font-bold shadow-md"
                        >
                          <PlayCircle className="mr-1 h-3.5 w-3.5" />
                          Mulai Kerjakan
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </SchoolLayout>
  );
}
