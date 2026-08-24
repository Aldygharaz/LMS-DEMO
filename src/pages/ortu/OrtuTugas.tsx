import { useEffect, useState, useDeferredValue } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Quote,
  Sparkles,
  Search,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ORTU_NAV } from "@/lib/nav";
import { NilaiBadge } from "@/components/lms-shared";
import {
  formatTanggalWaktu,
  isDeadlineLewat,
  sisaWaktu,
  exportToCSV,
} from "@/lib/lms";
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

function ChildTaskView({
  siswaId,
  childName,
}: {
  siswaId: number;
  childName: string;
}) {
  const dashboard = trpc.ortu.childDashboard.useQuery({ siswaId });
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "graded">("all");
  const [selectedMapel, setSelectedMapel] = useState<string>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  if (!dashboard.data) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Memuat data tugas ananda...
      </div>
    );
  }
  const data = dashboard.data;
  const allTasks = data.tugasList;
  const submittedTasks = allTasks.filter((t) => !!t.submission);
  const pendingTasks = allTasks.filter((t) => !t.submission);
  const gradedTasks = allTasks.filter((t) => t.nilai?.nilai !== null && t.nilai?.nilai !== undefined);

  const mapelList = Array.from(new Set(allTasks.map((t) => t.mapelNama)));

  const filteredTasks = allTasks.filter((t) => {
    const matchSearch =
      t.judul.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      t.mapelNama.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      t.guruNama.toLowerCase().includes(deferredSearch.toLowerCase());
    if (!matchSearch) return false;

    if (selectedMapel !== "all" && t.mapelNama !== selectedMapel) return false;

    if (filter === "pending") return !t.submission;
    if (filter === "submitted") return !!t.submission;
    if (filter === "graded") return t.nilai?.nilai !== null && t.nilai?.nilai !== undefined;
    return true;
  });

  const exportTugasCSV = () => {
    if (allTasks.length === 0) {
      toast.error("Tidak ada data tugas untuk diekspor.");
      return;
    }
    const headers = [
      "No",
      "Nama Siswa",
      "Judul Tugas",
      "Mata Pelajaran",
      "Guru Pengampu",
      "Batas Waktu",
      "Status Pengumpulan",
      "Nilai",
      "Feedback Guru",
    ];
    const rows = allTasks.map((t, idx) => [
      idx + 1,
      childName,
      t.judul,
      t.mapelNama,
      t.guruNama,
      formatTanggalWaktu(t.deadline),
      t.submission ? (t.submission.terlambat ? "Terlambat" : "Tepat Waktu") : "Belum Kumpul",
      t.nilai?.nilai ?? "-",
      t.nilai?.feedback || "-",
    ]);
    exportToCSV(`Daftar_Tugas_${childName.replace(/\s+/g, "_")}`, headers, rows);
    toast.success(`Daftar tugas ananda ${childName} berhasil diekspor!`);
  };

  return (
    <div className="space-y-6">
      {/* Milestone Progress Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Progres Tugas Anak: {submittedTasks.length} dari {allTasks.length} Tugas Selesai
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pendingTasks.length === 0
                ? "Semua tugas mandiri ananda telah selesai dikerjakan dan dikumpulkan."
                : `Masih ada ${pendingTasks.length} tugas yang belum dikumpulkan ananda.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            onClick={exportTugasCSV}
            variant="outline"
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl print:hidden"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-[#23A559]" />
            Ekspor Tugas (CSV)
          </Button>

          <div className="w-full sm:w-48 space-y-1.5 shrink-0">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
              <span>Kepatuhan Tugas</span>
              <span className="text-green-600 dark:text-[#57F287]">
                {allTasks.length > 0
                  ? Math.round((submittedTasks.length / allTasks.length) * 100)
                  : 100}
                %
              </span>
            </div>
            <div className="h-2 rounded-full bg-background overflow-hidden border border-border">
              <div
                className="h-full bg-[#23A559] transition-all duration-300 rounded-full"
                style={{
                  width: `${
                    allTasks.length > 0
                      ? (submittedTasks.length / allTasks.length) * 100
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-lg">
        <div className="flex items-center gap-1.5 p-1 bg-background border border-border rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "all"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({allTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "pending"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Belum Kumpul ({pendingTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("submitted")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "submitted"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sudah Kumpul ({submittedTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("graded")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "graded"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sudah Dinilai ({gradedTasks.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedMapel} onValueChange={setSelectedMapel}>
            <SelectTrigger className="w-44 bg-background border-border text-foreground text-xs rounded-xl h-9">
              <SelectValue placeholder="Pilih Mapel" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all" className="text-xs focus:bg-secondary">
                Semua Mata Pelajaran
              </SelectItem>
              {mapelList.map((m) => (
                <SelectItem key={m} value={m} className="text-xs focus:bg-secondary">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari tugas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
            />
          </div>
        </div>
      </div>

      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-bold font-brand text-foreground">
            Daftar Tugas & PR ({filteredTasks.length} dari {allTasks.length} Tugas)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Status pengerjaan tugas mandiri dan batas pengumpulan
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 max-h-[500px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Tugas & Mapel
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Deadline
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Status Pengumpulan
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                  Nilai
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    Tidak ada tugas yang cocok dengan filter yang dipilih.
                  </TableCell>
                </TableRow>
              )}
              {filteredTasks.map((t) => (
                <TableRow
                  key={t.id}
                  className="hover:bg-secondary/80 transition-colors"
                >
                  <TableCell className="py-3.5">
                    <p className="text-sm font-bold text-foreground">{t.judul}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-blue-600 dark:text-[#70B8FF] font-semibold">{t.mapelNama}</span> &bull; {t.guruNama}
                    </p>
                    {t.nilai?.feedback && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-[#70B8FF] bg-primary/10 p-2 rounded-lg border border-primary/20">
                        <Quote className="h-3 w-3 shrink-0" />
                        <span className="italic">"{t.nilai.feedback}"</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTanggalWaktu(t.deadline)}
                    {!t.submission && !isDeadlineLewat(t.deadline) && (
                      <span className="block text-[11px] font-bold text-primary mt-0.5">
                        {sisaWaktu(t.deadline)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.submission ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30">
                        <CheckCircle2 className="h-3 w-3" />
                        {t.submission.terlambat ? "Terlambat" : "Tepat Waktu"}
                      </span>
                    ) : isDeadlineLewat(t.deadline) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border border-red-200 dark:border-[#F23F43]/30">
                        <AlertCircle className="h-3 w-3" />
                        Lewat Batas
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-background text-muted-foreground border border-border">
                        Belum Kumpul
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <NilaiBadge nilai={t.nilai?.nilai} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrtuTugas() {
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
    <SchoolLayout role="orang_tua" title="Tugas & PR Anak" nav={ORTU_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Pemantauan Tugas & PR Anak
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pantau status pengerjaan tugas harian anak dan tenggat waktu pengumpulan
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
        <ChildTaskView
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
