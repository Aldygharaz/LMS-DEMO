import { useState, type FormEvent, useDeferredValue } from "react";
import { BookOpen, Plus, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ADMIN_NAV } from "@/lib/nav";
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

export default function AdminMapel() {
  const utils = trpc.useUtils();
  const mapelList = trpc.admin.listMapel.useQuery();
  const [openMapel, setOpenMapel] = useState(false);
  const [namaMapel, setNamaMapel] = useState("");
  const [errMapel, setErrMapel] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const createMapel = trpc.admin.createMapel.useMutation({
    onSuccess: async () => {
      await utils.admin.listMapel.invalidate();
      await utils.admin.stats.invalidate();
      toast.success(`Mata pelajaran "${namaMapel}" berhasil didaftarkan!`);
      setOpenMapel(false);
      setNamaMapel("");
    },
    onError: (e) => setErrMapel(e.message),
  });

  const submitMapel = (e: FormEvent) => {
    e.preventDefault();
    setErrMapel(null);
    createMapel.mutate({ nama: namaMapel });
  };

  const filteredMapel = mapelList.data?.filter((m) =>
    m.nama.toLowerCase().includes(deferredSearch.toLowerCase()),
  );

  return (
    <SchoolLayout role="admin" title="Mata Pelajaran Kurikulum" nav={ADMIN_NAV}>
      {/* Header Info */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-brand text-foreground">
              Katalog Mata Pelajaran
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daftar seluruh mata pelajaran standar kurikulum sekolah yang dapat diampu oleh guru
          </p>
        </div>

        <Dialog open={openMapel} onOpenChange={setOpenMapel}>
          <DialogTrigger asChild>
            <Button className="h-10 bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold shadow-sm px-4">
              <Plus className="mr-1.5 h-4 w-4" /> Tambah Mata Pelajaran
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold font-brand text-foreground">
                Tambah Mata Pelajaran Baru
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submitMapel} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-card-foreground">
                  Nama Mata Pelajaran
                </Label>
                <Input
                  placeholder="mis. Biologi, Sosiologi, Informatika"
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
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold h-10"
                disabled={createMapel.isPending}
              >
                {createMapel.isPending ? "Menyimpan..." : "Simpan Mata Pelajaran"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mapel Grid Card */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Daftar Mata Pelajaran ({filteredMapel?.length ?? 0})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Mata pelajaran aktif yang siap dialokasikan ke rombel
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari mata pelajaran..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl focus:border-primary"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {filteredMapel?.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search
                ? "Tidak ada mata pelajaran yang cocok dengan pencarian."
                : "Belum ada mata pelajaran yang dibuat."}
            </div>
          )}

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMapel?.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-4 rounded-2xl bg-background border border-border shadow-sm hover:border-primary hover:bg-secondary/70 transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{m.nama}</h4>
                  <span className="text-[11px] text-muted-foreground">ID: #{m.id}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </SchoolLayout>
  );
}
