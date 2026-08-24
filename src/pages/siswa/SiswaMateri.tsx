import { useState, useDeferredValue } from "react";
import {
  BookOpen,
  Download,
  Link as LinkIcon,
  Search,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { SISWA_NAV } from "@/lib/nav";
import { downloadBase64, formatTanggalWaktu } from "@/lib/lms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SiswaMateri() {
  const utils = trpc.useUtils();
  const materiQuery = trpc.siswa.listMateri.useQuery();
  const [search, setSearch] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("all");
  const deferredSearch = useDeferredValue(search);
  const [completedIds, setCompletedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("sokara_completed_materi");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleComplete = (id: number) => {
    setCompletedIds((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("sokara_completed_materi", JSON.stringify(updated));
      if (!exists) {
        toast.success("Modul materi ditandai selesai dipelajari!");
      }
      return updated;
    });
  };

  const downloadFile = async (materiId: number) => {
    const f = await utils.siswa.downloadMateriFile.fetch({ materiId });
    downloadBase64(f.fileNama, f.dataBase64, f.fileMime);
  };

  const allMateri = materiQuery.data ?? [];
  const mapelNames = Array.from(new Set(allMateri.map((m) => m.mapelNama)));

  const filtered = allMateri.filter((m) => {
    const matchSearch =
      m.judul.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      m.mapelNama.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      (m.deskripsi?.toLowerCase().includes(deferredSearch.toLowerCase()) ?? false);
    if (!matchSearch) return false;
    if (selectedMapel !== "all" && m.mapelNama !== selectedMapel) return false;
    return true;
  });

  return (
    <SchoolLayout role="siswa" title="Materi & Modul Belajar" nav={SISWA_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            E-Library & Modul Pembelajaran
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Akses materi ajar, slide presentasi guru, dan rangkuman materi per mata pelajaran
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari modul materi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl focus:border-primary"
          />
        </div>
      </div>

      {/* Study Progress Milestone Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-card border border-border shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Progres Belajar Mandiri: {completedIds.length} dari {allMateri.length} Modul Selesai
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {completedIds.length === allMateri.length && allMateri.length > 0
                ? "Luar biasa! Seluruh materi pembelajaran telah selesai Anda pelajari."
                : "Tandai modul ajar setelah selesai dibaca untuk memantau pemahaman materi."}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-48 space-y-1.5 shrink-0">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
            <span>Kesiapan Ujian</span>
            <span className="text-blue-600 dark:text-[#70B8FF]">
              {allMateri.length > 0
                ? Math.round((completedIds.length / allMateri.length) * 100)
                : 100}
              %
            </span>
          </div>
          <div className="h-2 rounded-full bg-background overflow-hidden border border-border">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{
                width: `${
                  allMateri.length > 0
                    ? (completedIds.length / allMateri.length) * 100
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Mapel Filter Pills */}
      <div className="flex items-center gap-2 p-1.5 bg-card rounded-2xl border border-border mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedMapel("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedMapel === "all"
              ? "bg-primary text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          Semua Mapel ({allMateri.length})
        </button>
        {mapelNames.map((nama) => (
          <button
            key={nama}
            type="button"
            onClick={() => setSelectedMapel(nama)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedMapel === nama
                ? "bg-primary text-white shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {nama}
          </button>
        ))}
      </div>

      {/* Materials Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border">
            Tidak ada materi pembelajaran yang ditemukan.
          </div>
        )}

        {filtered.map((m) => {
          const isDone = completedIds.includes(m.id);

          return (
            <div
              key={m.id}
              className={`p-5 rounded-2xl bg-card border transition-all flex flex-col justify-between space-y-4 shadow-lg ${
                isDone
                  ? "border-green-300 dark:border-[#23A559]/50 ring-1 ring-[#23A559]/30"
                  : "border-border hover:border-primary"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                        isDone
                          ? "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287]"
                          : "bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF]"
                      }`}
                    >
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-[#70B8FF] block">
                        {m.mapelNama}
                      </span>
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {m.judul}
                      </h4>
                    </div>
                  </div>

                  {isDone && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30">
                      <CheckCircle2 className="h-3 w-3" />
                      Selesai
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Guru Pengampu: <strong className="text-card-foreground">{m.guruNama}</strong> &bull; {formatTanggalWaktu(m.createdAt)}
                </p>

                {m.deskripsi && (
                  <p className="text-xs text-card-foreground bg-background p-3 rounded-xl border border-border/60 leading-relaxed">
                    {m.deskripsi}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-border/50 space-y-2">
                {m.fileNama && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(m.id)}
                    className="w-full h-8 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Unduh Berkas ({m.fileNama})
                  </Button>
                )}

                {m.linkUrl && (
                  <a
                    href={m.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full h-8 rounded-xl bg-blue-100 dark:bg-primary/15 hover:bg-primary/25 text-blue-600 dark:text-[#70B8FF] text-xs font-semibold border border-blue-200 dark:border-primary/30 transition-colors"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Buka Tautan Materi
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => toggleComplete(m.id)}
                  className={`w-full h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isDone
                      ? "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] hover:bg-[#23A559]/30 border border-[#23A559]/40"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-secondary border border-border"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isDone ? "Telah Dipelajari" : "Tandai Telah Dibaca"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </SchoolLayout>
  );
}
