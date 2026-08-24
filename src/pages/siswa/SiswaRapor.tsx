import { useEffect, useState } from "react";
import {
  Printer,
  QrCode,
  GraduationCap,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { SISWA_NAV, ORTU_NAV } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SiswaRapor({ role = "siswa" }: { role?: "siswa" | "orang_tua" }) {
  const childrenQuery = trpc.ortu.myChildren.useQuery(undefined, {
    enabled: role === "orang_tua",
  });
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  useEffect(() => {
    if (role === "orang_tua" && childrenQuery.data && childrenQuery.data.length > 0 && selectedChildId === null) {
      setSelectedChildId(childrenQuery.data[0].id);
    }
  }, [role, childrenQuery.data, selectedChildId]);

  const siswaRaporQuery = trpc.siswa.myOfficialRapor.useQuery(undefined, {
    enabled: role === "siswa",
  });

  const ortuRaporQuery = trpc.ortu.childOfficialRapor.useQuery(
    { siswaId: selectedChildId! },
    { enabled: role === "orang_tua" && selectedChildId !== null },
  );

  const raporData = role === "siswa" ? siswaRaporQuery.data : ortuRaporQuery.data;
  const nav = role === "siswa" ? SISWA_NAV : ORTU_NAV;

  if (!raporData) {
    return (
      <SchoolLayout role={role} title="Rapor Akademik Digital" nav={nav}>
        <div className="text-center py-20 text-xs text-muted-foreground">
          Menyiapkan lembar rapor resmi Kurikulum Merdeka...
        </div>
      </SchoolLayout>
    );
  }

  const { student, mapelList, presensiSummary } = raporData;

  return (
    <SchoolLayout role={role} title="Rapor Akademik Digital" nav={nav}>
      {/* Top Action Strip (Hidden in Print) */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Laporan Hasil Belajar (E-Rapor Resmi)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dokumen penilaian capaian pembelajaran standar Kurikulum Merdeka &bull; Semester {student.semester} TP {student.tahunAjaran}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {role === "orang_tua" && childrenQuery.data && childrenQuery.data.length > 1 && (
            <Select
              value={selectedChildId ? String(selectedChildId) : ""}
              onValueChange={(val) => setSelectedChildId(Number(val))}
            >
              <SelectTrigger className="w-48 bg-background border-border text-foreground text-xs rounded-xl h-10">
                <SelectValue placeholder="Pilih Anak" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground text-xs">
                {childrenQuery.data.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    Ananda: {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            type="button"
            onClick={() => window.print()}
            className="h-10 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold shadow-md"
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Cetak Lembar Rapor Resmi
          </Button>
        </div>
      </div>

      {/* Official Report Card Sheet (High-Density Print-Ready Document) */}
      <div className="bg-white text-black p-6 sm:p-10 rounded-2xl border border-slate-300 shadow-2xl max-w-4xl mx-auto space-y-6">
        {/* Header Kop Resmi */}
        <div className="border-b-2 border-black pb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600 block">
              KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
            </span>
            <h1 className="text-xl font-bold font-brand tracking-tight text-black mt-0.5">
              SOKARA ACADEMY INTERNASIONAL
            </h1>
            <p className="text-xs text-slate-600">
              LAPORAN HASIL CAPAIAN KOMPETENSI PESERTA DIDIK (KURIKULUM MERDEKA)
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-mono text-xs font-bold text-black">
              {student.fase}
            </span>
          </div>
        </div>

        {/* Biodata Siswa */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 font-semibold">Nama Peserta Didik:</span>
            <span className="font-bold text-black">{student.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 font-semibold">Kelas / Rombel:</span>
            <span className="font-bold text-black">{student.kelasNama}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 font-semibold">Nomor Induk / NISN:</span>
            <span className="font-mono font-bold text-black">{student.nis} / {student.nisn}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span className="text-slate-500 font-semibold">Semester / TP:</span>
            <span className="font-bold text-black">{student.semester} &bull; {student.tahunAjaran}</span>
          </div>
          <div className="flex justify-between col-span-2 pt-1">
            <span className="text-slate-500 font-semibold">Wali Kelas:</span>
            <span className="font-bold text-black">{student.waliKelasNama}</span>
          </div>
        </div>

        {/* Tabel Capaian Akademik */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            A. Nilai Hasil Belajar &amp; Capaian Kompetensi
          </h3>
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-black border-b border-slate-300">
                <th className="border border-slate-300 py-2.5 px-2 w-10 text-center font-bold">No</th>
                <th className="border border-slate-300 py-2.5 px-3 text-left font-bold min-w-36">Mata Pelajaran</th>
                <th className="border border-slate-300 py-2.5 px-2 text-center font-bold w-16">Nilai Akhir</th>
                <th className="border border-slate-300 py-2.5 px-2 text-center font-bold w-16">Predikat</th>
                <th className="border border-slate-300 py-2.5 px-3 text-left font-bold">Capaian Kompetensi Pembelajaran</th>
              </tr>
            </thead>
            <tbody>
              {mapelList.map((m, idx) => (
                <tr key={idx} className="border-b border-slate-300 hover:bg-slate-50">
                  <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold text-slate-700">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 py-2 px-3">
                    <div className="font-bold text-black">{m.mapelNama}</div>
                    <div className="text-[10px] text-slate-500">{m.guruNama}</div>
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold text-sm text-black">
                    {m.nilaiAkhir}
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-center font-bold text-sm text-black">
                    {m.predikat}
                  </td>
                  <td className="border border-slate-300 py-2 px-3 text-[11px] leading-relaxed text-slate-700">
                    {m.capaianKompetensi}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tabel Presensi & Ekstrakurikuler */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              B. Rekapitulasi Presensi Kehadiran
            </h3>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="border border-slate-300 py-1.5 px-3 text-slate-600 font-semibold">Hadir</td>
                  <td className="border border-slate-300 py-1.5 px-3 text-right font-bold text-black">{presensiSummary.hadir} Hari</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border border-slate-300 py-1.5 px-3 text-slate-600 font-semibold">Sakit (S)</td>
                  <td className="border border-slate-300 py-1.5 px-3 text-right font-bold text-black">{presensiSummary.sakit} Hari</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="border border-slate-300 py-1.5 px-3 text-slate-600 font-semibold">Izin (I)</td>
                  <td className="border border-slate-300 py-1.5 px-3 text-right font-bold text-black">{presensiSummary.izin} Hari</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 py-1.5 px-3 text-slate-600 font-semibold">Tanpa Keterangan (A)</td>
                  <td className="border border-slate-300 py-1.5 px-3 text-right font-bold text-black">{presensiSummary.alpa} Hari</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              C. Ekstrakurikuler &amp; Karakter
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-[11px] text-slate-700 space-y-1.5">
              <p>
                <strong>1. Robotika &amp; Coding:</strong> Predikat <strong>A</strong> (Sangat Aktif, mewakili sekolah pada kompetensi regional).
              </p>
              <p>
                <strong>2. Profil Pelajar Pancasila:</strong> Menunjukkan sikap gotong royong, nalar kritis, dan integritas yang sangat baik dalam lingkungan sosial kelas.
              </p>
            </div>
          </div>
        </div>

        {/* Tanda Tangan & Seal Block */}
        <div className="hidden print:grid pt-6 border-t-2 border-black grid-cols-3 gap-4 text-center text-xs text-slate-800">
          <div>
            <p className="text-[11px] text-slate-600 mb-14">Mengetahui,<br />Orang Tua / Wali Murid</p>
            <p className="font-bold border-t border-slate-400 pt-1 text-black">....................................</p>
          </div>

          <div>
            <div className="h-14 w-14 mx-auto mb-1 flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50">
              <QrCode className="h-11 w-11 text-slate-800" />
            </div>
            <p className="text-[9px] text-slate-500 font-mono">E-Rapor Sah Terverifikasi</p>
          </div>

          <div>
            <p className="text-[11px] text-slate-600 mb-14">Jakarta, 20 Juni 2026<br />Wali Kelas,</p>
            <p className="font-bold border-t border-slate-400 pt-1 text-black">{student.waliKelasNama}</p>
          </div>
        </div>
      </div>
    </SchoolLayout>
  );
}
