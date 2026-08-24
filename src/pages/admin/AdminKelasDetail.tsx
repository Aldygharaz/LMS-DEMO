import { useState, useDeferredValue, type FormEvent } from "react";
import { useParams, Link } from "react-router";
import {
  Plus,
  Trash2,
  Users,
  BookOpen,
  Calendar,
  ArrowLeft,
  AlertCircle,
  Download,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ADMIN_NAV } from "@/lib/nav";
import { HARI_LIST, exportToCSV, isValidTimeRange } from "@/lib/lms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminKelasDetail() {
  const { id } = useParams<{ id: string }>();
  const kelasId = Number(id);
  const utils = trpc.useUtils();

  const detail = trpc.admin.kelasDetail.useQuery({ kelasId });
  const allSiswa = trpc.admin.listSiswaNotInKelas.useQuery({ kelasId });
  const guruList = trpc.admin.listUsers.useQuery({ role: "guru" });
  const mapelList = trpc.admin.listMapel.useQuery();

  const [siswaId, setSiswaId] = useState("");
  const [mapelId, setMapelId] = useState("");
  const [guruId, setGuruId] = useState("");
  const [jadwalKmgId, setJadwalKmgId] = useState("");
  const [hari, setHari] = useState("");
  const [jamMulai, setJamMulai] = useState("07:00");
  const [jamSelesai, setJamSelesai] = useState("08:30");
  const [error, setError] = useState<string | null>(null);
  const [searchSiswa, setSearchSiswa] = useState("");

  const invalidate = async () => {
    await utils.admin.kelasDetail.invalidate({ kelasId });
    await utils.admin.listSiswaNotInKelas.invalidate({ kelasId });
    await utils.admin.listKelas.invalidate();
  };

  const handleError = (e: { message: string }) => setError(e.message);

  const addSiswa = trpc.admin.addSiswaToKelas.useMutation({
    onSuccess: async () => {
      setSiswaId("");
      await invalidate();
      toast.success("Siswa berhasil dimasukkan ke rombongan belajar!");
    },
    onError: handleError,
  });

  const removeSiswa = trpc.admin.removeSiswaFromKelas.useMutation({
    onSuccess: async () => {
      await invalidate();
      toast.success("Siswa berhasil dikeluarkan dari kelas.");
    },
    onError: handleError,
  });

  const assignGuru = trpc.admin.assignGuru.useMutation({
    onSuccess: async () => {
      setMapelId("");
      setGuruId("");
      await invalidate();
      toast.success("Alokasi guru pengampu mata pelajaran berhasil disimpan!");
    },
    onError: handleError,
  });

  const removePengampu = trpc.admin.removePengampu.useMutation({
    onSuccess: async () => {
      await invalidate();
      toast.success("Alokasi pengampu berhasil dicabut.");
    },
    onError: handleError,
  });

  const addJadwal = trpc.admin.addJadwal.useMutation({
    onSuccess: async () => {
      setJadwalKmgId("");
      setHari("");
      await invalidate();
      toast.success("Sesi jadwal pelajaran berhasil ditambahkan!");
    },
    onError: handleError,
  });

  const removeJadwal = trpc.admin.removeJadwal.useMutation({
    onSuccess: async () => {
      await invalidate();
      toast.success("Sesi jadwal berhasil dihapus.");
    },
    onError: handleError,
  });

  const submitSiswa = (e: FormEvent) => {
    e.preventDefault();
    if (!siswaId) return;
    setError(null);
    addSiswa.mutate({ kelasId, siswaId: Number(siswaId) });
  };

  const submitAssign = (e: FormEvent) => {
    e.preventDefault();
    if (!mapelId || !guruId) return;
    setError(null);
    assignGuru.mutate({
      kelasId,
      mapelId: Number(mapelId),
      guruId: Number(guruId),
    });
  };

  const submitJadwal = (e: FormEvent) => {
    e.preventDefault();
    if (!jadwalKmgId || !hari || !jamMulai || !jamSelesai) return;
    if (!isValidTimeRange(jamMulai, jamSelesai)) {
      setError("Jam selesai harus lebih akhir dari jam mulai.");
      return;
    }
    setError(null);
    addJadwal.mutate({
      kelasMapelGuruId: Number(jadwalKmgId),
      hari: hari as any,
      jamMulai,
      jamSelesai,
    });
  };

  const exportSiswaCSV = () => {
    if (!detail.data) return;
    const { kelas: k, siswaList } = detail.data;
    const headers = ["No", "Nama Siswa", "Email Akun", "Kelas", "Wali Kelas"];
    const rows = siswaList.map((s, idx) => [
      idx + 1,
      s.name,
      s.email,
      `Kelas ${k.nama}`,
      k.waliNama || "-",
    ]);
    exportToCSV(`Daftar_Siswa_Kelas_${k.nama}`, headers, rows);
    toast.success(`Daftar siswa kelas ${k.nama} berhasil diekspor!`);
  };

  const k = detail.data?.kelas;

  const deferredSearchSiswa = useDeferredValue(searchSiswa);
  const filteredSiswaList = detail.data?.siswaList.filter(
    (s) =>
      s.name.toLowerCase().includes(deferredSearchSiswa.toLowerCase()) ||
      s.email.toLowerCase().includes(deferredSearchSiswa.toLowerCase()),
  ) ?? [];

  return (
    <SchoolLayout
      role="admin"
      title={k ? `Kelas ${k.nama}` : "Detail Rombel"}
      nav={ADMIN_NAV}
    >
      {/* Back & Title Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl bg-background border border-border text-foreground hover:bg-secondary"
          >
            <Link to="/admin/kelas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-brand text-foreground">
                Kelas {k?.nama ?? "..."}
              </h2>
              <Badge className="bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border border-blue-200 dark:border-primary/30 text-xs">
                Rombel Aktif
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Wali Kelas:{" "}
              <span className="font-semibold text-foreground">{k?.waliNama}</span> &bull; Total{" "}
              <span className="font-semibold text-green-600 dark:text-[#57F287]">
                {detail.data?.siswaList.length ?? 0} Siswa
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={exportSiswaCSV}
            className="h-10 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Download className="mr-1.5 h-4 w-4 text-[#23A559]" />
            Ekspor Siswa (CSV)
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-100 dark:bg-[#F23F43]/15 border border-red-200 dark:border-[#F23F43]/30 text-xs text-red-600 dark:text-[#FF7074]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="siswa" className="space-y-6">
        <TabsList className="bg-background border border-border p-1 rounded-xl">
          <TabsTrigger
            value="siswa"
            className="data-[state=active]:bg-secondary data-[state=active]:text-foreground rounded-lg text-xs font-semibold py-2 px-4 text-muted-foreground"
          >
            <Users className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-[#70B8FF]" />
            Daftar Siswa ({detail.data?.siswaList.length ?? 0})
          </TabsTrigger>
          <TabsTrigger
            value="pengampu"
            className="data-[state=active]:bg-secondary data-[state=active]:text-foreground rounded-lg text-xs font-semibold py-2 px-4 text-muted-foreground"
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5 text-green-600 dark:text-[#57F287]" />
            Guru & Mapel ({detail.data?.pengampu.length ?? 0})
          </TabsTrigger>
          <TabsTrigger
            value="jadwal"
            className="data-[state=active]:bg-secondary data-[state=active]:text-foreground rounded-lg text-xs font-semibold py-2 px-4 text-muted-foreground"
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5 text-amber-600 dark:text-[#FEE75C]" />
            Jadwal Pelajaran ({detail.data?.jadwalList.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SISWA */}
        <TabsContent value="siswa" className="space-y-6">
          {/* Add Siswa Box */}
          <Card className="bg-card border-border shadow-xl rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold font-brand text-foreground">
                Tambah Siswa ke Kelas Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                onSubmit={submitSiswa}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="flex-1">
                  <Select value={siswaId} onValueChange={setSiswaId}>
                    <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                      <SelectValue placeholder="Pilih siswa yang belum masuk kelas ini" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {allSiswa.data?.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={String(s.id)}
                          className="focus:bg-secondary focus:text-foreground text-xs"
                        >
                          {s.name} ({s.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={addSiswa.isPending || !siswaId}
                  className="bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-semibold h-10 px-5"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {addSiswa.isPending ? "Menambahkan..." : "Tambahkan Siswa"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Siswa Table with Search */}
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xl">
            <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">Anggota Rombel Siswa</h4>
                <p className="text-xs text-muted-foreground">Menampilkan {filteredSiswaList.length} dari {detail.data?.siswaList.length ?? 0} siswa</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari siswa dalam kelas..."
                  value={searchSiswa}
                  onChange={(e) => setSearchSiswa(e.target.value)}
                  className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader className="bg-background sticky top-0 z-10">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Nama Siswa
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                      Email Akun
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {filteredSiswaList.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-8 text-xs text-muted-foreground"
                      >
                        {searchSiswa ? "Tidak ada siswa yang cocok dengan pencarian." : "Belum ada siswa di kelas ini."}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredSiswaList.map((s) => (
                    <TableRow
                      key={s.id}
                      className="hover:bg-secondary/80 transition-colors"
                    >
                      <TableCell className="font-semibold text-foreground text-sm py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                            {s.name.charAt(0)}
                          </div>
                          <span>{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-[#F23F43] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 hover:text-red-600 dark:hover:text-[#FF7074] rounded-lg"
                          disabled={removeSiswa.isPending}
                          onClick={() => {
                            if (confirm(`Keluarkan ${s.name} dari kelas?`)) {
                              removeSiswa.mutate({ kelasId, siswaId: s.id });
                            }
                          }}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: GURU & MAPEL */}
        <TabsContent value="pengampu" className="space-y-6">
          {/* Assign Pengampu Form */}
          <Card className="bg-card border-border shadow-xl rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold font-brand text-foreground">
                Tetapkan Guru Pengampu Mata Pelajaran
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                onSubmit={submitAssign}
                className="grid sm:grid-cols-12 gap-3"
              >
                <div className="sm:col-span-5">
                  <Select value={mapelId} onValueChange={setMapelId}>
                    <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                      <SelectValue placeholder="Pilih Mata Pelajaran" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {mapelList.data?.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={String(m.id)}
                          className="focus:bg-secondary text-xs"
                        >
                          {m.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-5">
                  <Select value={guruId} onValueChange={setGuruId}>
                    <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                      <SelectValue placeholder="Pilih Guru Pengampu" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {guruList.data?.map((g) => (
                        <SelectItem
                          key={g.id}
                          value={String(g.id)}
                          className="focus:bg-secondary text-xs"
                        >
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    disabled={assignGuru.isPending || !mapelId || !guruId}
                    className="w-full bg-[#23A559] hover:bg-[#1f914d] text-white rounded-xl text-xs font-semibold h-10"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Tetapkan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Pengampu List */}
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xl">
            <Table>
              <TableHeader className="bg-background">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                    Mata Pelajaran
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                    Guru Pengampu
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {detail.data?.pengampu.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      Belum ada guru pengampu yang dialokasikan ke kelas ini.
                    </TableCell>
                  </TableRow>
                )}
                {detail.data?.pengampu.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-secondary/80 transition-colors"
                  >
                    <TableCell className="font-semibold text-foreground text-sm py-3.5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span>{p.mapelNama}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-card-foreground">
                      {p.guruNama}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-[#F23F43] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 hover:text-red-600 dark:hover:text-[#FF7074] rounded-lg"
                        disabled={removePengampu.isPending}
                        onClick={() => {
                            if (confirm(`Hapus alokasi ${p.guruNama} untuk mapel ${p.mapelNama}?`)) {
                              removePengampu.mutate({ id: p.id });
                            }
                        }}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus Alokasi
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 3: JADWAL */}
        <TabsContent value="jadwal" className="space-y-6">
          {/* Add Jadwal Form */}
          <Card className="bg-card border-border shadow-xl rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold font-brand text-foreground">
                Tambah Sesi Jadwal Mingguan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={submitJadwal} className="grid sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <Select value={jadwalKmgId} onValueChange={setJadwalKmgId}>
                    <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                      <SelectValue placeholder="Pilih Mapel & Guru" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {detail.data?.pengampu.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={String(p.id)}
                          className="focus:bg-secondary text-xs"
                        >
                          {p.mapelNama} — {p.guruNama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3">
                  <Select value={hari} onValueChange={setHari}>
                    <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                      <SelectValue placeholder="Pilih Hari" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {HARI_LIST.map((h) => (
                        <SelectItem
                          key={h}
                          value={h}
                          className="focus:bg-secondary text-xs"
                        >
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 flex items-center gap-2">
                  <Input
                    type="time"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10 font-mono"
                    required
                  />
                  <span className="text-xs text-muted-foreground">&ndash;</span>
                  <Input
                    type="time"
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10 font-mono"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    disabled={addJadwal.isPending || !jadwalKmgId || !hari}
                    className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-semibold h-10"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Tambah
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Jadwal Table */}
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xl">
            <Table>
              <TableHeader className="bg-background">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                    Hari & Jam
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                    Mata Pelajaran
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                    Guru Pengampu
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {detail.data?.jadwalList.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      Belum ada sesi jadwal yang ditentukan.
                    </TableCell>
                  </TableRow>
                )}
                {detail.data?.jadwalList.map((j) => (
                  <TableRow
                    key={j.id}
                    className="hover:bg-secondary/80 transition-colors"
                  >
                    <TableCell className="font-semibold text-foreground text-sm py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{j.hari},</span>
                        <span className="font-mono text-xs text-green-600 dark:text-[#57F287] bg-green-100 dark:bg-[#23A559]/10 px-2 py-0.5 rounded border border-green-200 dark:border-[#23A559]/20">
                          {j.jamMulai} &ndash; {j.jamSelesai}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {j.mapelNama}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {j.guruNama}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-[#F23F43] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 hover:text-red-600 dark:hover:text-[#FF7074] rounded-lg"
                        disabled={removeJadwal.isPending}
                        onClick={() => {
                          if (confirm(`Hapus jadwal ${j.mapelNama} pada ${j.hari} jam ${j.jamMulai}?`)) {
                            removeJadwal.mutate({ id: j.id });
                          }
                        }}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </SchoolLayout>
  );
}
