import { useState, useDeferredValue } from "react";
import { toast } from "sonner";
import {
  Download,
  Printer,
  Search,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { GURU_NAV } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { exportToCSV, getPredikatBadgeClass } from "@/lib/lms";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function StudentMiniSparkline({ scores }: { scores: (number | null)[] }) {
  const validScores = scores.filter((s): s is number => s !== null && s !== undefined);
  if (validScores.length < 2) return null;

  const min = Math.min(...validScores, 0);
  const max = Math.max(...validScores, 100);
  const range = max - min || 1;
  const width = 64;
  const height = 18;
  const points = validScores
    .map((s, i) => {
      const x = (i / (validScores.length - 1)) * (width - 6) + 3;
      const y = height - ((s - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  const isTrendingUp = validScores[validScores.length - 1] >= validScores[0];

  return (
    <div className="flex items-center gap-1 justify-center" title="Tren performa tugas siswa">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={isTrendingUp ? "#23A559" : "#F23F43"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {validScores.map((s, i) => {
          const x = (i / (validScores.length - 1)) * (width - 6) + 3;
          const y = height - ((s - min) / range) * (height - 6) - 3;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.5"
              fill={s >= 75 ? "#23A559" : "#F23F43"}
            />
          );
        })}
      </svg>
    </div>
  );
}

function MiniKkmIndicator({ score, kkm = 75 }: { score: number | null; kkm?: number }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const isTuntas = score >= kkm;
  const percentage = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col items-center gap-1 min-w-[70px]">
      <span className={`font-mono font-extrabold text-sm ${isTuntas ? "text-green-600 dark:text-[#57F287]" : "text-amber-600 dark:text-[#FEE75C]"}`}>
        {score}
      </span>
      <div className="relative h-1.5 w-16 bg-background rounded-full overflow-hidden border border-border">
        {/* KKM Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
          style={{ left: `${kkm}%` }}
          title={`Batas KKM: ${kkm}`}
        />
        <div
          className={`h-full rounded-full transition-all ${isTuntas ? "bg-[#23A559]" : "bg-[#F0B232]"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function GuruRekapNilai() {
  const assignments = trpc.guru.myAssignments.useQuery();
  const [selectedKmgId, setSelectedKmgId] = useState<string>("");
  const [searchStudent, setSearchStudent] = useState("");
  const deferredSearchStudent = useDeferredValue(searchStudent);
  const [predikatFilter, setPredikatFilter] = useState<string>("Semua");

  const kmgList = assignments.data?.assignments ?? [];
  const currentKmgId = selectedKmgId ? Number(selectedKmgId) : kmgList[0]?.id;

  const rekapQuery = trpc.guru.rekapNilaiKelas.useQuery(
    { kmgId: currentKmgId ?? 0 },
    { enabled: !!currentKmgId },
  );

  const exportCSV = () => {
    if (!rekapQuery.data) return;
    const { kelasNama, mapelNama, tugasList, rows } = rekapQuery.data;

    const headers = [
      "No",
      "Peringkat",
      "Nama Siswa",
      "Email",
      ...tugasList.map((t) => t.judul),
      "Rata-rata",
      "Predikat",
      "Status KKM (75)",
    ];

    const dataRows = rows.map((r, idx) => {
      const taskScores = r.tasks.map((t) =>
        t.nilai !== null ? t.nilai : t.submitted ? "0 (Belum Dinilai)" : "-",
      );
      return [
        idx + 1,
        r.rank ? `#${r.rank}` : "-",
        r.siswaNama,
        r.siswaEmail,
        ...taskScores,
        r.rataRata ?? "-",
        r.predikat,
        r.isTuntas ? "Tuntas KKM" : "Remedial",
      ];
    });

    exportToCSV(`Rekap_Nilai_${kelasNama}_${mapelNama}`, headers, dataRows);
    toast.success("Rekap nilai berhasil diekspor ke CSV!");
  };

  const handlePrint = () => {
    window.print();
  };

  const rows = rekapQuery.data?.rows ?? [];
  const validAverages = rows
    .map((r) => r.rataRata)
    .filter((v): v is number => v !== null);
  const classAverage =
    validAverages.length > 0
      ? Math.round(
          validAverages.reduce((a, b) => a + b, 0) / validAverages.length,
        )
      : null;
  const gradeA = rows.filter((r) => r.predikat === "A").length;
  const gradeB = rows.filter((r) => r.predikat === "B").length;
  const gradeC = rows.filter((r) => r.predikat === "C").length;
  const gradeD = rows.filter((r) => r.predikat === "D").length;
  const tuntasCount = rows.filter(
    (r) => r.rataRata !== null && r.rataRata >= 75,
  ).length;
  const tuntasRate =
    rows.length > 0 ? Math.round((tuntasCount / rows.length) * 100) : 100;

  const filteredRows = rows.filter((r) => {
    const matchSearch =
      r.siswaNama.toLowerCase().includes(deferredSearchStudent.toLowerCase()) ||
      r.siswaEmail.toLowerCase().includes(deferredSearchStudent.toLowerCase());
    const matchPredikat =
      predikatFilter === "Semua" || r.predikat === predikatFilter;
    return matchSearch && matchPredikat;
  });

  return (
    <SchoolLayout role="guru" title="Rekapitulasi Nilai Siswa" nav={GURU_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Buku Nilai &amp; Rekapitulasi Rombel
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Matriks evaluasi nilai tugas, capaian rata-rata, predikat ketuntasan, dan tren performa kelas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={currentKmgId ? String(currentKmgId) : ""}
            onValueChange={setSelectedKmgId}
          >
            <SelectTrigger className="w-56 bg-background border-border text-foreground text-xs rounded-xl h-10">
              <SelectValue placeholder="Pilih Kelas &amp; Mapel" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {kmgList.map((a) => (
                <SelectItem key={a.id} value={String(a.id)} className="text-xs focus:bg-secondary">
                  Kelas {a.kelasNama} - {a.mapelNama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-10 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Download className="mr-1.5 h-4 w-4 text-[#23A559]" />
            Ekspor Excel (CSV)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-10 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Printer className="mr-1.5 h-4 w-4 text-blue-600 dark:text-[#70B8FF]" />
            Cetak Rekap
          </Button>
        </div>
      </div>

      {/* Grade Analytics & Mastery Distribution Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6 print:hidden">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Rata-rata Kelas
          </span>
          <p className="text-2xl font-extrabold text-green-600 dark:text-[#57F287] mt-0.5">
            {classAverage ?? "—"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Ketuntasan (KKM 75)
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-[#70B8FF]">
              {tuntasRate}%
            </span>
          </div>
          <p className="text-lg font-extrabold text-foreground">
            {tuntasCount} <span className="text-xs font-normal text-muted-foreground">dari {rows.length} Siswa Tuntas</span>
          </p>
          <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-[#23A559] rounded-full transition-all"
              style={{ width: `${tuntasRate}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Sebaran Predikat Nilai Siswa
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              Total {rows.length} Siswa
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30 text-xs font-bold">
              A: {gradeA} ({rows.length > 0 ? Math.round((gradeA / rows.length) * 100) : 0}%)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border border-blue-200 dark:border-primary/30 text-xs font-bold">
              B: {gradeB} ({rows.length > 0 ? Math.round((gradeB / rows.length) * 100) : 0}%)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-amber-200 dark:border-[#F0B232]/30 text-xs font-bold">
              C: {gradeC} ({rows.length > 0 ? Math.round((gradeC / rows.length) * 100) : 0}%)
            </span>
            {gradeD > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border border-red-200 dark:border-[#F23F43]/30 text-xs font-bold">
                D: {gradeD} ({rows.length > 0 ? Math.round((gradeD / rows.length) * 100) : 0}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gradebook Matrix Table with Search & Filter Header */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Rekapitulasi Nilai: Kelas {rekapQuery.data?.kelasNama} &bull; {rekapQuery.data?.mapelNama}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Menampilkan {filteredRows.length} dari {rekapQuery.data?.rows.length ?? 0} Siswa &bull; {rekapQuery.data?.tugasList.length ?? 0} Tugas
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl">
                {["Semua", "A", "B", "C", "D"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPredikatFilter(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      predikatFilter === p
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "Semua" ? "Semua" : `Predikat ${p}`}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari siswa atau email..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 w-12 text-center">
                  No
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 min-w-48">
                  Nama Siswa
                </TableHead>
                {rekapQuery.data?.tugasList.map((t) => (
                  <TableHead
                    key={t.id}
                    className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center min-w-28"
                  >
                    <span className="block truncate max-w-28" title={t.judul}>
                      {t.judul}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center min-w-20">
                  Tren Nilai
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-amber-600 dark:text-[#FEE75C] py-3.5 text-center min-w-20">
                  Peringkat
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-green-600 dark:text-[#57F287] py-3.5 text-center min-w-24">
                  Rata-rata (KKM 75)
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-blue-600 dark:text-[#70B8FF] py-3.5 text-center min-w-20">
                  Predikat
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={(rekapQuery.data?.tugasList.length ?? 0) + 6}
                    className="text-center py-10 text-xs text-muted-foreground"
                  >
                    Tidak ada siswa yang sesuai dengan filter atau pencarian.
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map((r, idx) => {
                const taskScoreValues = r.tasks.map((t) => t.nilai);

                return (
                  <TableRow
                    key={r.siswaId}
                    className="hover:bg-secondary/80 transition-colors"
                  >
                    <TableCell className="text-center text-xs font-mono font-bold text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-sm py-3.5">
                      <div>{r.siswaNama}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{r.siswaEmail}</div>
                    </TableCell>
                    {r.tasks.map((t) => (
                      <TableCell key={t.tugasId} className="text-center py-3.5">
                        {t.nilai !== null ? (
                          <span className="font-mono text-xs font-bold text-foreground px-2 py-0.5 rounded bg-background border border-border">
                            {t.nilai}
                          </span>
                        ) : t.submitted ? (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-[#FEE75C] bg-[#F0B232]/10 px-1.5 py-0.5 rounded">
                            Belum Dinilai
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center py-3.5">
                      <StudentMiniSparkline scores={taskScoreValues} />
                    </TableCell>
                    <TableCell className="text-center py-3.5">
                      {r.rank === 1 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-[#F0B232]/50 shadow-sm">
                          #1 Juara
                        </span>
                      ) : r.rank === 2 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-300/20 text-slate-200 border border-slate-400/50">
                          #2
                        </span>
                      ) : r.rank === 3 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-700/20 text-amber-300 border border-amber-600/50">
                          #3
                        </span>
                      ) : r.rank !== null ? (
                        <span className="text-xs font-mono font-bold text-muted-foreground">
                          #{r.rank}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-3.5">
                      <MiniKkmIndicator score={r.rataRata} kkm={75} />
                    </TableCell>
                    <TableCell className="text-center">
                      {r.predikat !== "—" ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPredikatBadgeClass(r.predikat)}`}>
                          {r.predikat}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
