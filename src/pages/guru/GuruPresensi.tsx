import { useState } from "react";
import {
  CheckCircle2,
  Save,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { GURU_NAV } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function GuruPresensi() {
  const assignments = trpc.guru.myAssignments.useQuery();
  const [selectedKmgId, setSelectedKmgId] = useState<string>("");
  const todayStr = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(todayStr);
  const [records, setRecords] = useState<
    Record<number, { status: "hadir" | "sakit" | "izin" | "alpa"; catatan: string }>
  >({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select first KMG
  const kmgList = assignments.data?.assignments ?? [];
  const currentKmgId = selectedKmgId ? Number(selectedKmgId) : kmgList[0]?.id;

  const presensiQuery = trpc.guru.getPresensi.useQuery(
    { kmgId: currentKmgId ?? 0, tanggal },
    { enabled: !!currentKmgId },
  );

  const saveMut = trpc.guru.savePresensi.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      toast.success("Lembar presensi kelas berhasil disimpan!");
      presensiQuery.refetch();
    },
    onError: (e) => setError(e.message),
  });

  const updateStatus = (siswaId: number, status: "hadir" | "sakit" | "izin" | "alpa") => {
    setRecords((prev) => ({
      ...prev,
      [siswaId]: {
        status,
        catatan: prev[siswaId]?.catatan ?? "",
      },
    }));
  };

  const updateCatatan = (siswaId: number, catatan: string) => {
    setRecords((prev) => ({
      ...prev,
      [siswaId]: {
        status: prev[siswaId]?.status ?? "hadir",
        catatan,
      },
    }));
  };

  const markAllHadir = () => {
    const items = presensiQuery.data?.items ?? [];
    const next: typeof records = {};
    for (const it of items) {
      next[it.siswaId] = {
        status: "hadir",
        catatan: records[it.siswaId]?.catatan ?? "",
      };
    }
    setRecords(next);
  };

  const save = () => {
    if (!currentKmgId) return;
    setError(null);
    const items = presensiQuery.data?.items ?? [];
    const payload = items.map((it) => {
      const rec = records[it.siswaId];
      const rawCatatan = rec ? rec.catatan : it.catatan;
      return {
        siswaId: it.siswaId,
        status: rec ? rec.status : it.status,
        catatan: rawCatatan || undefined,
      };
    });
    saveMut.mutate({
      kmgId: currentKmgId,
      tanggal,
      records: payload,
    });
  };

  return (
    <SchoolLayout role="guru" title="Presensi Kelas" nav={GURU_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Lembar Presensi Sesi Pembelajaran
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rekam status kehadiran siswa harian ("Hadir", "Sakit", "Izin", "Alpa") untuk rombel yang diampu
          </p>
        </div>

        {/* Filter Selection */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={currentKmgId ? String(currentKmgId) : ""}
            onValueChange={(v) => {
              setSelectedKmgId(v);
              setRecords({});
            }}
          >
            <SelectTrigger className="w-56 bg-background border-border text-foreground text-xs rounded-xl h-10">
              <SelectValue placeholder="Pilih Kelas & Mapel" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {kmgList.map((a) => (
                <SelectItem key={a.id} value={String(a.id)} className="text-xs focus:bg-secondary">
                  Kelas {a.kelasNama} - {a.mapelNama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={tanggal}
            onChange={(e) => {
              setTanggal(e.target.value);
              setRecords({});
            }}
            className="w-40 bg-background border-border text-foreground text-xs rounded-xl h-10"
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">
            {presensiQuery.data?.kelasNama} &bull; {presensiQuery.data?.mapelNama}
          </span>
          <span className="text-xs text-muted-foreground">
            ({presensiQuery.data?.items.length ?? 0} Siswa Terdaftar)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={markAllHadir}
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-green-600 dark:text-[#57F287]" />
            Tandai Semua Hadir
          </Button>

          <Button
            size="sm"
            onClick={save}
            disabled={saveMut.isPending}
            className="h-9 bg-primary hover:bg-[#0097E6] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#0984E3]/25 px-5"
          >
            <Save className="mr-1.5 h-4 w-4" />
            {saveMut.isPending ? "Menyimpan..." : "Simpan Presensi"}
          </Button>
        </div>
      </div>

      {presensiQuery.data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-card border border-border text-center">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">Hadir</span>
            <span className="text-lg font-extrabold text-green-600 dark:text-[#57F287]">
              {presensiQuery.data.items.filter((it) => (records[it.siswaId]?.status ?? it.status) === "hadir").length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border text-center">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">Sakit</span>
            <span className="text-lg font-extrabold text-amber-600 dark:text-[#FEE75C]">
              {presensiQuery.data.items.filter((it) => (records[it.siswaId]?.status ?? it.status) === "sakit").length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border text-center">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">Izin</span>
            <span className="text-lg font-extrabold text-blue-600 dark:text-[#70B8FF]">
              {presensiQuery.data.items.filter((it) => (records[it.siswaId]?.status ?? it.status) === "izin").length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border text-center">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">Alpa</span>
            <span className="text-lg font-extrabold text-red-600 dark:text-[#FF7074]">
              {presensiQuery.data.items.filter((it) => (records[it.siswaId]?.status ?? it.status) === "alpa").length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase block">Kehadiran</span>
            <span className="text-lg font-extrabold text-foreground">
              {presensiQuery.data.items.length > 0
                ? Math.round(
                    (presensiQuery.data.items.filter((it) => (records[it.siswaId]?.status ?? it.status) === "hadir").length /
                      presensiQuery.data.items.length) *
                      100,
                  )
                : 0}
              %
            </span>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-green-100 dark:bg-[#23A559]/15 border border-green-200 dark:border-[#23A559]/30 text-xs text-green-600 dark:text-[#57F287]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Presensi tanggal {tanggal} berhasil disimpan dan otomatis tersinkronisasi!</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-100 dark:bg-[#F23F43]/15 border border-red-200 dark:border-[#F23F43]/30 text-xs text-red-600 dark:text-[#FF7074]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Student Attendance List */}
      <div className="space-y-3">
        {presensiQuery.data?.items.map((it, idx) => {
          const currentStatus = records[it.siswaId]?.status ?? it.status;
          const currentCatatan = records[it.siswaId]?.catatan ?? it.catatan;

          return (
            <div
              key={it.siswaId}
              className="p-4 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md hover:border-primary transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-muted-foreground w-5">
                  {idx + 1}.
                </span>
                <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold text-xs">
                  {it.siswaNama.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{it.siswaNama}</h4>
                  <span className="text-[11px] text-muted-foreground">NIS / ID: #{it.siswaId}</span>
                </div>
              </div>

              {/* Status Radio Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { key: "hadir", label: "Hadir", activeCls: "bg-[#23A559] text-white" },
                    { key: "izin", label: "Izin", activeCls: "bg-primary text-white" },
                    { key: "sakit", label: "Sakit", activeCls: "bg-[#F0B232] text-black" },
                    { key: "alpa", label: "Alpa", activeCls: "bg-[#F23F43] text-white" },
                  ] as const
                ).map((st) => {
                  const isSelected = currentStatus === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => updateStatus(it.siswaId, st.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? st.activeCls
                          : "bg-background border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}

                <Input
                  placeholder="Keterangan / catatan izin..."
                  value={currentCatatan}
                  onChange={(e) => updateCatatan(it.siswaId, e.target.value)}
                  className="w-full sm:w-56 h-8 bg-background border-border text-foreground text-xs rounded-lg"
                />
              </div>
            </div>
          );
        })}
      </div>
    </SchoolLayout>
  );
}
