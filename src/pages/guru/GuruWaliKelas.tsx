import { useState, useDeferredValue } from "react";
import {
  School,
  AlertCircle,
  Printer,
  MessageSquare,
  Download,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { GURU_NAV } from "@/lib/nav";
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

export default function GuruWaliKelas() {
  const waliQuery = trpc.guru.waliKelasInfo.useQuery();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filterRelasi, setFilterRelasi] = useState<"all" | "linked" | "unlinked">("all");

  if (waliQuery.isLoading) {
    return (
      <SchoolLayout role="guru" title="Ruang Wali Kelas" nav={GURU_NAV}>
        <div className="py-16 text-center text-sm text-muted-foreground">
          Memuat data perwalian kelas...
        </div>
      </SchoolLayout>
    );
  }

  if (!waliQuery.data) {
    return (
      <SchoolLayout role="guru" title="Ruang Wali Kelas" nav={GURU_NAV}>
        <div className="py-16 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border">
          Anda saat ini tidak ditugaskan sebagai Wali Kelas pada tahun ajaran ini.
        </div>
      </SchoolLayout>
    );
  }

  const { kelas, totalSiswa, students } = waliQuery.data;

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.siswaNama.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      s.siswaEmail.toLowerCase().includes(deferredSearch.toLowerCase());
    const matchRelasi =
      filterRelasi === "all" ||
      (filterRelasi === "linked" && s.parents.length > 0) ||
      (filterRelasi === "unlinked" && s.parents.length === 0);
    return matchSearch && matchRelasi;
  });

  const exportLegerCSV = () => {
    const headers = [
      "No",
      "Nama Siswa",
      "Email Siswa",
      "Kontak Wali Murid",
      "Status Relasi Wali",
    ];
    const rows = students.map((s, idx) => [
      idx + 1,
      s.siswaNama,
      s.siswaEmail,
      s.parents.map((p) => `${p.ortuNama} (${p.ortuEmail})`).join("; ") || "Belum Terhubung",
      s.parents.length > 0 ? "Terhubung" : "Belum Terhubung",
    ]);
    exportToCSV(`Leger_Perwalian_Kelas_${kelas.nama}`, headers, rows);
    toast.success(`Leger perwalian kelas ${kelas.nama} berhasil diekspor!`);
  };

  return (
    <SchoolLayout role="guru" title={`Wali Kelas: ${kelas.nama}`} nav={GURU_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <School className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold font-brand text-foreground">
              Ruang Perwalian Kelas {kelas.nama}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manajemen informasi siswa perwalian, kontak wali murid, dan catatan bimbingan konseling
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={exportLegerCSV}
            variant="outline"
            className="h-10 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Download className="mr-1.5 h-4 w-4 text-[#23A559]" />
            Ekspor Leger (CSV)
          </Button>

          <Button
            type="button"
            onClick={() => window.print()}
            variant="outline"
            className="h-10 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-[#70B8FF]" />
            Cetak Leger Perwalian
          </Button>

          <div className="px-5 py-2.5 rounded-2xl bg-background border border-border text-center shadow-inner">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Total Siswa
            </span>
            <span className="text-2xl font-extrabold text-foreground">
              {totalSiswa} Siswa
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Rombongan Belajar
          </span>
          <p className="text-lg font-bold text-foreground mt-0.5">
            Kelas {kelas.nama}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Terhubung Wali Murid
          </span>
          <p className="text-lg font-bold text-green-600 dark:text-[#57F287] mt-0.5">
            {students.filter((s) => s.parents.length > 0).length} / {totalSiswa} Siswa
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Kesiapan Koordinasi
          </span>
          <p className="text-lg font-bold text-blue-600 dark:text-[#70B8FF] mt-0.5">
            {totalSiswa > 0
              ? Math.round(
                  (students.filter((s) => s.parents.length > 0).length /
                    totalSiswa) *
                    100,
                )
              : 100}
            % Terkoneksi
          </p>
        </div>
      </div>

      {/* Student & Parent Contacts Directory */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Daftar Siswa & Kontak Orang Tua / Wali
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Menampilkan {filteredStudents.length} dari {totalSiswa} siswa perwalian
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl">
                {[
                  { id: "all", label: "Semua" },
                  { id: "linked", label: "Terhubung Wali" },
                  { id: "unlinked", label: "Belum Terhubung" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterRelasi(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterRelasi === f.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari siswa atau email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[550px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Nama Siswa
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Email Siswa
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Orang Tua / Wali
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5 print:hidden">
                  Aksi Komunikasi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    Tidak ada siswa yang cocok dengan filter atau pencarian.
                  </TableCell>
                </TableRow>
              )}
              {filteredStudents.map((s) => (
                <TableRow
                  key={s.siswaId}
                  className="hover:bg-secondary/80 transition-colors"
                >
                  <TableCell className="font-semibold text-foreground text-sm py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold text-xs">
                        {s.siswaNama.charAt(0)}
                      </div>
                      <span>{s.siswaNama}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.siswaEmail}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {s.parents.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        Belum terhubung akun orang tua
                      </span>
                    ) : (
                      <div className="space-y-1">
                        {s.parents.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-card-foreground">
                            <span className="font-semibold text-foreground">{p.ortuNama}</span>
                            <span className="text-muted-foreground">({p.ortuEmail})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right print:hidden">
                    {s.parents.length > 0 ? (
                      <a
                        href={`https://wa.me/6281234567890?text=Halo%20Bpk/Ibu%20wali%20dari%20${encodeURIComponent(s.siswaNama)},%20saya%20Wali%20Kelas%20${encodeURIComponent(kelas.nama)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] hover:bg-[#23A559]/30 border border-[#23A559]/40 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Chat Wali Murid
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-amber-200 dark:border-[#F0B232]/30">
                        <AlertCircle className="h-3 w-3" /> Belum Terhubung
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </SchoolLayout>
  );
}
