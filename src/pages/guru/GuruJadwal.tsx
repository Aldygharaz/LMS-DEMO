import { useState } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CalendarOff,
  Download,
  Printer,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { GURU_NAV } from "@/lib/nav";
import { ScheduleCard } from "@/components/lms-shared";
import { hariIni, exportToCSV, isValidTimeRange } from "@/lib/lms";
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

export default function GuruJadwal() {
  const [activeTab, setActiveTab] = useState<"reguler" | "pengganti" | "libur">("reguler");
  const schedule = trpc.guru.mySchedule.useQuery();
  const kmgList = trpc.guru.myKelasMapel.useQuery();
  const holidaysQuery = trpc.guru.listHariLibur.useQuery();
  const makeUpClassesQuery = trpc.guru.myKelasPengganti.useQuery();

  const today = hariIni();
  const totalSesi = schedule.data?.length ?? 0;
  const sesiHariIni = schedule.data?.filter((s) => s.hari === today) ?? [];

  // Mutations
  const utils = trpc.useUtils();
  const createMakeUpMutation = trpc.guru.createKelasPengganti.useMutation({
    onSuccess: () => {
      utils.guru.myKelasPengganti.invalidate();
      toast.success("Sesi kelas pengganti berhasil dijadwalkan!");
      setIsCreateOpen(false);
      setNewMakeUp({
        kelasMapelGuruId: 0,
        tanggalAsli: "",
        tanggalPengganti: "",
        jamMulai: "09:00",
        jamSelesai: "10:30",
        ruang: "Ruang Kelas",
        alasan: "",
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.guru.updateKelasPengganti.useMutation({
    onSuccess: () => {
      utils.guru.myKelasPengganti.invalidate();
      toast.success("Status sesi pengganti diperbarui.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMakeUpMutation = trpc.guru.deleteKelasPengganti.useMutation({
    onSuccess: () => {
      utils.guru.myKelasPengganti.invalidate();
      toast.success("Sesi pengganti berhasil dihapus.");
    },
    onError: (err) => toast.error(err.message),
  });

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMakeUp, setNewMakeUp] = useState<{
    kelasMapelGuruId: number;
    tanggalAsli: string;
    tanggalPengganti: string;
    jamMulai: string;
    jamSelesai: string;
    ruang: string;
    alasan: string;
  }>({
    kelasMapelGuruId: 0,
    tanggalAsli: "",
    tanggalPengganti: "",
    jamMulai: "09:00",
    jamSelesai: "10:30",
    ruang: "Ruang Kelas",
    alasan: "",
  });

  const handleSaveMakeUp = () => {
    if (!isValidTimeRange(newMakeUp.jamMulai, newMakeUp.jamSelesai)) {
      toast.error("Jam selesai harus lebih akhir dari jam mulai.");
      return;
    }
    createMakeUpMutation.mutate(newMakeUp);
  };

  const exportPenggantiCSV = () => {
    const list = makeUpClassesQuery.data ?? [];
    if (list.length === 0) {
      toast.error("Tidak ada sesi pengganti untuk diekspor.");
      return;
    }
    const headers = [
      "No",
      "Kelas",
      "Mata Pelajaran",
      "Tanggal Asli (Libur)",
      "Tanggal Pengganti",
      "Jam Mulai",
      "Jam Selesai",
      "Ruang",
      "Alasan",
      "Status",
    ];
    const rows = list.map((m, idx) => [
      idx + 1,
      `Kelas ${m.kelasNama}`,
      m.mapelNama,
      m.tanggalAsli,
      m.tanggalPengganti,
      m.jamMulai,
      m.jamSelesai,
      m.ruang || "-",
      m.alasan || "-",
      m.status,
    ]);
    exportToCSV("Sesi_Kelas_Pengganti_Guru", headers, rows);
    toast.success("Daftar sesi pengganti berhasil diekspor!");
  };

  return (
    <SchoolLayout role="guru" title="Jadwal Mengajar & Sesi Pengganti" nav={GURU_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Agenda Mengajar &amp; Sesi Pengganti
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola jadwal tatap muka mingguan, sesuaikan kelas pengganti saat libur, dan pantau kalender sekolah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 bg-primary hover:bg-[#0873c4] text-white text-xs font-bold rounded-xl shadow-md">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Jadwalkan Sesi Pengganti
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold font-brand text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-[#70B8FF]" />
                  Jadwalkan Sesi Kelas Pengganti
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Rombel &amp; Mata Pelajaran *</Label>
                  <Select
                    value={newMakeUp.kelasMapelGuruId ? String(newMakeUp.kelasMapelGuruId) : ""}
                    onValueChange={(v) => setNewMakeUp({ ...newMakeUp, kelasMapelGuruId: Number(v) })}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                      <SelectValue placeholder="Pilih Kelas & Mapel" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {kmgList.data?.map((k) => (
                        <SelectItem key={k.id} value={String(k.id)} className="text-xs focus:bg-secondary">
                          Kelas {k.kelasNama} &mdash; {k.mapelNama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Tanggal Asli (Libur) *</Label>
                    <Input
                      type="date"
                      value={newMakeUp.tanggalAsli}
                      onChange={(e) => setNewMakeUp({ ...newMakeUp, tanggalAsli: e.target.value })}
                      className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Tanggal Pengganti *</Label>
                    <Input
                      type="date"
                      value={newMakeUp.tanggalPengganti}
                      onChange={(e) => setNewMakeUp({ ...newMakeUp, tanggalPengganti: e.target.value })}
                      className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Jam Mulai *</Label>
                    <Input
                      type="time"
                      value={newMakeUp.jamMulai}
                      onChange={(e) => setNewMakeUp({ ...newMakeUp, jamMulai: e.target.value })}
                      className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Jam Selesai *</Label>
                    <Input
                      type="time"
                      value={newMakeUp.jamSelesai}
                      onChange={(e) => setNewMakeUp({ ...newMakeUp, jamSelesai: e.target.value })}
                      className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Ruang / Lokasi Kelas</Label>
                  <Input
                    placeholder="Contoh: Ruang Kelas 10 IPA 1 / Lab Komputer"
                    value={newMakeUp.ruang}
                    onChange={(e) => setNewMakeUp({ ...newMakeUp, ruang: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Alasan / Keterangan</Label>
                  <Textarea
                    placeholder="Contoh: Pengganti sesi tatap muka yang terbentur Libur Nasional..."
                    value={newMakeUp.alasan}
                    onChange={(e) => setNewMakeUp({ ...newMakeUp, alasan: e.target.value })}
                    className="bg-background border-border text-foreground text-xs rounded-xl min-h-[60px]"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={
                    !newMakeUp.kelasMapelGuruId ||
                    !newMakeUp.tanggalAsli ||
                    !newMakeUp.tanggalPengganti ||
                    createMakeUpMutation.isPending
                  }
                  onClick={handleSaveMakeUp}
                  className="bg-primary hover:bg-[#0873c4] text-white text-xs font-bold rounded-xl"
                >
                  {createMakeUpMutation.isPending ? "Menyimpan..." : "Jadwalkan Sesi"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6 print:hidden">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Sesi Hari Ini ({today})
          </span>
          <p className="text-lg font-bold text-green-600 dark:text-[#57F287] mt-0.5">
            {sesiHariIni.length} Sesi Mengajar
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Total Sesi Mingguan
          </span>
          <p className="text-lg font-bold text-foreground mt-0.5">
            {totalSesi} Sesi Reguler
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Sesi Pengganti Aktif
          </span>
          <p className="text-lg font-bold text-blue-600 dark:text-[#70B8FF] mt-0.5">
            {makeUpClassesQuery.data?.filter((m) => m.status === "dijadwalkan").length ?? 0} Sesi
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Hari Libur Terdaftar
          </span>
          <p className="text-lg font-bold text-amber-600 dark:text-[#FEE75C] mt-0.5">
            {holidaysQuery.data?.length ?? 0} Hari Libur
          </p>
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
          Jadwal Mengajar Reguler
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
        <ScheduleCard
          items={schedule.data ?? []}
          showKelas
          title="Jadwal Mengajar Lengkap (Senin – Sabtu)"
        />
      )}

      {/* TAB 2: SESI KELAS PENGGANTI */}
      {activeTab === "pengganti" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Manajemen Sesi Kelas Pengganti Guru
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Jadwalkan sesi kompensasi tatap muka jika jam pelajaran Anda terbentur hari libur nasional atau cuti bersama.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={exportPenggantiCSV}
              className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl shrink-0"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-[#23A559]" />
              Ekspor CSV
            </Button>
          </div>

          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Daftar Sesi Pengganti yang Anda Jadwalkan
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Notifikasi sesi ini otomatis dikirimkan ke portal siswa dan orang tua murid
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
                      Sesi Asli (Libur)
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Waktu Pengganti
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Ruang &amp; Alasan
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {makeUpClassesQuery.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                        Belum ada sesi kelas pengganti yang dijadwalkan.
                      </TableCell>
                    </TableRow>
                  )}
                  {makeUpClassesQuery.data?.map((m) => (
                    <TableRow key={m.id} className="hover:bg-secondary/80 transition-colors">
                      <TableCell className="py-3.5">
                        <p className="text-sm font-bold text-foreground">{m.mapelNama}</p>
                        <span className="text-xs text-blue-600 dark:text-[#70B8FF] font-semibold">Kelas {m.kelasNama}</span>
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
                      <TableCell>
                        <Select
                          value={m.status}
                          onValueChange={(val: "dijadwalkan" | "selesai" | "dibatalkan") =>
                            updateStatusMutation.mutate({ id: m.id, status: val })
                          }
                        >
                          <SelectTrigger
                            className={`h-7 text-[11px] font-bold rounded-lg border w-28 ${
                              m.status === "selesai"
                                ? "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border-green-200 dark:border-[#23A559]/30"
                                : m.status === "dibatalkan"
                                ? "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border-red-200 dark:border-[#F23F43]/30"
                                : "bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border-blue-200 dark:border-primary/30"
                            }`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground">
                            <SelectItem value="dijadwalkan" className="text-xs focus:bg-secondary">
                              Dijadwalkan
                            </SelectItem>
                            <SelectItem value="selesai" className="text-xs focus:bg-secondary">
                              Selesai
                            </SelectItem>
                            <SelectItem value="dibatalkan" className="text-xs focus:bg-secondary">
                              Dibatalkan
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Hapus sesi pengganti ${m.mapelNama} (${m.tanggalPengganti})?`)) {
                              deleteMakeUpMutation.mutate({ id: m.id });
                            }
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 dark:hover:text-[#FF7074] hover:bg-[#F23F43]/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                Daftar hari libur resmi yang ditetapkan oleh Admin Sekolah. Pembelajaran tatap muka diliburkan pada tanggal-tanggal berikut.
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
