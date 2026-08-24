import { useState } from "react";
import {
  Calendar,
  Users,
  Download,
  Printer,
  Plus,
  Trash2,
  Clock,
  CalendarOff,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ADMIN_NAV } from "@/lib/nav";
import { HARI_LIST, hariIni, exportToCSV } from "@/lib/lms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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

export default function AdminJadwal() {
  const [activeTab, setActiveTab] = useState<"jadwal" | "libur" | "pengganti">("jadwal");
  const kelasList = trpc.admin.listKelas.useQuery();
  const [selectedKelasId, setSelectedKelasId] = useState<string>("all");
  const [selectedHari, setSelectedHari] = useState<string>("all");

  const today = hariIni();
  const kId = selectedKelasId === "all" ? 1 : Number(selectedKelasId);
  const detail = trpc.admin.kelasDetail.useQuery(
    { kelasId: kId },
    { enabled: !!kId },
  );

  // Queries for holidays and make-up classes
  const holidaysQuery = trpc.admin.listHariLibur.useQuery();
  const makeUpClassesQuery = trpc.admin.listKelasPengganti.useQuery();

  // Mutations
  const utils = trpc.useUtils();
  const createHolidayMutation = trpc.admin.createHariLibur.useMutation({
    onSuccess: () => {
      utils.admin.listHariLibur.invalidate();
      toast.success("Hari libur berhasil ditambahkan ke kalender akademik.");
      setIsCreateHolidayOpen(false);
      setNewHoliday({ tanggal: "", nama: "", keterangan: "", tipe: "nasional" });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteHolidayMutation = trpc.admin.deleteHariLibur.useMutation({
    onSuccess: () => {
      utils.admin.listHariLibur.invalidate();
      toast.success("Hari libur berhasil dihapus.");
    },
    onError: (err) => toast.error(err.message),
  });

  // Modal form states
  const [isCreateHolidayOpen, setIsCreateHolidayOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState<{
    tanggal: string;
    nama: string;
    keterangan: string;
    tipe: "nasional" | "sekolah" | "cuti_bersama";
  }>({
    tanggal: "",
    nama: "",
    keterangan: "",
    tipe: "nasional",
  });

  const exportJadwalCSV = () => {
    if (!detail.data || detail.data.jadwalList.length === 0) {
      toast.error("Tidak ada sesi jadwal untuk rombel ini.");
      return;
    }
    const { kelas: k, jadwalList } = detail.data;
    const headers = ["No", "Hari", "Jam Mulai", "Jam Selesai", "Mata Pelajaran", "Guru Pengampu", "Kelas"];
    const rows = jadwalList.map((j, idx) => [
      idx + 1,
      j.hari,
      j.jamMulai,
      j.jamSelesai,
      j.mapelNama,
      j.guruNama,
      `Kelas ${k.nama}`,
    ]);
    exportToCSV(`Jadwal_Pelajaran_Kelas_${k.nama}`, headers, rows);
    toast.success(`Jadwal pelajaran kelas ${k.nama} berhasil diekspor!`);
  };

  const exportHolidaysCSV = () => {
    const holidays = holidaysQuery.data ?? [];
    if (holidays.length === 0) {
      toast.error("Tidak ada data hari libur untuk diekspor.");
      return;
    }
    const headers = ["No", "Tanggal", "Nama Hari Libur", "Kategori Tipe", "Keterangan"];
    const rows = holidays.map((h, idx) => [
      idx + 1,
      h.tanggal,
      h.nama,
      HOLIDAY_TYPE_BADGE[h.tipe]?.label ?? h.tipe,
      h.keterangan || "-",
    ]);
    exportToCSV("Kalender_Hari_Libur_Sekolah", headers, rows);
    toast.success("Kalender hari libur berhasil diekspor!");
  };

  const displayedDays = selectedHari === "all" ? HARI_LIST : [selectedHari];

  return (
    <SchoolLayout role="admin" title="Master Jadwal & Kalender Libur" nav={ADMIN_NAV}>
      {/* Header Info */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Master Jadwal &amp; Kalender Akademik
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola jadwal reguler, kalender hari libur nasional, dan pantau sesi kelas pengganti
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === "libur" && (
            <Dialog open={isCreateHolidayOpen} onOpenChange={setIsCreateHolidayOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 bg-primary hover:bg-[#0873c4] text-white text-xs font-bold rounded-xl shadow-md">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Tambah Hari Libur
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold font-brand text-foreground flex items-center gap-2">
                    <CalendarOff className="h-5 w-5 text-red-600 dark:text-[#FF7074]" />
                    Tambah Hari Libur / Cuti Bersama
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Tanggal Libur *</Label>
                    <Input
                      type="date"
                      value={newHoliday.tanggal}
                      onChange={(e) => setNewHoliday({ ...newHoliday, tanggal: e.target.value })}
                      className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Nama Hari Libur *</Label>
                    <Input
                      placeholder="Contoh: HUT RI Ke-81 / Libur Awal Ramadhan"
                      value={newHoliday.nama}
                      onChange={(e) => setNewHoliday({ ...newHoliday, nama: e.target.value })}
                      className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Kategori Tipe Libur</Label>
                    <Select
                      value={newHoliday.tipe}
                      onValueChange={(val: "nasional" | "sekolah" | "cuti_bersama") =>
                        setNewHoliday({ ...newHoliday, tipe: val })
                      }
                    >
                      <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="nasional" className="text-xs focus:bg-secondary">
                          Libur Nasional (SKB 3 Menteri)
                        </SelectItem>
                        <SelectItem value="cuti_bersama" className="text-xs focus:bg-secondary">
                          Cuti Bersama Pemerintah
                        </SelectItem>
                        <SelectItem value="sekolah" className="text-xs focus:bg-secondary">
                          Libur Khusus Kalender Sekolah
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Keterangan / Edaran</Label>
                    <Textarea
                      placeholder="Catatan tambahan mengenai kegiatan belajar mengajar..."
                      value={newHoliday.keterangan}
                      onChange={(e) => setNewHoliday({ ...newHoliday, keterangan: e.target.value })}
                      className="bg-background border-border text-foreground text-xs rounded-xl min-h-[70px]"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreateHolidayOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    disabled={!newHoliday.tanggal || !newHoliday.nama || createHolidayMutation.isPending}
                    onClick={() => createHolidayMutation.mutate(newHoliday)}
                    className="bg-primary hover:bg-[#0873c4] text-white text-xs font-bold rounded-xl"
                  >
                    {createHolidayMutation.isPending ? "Menyimpan..." : "Simpan Hari Libur"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {activeTab === "jadwal" && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Rombel:</span>
                <Select value={selectedKelasId} onValueChange={setSelectedKelasId}>
                  <SelectTrigger className="w-44 bg-background border-border text-foreground text-xs rounded-xl h-9">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {kelasList.data?.map((k) => (
                      <SelectItem key={k.id} value={String(k.id)} className="text-xs focus:bg-secondary">
                        Kelas {k.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={exportJadwalCSV}
                className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-[#23A559]" />
                Ekspor CSV
              </Button>
            </>
          )}

          {activeTab === "libur" && (
            <Button
              type="button"
              variant="outline"
              onClick={exportHolidaysCSV}
              className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-[#23A559]" />
              Ekspor Kalender Libur
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-[#70B8FF]" />
            Cetak
          </Button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-card rounded-2xl border border-border mb-6 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("jadwal")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "jadwal"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Master Jadwal Rombel
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
      </div>

      {/* TAB 1: MASTER JADWAL ROMBEL */}
      {activeTab === "jadwal" && (
        <div className="space-y-6">
          {/* Schedule Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 print:hidden">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Rombel Terpilih
              </span>
              <p className="text-lg font-bold text-foreground mt-0.5">
                Kelas {detail.data?.kelas.nama ?? "..."}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Total Sesi Mingguan
              </span>
              <p className="text-lg font-bold text-blue-600 dark:text-[#70B8FF] mt-0.5">
                {detail.data?.jadwalList.length ?? 0} Sesi
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Wali Kelas
              </span>
              <p className="text-xs font-bold text-green-600 dark:text-[#57F287] mt-1 line-clamp-1">
                {detail.data?.kelas.waliNama ?? "—"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Jumlah Siswa
              </span>
              <p className="text-lg font-bold text-amber-600 dark:text-[#FEE75C] mt-0.5">
                {detail.data?.siswaList.length ?? 0} Siswa
              </p>
            </div>
          </div>

          {/* Schedule Timetable Display with Day Filter Chips */}
          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base font-bold font-brand text-foreground">
                      Jadwal Pelajaran: Kelas {detail.data?.kelas.nama ?? "..."}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Wali Kelas: <strong className="text-foreground ml-1">{detail.data?.kelas.waliNama ?? "—"}</strong>
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
              {detail.data?.jadwalList.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Belum ada jadwal yang ditentukan untuk kelas ini. Atur di menu{" "}
                  <strong>Kelola Kelas &rarr; Detail Kelas</strong>.
                </div>
              )}

              {displayedDays.map((hari) => {
                const rows = (detail.data?.jadwalList ?? [])
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
                      <span className="text-xs text-muted-foreground">{rows.length} Sesi Pembelajaran</span>
                    </div>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {rows.map((j) => (
                        <div
                          key={j.id}
                          className="p-3 rounded-xl bg-card border border-border space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">{j.mapelNama}</span>
                            <span className="font-mono text-xs text-green-600 dark:text-[#57F287] bg-green-100 dark:bg-[#23A559]/10 px-2 py-0.5 rounded border border-green-200 dark:border-[#23A559]/20">
                              {j.jamMulai}–{j.jamSelesai}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {j.guruNama}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: KALENDER LIBUR SEKOLAH */}
      {activeTab === "libur" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-lg flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] flex items-center justify-center font-bold">
              <CalendarOff className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Kalender Hari Libur &amp; Cuti Akademik
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Setiap sesi KBM yang jatuh pada tanggal libur otomatis dibebaskan dari presensi reguler dan dapat dijadwalkan Sesi Pengganti oleh guru pengampu.
              </p>
            </div>
          </div>

          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Daftar Hari Libur Nasional &amp; Sekolah
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {holidaysQuery.data?.length ?? 0} Hari Libur Terdaftar dalam Kalender Akademik
              </CardDescription>
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
                      Keterangan / Edaran
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {holidaysQuery.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                        Belum ada hari libur yang ditambahkan.
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
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {h.keterangan || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Hapus hari libur "${h.nama}"?`)) {
                                deleteHolidayMutation.mutate({ id: h.id });
                              }
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 dark:hover:text-[#FF7074] hover:bg-[#F23F43]/10 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* TAB 3: MONITORING SESI KELAS PENGGANTI */}
      {activeTab === "pengganti" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-lg flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Monitoring Sesi Kelas Pengganti (Make-up Classes)
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Daftar sesi tambahan yang dijadwalkan oleh dewan guru untuk mengganti jam tatap muka yang terbentur hari libur atau cuti bersama.
              </p>
            </div>
          </div>

          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Daftar Sesi Pengganti Terjadwal
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {makeUpClassesQuery.data?.length ?? 0} Sesi Terjadwal di Seluruh Rombel
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 max-h-[550px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader className="bg-background sticky top-0 z-10">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Rombel &amp; Mapel
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Guru Pengampu
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Tanggal Asli (Libur)
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Jadwal Pengganti
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Ruang &amp; Alasan
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {makeUpClassesQuery.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                        Belum ada guru yang menjadwalkan sesi kelas pengganti.
                      </TableCell>
                    </TableRow>
                  )}
                  {makeUpClassesQuery.data?.map((m) => (
                    <TableRow key={m.id} className="hover:bg-secondary/80 transition-colors">
                      <TableCell className="py-3.5">
                        <p className="text-sm font-bold text-foreground">{m.mapelNama}</p>
                        <span className="text-xs text-blue-600 dark:text-[#70B8FF] font-semibold">Kelas {m.kelasNama}</span>
                      </TableCell>
                      <TableCell className="text-xs text-card-foreground">
                        {m.guruNama}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-red-600 dark:text-[#FF7074]">
                        {m.tanggalAsli}
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs font-bold text-green-600 dark:text-[#57F287]">{m.tanggalPengganti}</p>
                        <p className="text-[11px] text-muted-foreground">{m.jamMulai} - {m.jamSelesai} WIB</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">{m.ruang || "Ruang Kelas"}</p>
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
                            : "Dijadwalkan"}
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
    </SchoolLayout>
  );
}
