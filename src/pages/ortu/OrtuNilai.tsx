import { useState, useDeferredValue } from "react";
import { Quote, Printer, CheckCircle2, Download, Search, BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ORTU_NAV } from "@/lib/nav";
import { NilaiBadge } from "@/components/lms-shared";
import { formatTanggalWaktu, exportToCSV, hitungPredikat, getPredikatBadgeClass } from "@/lib/lms";
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

function MiniSparkline({ scores, className }: { scores: number[]; className?: string }) {
  if (scores.length < 2) return null;
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const range = max - min || 1;
  const width = 76;
  const height = 22;
  const points = scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * (width - 8) + 4;
      const y = height - ((s - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  const isTrendingUp = scores[scores.length - 1] >= scores[0];

  return (
    <div className="flex items-center gap-1.5" title="Tren capaian nilai tugas ananda">
      <svg className={className} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={isTrendingUp ? "#23A559" : "#F23F43"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {scores.map((s, i) => {
          const x = (i / (scores.length - 1)) * (width - 8) + 4;
          const y = height - ((s - min) / range) * (height - 8) - 4;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill={s >= 75 ? "#23A559" : "#F23F43"}
            />
          );
        })}
      </svg>
      {isTrendingUp ? (
        <TrendingUp className="h-3 w-3 text-green-600 dark:text-[#57F287] shrink-0" />
      ) : (
        <TrendingDown className="h-3 w-3 text-red-600 dark:text-[#FF7074] shrink-0" />
      )}
    </div>
  );
}

function KkmProgressBar({ score, kkm = 75 }: { score: number | null; kkm?: number }) {
  if (score === null) return null;
  const isTuntas = score >= kkm;
  const percentage = Math.min(100, Math.max(0, score));

  return (
    <div className="space-y-1 w-full pt-1">
      <div className="relative h-2 w-full bg-background rounded-full overflow-hidden border border-border">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
          style={{ left: `${kkm}%` }}
          title={`Batas KKM: ${kkm}`}
        />
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isTuntas ? "bg-[#23A559]" : "bg-[#F0B232]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
        <span>0</span>
        <span className="font-bold text-foreground">Target KKM {kkm}</span>
        <span>100</span>
      </div>
    </div>
  );
}

function ChildGradesView({
  siswaId,
  childName,
}: {
  siswaId: number;
  childName: string;
}) {
  const dashboard = trpc.ortu.childDashboard.useQuery({ siswaId });
  const [searchMapel, setSearchMapel] = useState("");
  const deferredSearchMapel = useDeferredValue(searchMapel);

  if (!dashboard.data) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Memuat data perkembangan nilai ananda...
      </div>
    );
  }
  const data = dashboard.data;

  const dinilai = data.tugasList.filter(
    (t) => t.nilai && t.nilai.nilai !== null,
  );
  const rataRata =
    dinilai.length > 0
      ? Math.round(
          dinilai.reduce((acc, t) => acc + (t.nilai!.nilai as number), 0) /
            dinilai.length,
        )
      : null;

  // Group by Mapel
  const mapelMap: Record<
    string,
    { mapelNama: string; guruNama: string; scores: number[]; tasks: typeof dinilai }
  > = {};

  for (const t of data.tugasList) {
    if (!mapelMap[t.mapelNama]) {
      mapelMap[t.mapelNama] = {
        mapelNama: t.mapelNama,
        guruNama: t.guruNama,
        scores: [],
        tasks: [],
      };
    }
    if (t.nilai?.nilai !== null && t.nilai?.nilai !== undefined) {
      mapelMap[t.mapelNama]!.scores.push(t.nilai.nilai);
      mapelMap[t.mapelNama]!.tasks.push(t);
    }
  }

  const mapelList = Object.values(mapelMap).filter(
    (m) =>
      m.mapelNama.toLowerCase().includes(deferredSearchMapel.toLowerCase()) ||
      m.guruNama.toLowerCase().includes(deferredSearchMapel.toLowerCase()),
  );

  const filteredTasks = data.tugasList.filter(
    (t) =>
      t.judul.toLowerCase().includes(deferredSearchMapel.toLowerCase()) ||
      t.mapelNama.toLowerCase().includes(deferredSearchMapel.toLowerCase()) ||
      t.guruNama.toLowerCase().includes(deferredSearchMapel.toLowerCase()),
  );

  const exportRaporCSV = () => {
    if (dinilai.length === 0) {
      toast.error("Tidak ada data nilai yang selesai dinilai.");
      return;
    }
    const headers = [
      "No",
      "Nama Siswa",
      "Mata Pelajaran",
      "Guru Pengampu",
      "Judul Tugas",
      "Nilai",
      "Status KKM (75)",
      "Catatan Feedback Guru",
      "Batas Waktu",
    ];
    const rows = dinilai.map((t, idx) => [
      idx + 1,
      childName,
      t.mapelNama,
      t.guruNama,
      t.judul,
      t.nilai?.nilai ?? "-",
      (t.nilai?.nilai ?? 0) >= 75 ? "Tuntas KKM" : "Perlu Remedial",
      t.nilai?.feedback || "-",
      formatTanggalWaktu(t.deadline),
    ]);
    exportToCSV(`Laporan_Nilai_${childName.replace(/\s+/g, "_")}`, headers, rows);
    toast.success(`Laporan nilai ananda ${childName} berhasil diekspor!`);
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-card border border-border p-4 text-center shadow-lg">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
            Rata-rata Nilai Anak
          </span>
          <p className="text-3xl font-extrabold text-green-600 dark:text-[#57F287] mt-1">
            {rataRata ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 text-center shadow-lg">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
            Tugas Selesai Dinilai
          </span>
          <p className="text-3xl font-extrabold text-blue-600 dark:text-[#70B8FF] mt-1">
            {dinilai.length}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 text-center shadow-lg">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
            Evaluasi Guru
          </span>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-[#FEE75C] mt-1">
            {data.tugasList.filter((t) => !!t.nilai?.feedback).length} Catatan
          </p>
        </div>
      </div>

      {/* KKM Standard & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Standar Ketuntasan Minimal (KKM): 75
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {rataRata && rataRata >= 75
                ? "Selamat! Rata-rata capaian akademik ananda melampaui standar ketuntasan sekolah."
                : "Perlu bimbingan dan pendampingan belajar tambahan di rumah."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari mapel..."
              value={searchMapel}
              onChange={(e) => setSearchMapel(e.target.value)}
              className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
            />
          </div>

          <Button
            type="button"
            onClick={exportRaporCSV}
            variant="outline"
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-[#23A559]" />
            Ekspor Nilai (CSV)
          </Button>

          <Button
            type="button"
            onClick={() => window.print()}
            variant="outline"
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl shrink-0"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-[#70B8FF]" />
            Cetak Rapor
          </Button>
        </div>
      </div>

      {/* Mapel Score Cards Breakdown with Sparklines & KKM Bars */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mapelList.map((m) => {
          const avg =
            m.scores.length > 0
              ? Math.round(m.scores.reduce((a, b) => a + b, 0) / m.scores.length)
              : null;
          const isTuntas = avg !== null && avg >= 75;

          return (
            <div
              key={m.mapelNama}
              className="p-5 rounded-2xl bg-card border border-border shadow-lg space-y-3 flex flex-col justify-between hover:border-primary/50 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{m.mapelNama}</h4>
                    <p className="text-[11px] text-muted-foreground">{m.guruNama}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Rata-rata Mapel
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl font-extrabold font-mono text-foreground">
                        {avg !== null ? avg : "—"}
                      </span>
                      {avg !== null && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getPredikatBadgeClass(hitungPredikat(avg))}`}>
                          Predikat {hitungPredikat(avg)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {avg !== null && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isTuntas
                            ? "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border-[#23A559]/40"
                            : "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border-[#F0B232]/40"
                        }`}
                      >
                        {isTuntas ? "Tuntas KKM" : "Remedial"}
                      </span>
                    )}

                    {m.scores.length >= 2 && (
                      <MiniSparkline scores={m.scores} />
                    )}
                  </div>
                </div>
              </div>

              {/* Visual KKM Progress Bar */}
              <KkmProgressBar score={avg} kkm={75} />
            </div>
          );
        })}
      </div>

      {/* History Table */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-bold font-brand text-foreground">
            Buku Catatan &amp; Evaluasi Tugas Ananda
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Menampilkan seluruh tugas, perolehan nilai, dan feedback bimbingan dari guru
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-background">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Mata Pelajaran &amp; Tugas
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Guru Pengampu
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Batas Waktu
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground text-center py-3.5">
                  Status KKM
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                  Skor
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    Tidak ada data tugas ditemukan.
                  </TableCell>
                </TableRow>
              )}
              {filteredTasks.map((t) => {
                const score = t.nilai?.nilai;
                const isTuntas = score !== null && score !== undefined && score >= 75;

                return (
                  <TableRow
                    key={t.id}
                    className="hover:bg-secondary/80 transition-colors"
                  >
                    <TableCell className="py-3.5">
                      <p className="text-sm font-semibold text-foreground">{t.judul}</p>
                      <span className="text-xs font-semibold text-blue-600 dark:text-[#70B8FF]">
                        {t.mapelNama}
                      </span>
                      {t.nilai?.feedback && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-[#70B8FF] bg-primary/10 p-2 rounded-lg border border-primary/20">
                          <Quote className="h-3 w-3 shrink-0" />
                          <span className="italic">"{t.nilai.feedback}"</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-card-foreground">
                      {t.guruNama}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTanggalWaktu(t.deadline)}
                    </TableCell>
                    <TableCell className="text-center">
                      {score !== null && score !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isTuntas
                              ? "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border-[#23A559]/40"
                              : "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border-[#F0B232]/40"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isTuntas ? "bg-[#23A559]" : "bg-[#F0B232]"}`} />
                          {isTuntas ? "Tuntas KKM" : "Remedial"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <NilaiBadge nilai={t.nilai?.nilai} />
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

export default function OrtuNilai() {
  const childrenQuery = trpc.ortu.myChildren.useQuery();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const activeChildId =
    selectedChildId ??
    (childrenQuery.data && childrenQuery.data.length > 0
      ? childrenQuery.data[0]!.id
      : null);

  const selectedChild = childrenQuery.data?.find((c) => c.id === activeChildId);

  return (
    <SchoolLayout role="orang_tua" title="Perkembangan Nilai Siswa" nav={ORTU_NAV}>
      {/* Child Selector Tabs */}
      {childrenQuery.data && childrenQuery.data.length > 1 && (
        <div className="flex items-center gap-2 p-1.5 bg-card rounded-2xl border border-border mb-6 print:hidden">
          <span className="text-xs font-bold text-muted-foreground px-3">
            Pilih Anak:
          </span>
          {childrenQuery.data.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => setSelectedChildId(child.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeChildId === child.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      {activeChildId && selectedChild ? (
        <ChildGradesView
          siswaId={activeChildId}
          childName={selectedChild.name}
        />
      ) : (
        <div className="py-12 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border">
          Tidak ada data anak yang terdaftar pada akun Anda.
        </div>
      )}
    </SchoolLayout>
  );
}
