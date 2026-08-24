import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTanggal } from "@/lib/lms";

type SchoolEvent = {
  id: string;
  tanggal: string; // YYYY-MM-DD
  judul: string;
  kategori: "Ujian" | "Akademik" | "Kegiatan" | "Libur" | "Pengganti";
  waktu: string;
  lokasi: string;
  badgeClass: string;
};

const BASE_EVENTS: SchoolEvent[] = [
  {
    id: "e1",
    tanggal: "2026-08-20",
    judul: "Batas Akhir Pengumpulan Tugas Formatif Aljabar",
    kategori: "Akademik",
    waktu: "23:59 WIB",
    lokasi: "Portal LMS Siswa",
    badgeClass: "bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] border-blue-200 dark:border-primary/30",
  },
  {
    id: "e2",
    tanggal: "2026-08-24",
    judul: "Simulasi & Tryout CBT Persiapan PTS Ganjil",
    kategori: "Ujian",
    waktu: "07:30 - 12:30 WIB",
    lokasi: "Ruang Kelas 10 IPA 1 & Lab CBT",
    badgeClass: "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border-red-200 dark:border-[#F23F43]/30",
  },
  {
    id: "e3",
    tanggal: "2026-08-28",
    judul: "Pertemuan Evaluasi Wali Murid & Konsultasi E-Rapor",
    kategori: "Kegiatan",
    waktu: "09:00 - 11:30 WIB",
    lokasi: "Aula Utama Sokara Academy",
    badgeClass: "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border-amber-200 dark:border-[#F0B232]/30",
  },
];

export function AcademicCalendarWidget() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const hariLiburQuery = trpc.admin.listHariLibur.useQuery();
  const kelasPenggantiQuery = trpc.admin.listKelasPengganti.useQuery();

  // Combine dynamic database events + base events
  const dynamicEvents: SchoolEvent[] = [...BASE_EVENTS];

  if (hariLiburQuery.data) {
    for (const h of hariLiburQuery.data) {
      dynamicEvents.push({
        id: `libur-${h.id}`,
        tanggal: h.tanggal,
        judul: h.nama,
        kategori: "Libur",
        waktu: "Sepanjang Hari",
        lokasi: h.keterangan || "Sekolah Diliburkan",
        badgeClass: "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border-[#F23F43]/40",
      });
    }
  }

  if (kelasPenggantiQuery.data) {
    for (const kp of kelasPenggantiQuery.data) {
      dynamicEvents.push({
        id: `pengganti-${kp.id}`,
        tanggal: kp.tanggalPengganti,
        judul: `Kelas Pengganti: ${kp.mapelNama} (${kp.kelasNama})`,
        kategori: "Pengganti",
        waktu: `${kp.jamMulai} - ${kp.jamSelesai} WIB`,
        lokasi: `${kp.ruang} • Guru: ${kp.guruNama}`,
        badgeClass: "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border-[#F0B232]/40",
      });
    }
  }

  // Generate a rolling 10-day window around today
  const daysWindow = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + (i - 2)); // 2 days past, 7 days future
    const iso = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
    const dayNum = String(d.getDate());
    const hasEvent = dynamicEvents.some((e) => e.tanggal === iso);
    const isToday = iso === todayStr;

    return {
      date: iso,
      day: dayName,
      num: dayNum,
      hasEvent,
      isToday,
    };
  });

  const activeEvents = dynamicEvents.filter((e) => e.tanggal === selectedDate);

  return (
    <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold font-brand text-foreground">
              Kalender &amp; Agenda Akademik
            </CardTitle>
          </div>
          <span className="text-[11px] font-bold text-blue-600 dark:text-[#70B8FF] bg-blue-100 dark:bg-primary/15 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-primary/30">
            {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Quick Date Picker Carousel Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {daysWindow.map((d) => {
            const isSelected = selectedDate === d.date;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDate(d.date)}
                className={`flex flex-col items-center justify-center min-w-[54px] py-2 px-1 rounded-xl transition-all relative shrink-0 ${
                  isSelected
                    ? "bg-primary text-white shadow-md font-bold ring-2 ring-white/30"
                    : d.isToday
                      ? "bg-background border-2 border-primary text-foreground"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <span className="text-[10px] uppercase font-semibold">{d.day}</span>
                <span className="text-sm font-extrabold">{d.num}</span>
                {d.hasEvent && !isSelected && (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-[#F0B232] animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day's Events */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Agenda: {formatTanggal(selectedDate)}</span>
            <span className="font-semibold text-muted-foreground">{activeEvents.length} Kegiatan</span>
          </div>

          {activeEvents.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground bg-background rounded-xl border border-border/50">
              Tidak ada agenda khusus pada tanggal ini. KBM berjalan normal.
            </div>
          ) : (
            activeEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl bg-background border border-border space-y-1.5 hover:border-primary transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${evt.badgeClass}`}>
                    {evt.kategori}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-card-foreground">
                    <Clock className="h-3 w-3 text-primary" />
                    <span>{evt.waktu}</span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-foreground leading-snug">
                  {evt.judul}
                </h4>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{evt.lokasi}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
