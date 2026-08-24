import { useState, useDeferredValue, type FormEvent } from "react";
import { Link } from "react-router";
import { Plus, School, BookOpen, ArrowRight, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ADMIN_NAV } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminKelas() {
  const utils = trpc.useUtils();
  const kelasList = trpc.admin.listKelas.useQuery();
  const guruList = trpc.admin.listUsers.useQuery({ role: "guru" });
  const mapelList = trpc.admin.listMapel.useQuery();

  const [openKelas, setOpenKelas] = useState(false);
  const [namaKelas, setNamaKelas] = useState("");
  const [waliId, setWaliId] = useState("");
  const [errKelas, setErrKelas] = useState<string | null>(null);

  const [openMapel, setOpenMapel] = useState(false);
  const [namaMapel, setNamaMapel] = useState("");
  const [errMapel, setErrMapel] = useState<string | null>(null);

  const [searchKelas, setSearchKelas] = useState("");
  const [searchMapel, setSearchMapel] = useState("");
  const deferredSearchKelas = useDeferredValue(searchKelas);
  const deferredSearchMapel = useDeferredValue(searchMapel);

  const createKelas = trpc.admin.createKelas.useMutation({
    onSuccess: async () => {
      await utils.admin.listKelas.invalidate();
      await utils.admin.stats.invalidate();
      setOpenKelas(false);
      setNamaKelas("");
      setWaliId("");
      setErrKelas(null);
      toast.success("Kelas berhasil dibuat");
    },
    onError: (e) => setErrKelas(e.message),
  });

  const createMapel = trpc.admin.createMapel.useMutation({
    onSuccess: async () => {
      await utils.admin.listMapel.invalidate();
      await utils.admin.stats.invalidate();
      setOpenMapel(false);
      setNamaMapel("");
      setErrMapel(null);
      toast.success("Mata pelajaran berhasil ditambahkan");
    },
    onError: (e) => setErrMapel(e.message),
  });

  const submitKelas = (e: FormEvent) => {
    e.preventDefault();
    setErrKelas(null);
    if (!waliId) {
      setErrKelas("Pilih wali kelas terlebih dahulu.");
      return;
    }
    createKelas.mutate({ nama: namaKelas, waliKelasId: Number(waliId) });
  };

  const submitMapel = (e: FormEvent) => {
    e.preventDefault();
    setErrMapel(null);
    createMapel.mutate({ nama: namaMapel });
  };

  const filteredKelas = kelasList.data?.filter(
    (k) =>
      k.nama.toLowerCase().includes(deferredSearchKelas.toLowerCase()) ||
      k.waliNama.toLowerCase().includes(deferredSearchKelas.toLowerCase()),
  );

  const filteredMapel = mapelList.data?.filter((m) =>
    m.nama.toLowerCase().includes(deferredSearchMapel.toLowerCase()),
  );

  return (
    <SchoolLayout role="admin" title="Kelola Kelas & Mapel" nav={ADMIN_NAV}>
      {/* Top Action Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div>
          <h3 className="text-base font-bold font-brand text-foreground">Struktur Akademik</h3>
          <p className="text-xs text-muted-foreground">Buat rombongan belajar baru dan mata pelajaran kurikulum</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Dialog open={openKelas} onOpenChange={setOpenKelas}>
            <DialogTrigger asChild>
              <Button className="h-10 bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#0984E3]/20 px-4">
                <Plus className="mr-1.5 h-4 w-4" /> Buat Kelas Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold font-brand text-foreground">Buat Kelas Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={submitKelas} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-card-foreground">Nama Kelas / Rombel</Label>
                  <Input
                    placeholder="mis. 10 IPA 3"
                    value={namaKelas}
                    onChange={(e) => setNamaKelas(e.target.value)}
                    className="bg-background border-border text-foreground text-sm rounded-xl focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-card-foreground">Wali Kelas (Guru)</Label>
                  <Select value={waliId} onValueChange={setWaliId}>
                    <SelectTrigger className="bg-background border-border text-foreground text-sm rounded-xl">
                      <SelectValue placeholder="Pilih guru sebagai wali kelas" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {guruList.data?.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)} className="focus:bg-secondary focus:text-foreground">
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errKelas && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errKelas}</span>
                  </div>
                )}
                <Button type="submit" className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold h-10" disabled={createKelas.isPending}>
                  {createKelas.isPending ? "Menyimpan..." : "Simpan Kelas"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openMapel} onOpenChange={setOpenMapel}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-10 bg-background border-border text-foreground hover:bg-secondary rounded-xl text-xs font-semibold px-4">
                <Plus className="mr-1.5 h-4 w-4 text-green-600 dark:text-[#57F287]" /> Tambah Mapel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold font-brand text-foreground">Tambah Mata Pelajaran</DialogTitle>
              </DialogHeader>
              <form onSubmit={submitMapel} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-card-foreground">Nama Mata Pelajaran</Label>
                  <Input
                    placeholder="mis. Kimia, Biologi, Sejarah"
                    value={namaMapel}
                    onChange={(e) => setNamaMapel(e.target.value)}
                    className="bg-background border-border text-foreground text-sm rounded-xl focus:border-primary"
                    required
                  />
                </div>
                {errMapel && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-100 dark:bg-[#F23F43]/15 text-red-600 dark:text-[#FF7074] text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errMapel}</span>
                  </div>
                )}
                <Button type="submit" className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold h-10" disabled={createMapel.isPending}>
                  {createMapel.isPending ? "Menyimpan..." : "Simpan Mapel"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Kelas List */}
        <div className="lg:col-span-7">
          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <School className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-bold font-brand text-foreground">
                    Daftar Kelas Aktif
                  </CardTitle>
                </div>

                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter kelas..."
                    value={searchKelas}
                    onChange={(e) => setSearchKelas(e.target.value)}
                    className="h-8 pl-8 bg-background border-border text-foreground text-xs rounded-lg focus:border-primary"
                  />
                </div>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Klik pada kelas untuk melihat detail siswa, guru pengampu, dan jadwal
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {filteredKelas?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searchKelas ? "Tidak ditemukan kelas yang cocok." : "Belum ada kelas yang terdaftar."}
                </p>
              )}
              {filteredKelas?.map((k) => (
                <Link
                  key={k.id}
                  to={`/admin/kelas/${k.id}`}
                  className="group flex items-center justify-between p-4 rounded-xl bg-background border border-border/70 transition-all hover:border-primary hover:bg-secondary/80"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground group-hover:text-blue-600 dark:hover:text-[#70B8FF]">
                        Kelas {k.nama}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Wali: <span className="text-card-foreground font-semibold">{k.waliNama}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30 text-xs font-bold">
                      {k.jumlahSiswa} Siswa
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Mapel List */}
        <div className="lg:col-span-5">
          <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600 dark:text-[#57F287]" />
                  <CardTitle className="text-base font-bold font-brand text-foreground">
                    Mata Pelajaran
                  </CardTitle>
                </div>

                <div className="relative w-full sm:w-40">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter mapel..."
                    value={searchMapel}
                    onChange={(e) => setSearchMapel(e.target.value)}
                    className="h-8 pl-8 bg-background border-border text-foreground text-xs rounded-lg focus:border-primary"
                  />
                </div>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Mapel kurikulum yang dialokasikan ke guru pengampu
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {filteredMapel?.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">
                    {searchMapel ? "Tidak ditemukan mapel." : "Belum ada mata pelajaran."}
                  </p>
                )}
                {filteredMapel?.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-foreground shadow-sm hover:border-primary transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    {m.nama}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SchoolLayout>
  );
}
