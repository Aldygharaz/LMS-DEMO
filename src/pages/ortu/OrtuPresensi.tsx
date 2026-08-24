import { useEffect, useState, useDeferredValue } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  UserX,
  Printer,
  Sparkles,
  Download,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ORTU_NAV } from "@/lib/nav";
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
    label: "Hadir di Kelas",
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

function ChildPresensiView({
  siswaId,
  childName,
}: {
  siswaId: number;
  childName: string;
}) {
  const presensiQuery = trpc.ortu.childPresensi.useQuery({ siswaId });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  if (presensiQuery.isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Memuat data presensi ananda...
      </div>
    );
  }

  const stats = presensiQuery.data?.stats ?? {
    totalHadir: 0,
    totalIzin: 0,
    totalSakit: 0,
    totalAlpa: 0,
    total: 0,
    persentaseHadir: 100,
  };

  const records = presensiQuery.data?.records ?? [];

  const filteredRecords = records.filter((r) => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSearch =
      r.mapelNama.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
      r.guruNama.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
      (r.catatan?.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ?? false);
    return matchStatus && matchSearch;
  });

  const exportPresensiCSV = () => {
    if (records.length === 0) {
      toast.error("Tidak ada data rekaman presensi untuk diekspor.");
      return;
    }
    const headers = [
      "No",
      "Nama Siswa",
      "Tanggal",
      "Mata Pelajaran",
      "Guru Pengampu",
      "Status Kehadiran",
      "Keterangan / Catatan",
    ];
    const rows = records.map((r, idx) => [
      idx + 1,
      childName,
      r.tanggal,
      r.mapelNama,
      r.guruNama,
      STATUS_BADGE[r.status]?.label ?? r.status,
      r.catatan || "-",
    ]);
    exportToCSV(`Rekapitulasi_Presensi_${childName.replace(/\s+/g, "_")}`, headers, rows);
    toast.success(`Rekapitulasi presensi ananda ${childName} berhasil diekspor!`);
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Hadir"
          value={stats.totalHadir}
          icon={<CheckCircle2 className="h-5 w-5" />}
          colorScheme="green"
        />
        <StatCard
          label="Izin"
          value={stats.totalIzin}
          icon={<Clock className="h-5 w-5" />}
          colorScheme="blue"
        />
        <StatCard
          label="Sakit"
          value={stats.totalSakit}
          icon={<AlertCircle className="h-5 w-5" />}
          colorScheme="amber"
        />
        <StatCard
          label="Alpa"
          value={stats.totalAlpa}
          icon={<UserX className="h-5 w-5" />}
          colorScheme={stats.totalAlpa > 0 ? "red" : "green"}
        />
      </div>

      {/* Compliance Meter & Action Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Tingkat Kehadiran Kumulatif: {stats.persentaseHadir}%
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.persentaseHadir >= 85
                ? "Kehadiran ananda sangat baik dan memenuhi batas minimum 85% untuk Penilaian Akhir Semester (PAS)."
                : "Kehadiran di bawah batas minimum 85%. Mohon konfirmasikan kendala ketidakhadiran ke wali kelas."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <Button
            type="button"
            onClick={exportPresensiCSV}
            variant="outline"
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-[#23A559]" />
            Ekspor Presensi (CSV)
          </Button>

          <Button
            type="button"
            onClick={() => window.print()}
            variant="outline"
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-[#70B8FF]" />
            Cetak Rekap
          </Button>
        </div>
      </div>

      {/* Log Table with Status Filters and Search */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Riwayat Presensi Sekolah Anak ({filteredRecords.length} dari {records.length} Sesi)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Catatan kehadiran yang diverifikasi oleh guru pengampu mata pelajaran
              </CardDescription>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl">
                {[
                  { id: "all", label: "Semua" },
                  { id: "hadir", label: "Hadir" },
                  { id: "izin", label: "Izin" },
                  { id: "sakit", label: "Sakit" },
                  { id: "alpa", label: "Alpa" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterStatus(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === f.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari mapel atau guru..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[500px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Tanggal & Hari
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Mata Pelajaran
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Guru Pengampu
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Catatan
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    Tidak ada riwayat presensi yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              )}
              {filteredRecords.map((r) => {
                const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.hadir;
                return (
                  <TableRow
                    key={r.id}
                    className="hover:bg-secondary/80 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-foreground py-3.5 font-bold">
                      {r.tanggal}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-foreground">
                      {r.mapelNama}
                    </TableCell>
                    <TableCell className="text-xs text-card-foreground">
                      {r.guruNama}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.catatan || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrtuPresensi() {
  const childrenQuery = trpc.ortu.myChildren.useQuery();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  useEffect(() => {
    if (
      childrenQuery.data &&
      childrenQuery.data.length > 0 &&
      selectedChildId === null
    ) {
      setSelectedChildId(childrenQuery.data[0]!.id);
    }
  }, [childrenQuery.data, selectedChildId]);

  return (
    <SchoolLayout role="orang_tua" title="Presensi Kehadiran Anak" nav={ORTU_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Log Presensi & Kehadiran Anak
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pantau kehadiran harian ananda di kelas secara transparan dan akurat
          </p>
        </div>

        {/* Multi-Child Selector */}
        {childrenQuery.data && childrenQuery.data.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {childrenQuery.data.map((c) => {
              const isSelected = selectedChildId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedChildId(c.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-sm ring-1 ring-white/20"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <div className="h-5 w-5 rounded-md bg-white/20 flex items-center justify-center font-bold text-[10px]">
                    {c.name.charAt(0)}
                  </div>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedChildId !== null && (
        <ChildPresensiView
          siswaId={selectedChildId}
          childName={
            childrenQuery.data?.find((c) => c.id === selectedChildId)?.name ??
            "Ananda"
          }
        />
      )}
    </SchoolLayout>
  );
}
