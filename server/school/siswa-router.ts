// @ts-nocheck
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  kelas,
  kelasMapelGuru,
  kelasSiswa,
  mapel,
  materi,
  pengumuman,
  presensi,
  schoolUsers,
  submission,
  tugas,
  hariLibur,
  kelasPengganti,
  tagihanSiswa,
  ujian,
  soalUjian,
  ujianSiswa,
} from "@db/schema";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { requireSchoolUser } from "./auth";
import { getSiswaGrades, getSiswaOverview } from "./queries";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Pastikan tugas memang ditujukan ke kelas siswa ini (FR-2). */
async function requireTugasAccessible(siswaId: number, tugasId: number) {
  const db = getDb();
  const tRows = await db
    .select()
    .from(tugas)
    .where(eq(tugas.id, tugasId))
    .limit(1);
  const t = tRows.at(0);
  if (!t) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan." });
  }
  const kmgRows = await db
    .select({ kelasId: kelasMapelGuru.kelasId })
    .from(kelasMapelGuru)
    .where(eq(kelasMapelGuru.id, t.kelasMapelGuruId))
    .limit(1);
  const kmg = kmgRows.at(0);
  if (!kmg) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan." });
  }
  const member = await db
    .select({ id: kelasSiswa.id })
    .from(kelasSiswa)
    .where(
      and(eq(kelasSiswa.kelasId, kmg.kelasId), eq(kelasSiswa.siswaId, siswaId)),
    )
    .limit(1);
  if (member.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Tugas ini bukan untuk kelas Anda.",
    });
  }
  return t;
}

export const siswaRouter = createRouter({
  dashboard: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["siswa"]);
    return getSiswaOverview(user.id);
  }),

  myGrades: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["siswa"]);
    return getSiswaGrades(user.id);
  }),

  /** Submit tugas: teks dan/atau file. Submit terlambat tetap dizinkan (FR-7/8). */
  submitTugas: publicQuery
    .input(
      z
        .object({
          tugasId: z.number(),
          isiText: z.string().optional(),
          file: z
            .object({
              nama: z.string().min(1),
              mime: z.string().min(1),
              dataBase64: z.string().min(1),
            })
            .optional(),
        })
        .refine((v) => (v.isiText?.trim() ?? "") !== "" || v.file, {
          message: "Isi teks jawaban atau upload file.",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["siswa"]);
      await requireTugasAccessible(user.id, input.tugasId);
      if (input.file) {
        const bytes = Math.floor((input.file.dataBase64.length * 3) / 4);
        if (bytes > MAX_FILE_BYTES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ukuran file maksimal 5MB.",
          });
        }
      }
      const db = getDb();
      const existing = await db
        .select()
        .from(submission)
        .where(
          and(
            eq(submission.tugasId, input.tugasId),
            eq(submission.siswaId, user.id),
          ),
        )
        .limit(1);
      if (existing.at(0)) {
        // Re-submit: perbarui isi & waktu submit
        await db
          .update(submission)
          .set({
            isiText: input.isiText?.trim() || null,
            fileNama: input.file?.nama ?? null,
            fileData: input.file?.dataBase64 ?? null,
            fileMime: input.file?.mime ?? null,
            waktuSubmit: new Date(),
          })
          .where(eq(submission.id, existing.at(0)!.id));
        return { id: existing.at(0)!.id, resubmitted: true };
      }
      const [{ id }] = await db
        .insert(submission)
        .values({
          tugasId: input.tugasId,
          siswaId: user.id,
          isiText: input.isiText?.trim() || null,
          fileNama: input.file?.nama ?? null,
          fileData: input.file?.dataBase64 ?? null,
          fileMime: input.file?.mime ?? null,
        })
        .returning({ id: submission.id });
      return { id, resubmitted: false };
    }),

  downloadLampiran: publicQuery
    .input(z.object({ tugasId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["siswa"]);
      const t = await requireTugasAccessible(user.id, input.tugasId);
      if (!t.lampiranData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lampiran tidak ada." });
      }
      return { fileNama: t.lampiranNama ?? "lampiran", dataBase64: t.lampiranData };
    }),

  downloadOwnFile: publicQuery
    .input(z.object({ tugasId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["siswa"]);
      await requireTugasAccessible(user.id, input.tugasId);
      const db = getDb();
      const rows = await db
        .select()
        .from(submission)
        .where(
          and(
            eq(submission.tugasId, input.tugasId),
            eq(submission.siswaId, user.id),
          ),
        )
        .limit(1);
      const sub = rows.at(0);
      if (!sub || !sub.fileData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File tidak ada." });
      }
      return {
        fileNama: sub.fileNama ?? "file",
        fileMime: sub.fileMime ?? "application/octet-stream",
        dataBase64: sub.fileData,
      };
    }),

  // ------------------------------------------------------------------ materi pelajaran siswa
  listMateri: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["siswa"]);
    const db = getDb();

    // Temukan kelas siswa
    const kelasRows = await db
      .select({ kelasId: kelasSiswa.kelasId })
      .from(kelasSiswa)
      .where(eq(kelasSiswa.siswaId, user.id));

    if (kelasRows.length === 0) return [];
    const kelasIds = kelasRows.map((k) => k.kelasId);

    // Temukan KMG
    const kmgRows = await db
      .select({
        id: kelasMapelGuru.id,
        mapelNama: mapel.nama,
        guruNama: schoolUsers.name,
      })
      .from(kelasMapelGuru)
      .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
      .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
      .where(inArray(kelasMapelGuru.kelasId, kelasIds));

    if (kmgRows.length === 0) return [];
    const kmgMap = new Map(kmgRows.map((k) => [k.id, k]));
    const kmgIds = kmgRows.map((k) => k.id);

    const rows = await db
      .select()
      .from(materi)
      .where(inArray(materi.kelasMapelGuruId, kmgIds))
      .orderBy(desc(materi.createdAt));

    return rows.map((r) => {
      const info = kmgMap.get(r.kelasMapelGuruId);
      return {
        id: r.id,
        judul: r.judul,
        deskripsi: r.deskripsi,
        fileNama: r.fileNama,
        linkUrl: r.linkUrl,
        createdAt: r.createdAt,
        mapelNama: info?.mapelNama ?? "Mapel",
        guruNama: info?.guruNama ?? "Guru",
      };
    });
  }),

  // ------------------------------------------------------------------ presensi saya
  myPresensi: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["siswa"]);
    const db = getDb();

    const rows = await db
      .select({
        id: presensi.id,
        tanggal: presensi.tanggal,
        status: presensi.status,
        catatan: presensi.catatan,
        mapelNama: mapel.nama,
        guruNama: schoolUsers.name,
      })
      .from(presensi)
      .innerJoin(kelasMapelGuru, eq(presensi.kelasMapelGuruId, kelasMapelGuru.id))
      .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
      .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
      .where(eq(presensi.siswaId, user.id))
      .orderBy(desc(presensi.tanggal));

    const totalHadir = rows.filter((r) => r.status === "hadir").length;
    const totalIzin = rows.filter((r) => r.status === "izin").length;
    const totalSakit = rows.filter((r) => r.status === "sakit").length;
    const totalAlpa = rows.filter((r) => r.status === "alpa").length;
    const total = rows.length;
    const persentaseHadir = total > 0 ? Math.round((totalHadir / total) * 100) : 100;

    return {
      stats: { totalHadir, totalIzin, totalSakit, totalAlpa, total, persentaseHadir },
      records: rows,
    };
  }),

  // ------------------------------------------------------------------ pengumuman
  listPengumuman: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["siswa"]);
    const db = getDb();
    return db
      .select()
      .from(pengumuman)
      .where(inArray(pengumuman.targetRole, ["semua", "siswa"]))
      .orderBy(desc(pengumuman.pinned), desc(pengumuman.createdAt));
  }),

  downloadMateriFile: publicQuery
    .input(z.object({ materiId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["siswa"]);
      const db = getDb();
      const rows = await db.select().from(materi).where(eq(materi.id, input.materiId)).limit(1);
      const m = rows.at(0);
      if (!m || !m.fileData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Berkas materi tidak ada." });
      }
      return {
        fileNama: m.fileNama ?? "materi",
        fileMime: m.fileMime ?? "application/octet-stream",
        dataBase64: m.fileData,
      };
    }),

  // ------------------------------------------------------------------ hari libur
  listHariLibur: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["siswa"]);
    const db = getDb();
    const rows = await db
      .select()
      .from(hariLibur)
      .orderBy(hariLibur.tanggal);
    return rows;
  }),

  // ------------------------------------------------------------------ kelas pengganti siswa
  myKelasPengganti: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["siswa"]);
    const db = getDb();

    // Dapatkan kelas-kelas yang diikuti siswa
    const myClasses = await db
      .select({ kelasId: kelasSiswa.kelasId })
      .from(kelasSiswa)
      .where(eq(kelasSiswa.siswaId, user.id));

    if (myClasses.length === 0) return [];

    const kelasIds = myClasses.map((c) => c.kelasId);

    const rows = await db
      .select({
        id: kelasPengganti.id,
        kelasMapelGuruId: kelasPengganti.kelasMapelGuruId,
        tanggalAsli: kelasPengganti.tanggalAsli,
        tanggalPengganti: kelasPengganti.tanggalPengganti,
        jamMulai: kelasPengganti.jamMulai,
        jamSelesai: kelasPengganti.jamSelesai,
        ruang: kelasPengganti.ruang,
        alasan: kelasPengganti.alasan,
        status: kelasPengganti.status,
        kelasNama: kelas.nama,
        mapelNama: mapel.nama,
        guruNama: schoolUsers.name,
      })
      .from(kelasPengganti)
      .innerJoin(kelasMapelGuru, eq(kelasPengganti.kelasMapelGuruId, kelasMapelGuru.id))
      .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
      .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
      .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
      .where(inArray(kelasMapelGuru.kelasId, kelasIds))
      .orderBy(desc(kelasPengganti.tanggalPengganti));

    return rows;
  }),

  // ------------------------------------------------------------------ keuangan & spp siswa
  myTagihanList: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["siswa"]);
    const db = getDb();

    const rows = await db
      .select()
      .from(tagihanSiswa)
      .where(eq(tagihanSiswa.siswaId, user.id))
      .orderBy(desc(tagihanSiswa.id));

    const totalNominal = rows.reduce((acc, r) => acc + r.nominal, 0);
    const lunasNominal = rows
      .filter((r) => r.status === "lunas")
      .reduce((acc, r) => acc + r.nominal, 0);
    const menunggakNominal = rows
      .filter((r) => r.status === "belum_bayar")
      .reduce((acc, r) => acc + r.nominal, 0);

      return {
        rows,
        summary: {
          totalNominal,
          lunasNominal,
          menunggakNominal,
          countLunas: rows.filter((r) => r.status === "lunas").length,
          countBelum: rows.filter((r) => r.status === "belum_bayar").length,
        },
      };
    }),

  // ================================================================== CBT UJIAN & KUIS SISWA
  myUjianList: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["siswa"]);
    const db = getDb();

    // Rombel siswa
    const myClasses = await db
      .select({ kelasId: kelasSiswa.kelasId })
      .from(kelasSiswa)
      .where(eq(kelasSiswa.siswaId, user.id));

    if (myClasses.length === 0) return [];
    const kelasIds = myClasses.map((c) => c.kelasId);

    const examRows = await db
      .select({
        id: ujian.id,
        kelasMapelGuruId: ujian.kelasMapelGuruId,
        judul: ujian.judul,
        deskripsi: ujian.deskripsi,
        kategori: ujian.kategori,
        durasiMenit: ujian.durasiMenit,
        kkm: ujian.kkm,
        tanggalMulai: ujian.tanggalMulai,
        tanggalSelesai: ujian.tanggalSelesai,
        acakSoal: ujian.acakSoal,
        tampilkanHasil: ujian.tampilkanHasil,
        kelasNama: kelas.nama,
        mapelNama: mapel.nama,
        guruNama: schoolUsers.name,
      })
      .from(ujian)
      .innerJoin(kelasMapelGuru, eq(ujian.kelasMapelGuruId, kelasMapelGuru.id))
      .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
      .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
      .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
      .where(inArray(kelasMapelGuru.kelasId, kelasIds))
      .orderBy(desc(ujian.id));

    const examIds = examRows.map((e) => e.id);
    const myResults = examIds.length
      ? await db
          .select()
          .from(ujianSiswa)
          .where(and(inArray(ujianSiswa.ujianId, examIds), eq(ujianSiswa.siswaId, user.id)))
      : [];

    const resultMap = new Map<number, typeof myResults[0]>();
    for (const r of myResults) {
      resultMap.set(r.ujianId, r);
    }

    return examRows.map((e) => {
      const res = resultMap.get(e.id);
      return {
        ...e,
        status: res?.status ?? "belum_mulai",
        nilai: res?.nilai ?? null,
        totalBenar: res?.totalBenar ?? 0,
        totalSalah: res?.totalSalah ?? 0,
        waktuSelesai: res?.waktuSelesai ?? null,
        isTuntas: res?.nilai !== null && res?.nilai !== undefined ? res.nilai >= e.kkm : false,
      };
    });
  }),

  startUjian: publicQuery
    .input(z.object({ ujianId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["siswa"]);
      const db = getDb();

      const [exam] = await db
        .select({
          id: ujian.id,
          judul: ujian.judul,
          durasiMenit: ujian.durasiMenit,
          kkm: ujian.kkm,
          acakSoal: ujian.acakSoal,
          kelasNama: kelas.nama,
          mapelNama: mapel.nama,
        })
        .from(ujian)
        .innerJoin(kelasMapelGuru, eq(ujian.kelasMapelGuruId, kelasMapelGuru.id))
        .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
        .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
        .where(eq(ujian.id, input.ujianId))
        .limit(1);

      if (!exam) throw new TRPCError({ code: "NOT_FOUND", message: "Ujian tidak ditemukan." });

      // Ambil atau inisialisasi record ujian siswa
      const existing = await db
        .select()
        .from(ujianSiswa)
        .where(and(eq(ujianSiswa.ujianId, input.ujianId), eq(ujianSiswa.siswaId, user.id)))
        .limit(1);

      let record = existing.at(0);
      if (!record) {
        const [inserted] = await db
          .insert(ujianSiswa)
          .values({
            ujianId: input.ujianId,
            siswaId: user.id,
            status: "sedang_mengerjakan",
            waktuMulai: new Date(),
          })
          .returning();
        record = inserted;
      } else if (record.status === "selesai") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Anda sudah menyelesaikan ujian ini." });
      }

      // Ambil bank soal (tanpa kunci jawaban & pembahasan demi integritas tes!)
      const rawQuestions = await db
        .select({
          id: soalUjian.id,
          nomorUrut: soalUjian.nomorUrut,
          pertanyaan: soalUjian.pertanyaan,
          pilihanA: soalUjian.pilihanA,
          pilihanB: soalUjian.pilihanB,
          pilihanC: soalUjian.pilihanC,
          pilihanD: soalUjian.pilihanD,
          poin: soalUjian.poin,
        })
        .from(soalUjian)
        .where(eq(soalUjian.ujianId, input.ujianId))
        .orderBy(asc(soalUjian.nomorUrut));

      // Hitung sisa waktu aktual berdasarkan waktuMulai di server
      const startTime = record.waktuMulai ? new Date(record.waktuMulai).getTime() : Date.now();
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remainingSeconds = Math.max(0, exam.durasiMenit * 60 - elapsedSeconds);

      // Ambil jawaban tersimpan jika pernah tersimpan sebelumnya
      let savedAnswers: Record<string, "A" | "B" | "C" | "D"> = {};
      if (record.jawabanJson) {
        try {
          savedAnswers = JSON.parse(record.jawabanJson);
        } catch {
          savedAnswers = {};
        }
      }

      return {
        exam,
        record,
        questions: rawQuestions,
        remainingSeconds,
        savedAnswers,
      };
    }),

  submitJawabanUjian: publicQuery
    .input(
      z.object({
        ujianId: z.number(),
        jawaban: z.record(z.string(), z.enum(["A", "B", "C", "D"])), // { "1": "A", "2": "C" }
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["siswa"]);
      const db = getDb();

      const questions = await db
        .select()
        .from(soalUjian)
        .where(eq(soalUjian.ujianId, input.ujianId))
        .orderBy(asc(soalUjian.nomorUrut));

      if (questions.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Soal ujian tidak ditemukan." });
      }

      let totalPoinDapat = 0;
      let totalPoinMaks = 0;
      let totalBenar = 0;
      let totalSalah = 0;

      for (const q of questions) {
        totalPoinMaks += q.poin;
        const studentAns = input.jawaban[String(q.nomorUrut)] || input.jawaban[String(q.id)];
        if (studentAns && studentAns === q.kunciJawaban) {
          totalBenar++;
          totalPoinDapat += q.poin;
        } else {
          totalSalah++;
        }
      }

      const finalScore = totalPoinMaks > 0 ? Math.round((totalPoinDapat / totalPoinMaks) * 100) : 0;

      await db
        .update(ujianSiswa)
        .set({
          status: "selesai",
          waktuSelesai: new Date(),
          nilai: finalScore,
          totalBenar,
          totalSalah,
          jawabanJson: JSON.stringify(input.jawaban),
        })
        .where(and(eq(ujianSiswa.ujianId, input.ujianId), eq(ujianSiswa.siswaId, user.id)));

      return {
        success: true,
        nilai: finalScore,
        totalBenar,
        totalSalah,
        totalSoal: questions.length,
      };
    }),

  ujianReviewDetail: publicQuery
    .input(z.object({ ujianId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["siswa"]);
      const db = getDb();

      const [exam] = await db
        .select({
          id: ujian.id,
          judul: ujian.judul,
          deskripsi: ujian.deskripsi,
          kkm: ujian.kkm,
          tampilkanHasil: ujian.tampilkanHasil,
          kelasNama: kelas.nama,
          mapelNama: mapel.nama,
        })
        .from(ujian)
        .innerJoin(kelasMapelGuru, eq(ujian.kelasMapelGuruId, kelasMapelGuru.id))
        .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
        .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
        .where(eq(ujian.id, input.ujianId))
        .limit(1);

      if (!exam) throw new TRPCError({ code: "NOT_FOUND", message: "Ujian tidak ditemukan." });

      const [record] = await db
        .select()
        .from(ujianSiswa)
        .where(and(eq(ujianSiswa.ujianId, input.ujianId), eq(ujianSiswa.siswaId, user.id)))
        .limit(1);

      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Hasil ujian belum ada." });

      const questions = await db
        .select()
        .from(soalUjian)
        .where(eq(soalUjian.ujianId, input.ujianId))
        .orderBy(asc(soalUjian.nomorUrut));

      const answers: Record<string, string> = record.jawabanJson ? JSON.parse(record.jawabanJson) : {};

      const questionReview = questions.map((q) => {
        const studentChoice = answers[String(q.nomorUrut)] || answers[String(q.id)] || null;
        const isCorrect = studentChoice === q.kunciJawaban;
        return {
          id: q.id,
          nomorUrut: q.nomorUrut,
          pertanyaan: q.pertanyaan,
          pilihanA: q.pilihanA,
          pilihanB: q.pilihanB,
          pilihanC: q.pilihanC,
          pilihanD: q.pilihanD,
          studentChoice,
          kunciJawaban: q.kunciJawaban,
          isCorrect,
          pembahasan: q.pembahasan,
          poin: q.poin,
        };
      });

      return {
        exam,
        record,
        questions: questionReview,
      };
    }),

  reportTabViolation: publicQuery
    .input(z.object({ ujianId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["siswa"]);
      const db = getDb();

      await db
        .update(ujianSiswa)
        .set({
          pelanggaranTab: sql`${ujianSiswa.pelanggaranTab} + 1`,
        })
        .where(and(eq(ujianSiswa.ujianId, input.ujianId), eq(ujianSiswa.siswaId, user.id)));

      return { success: true };
    }),

  // ================================================================== E-RAPOR RESMI KURIKULUM MERDEKA
  myOfficialRapor: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["siswa"]);
    const db = getDb();

    // Data kelas dan wali kelas
    const [myClass] = await db
      .select({
        kelasId: kelas.id,
        kelasNama: kelas.nama,
        waliKelasNama: schoolUsers.name,
      })
      .from(kelasSiswa)
      .innerJoin(kelas, eq(kelasSiswa.kelasId, kelas.id))
      .innerJoin(schoolUsers, eq(kelas.waliKelasId, schoolUsers.id))
      .where(eq(kelasSiswa.siswaId, user.id))
      .limit(1);

    // Rekap nilai seluruh mata pelajaran
    const grades = await getSiswaGrades(user.id);

    // Rekap presensi
    const presensiRows = await db
      .select({ status: presensi.status })
      .from(presensi)
      .where(eq(presensi.siswaId, user.id));

    const hadirCount = presensiRows.filter((p) => p.status === "hadir").length;
    const sakitCount = presensiRows.filter((p) => p.status === "sakit").length;
    const izinCount = presensiRows.filter((p) => p.status === "izin").length;
    const alpaCount = presensiRows.filter((p) => p.status === "alpa").length;

    // Nilai CBT
    const cbtRows = await db
      .select({
        nilai: ujianSiswa.nilai,
      })
      .from(ujianSiswa)
      .where(and(eq(ujianSiswa.siswaId, user.id), eq(ujianSiswa.status, "selesai")));

    const validCbt = cbtRows.map((c) => c.nilai).filter((n): n is number => n !== null);
    const avgCbt = validCbt.length > 0 ? Math.round(validCbt.reduce((a, b) => a + b, 0) / validCbt.length) : null;

    return {
      student: {
        id: user.id,
        name: user.name,
        email: user.email,
        nisn: `00${user.id + 8392019}`,
        nis: `2026${String(user.id).padStart(4, "0")}`,
        kelasNama: myClass?.kelasNama ?? "10 IPA 1",
        waliKelasNama: myClass?.waliKelasNama ?? "Budi Santoso, S.Pd",
        semester: "Ganjil (1)",
        tahunAjaran: "2026/2027",
        fase: "Fase E",
      },
      mapelList: grades.map((g) => {
        const score = g.nilai ?? 85;
        const predikat = score >= 88 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D";
        const capaianKompetensi =
          predikat === "A"
            ? "Menunjukkan penguasaan yang sangat istimewa dalam menguasai seluruh capaian pembelajaran, mampu berpikir kritis dan menyelesaikan studi kasus kompleks."
            : predikat === "B"
              ? "Menunjukkan penguasaan materi yang baik dan tuntas dalam mencapai target kompetensi pembelajaran standar kurikulum."
              : "Perlu bimbingan dan pendalaman pada beberapa konsep fundamental untuk memenuhi standar ketuntasan maksimal.";
        return {
          mapelNama: g.mapelNama,
          guruNama: g.guruNama,
          kkm: 75,
          nilaiAkhir: score,
          predikat,
          capaianKompetensi,
        };
      }),
      presensiSummary: {
        hadir: hadirCount,
        sakit: sakitCount,
        izin: izinCount,
        alpa: alpaCount,
        totalHari: presensiRows.length,
      },
      avgCbt,
    };
  }),
});
