import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HARI_LIST, hariIni } from "@/lib/lms";
import { Calendar, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export function StatCard({
  label,
  value,
  icon,
  trend,
  colorScheme = "blue",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: string;
  colorScheme?: "blue" | "green" | "purple" | "amber" | "red";
}) {
  const colorMap = {
    blue: "from-blue-600/20 to-blue-500/10 text-blue-600 dark:text-[#70B8FF] border-blue-500/20",
    green: "from-emerald-600/20 to-emerald-500/10 text-green-600 dark:text-[#57F287] border-emerald-500/20",
    purple: "from-purple-600/20 to-purple-500/10 text-purple-300 border-purple-500/20",
    amber: "from-amber-600/20 to-amber-500/10 text-amber-600 dark:text-[#FEE75C] border-amber-500/20",
    red: "from-red-600/20 to-red-500/10 text-red-600 dark:text-[#FF7074] border-red-500/20",
  };

  return (
    <Card className="bg-card border-border shadow-lg rounded-2xl overflow-hidden transition-all duration-200 hover:border-primary/50 hover:bg-secondary/80 hover:-translate-y-0.5">
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-brand tracking-tight text-foreground">
              {value}
            </span>
            {trend && (
              <span className="text-[11px] font-semibold text-green-600 dark:text-[#57F287]">
                {trend}
              </span>
            )}
          </div>
        </div>

        {icon && (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br border ${colorMap[colorScheme]} shadow-inner`}
          >
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type JadwalRow = {
  id: number;
  hari: (typeof HARI_LIST)[number];
  jamMulai: string;
  jamSelesai: string;
  kelasNama: string;
  mapelNama: string;
  guruNama: string;
};

/** Tabel jadwal mingguan, dikelompokkan per hari. */
export function ScheduleCard({
  items,
  showKelas = false,
  title = "Jadwal Mingguan",
}: {
  items: JadwalRow[];
  showKelas?: boolean;
  title?: string;
}) {
  const today = hariIni();
  return (
    <Card className="bg-card border-border shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold font-brand text-foreground">
              {title}
            </CardTitle>
          </div>
          <Badge className="bg-background border-border text-muted-foreground text-[11px]">
            Hari ini: <strong className="text-foreground ml-1">{today}</strong>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Belum ada data jadwal mata pelajaran.
          </div>
        ) : (
          <div className="space-y-4">
            {HARI_LIST.map((hari) => {
              const rows = items
                .filter((j) => j.hari === hari)
                .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
              if (rows.length === 0) return null;
              const isToday = hari === today;

              return (
                <div
                  key={hari}
                  className={`rounded-xl p-3.5 border transition-colors ${
                    isToday
                      ? "bg-card border-primary shadow-sm"
                      : "bg-background border-border"
                  }`}
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          isToday ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {hari}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                          Sedang Berjalan
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {rows.length} sesi
                    </span>
                  </div>

                  <div className="space-y-2">
                    {rows.map((j) => {
                      const now = new Date();
                      const nowMin = now.getHours() * 60 + now.getMinutes();
                      const [sH = 0, sM = 0] = j.jamMulai.split(":").map(Number);
                      const [eH = 0, eM = 0] = j.jamSelesai.split(":").map(Number);
                      const isLiveNow = isToday && nowMin >= sH * 60 + sM && nowMin <= eH * 60 + eM;

                      return (
                        <div
                          key={j.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm shadow-sm transition-all ${
                            isLiveNow
                              ? "bg-green-100 dark:bg-[#23A559]/15 border border-[#23A559] ring-1 ring-[#57F287]"
                              : "bg-card border border-border"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className={`flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded border ${
                              isLiveNow
                                ? "text-green-600 dark:text-[#57F287] bg-green-100 dark:bg-[#23A559]/25 border-green-300 dark:border-[#23A559]/50 font-extrabold"
                                : "text-green-600 dark:text-[#57F287] bg-green-100 dark:bg-[#23A559]/10 border-green-200 dark:border-[#23A559]/20 font-semibold"
                            }`}>
                              <Clock className="h-3 w-3" />
                              {j.jamMulai}–{j.jamSelesai}
                            </div>
                            <span className="font-semibold text-foreground">
                              {j.mapelNama}
                            </span>
                            {isLiveNow && (
                              <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-[#23A559] text-white animate-pulse">
                                Sedang Berlangsung
                              </span>
                            )}
                            {showKelas && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-background border-border text-muted-foreground"
                              >
                                {j.kelasNama}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {j.guruNama}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Badge nilai: bedakan tegas "Belum Dinilai" (null) vs nilai 0 (FR-12). */
export function NilaiBadge({ nilai }: { nilai: number | null | undefined }) {
  if (nilai === null || nilai === undefined) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-muted-foreground border border-border">
        Belum Dinilai
      </span>
    );
  }

  // Angka Psikologis DesignAldy:
  if (nilai >= 85) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border border-[#23A559]/40">
        <CheckCircle2 className="h-3 w-3" />
        {nilai} (A)
      </span>
    );
  }
  if (nilai >= 70) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border border-primary/40">
        {nilai} (B)
      </span>
    );
  }
  if (nilai >= 60) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border border-[#F0B232]/40">
        {nilai} (C)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border border-[#F23F43]/40">
      <AlertCircle className="h-3 w-3" />
      {nilai} {nilai === 0 ? "(Dinilai 0)" : "(D)"}
    </span>
  );
}

export function SimpleTable({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden overflow-x-auto bg-card">
      <Table>
        <TableHeader className="bg-background">
          <TableRow className="border-b border-border hover:bg-transparent">
            {head.map((h) => (
              <TableHead key={h} className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3.5">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/50">{children}</TableBody>
      </Table>
    </div>
  );
}

export { TableCell, TableRow };

export function EmptyState({ 
  icon: Icon, 
  title, 
  description,
  action 
}: { 
  icon?: any; 
  title: string; 
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-card/50">
      {Icon && <Icon className="w-10 h-10 text-muted-foreground mb-4 opacity-50" strokeWidth={1.5} />}
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}


export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full border border-border rounded-2xl overflow-hidden overflow-x-auto bg-card">
      <div className="flex bg-background border-b border-border px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 px-2"><div className="h-4 bg-border/70 rounded animate-shimmer w-2/3"></div></div>
        ))}
      </div>
      <div className="divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex px-4 py-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1 px-2">
                <div className="h-3.5 bg-border/50 rounded animate-shimmer w-full"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActionCenterWidget({ items, title = 'Perlu Tindakan' }: { items: { id: string | number; label: string; actionText: string; onClick: () => void; isUrgent?: boolean }[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="bg-card border border-[#F0B232]/50 rounded-2xl p-4 shadow-xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 bg-amber-100 dark:bg-[#F0B232]/20 p-2 rounded-xl text-amber-600 dark:text-[#FEE75C]">
          <AlertCircle className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FEE75C]"></span>
                {item.label}
                {item.isUrgent && <span className="text-[10px] bg-[#F23F43] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Urgent</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 flex flex-col gap-2">
        {items.map((item) => (
          <Button key={'btn-'+item.id} onClick={item.onClick} size="sm" className="h-8 bg-[#F0B232] hover:bg-[#D49826] text-black font-bold text-[11px]">
            {item.actionText}
          </Button>
        ))}
      </div>
    </div>
  );
}
