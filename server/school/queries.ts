// @ts-nocheck
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  jadwal,
  kelas,
  kelasMapelGuru,
  kelasSiswa,
  mapel,
  nilai,
  schoolUsers,
  submission,
  tugas,
} from "@db/schema";
import { getDb } from "../queries/connection";

export type TugasSiswaItem = {
  id: number;
  judul: string;
  deskripsi: string | null;
  deadline: Date;
  hasLampiran: boolean;
  kelasNama: string;
  mapelNama: string;
  guruNama: string;
  submission: {
    id: number;
    waktuSubmit: Date;
    isiText: string | null;
    fileNama: string | null;
    terlambat: boolean;
  } | null;
  nilai: { nilai: number | null; feedback: string | null } | null;
};

export type JadwalItem = {
  id: number;
  hari: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu";
  jamMulai: string;
  jamSelesai: string;
  kelasNama: string;
  mapelNama: string;
  guruNama: string;
};

/**
 * Data dashboard siswa: kelas, semua tugas (urut deadline terdekat) beserta
 * status submission & nilai, dan jadwal mingguan kelasnya.
 * Dipakai juga oleh dashboard orang tua (read-only, per anak).
 */
export async function getSiswaOverview(siswaId: number): Promise<{
  kelasList: { id: number; nama: string }[];
  tugasList: TugasSiswaItem[];
  jadwalList: JadwalItem[];
  nilaiTerbaru: {
    tugasId: number;
    judul: string;
    mapelNama: string;
    nilai: number;
    feedback: string | null;
    updatedAt: Date;
  }[];
}> {
  const db = getDb();

  const kelasRows = await db
    .select({ id: kelas.id, nama: kelas.nama })
    .from(kelasSiswa)
    .innerJoin(kelas, eq(kelasSiswa.kelasId, kelas.id))
    .where(eq(kelasSiswa.siswaId, siswaId));

  if (kelasRows.length === 0) {
    return { kelasList: [], tugasList: [], jadwalList: [], nilaiTerbaru: [] };
  }
  const kelasIds = kelasRows.map((r) => r.id);

  const kmgRows = await db
    .select({
      id: kelasMapelGuru.id,
      kelasNama: kelas.nama,
      mapelNama: mapel.nama,
      guruNama: schoolUsers.name,
    })
    .from(kelasMapelGuru)
    .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
    .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
    .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
    .where(inArray(kelasMapelGuru.kelasId, kelasIds));

  const kmgById = new Map(kmgRows.map((r) => [r.id, r]));
  const kmgIds = kmgRows.map((r) => r.id);
  if (kmgIds.length === 0) {
    return {
      kelasList: kelasRows,
      tugasList: [],
      jadwalList: [],
      nilaiTerbaru: [],
    };
  }

  const tugasRows = await db
    .select()
    .from(tugas)
    .where(inArray(tugas.kelasMapelGuruId, kmgIds))
    .orderBy(asc(tugas.deadline));

  const tugasIds = tugasRows.map((t) => t.id);
  const subs = tugasIds.length
    ? await db
        .select()
        .from(submission)
        .where(
          and(
            inArray(submission.tugasId, tugasIds),
            eq(submission.siswaId, siswaId),
          ),
        )
    : [];

  const subIds = subs.map((s) => s.id);
  const nilaiRows = subIds.length
    ? await db.select().from(nilai).where(inArray(nilai.submissionId, subIds))
    : [];

  const subByTugas = new Map(subs.map((s) => [s.tugasId, s]));
  const nilaiBySub = new Map(nilaiRows.map((n) => [n.submissionId, n]));

  const tugasList: TugasSiswaItem[] = tugasRows.map((t) => {
    const kmg = kmgById.get(t.kelasMapelGuruId);
    const sub = subByTugas.get(t.id);
    const n = sub ? nilaiBySub.get(sub.id) : undefined;
    return {
      id: t.id,
      judul: t.judul,
      deskripsi: t.deskripsi,
      deadline: t.deadline,
      hasLampiran: !!t.lampiranData,
      kelasNama: kmg?.kelasNama ?? "",
      mapelNama: kmg?.mapelNama ?? "",
      guruNama: kmg?.guruNama ?? "",
      submission: sub
        ? {
            id: sub.id,
            waktuSubmit: sub.waktuSubmit,
            isiText: sub.isiText,
            fileNama: sub.fileNama,
            terlambat: sub.waktuSubmit.getTime() > t.deadline.getTime(),
          }
        : null,
      nilai: n ? { nilai: n.nilai, feedback: n.feedback } : null,
    };
  });

  const jadwalRows = await db
    .select()
    .from(jadwal)
    .where(inArray(jadwal.kelasMapelGuruId, kmgIds));

  const jadwalList: JadwalItem[] = jadwalRows.map((j) => {
    const kmg = kmgById.get(j.kelasMapelGuruId);
    return {
      id: j.id,
      hari: j.hari,
      jamMulai: j.jamMulai,
      jamSelesai: j.jamSelesai,
      kelasNama: kmg?.kelasNama ?? "",
      mapelNama: kmg?.mapelNama ?? "",
      guruNama: kmg?.guruNama ?? "",
    };
  });

  // Nilai terbaru (hanya yang sudah dinilai eksplisit, bukan "Belum Dinilai")
  const graded = nilaiRows
    .filter((n) => n.nilai !== null)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10);
  const tugasById = new Map(tugasRows.map((t) => [t.id, t]));
  const subById = new Map(subs.map((s) => [s.id, s]));

  const nilaiTerbaru = graded.flatMap((n) => {
    const sub = subById.get(n.submissionId);
    const t = sub ? tugasById.get(sub.tugasId) : undefined;
    if (!t) return [];
    const kmg = kmgById.get(t.kelasMapelGuruId);
    return [
      {
        tugasId: t.id,
        judul: t.judul,
        mapelNama: kmg?.mapelNama ?? "",
        nilai: n.nilai as number,
        feedback: n.feedback,
        updatedAt: n.updatedAt,
      },
    ];
  });

  return { kelasList: kelasRows, tugasList, jadwalList, nilaiTerbaru };
}

/** Jadwal mengajar guru (semua kombinasi kelas-mapel yang dia ampu). */
export async function getGuruSchedule(guruId: number): Promise<JadwalItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: jadwal.id,
      hari: jadwal.hari,
      jamMulai: jadwal.jamMulai,
      jamSelesai: jadwal.jamSelesai,
      kelasNama: kelas.nama,
      mapelNama: mapel.nama,
      guruNama: schoolUsers.name,
    })
    .from(jadwal)
    .innerJoin(
      kelasMapelGuru,
      eq(jadwal.kelasMapelGuruId, kelasMapelGuru.id),
    )
    .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
    .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
    .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
    .where(eq(kelasMapelGuru.guruId, guruId));
  return rows;
}

/** Semua nilai siswa (untuk halaman rekap), urut terbaru. */
export async function getSiswaGrades(siswaId: number) {
  const db = getDb();
  const rows = await db
    .select({
      nilaiId: nilai.id,
      nilai: nilai.nilai,
      feedback: nilai.feedback,
      updatedAt: nilai.updatedAt,
      judul: tugas.judul,
      deadline: tugas.deadline,
      mapelNama: mapel.nama,
      kelasNama: kelas.nama,
      guruNama: schoolUsers.name,
    })
    .from(nilai)
    .innerJoin(submission, eq(nilai.submissionId, submission.id))
    .innerJoin(tugas, eq(submission.tugasId, tugas.id))
    .innerJoin(
      kelasMapelGuru,
      eq(tugas.kelasMapelGuruId, kelasMapelGuru.id),
    )
    .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
    .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
    .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
    .where(eq(submission.siswaId, siswaId))
    .orderBy(desc(nilai.updatedAt));
  return rows;
}
