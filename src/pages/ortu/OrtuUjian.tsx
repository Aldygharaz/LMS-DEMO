import { useEffect, useState, useDeferredValue } from "react";
import {
  FileCheck2,
  Clock,
  Search,
  Download,
  Printer,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ORTU_NAV } from "@/lib/nav";
import { exportToCSV, isDeadlineLewat } from "@/lib/lms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function OrtuUjian() {
  const childrenQuery = trpc.ortu.myChildren.useQuery();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (childrenQuery.data && childrenQuery.data.length > 0 && selectedChildId === null) {
      setSelectedChildId(childrenQuery.data[0].id);
    }
  }, [childrenQuery.data, selectedChildId]);

  const ujianQuery = trpc.ortu.childUjianList.useQuery(
    { siswaId: selectedChildId! },
    { enabled: selectedChildId !== null },
  );

  const children = childrenQuery.data ?? [];
  const activeChild = children.find((c) => c.id === selectedChildId);
  const childName = activeChild?.name ?? "Ananda";

  const rows = ujianQuery.data ?? [];
  const filteredRows = rows.filter((r) => {
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
      "Nama Siswa",
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
      childName,
      r.judul,
      r.mapelNama,
      r.guruNama,
      KATEGORI_LABEL[r.kategori] || r.kategori,
      r.durasiMenit,
      r.status === "selesai" ? "Selesai" : "Belum Mengerjakan",
      r.nilai !== null ? r.nilai : "-",
      r.status === "selesai" ? (r.isTuntas ? "Tuntas" : "Remedial") : "-",
    ]);
    exportToCSV(`Hasil_Ujian_CBT_${childName.replace(/\s+/g, "_")}`, headers, dataRows);
    toast.success("Hasil ujian berhasil diekspor!");
  };

  return (
    <SchoolLayout role="orang_tua" title="Hasil Ujian &amp; Kuis Ananda" nav={ORTU_NAV}>
      {/* Top Banner & Child Selector */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-primary" />
            Hasil Evaluasi CBT Ananda
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Laporan skor kuis formatif, UTS/PTS, dan UAS berbasis komputer yang telah dikerjakan oleh ananda
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {children.length > 1 && (
            <Select
              value={selectedChildId ? String(selectedChildId) : ""}
              onValueChange={(val) => setSelectedChildId(Number(val))}
            >
              <SelectTrigger className="w-56 bg-background border-border text-foreground text-xs rounded-xl h-10">
                <SelectValue placeholder="Pilih Anak" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground text-xs">
                {children.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    Ananda: {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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
            Total Ujian &amp; Kuis Terbit
          </span>
          <p className="text-2xl font-extrabold text-foreground mt-1">{rows.length}</p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Semester Berjalan
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-green-600 dark:text-[#57F287] block">
            Ujian Telah Dikerjakan
          </span>
          <p className="text-2xl font-extrabold text-green-600 dark:text-[#57F287] mt-1">
            {rows.filter((r) => r.status === "selesai").length}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {rows.filter((r) => r.isTuntas).length} Tuntas KKM
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-[#70B8FF] block">
            Rata-rata Nilai CBT Ananda
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
            Standar KKM Sekolah: 75
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
                Riwayat Evaluasi CBT: {childName}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Menampilkan {filteredRows.length} dari {rows.length} total ujian
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-56 print:hidden">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari ujian, mapel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  Paket Ujian
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Mata Pelajaran &amp; Guru
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Durasi &amp; Batas
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-green-600 dark:text-[#57F287] py-3.5 text-center">
                  Nilai CBT
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Belum ada riwayat ujian CBT untuk ananda.
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
                          Selesai Dikerjakan
                        </span>
                      ) : isDeadlineLewat(r.tanggalSelesai) ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border border-[#F23F43]/40">
                          Waktu Berakhir
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-[#F0B232]/40">
                          Belum Dikerjakan
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
