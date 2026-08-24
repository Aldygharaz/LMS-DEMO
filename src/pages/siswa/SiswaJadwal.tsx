import { useState } from "react";
import {
  Printer,
  Download,
  Calendar,
  Users,
  Clock,
  CalendarOff,
  MapPin,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { SISWA_NAV } from "@/lib/nav";
import { HARI_LIST, hariIni, exportToCSV } from "@/lib/lms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const HOLIDAY_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  nasional: {
    label: "Libur Nasional",
    cls: "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border-red-200 dark:border-[#F23F43]/30",
  },
  cuti_bersama: {
    label: "Cuti Bersama",
    cls: "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border-amber-200 dark:border-[#F0B232]/30",
  },
  sekolah: {
    label: "Libur Khusus Sekolah",
    cls: "bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border-blue-200 dark:border-primary/30",
  },
};

export default function SiswaJadwal() {
  const [activeTab, setActiveTab] = useState<"reguler" | "pengganti" | "libur">("reguler");
  const overview = trpc.siswa.dashboard.useQuery();
  const holidaysQuery = trpc.siswa.listHariLibur.useQuery();
  const makeUpClassesQuery = trpc.siswa.myKelasPengganti.useQuery();

  const [selectedHari, setSelectedHari] = useState<string>("all");
  const today = hariIni();
  const jadwalList = overview.data?.jadwalList ?? [];
  const sesiHariIni = jadwalList.filter((j) => j.hari === today);

  const exportJadwalCSV = () => {
    if (jadwalList.length === 0) {
      toast.error("Tidak ada data jadwal pelajaran untuk diekspor.");
      return;
    }
    const headers = ["No", "Hari", "Jam Mulai", "Jam Selesai", "Mata Pelajaran", "Guru Pengampu"];
    const rows = jadwalList.map((j, idx) => [
      idx + 1,
      j.hari,
      j.jamMulai,
      j.jamSelesai,
      j.mapelNama,
      j.guruNama,
    ]);
    exportToCSV("Jadwal_Pelajaran_Kelas_Saya", headers, rows);
    toast.success("Jadwal pelajaran berhasil diekspor ke CSV!");
  };

  const displayedDays = selectedHari === "all" ? HARI_LIST : [selectedHari];

  return (
    <SchoolLayout role="siswa" title="Jadwal Pelajaran & Sesi Pengganti" nav={SISWA_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Jadwal Pelajaran &amp; Sesi Pengganti
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Jadwal tatap muka kelas, sesi kelas pengganti saat libur, dan kalender akademik sekolah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={exportJadwalCSV}
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-[#23A559]" />
            Ekspor CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-[#70B8FF]" />
            Cetak Jadwal
          </Button>

          <div className="px-3.5 py-1.5 rounded-xl bg-background border border-border text-center">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">Hari Ini ({today})</span>
            <span className="text-xs font-bold text-green-600 dark:text-[#57F287]">{sesiHariIni.length} Mapel</span>
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-card rounded-2xl border border-border mb-6 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("reguler")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "reguler"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Jadwal Reguler Mingguan
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pengganti")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "pengganti"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          Sesi Kelas Pengganti ({makeUpClassesQuery.data?.length ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("libur")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "libur"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarOff className="h-4 w-4" />
          Kalender Libur Sekolah ({holidaysQuery.data?.length ?? 0})
        </button>
      </div>

      {/* TAB 1: JADWAL REGULER */}
      {activeTab === "reguler" && (
        <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-bold font-brand text-foreground">
                    Jadwal Mingguan Lengkap
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Waktu tatap muka dan pengampu mata pelajaran aktif
                  </p>
                </div>
              </div>

              {/* Day Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-background border border-border rounded-xl print:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedHari("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedHari === "all"
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua Hari
                </button>
                {HARI_LIST.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelectedHari(h)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedHari === h
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {jadwalList.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Belum ada jadwal pelajaran yang ditentukan untuk kelas Anda.
              </div>
            )}

            {displayedDays.map((hari) => {
              const rows = jadwalList
                .filter((j) => j.hari === hari)
                .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
              if (rows.length === 0) return null;
              const isToday = hari === today;

              return (
                <div
                  key={hari}
                  className={`rounded-2xl p-4 border transition-colors ${
                    isToday
                      ? "bg-secondary/70 border-primary/60 shadow-lg ring-1 ring-primary/30"
                      : "bg-background border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          isToday ? "text-blue-600 dark:text-[#70B8FF]" : "text-foreground"
                        }`}
                      >
                        {hari}
                      </span>
                      {isToday && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{rows.length} Sesi Belajar</span>
                  </div>

                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {rows.map((j) => {
                      const now = new Date();
                      const nowMin = now.getHours() * 60 + now.getMinutes();
                      const [sH = 0, sM = 0] = j.jamMulai.split(":").map(Number);
                      const [eH = 0, eM = 0] = j.jamSelesai.split(":").map(Number);
                      const isLiveNow = isToday && nowMin >= sH * 60 + sM && nowMin <= eH * 60 + eM;

                      return (
                        <div
                          key={j.id}
                          className={`p-3.5 rounded-xl border space-y-1.5 transition-all ${
                            isLiveNow
                              ? "bg-green-100 dark:bg-[#23A559]/15 border-[#23A559] ring-1 ring-[#57F287] shadow-md"
                              : "bg-card border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-foreground">{j.mapelNama}</span>
                              {isLiveNow && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-[#23A559] text-white animate-pulse">
                                  Sedang Berlangsung
                                </span>
                              )}
                            </div>
                            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
                              isLiveNow
                                ? "text-green-600 dark:text-[#57F287] bg-green-100 dark:bg-[#23A559]/20 border-[#23A559]/40 font-extrabold"
                                : "text-green-600 dark:text-[#57F287] bg-green-100 dark:bg-[#23A559]/10 border-green-200 dark:border-[#23A559]/20 font-semibold"
                            }`}>
                              {j.jamMulai}–{j.jamSelesai}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {j.guruNama}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: SESI KELAS PENGGANTI */}
      {activeTab === "pengganti" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-lg flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Sesi Kelas Pengganti Terjadwal
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Sesi tambahan yang dijadwalkan oleh bapak/ibu guru untuk menggantikan jam tatap muka yang terbentur hari libur.
              </p>
            </div>
          </div>

          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Daftar Sesi Pengganti Kelas Anda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[550px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader className="bg-background sticky top-0 z-10">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Mata Pelajaran &amp; Guru
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Sesi Asli (Libur)
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Waktu Pengganti
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Ruang &amp; Keterangan
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {makeUpClassesQuery.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                        Tidak ada sesi kelas pengganti yang dijadwalkan untuk kelas Anda.
                      </TableCell>
                    </TableRow>
                  )}
                  {makeUpClassesQuery.data?.map((m) => (
                    <TableRow key={m.id} className="hover:bg-secondary/80 transition-colors">
                      <TableCell className="py-3.5">
                        <p className="text-sm font-bold text-foreground">{m.mapelNama}</p>
                        <p className="text-xs text-muted-foreground">{m.guruNama}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-red-600 dark:text-[#FF7074]">
                        {m.tanggalAsli}
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs font-bold text-green-600 dark:text-[#57F287]">{m.tanggalPengganti}</p>
                        <p className="text-[11px] text-muted-foreground">{m.jamMulai} - {m.jamSelesai} WIB</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-600 dark:text-[#70B8FF]" />
                          {m.ruang || "Ruang Kelas"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs">{m.alasan || "Pengganti sesi libur"}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            m.status === "selesai"
                              ? "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border-green-200 dark:border-[#23A559]/30"
                              : m.status === "dibatalkan"
                              ? "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border-red-200 dark:border-[#F23F43]/30"
                              : "bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border-blue-200 dark:border-primary/30"
                          }`}
                        >
                          {m.status === "selesai"
                            ? "Selesai"
                            : m.status === "dibatalkan"
                            ? "Dibatalkan"
                            : "Wajib Hadir"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: KALENDER LIBUR SEKOLAH */}
      {activeTab === "libur" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-lg flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] flex items-center justify-center font-bold">
              <CalendarOff className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Kalender Hari Libur &amp; Cuti Sekolah
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Daftar hari libur resmi sekolah dan cuti bersama di mana kegiatan pembelajaran tatap muka ditiadakan.
              </p>
            </div>
          </div>

          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Daftar Hari Libur Nasional &amp; Sekolah
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[550px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader className="bg-background sticky top-0 z-10">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Tanggal
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Nama Hari Libur
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Kategori Tipe
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Keterangan
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {holidaysQuery.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-xs text-muted-foreground">
                        Belum ada data hari libur.
                      </TableCell>
                    </TableRow>
                  )}
                  {holidaysQuery.data?.map((h) => {
                    const badge = HOLIDAY_TYPE_BADGE[h.tipe] ?? HOLIDAY_TYPE_BADGE.nasional;
                    return (
                      <TableRow key={h.id} className="hover:bg-secondary/80 transition-colors">
                        <TableCell className="font-mono text-xs text-foreground font-bold py-3.5">
                          {h.tanggal}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-foreground">
                          {h.nama}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {h.keterangan || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </SchoolLayout>
  );
}
