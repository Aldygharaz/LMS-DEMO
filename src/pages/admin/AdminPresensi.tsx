import { useState, useDeferredValue } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  UserX,
  Download,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ADMIN_NAV } from "@/lib/nav";
import { StatCard } from "@/components/lms-shared";
import { exportToCSV } from "@/lib/lms";
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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  hadir: {
    label: "Hadir",
    cls: "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border-[#23A559]/40",
  },
  izin: {
    label: "Izin",
    cls: "bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border-primary/40",
  },
  sakit: {
    label: "Sakit",
    cls: "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border-[#F0B232]/40",
  },
  alpa: {
    label: "Alpa (Tanpa Keterangan)",
    cls: "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border-[#F23F43]/40",
  },
};

export default function AdminPresensi() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(todayStr);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const presensiQuery = trpc.admin.presensiOverview.useQuery({ tanggal });

  const summary = presensiQuery.data?.summary ?? {
    totalHadir: 0,
    totalSakit: 0,
    totalIzin: 0,
    totalAlpa: 0,
    total: 0,
  };

  const filteredRows = (presensiQuery.data?.rows ?? []).filter((r) => {
    const matchSearch =
      r.siswaNama.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      r.kelasNama.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      r.mapelNama.toLowerCase().includes(deferredSearch.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportPresensiCSV = () => {
    if (!presensiQuery.data || presensiQuery.data.rows.length === 0) {
      toast.error("Tidak ada data presensi pada tanggal ini.");
      return;
    }
    const headers = ["No", "Nama Siswa", "Kelas", "Mata Pelajaran", "Status Presensi", "Tanggal", "Catatan"];
    const rows = presensiQuery.data.rows.map((r, idx) => [
      idx + 1,
      r.siswaNama,
      r.kelasNama,
      r.mapelNama,
      r.status,
      r.tanggal,
      r.catatan || "-",
    ]);
    exportToCSV(`Rekap_Presensi_Sekolah_${tanggal}`, headers, rows);
    toast.success(`Rekap presensi tanggal ${tanggal} berhasil diunduh!`);
  };

  return (
    <SchoolLayout role="admin" title="Rekapitulasi Presensi" nav={ADMIN_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Rekapitulasi Kehadiran Siswa
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoring rekam kehadiran harian seluruh rombel dan sesi pembelajaran
          </p>
        </div>

        {/* Action Controls & Date Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Tanggal:</span>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="h-10 bg-background border-border text-foreground text-xs rounded-xl w-40"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={exportPresensiCSV}
            className="h-10 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Download className="mr-1.5 h-4 w-4 text-[#23A559]" />
            Ekspor CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-10 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Printer className="mr-1.5 h-4 w-4 text-blue-600 dark:text-[#70B8FF]" />
            Cetak Log
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6 print:hidden">
        <StatCard
          label="Hadir"
          value={summary.totalHadir}
          icon={<CheckCircle2 className="h-5 w-5" />}
          colorScheme="green"
        />
        <StatCard
          label="Izin"
          value={summary.totalIzin}
          icon={<Clock className="h-5 w-5" />}
          colorScheme="blue"
        />
        <StatCard
          label="Sakit"
          value={summary.totalSakit}
          icon={<AlertCircle className="h-5 w-5" />}
          colorScheme="amber"
        />
        <StatCard
          label="Alpa"
          value={summary.totalAlpa}
          icon={<UserX className="h-5 w-5" />}
          colorScheme={summary.totalAlpa > 0 ? "red" : "green"}
        />
      </div>

      {/* Records Table Card */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Log Presensi Harian ({filteredRows?.length ?? 0} Rekaman)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Tanggal: {tanggal}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl">
                {[
                  { id: "all", label: "Semua" },
                  { id: "hadir", label: "Hadir" },
                  { id: "izin", label: "Izin" },
                  { id: "sakit", label: "Sakit" },
                  { id: "alpa", label: "Alpa" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === st.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari siswa, kelas, mapel..."
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
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Nama Siswa
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Rombel & Mapel
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Status Presensi
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Catatan / Keterangan
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {filteredRows?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-10 text-xs text-muted-foreground"
                  >
                    Belum ada presensi yang cocok dengan filter pada tanggal ini.
                  </TableCell>
                </TableRow>
              )}
              {filteredRows?.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.hadir;
                return (
                  <TableRow
                    key={r.id}
                    className="hover:bg-secondary/80 transition-colors"
                  >
                    <TableCell className="font-semibold text-foreground text-sm py-3.5">
                      {r.siswaNama}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      Kelas {r.kelasNama} &bull; <span className="text-blue-600 dark:text-[#70B8FF]">{r.mapelNama}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-card-foreground">
                      {r.catatan || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </SchoolLayout>
  );
}
