import { Link } from "react-router";
import { BookOpen, ClipboardCheck, ArrowRight, CheckCircle2, Search } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { GURU_NAV } from "@/lib/nav";
import { useState, useDeferredValue } from "react";
import { Input } from "@/components/ui/input";

export default function GuruKelasList() {
  const assignments = trpc.guru.myAssignments.useQuery();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filtered = assignments.data?.assignments.filter(
    (a) =>
      a.mapelNama.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      a.kelasNama.toLowerCase().includes(deferredSearch.toLowerCase()),
  );

  return (
    <SchoolLayout role="guru" title="Kelas & Penugasan" nav={GURU_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Rombongan Belajar & Penugasan Mapel
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pilih kelas untuk membuat tugas baru, mengunggah materi, dan memeriksa lembar kerja siswa
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter kelas / mapel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl focus:border-primary"
          />
        </div>
      </div>

      {/* Grid Kelas x Mapel */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered?.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border">
            {search ? "Tidak ditemukan kelas yang cocok." : "Belum ada kelas yang diampu."}
          </div>
        )}

        {filtered?.map((a) => {
          const hasPending = a.belumDinilai > 0;
          return (
            <Link
              key={a.id}
              to={`/guru/kelas-mapel/${a.id}`}
              className="group block rounded-2xl bg-card border border-border p-5 shadow-lg transition-all duration-200 hover:border-primary hover:bg-secondary/80 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] font-bold text-base shadow-inner">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground group-hover:text-blue-600 dark:hover:text-[#70B8FF] transition-colors">
                      {a.mapelNama}
                    </h4>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Kelas {a.kelasNama}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50 mt-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-background text-card-foreground border border-border">
                  {a.jumlahSiswa} Siswa
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-background text-card-foreground border border-border">
                  {a.jumlahTugas} Tugas
                </span>

                {hasPending ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-[#F0B232]/40 animate-pulse">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    {a.belumDinilai} Perlu Dinilai
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 dark:bg-[#23A559]/15 text-green-600 dark:text-[#57F287] border border-green-200 dark:border-[#23A559]/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Semua Dinilai
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted-foreground group-hover:text-blue-600 dark:hover:text-[#70B8FF] transition-colors">
                <span>Buka Lembar Kerja & Penugasan</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </SchoolLayout>
  );
}
