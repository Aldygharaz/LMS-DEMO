// @ts-nocheck
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  jadwal,
  kelas,
  kelasMapelGuru,
  kelasSiswa,
  mapel,
  materi,
  nilai,
  orangTuaSiswa,
  presensi,
  schoolUsers,
  submission,
  tugas,
  hariLibur,
  kelasPengganti,
  ujian,
  soalUjian,
  ujianSiswa,
} from "@db/schema";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { requireSchoolUser } from "./auth";
import { getGuruSchedule } from "./queries";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // guardrail ukuran file (PRD section 13)

async function requireOwnedKmg(guruId: number, kmgId: number) {
  const db = getDb();
  const rows = await db
    .select({
      id: kelasMapelGuru.id,
      kelasId: kelasMapelGuru.kelasId,
      kelasNama: kelas.nama,
      mapelNama: mapel.nama,
    })
    .from(kelasMapelGuru)
    .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
    .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
    .where(
      and(eq(kelasMapelGuru.id, kmgId), eq(kelasMapelGuru.guruId, guruId)),
    )
    .limit(1);
  const kmg = rows.at(0);
  if (!kmg) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Anda tidak mengampu kombinasi kelas-mapel ini.",
    });
  }
  return kmg;
}

export const guruRouter = createRouter({
  myKelasMapel: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["guru"]);
    const db = getDb();
    const rows = await db
      .select({
        id: kelasMapelGuru.id,
        kelasId: kelasMapelGuru.kelasId,
        kelasNama: kelas.nama,
        mapelNama: mapel.nama,
      })
      .from(kelasMapelGuru)
      .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
      .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
      .where(eq(kelasMapelGuru.guruId, user.id))
      .orderBy(kelas.nama);
    return rows;
  }),

  /** Dashboard guru: daftar kelas × mapel yang diampu + counter belum dinilai. */
  myAssignments: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["guru"]);
    const db = getDb();

    const kmgRows = await db
      .select({
        id: kelasMapelGuru.id,
        kelasId: kelasMapelGuru.kelasId,
        kelasNama: kelas.nama,
        mapelNama: mapel.nama,
      })
      .from(kelasMapelGuru)
      .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
      .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
      .where(eq(kelasMapelGuru.guruId, user.id));

    const kmgIds = kmgRows.map((r) => r.id);
    if (kmgIds.length === 0) return { assignments: [], upcoming: [] };

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
          .where(inArray(submission.tugasId, tugasIds))
      : [];
    const subIds = subs.map((s) => s.id);
    const graded = subIds.length
      ? await db
          .select({ submissionId: nilai.submissionId })
          .from(nilai)
          .where(
            and(inArray(nilai.submissionId, subIds), isNull(nilai.nilai)),
          )
      : [];
    const ungradedSubIds = new Set(graded.map((g) => g.submissionId));
    // submission tanpa baris nilai sama sekali juga "belum dinilai"
    const anyNilai = subIds.length
      ? await db
          .select({ submissionId: nilai.submissionId })
          .from(nilai)
          .where(inArray(nilai.submissionId, subIds))
      : [];
    const hasNilai = new Set(anyNilai.map((n) => n.submissionId));

    const ungradedByKmg = new Map<number, number>();
    for (const s of subs) {
      if (!hasNilai.has(s.id) || ungradedSubIds.has(s.id)) {
        const t = tugasRows.find((x) => x.id === s.tugasId);
        if (t) {
          ungradedByKmg.set(
            t.kelasMapelGuruId,
            (ungradedByKmg.get(t.kelasMapelGuruId) ?? 0) + 1,
          );
        }
      }
    }

    const siswaCounts = await db
      .select({ kelasId: kelasSiswa.kelasId, n: sql<number>`count(*)` })
      .from(kelasSiswa)
      .where(
        inArray(
          kelasSiswa.kelasId,
          kmgRows.map((r) => r.kelasId),
        ),
      )
      .groupBy(kelasSiswa.kelasId);
    const siswaByKelas = new Map(
      siswaCounts.map((c) => [c.kelasId, Number(c.n)]),
    );

    const assignments = kmgRows.map((k) => ({
      ...k,
      jumlahSiswa: siswaByKelas.get(k.kelasId) ?? 0,
      belumDinilai: ungradedByKmg.get(k.id) ?? 0,
      jumlahTugas: tugasRows.filter((t) => t.kelasMapelGuruId === k.id).length,
    }));

    const now = new Date();
    const kmgById = new Map(kmgRows.map((k) => [k.id, k]));
    const upcoming = tugasRows
      .filter((t) => t.deadline.getTime() >= now.getTime())
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        judul: t.judul,
        deadline: t.deadline,
        kelasNama: kmgById.get(t.kelasMapelGuruId)?.kelasNama ?? "",
        mapelNama: kmgById.get(t.kelasMapelGuruId)?.mapelNama ?? "",
      }));

    return { assignments, upcoming };
  }),

  mySchedule: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["guru"]);
    return getGuruSchedule(user.id);
  }),

  /** Detail kelas-mapel: siswa, tugas (dengan counter submission), jadwal. */
  kelasMapelDetail: publicQuery
    .input(z.object({ kmgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const kmg = await requireOwnedKmg(user.id, input.kmgId);
      const db = getDb();

      const siswaList = await db
        .select({
          id: schoolUsers.id,
          name: schoolUsers.name,
          email: schoolUsers.email,
        })
        .from(kelasSiswa)
        .innerJoin(schoolUsers, eq(kelasSiswa.siswaId, schoolUsers.id))
        .where(eq(kelasSiswa.kelasId, kmg.kelasId))
        .orderBy(schoolUsers.name);

      const tugasRows = await db
        .select()
        .from(tugas)
        .where(eq(tugas.kelasMapelGuruId, input.kmgId))
        .orderBy(desc(tugas.deadline));

      const tugasIds = tugasRows.map((t) => t.id);
      const subs = tugasIds.length
        ? await db
            .select()
            .from(submission)
            .where(inArray(submission.tugasId, tugasIds))
        : [];
      const subIds = subs.map((s) => s.id);
      const nilaiRows = subIds.length
        ? await db
            .select()
            .from(nilai)
            .where(inArray(nilai.submissionId, subIds))
        : [];
      const nilaiBySub = new Map(nilaiRows.map((n) => [n.submissionId, n]));

      const tugasList = tugasRows.map((t) => {
        const subsOf = subs.filter((s) => s.tugasId === t.id);
        const belumDinilai = subsOf.filter((s) => {
          const n = nilaiBySub.get(s.id);
          return !n || n.nilai === null;
        }).length;
        return {
          id: t.id,
          judul: t.judul,
          deskripsi: t.deskripsi,
          deadline: t.deadline,
          hasLampiran: !!t.lampiranData,
          lampiranNama: t.lampiranNama,
          jumlahSubmit: subsOf.length,
          belumDinilai,
          totalSiswa: siswaList.length,
        };
      });

      const jadwalRows = await db
        .select()
        .from(jadwal)
        .where(eq(jadwal.kelasMapelGuruId, input.kmgId));

      return { kmg, siswaList, tugasList, jadwalList: jadwalRows };
    }),

  createTugas: publicQuery
    .input(
      z.object({
        kmgId: z.number(),
        judul: z.string().min(1, "Judul wajib diisi"),
        deskripsi: z.string().optional(),
        deadline: z.date(),
        lampiran: z
          .object({
            nama: z.string().min(1),
            dataBase64: z.string().min(1),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      await requireOwnedKmg(user.id, input.kmgId);
      if (input.lampiran) {
        const bytes = Math.floor((input.lampiran.dataBase64.length * 3) / 4);
        if (bytes > MAX_FILE_BYTES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ukuran lampiran maksimal 5MB.",
          });
        }
      }
      const [{ id }] = await getDb()
        .insert(tugas)
        .values({
          kelasMapelGuruId: input.kmgId,
          judul: input.judul.trim(),
          deskripsi: input.deskripsi?.trim() || null,
          deadline: input.deadline,
          lampiranNama: input.lampiran?.nama ?? null,
          lampiranData: input.lampiran?.dataBase64 ?? null,
        })
        .returning({ id: tugas.id });
      return { id };
    }),

  updateTugas: publicQuery
    .input(
      z.object({
        id: z.number(),
        judul: z.string().min(1, "Judul wajib diisi"),
        deskripsi: z.string().optional(),
        deadline: z.date(),
        lampiran: z
          .object({
            nama: z.string().min(1),
            dataBase64: z.string().min(1),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const tRows = await db.select().from(tugas).where(eq(tugas.id, input.id)).limit(1);
      const t = tRows.at(0);
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan." });
      await requireOwnedKmg(user.id, t.kelasMapelGuruId);

      if (input.lampiran) {
        const bytes = Math.floor((input.lampiran.dataBase64.length * 3) / 4);
        if (bytes > MAX_FILE_BYTES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ukuran lampiran maksimal 5MB.",
          });
        }
      }

      const updates: {
        judul: string;
        deskripsi: string | null;
        deadline: Date;
        lampiranNama?: string;
        lampiranData?: string;
      } = {
        judul: input.judul.trim(),
        deskripsi: input.deskripsi?.trim() || null,
        deadline: input.deadline,
      };
      if (input.lampiran) {
        updates.lampiranNama = input.lampiran.nama;
        updates.lampiranData = input.lampiran.dataBase64;
      }

      await db.update(tugas).set(updates).where(eq(tugas.id, input.id));
      return { success: true };
    }),

  deleteTugas: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const tRows = await db.select().from(tugas).where(eq(tugas.id, input.id)).limit(1);
      const t = tRows.at(0);
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan." });
      await requireOwnedKmg(user.id, t.kelasMapelGuruId);

      const subs = await db
        .select({ id: submission.id })
        .from(submission)
        .where(eq(submission.tugasId, input.id));
      const subIds = subs.map((s) => s.id);
      if (subIds.length > 0) {
        await db.delete(nilai).where(inArray(nilai.submissionId, subIds));
        await db.delete(submission).where(eq(submission.tugasId, input.id));
      }
      await db.delete(tugas).where(eq(tugas.id, input.id));
      return { success: true };
    }),

  /** Daftar submission per tugas + status siswa yang belum submit. */
  tugasSubmissions: publicQuery
    .input(z.object({ tugasId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const tugasRows = await db
        .select()
        .from(tugas)
        .where(eq(tugas.id, input.tugasId))
        .limit(1);
      const t = tugasRows.at(0);
      if (!t) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan." });
      }
      const kmg = await requireOwnedKmg(user.id, t.kelasMapelGuruId);

      const siswaList = await db
        .select({ id: schoolUsers.id, name: schoolUsers.name })
        .from(kelasSiswa)
        .innerJoin(schoolUsers, eq(kelasSiswa.siswaId, schoolUsers.id))
        .where(eq(kelasSiswa.kelasId, kmg.kelasId))
        .orderBy(schoolUsers.name);

      const subs = await db
        .select()
        .from(submission)
        .where(eq(submission.tugasId, input.tugasId));
      const subIds = subs.map((s) => s.id);
      const nilaiRows = subIds.length
        ? await db.select().from(nilai).where(inArray(nilai.submissionId, subIds))
        : [];
      const subBySiswa = new Map(subs.map((s) => [s.siswaId, s]));
      const nilaiBySub = new Map(nilaiRows.map((n) => [n.submissionId, n]));

      const items = siswaList.map((s) => {
        const sub = subBySiswa.get(s.id);
        const n = sub ? nilaiBySub.get(sub.id) : undefined;
        return {
          siswaId: s.id,
          siswaNama: s.name,
          submission: sub
            ? {
                id: sub.id,
                waktuSubmit: sub.waktuSubmit,
                isiText: sub.isiText,
                fileNama: sub.fileNama,
                terlambat: sub.waktuSubmit.getTime() > t.deadline.getTime(),
              }
            : null,
          nilai: n
            ? { nilai: n.nilai, feedback: n.feedback }
            : null,
        };
      });

      return {
        tugas: {
          id: t.id,
          judul: t.judul,
          deskripsi: t.deskripsi,
          deadline: t.deadline,
          hasLampiran: !!t.lampiranData,
          lampiranNama: t.lampiranNama,
        },
        kelasNama: kmg.kelasNama,
        mapelNama: kmg.mapelNama,
        items,
      };
    }),

  /** Input/edit nilai + feedback per submission (FR-9, FR-11). */
  gradeSubmission: publicQuery
    .input(
      z.object({
        submissionId: z.number(),
        nilai: z.number().min(0).max(100).nullable(),
        feedback: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const subRows = await db
        .select()
        .from(submission)
        .where(eq(submission.id, input.submissionId))
        .limit(1);
      const sub = subRows.at(0);
      if (!sub) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission tidak ditemukan.",
        });
      }
      const tRows = await db
        .select()
        .from(tugas)
        .where(eq(tugas.id, sub.tugasId))
        .limit(1);
      const t = tRows.at(0);
      if (!t) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan." });
      }
      await requireOwnedKmg(user.id, t.kelasMapelGuruId);

      const existing = await db
        .select()
        .from(nilai)
        .where(eq(nilai.submissionId, input.submissionId))
        .limit(1);
      if (existing.at(0)) {
        await db
          .update(nilai)
          .set({
            nilai: input.nilai,
            feedback: input.feedback?.trim() || null,
            guruId: user.id,
          })
          .where(eq(nilai.submissionId, input.submissionId));
      } else {
        await db.insert(nilai).values({
          submissionId: input.submissionId,
          nilai: input.nilai,
          feedback: input.feedback?.trim() || null,
          guruId: user.id,
        });
      }
      return { success: true };
    }),

  /** Download file submission (milik tugas yang dia ampu). */
  downloadSubmissionFile: publicQuery
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const rows = await db
        .select()
        .from(submission)
        .where(eq(submission.id, input.submissionId))
        .limit(1);
      const sub = rows.at(0);
      if (!sub || !sub.fileData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File tidak ada." });
      }
      const tRows = await db
        .select()
        .from(tugas)
        .where(eq(tugas.id, sub.tugasId))
        .limit(1);
      if (!tRows.at(0)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan." });
      }
      await requireOwnedKmg(user.id, tRows.at(0)!.kelasMapelGuruId);
      return {
        fileNama: sub.fileNama ?? "file",
        fileMime: sub.fileMime ?? "application/octet-stream",
        dataBase64: sub.fileData,
      };
    }),

  /** Download lampiran tugas (milik tugas yang dia ampu). */
  downloadLampiran: publicQuery
    .input(z.object({ tugasId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const rows = await db
        .select()
        .from(tugas)
        .where(eq(tugas.id, input.tugasId))
        .limit(1);
      const t = rows.at(0);
      if (!t || !t.lampiranData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lampiran tidak ada." });
      }
      await requireOwnedKmg(user.id, t.kelasMapelGuruId);
      return { fileNama: t.lampiranNama ?? "lampiran", dataBase64: t.lampiranData };
    }),

  // ------------------------------------------------------------------ materi pembelajaran
  listMateri: publicQuery
    .input(z.object({ kmgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      await requireOwnedKmg(user.id, input.kmgId);
      const db = getDb();
      return db
        .select({
          id: materi.id,
          judul: materi.judul,
          deskripsi: materi.deskripsi,
          fileNama: materi.fileNama,
          fileMime: materi.fileMime,
          linkUrl: materi.linkUrl,
          createdAt: materi.createdAt,
          hasFile: sql<boolean>`${materi.fileData} IS NOT NULL`,
        })
        .from(materi)
        .where(eq(materi.kelasMapelGuruId, input.kmgId))
        .orderBy(desc(materi.createdAt));
    }),

  createMateri: publicQuery
    .input(
      z.object({
        kmgId: z.number(),
        judul: z.string().min(2, "Judul materi wajib diisi"),
        deskripsi: z.string().optional(),
        linkUrl: z.string().optional(),
        file: z
          .object({
            nama: z.string(),
            mime: z.string(),
            dataBase64: z.string(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      await requireOwnedKmg(user.id, input.kmgId);
      if (input.file && input.file.dataBase64.length > MAX_FILE_BYTES * 1.37) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ukuran berkas materi melebihi 5MB.",
        });
      }
      const db = getDb();
      const [{ id }] = await db
        .insert(materi)
        .values({
          kelasMapelGuruId: input.kmgId,
          judul: input.judul,
          deskripsi: input.deskripsi || null,
          linkUrl: input.linkUrl || null,
          fileNama: input.file?.nama ?? null,
          fileData: input.file?.dataBase64 ?? null,
          fileMime: input.file?.mime ?? null,
        })
        .returning({ id: materi.id });
      return { id };
    }),

  updateMateri: publicQuery
    .input(
      z.object({
        id: z.number(),
        judul: z.string().min(2, "Judul materi wajib diisi"),
        deskripsi: z.string().optional(),
        linkUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const rows = await db.select().from(materi).where(eq(materi.id, input.id)).limit(1);
      const m = rows.at(0);
      if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Materi tidak ditemukan." });
      await requireOwnedKmg(user.id, m.kelasMapelGuruId);
      await db
        .update(materi)
        .set({
          judul: input.judul.trim(),
          deskripsi: input.deskripsi?.trim() || null,
          linkUrl: input.linkUrl?.trim() || null,
        })
        .where(eq(materi.id, input.id));
      return { success: true };
    }),

  deleteMateri: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const rows = await db.select().from(materi).where(eq(materi.id, input.id)).limit(1);
      const m = rows.at(0);
      if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Materi tidak ditemukan." });
      await requireOwnedKmg(user.id, m.kelasMapelGuruId);
      await db.delete(materi).where(eq(materi.id, input.id));
      return { success: true };
    }),

  downloadMateriFile: publicQuery
    .input(z.object({ materiId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["guru", "siswa", "orang_tua"]);
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

  // ------------------------------------------------------------------ presensi kelas
  getPresensi: publicQuery
    .input(
      z.object({
        kmgId: z.number(),
        tanggal: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const kmg = await requireOwnedKmg(user.id, input.kmgId);
      const db = getDb();
      const tgl = input.tanggal || new Date().toISOString().slice(0, 10);

      // Ambil seluruh siswa di kelas ini
      const siswaRows = await db
        .select({
          siswaId: schoolUsers.id,
          siswaNama: schoolUsers.name,
          siswaEmail: schoolUsers.email,
        })
        .from(kelasSiswa)
        .innerJoin(schoolUsers, eq(kelasSiswa.siswaId, schoolUsers.id))
        .where(eq(kelasSiswa.kelasId, kmg.kelasId))
        .orderBy(schoolUsers.name);

      // Ambil data presensi yang sudah tersimpan untuk tanggal ini
      const presensiRows = await db
        .select()
        .from(presensi)
        .where(
          and(
            eq(presensi.kelasMapelGuruId, input.kmgId),
            eq(presensi.tanggal, tgl),
          ),
        );

      const presensiBySiswa = new Map(presensiRows.map((p) => [p.siswaId, p]));

      const items = siswaRows.map((s) => {
        const record = presensiBySiswa.get(s.siswaId);
        return {
          siswaId: s.siswaId,
          siswaNama: s.siswaNama,
          status: record ? record.status : ("hadir" as const),
          catatan: record ? record.catatan : "",
          isSaved: !!record,
        };
      });

      return {
        kelasNama: kmg.kelasNama,
        mapelNama: kmg.mapelNama,
        tanggal: tgl,
        items,
      };
    }),

  savePresensi: publicQuery
    .input(
      z.object({
        kmgId: z.number(),
        tanggal: z.string(),
        records: z.array(
          z.object({
            siswaId: z.number(),
            status: z.enum(["hadir", "sakit", "izin", "alpa"]),
            catatan: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      await requireOwnedKmg(user.id, input.kmgId);
      const db = getDb();

      for (const rec of input.records) {
        const existing = await db
          .select({ id: presensi.id })
          .from(presensi)
          .where(
            and(
              eq(presensi.kelasMapelGuruId, input.kmgId),
              eq(presensi.siswaId, rec.siswaId),
              eq(presensi.tanggal, input.tanggal),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(presensi)
            .set({
              status: rec.status,
              catatan: rec.catatan || null,
            })
            .where(eq(presensi.id, existing[0]!.id));
        } else {
          await db.insert(presensi).values({
            kelasMapelGuruId: input.kmgId,
            siswaId: rec.siswaId,
            tanggal: input.tanggal,
            status: rec.status,
            catatan: rec.catatan || null,
          });
        }
      }
      return { success: true };
    }),

  // ------------------------------------------------------------------ rekap nilai (gradebook matrix)
  rekapNilaiKelas: publicQuery
    .input(z.object({ kmgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const kmg = await requireOwnedKmg(user.id, input.kmgId);
      const db = getDb();

      // Siswa di kelas
      const siswaRows = await db
        .select({
          siswaId: schoolUsers.id,
          siswaNama: schoolUsers.name,
          siswaEmail: schoolUsers.email,
        })
        .from(kelasSiswa)
        .innerJoin(schoolUsers, eq(kelasSiswa.siswaId, schoolUsers.id))
        .where(eq(kelasSiswa.kelasId, kmg.kelasId))
        .orderBy(schoolUsers.name);

      // Tugas di KMG ini
      const tugasRows = await db
        .select({
          id: tugas.id,
          judul: tugas.judul,
          deadline: tugas.deadline,
        })
        .from(tugas)
        .where(eq(tugas.kelasMapelGuruId, input.kmgId))
        .orderBy(asc(tugas.deadline));

      // Submissions & Nilai
      const tugasIds = tugasRows.map((t) => t.id);
      const subRows = tugasIds.length
        ? await db
            .select({
              submissionId: submission.id,
              tugasId: submission.tugasId,
              siswaId: submission.siswaId,
              nilai: nilai.nilai,
              terlambat: sql<boolean>`${submission.waktuSubmit} > ${tugas.deadline}`,
            })
            .from(submission)
            .leftJoin(nilai, eq(submission.id, nilai.submissionId))
            .innerJoin(tugas, eq(submission.tugasId, tugas.id))
            .where(inArray(submission.tugasId, tugasIds))
        : [];

      // Map: `${siswaId}-${tugasId}` -> score
      const scoreMap = new Map<string, { nilai: number | null; terlambat: boolean }>();
      for (const s of subRows) {
        scoreMap.set(`${s.siswaId}-${s.tugasId}`, {
          nilai: s.nilai,
          terlambat: s.terlambat,
        });
      }

      const rows = siswaRows.map((siswa) => {
        const scores: (number | null)[] = [];
        const taskDetails = tugasRows.map((t) => {
          const res = scoreMap.get(`${siswa.siswaId}-${t.id}`);
          if (res && res.nilai !== null) {
            scores.push(res.nilai);
          }
          return {
            tugasId: t.id,
            nilai: res ? res.nilai : null,
            terlambat: res ? res.terlambat : false,
            submitted: !!res,
          };
        });

        const nonNullScores = scores.filter((s): s is number => s !== null);
        const rataRata =
          nonNullScores.length > 0
            ? Math.round(
                nonNullScores.reduce((acc, val) => acc + val, 0) /
                  nonNullScores.length,
              )
            : null;

        const predikat =
          rataRata !== null
            ? rataRata >= 88
              ? "A"
              : rataRata >= 75
                ? "B"
                : rataRata >= 60
                  ? "C"
                  : "D"
            : "—";

        const isTuntas = rataRata !== null && rataRata >= 75;

        return {
          siswaId: siswa.siswaId,
          siswaNama: siswa.siswaNama,
          siswaEmail: siswa.siswaEmail,
          tasks: taskDetails,
          rataRata,
          predikat,
          isTuntas,
          rank: null as number | null,
        };
      });

      // Peringkat Kelas Berdasarkan Rata-rata Terbobot (Standard Competition Ranking)
      const sortedByAvg = [...rows]
        .filter((r) => r.rataRata !== null)
        .sort((a, b) => (b.rataRata ?? 0) - (a.rataRata ?? 0));

      const rankMap = new Map<number, number>();
      let currentRank = 1;
      sortedByAvg.forEach((item, index) => {
        if (index > 0 && item.rataRata !== sortedByAvg[index - 1].rataRata) {
          currentRank = index + 1;
        }
        rankMap.set(item.siswaId, currentRank);
      });

      const enrichedRows = rows.map((r) => ({
        ...r,
        rank: rankMap.get(r.siswaId) ?? null,
      }));

      // Statistik Rombel
      const validAverages = enrichedRows
        .map((r) => r.rataRata)
        .filter((v): v is number => v !== null);

      const highestScore = validAverages.length > 0 ? Math.max(...validAverages) : null;
      const lowestScore = validAverages.length > 0 ? Math.min(...validAverages) : null;
      const classAverage =
        validAverages.length > 0
          ? Math.round(validAverages.reduce((a, b) => a + b, 0) / validAverages.length)
          : null;
      const tuntasCount = enrichedRows.filter((r) => r.isTuntas).length;
      const passRate =
        enrichedRows.length > 0 ? Math.round((tuntasCount / enrichedRows.length) * 100) : 100;

      return {
        kelasNama: kmg.kelasNama,
        mapelNama: kmg.mapelNama,
        tugasList: tugasRows,
        rows: enrichedRows,
        stats: {
          highestScore,
          lowestScore,
          classAverage,
          passRate,
          tuntasCount,
          totalSiswa: enrichedRows.length,
        },
      };
    }),

  // ------------------------------------------------------------------ wali kelas info
  waliKelasInfo: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["guru"]);
    const db = getDb();

    // Cek kelas mana yang diwali oleh guru ini
    const kelasRows = await db
      .select({ id: kelas.id, nama: kelas.nama })
      .from(kelas)
      .where(eq(kelas.waliKelasId, user.id));

    if (kelasRows.length === 0) {
      return null;
    }

    const myKelas = kelasRows[0]!;

    // Ambil siswa di kelas perwalian
    const siswaList = await db
      .select({
        siswaId: schoolUsers.id,
        siswaNama: schoolUsers.name,
        siswaEmail: schoolUsers.email,
      })
      .from(kelasSiswa)
      .innerJoin(schoolUsers, eq(kelasSiswa.siswaId, schoolUsers.id))
      .where(eq(kelasSiswa.kelasId, myKelas.id))
      .orderBy(schoolUsers.name);

    // Ambil kontak ortu masing-masing siswa
    const siswaIds = siswaList.map((s) => s.siswaId);
    const ortuRows = siswaIds.length
      ? await db
          .select({
            siswaId: orangTuaSiswa.siswaId,
            ortuNama: schoolUsers.name,
            ortuEmail: schoolUsers.email,
          })
          .from(orangTuaSiswa)
          .innerJoin(schoolUsers, eq(orangTuaSiswa.orangTuaId, schoolUsers.id))
          .where(inArray(orangTuaSiswa.siswaId, siswaIds))
      : [];

    const ortuBySiswa = new Map<number, { ortuNama: string; ortuEmail: string }[]>();
    for (const o of ortuRows) {
      if (!ortuBySiswa.has(o.siswaId)) ortuBySiswa.set(o.siswaId, []);
      ortuBySiswa.get(o.siswaId)!.push({
        ortuNama: o.ortuNama,
        ortuEmail: o.ortuEmail,
      });
    }

    const students = siswaList.map((s) => ({
      ...s,
      parents: ortuBySiswa.get(s.siswaId) ?? [],
    }));

    return {
      kelas: myKelas,
      totalSiswa: siswaList.length,
      students,
    };
  }),

  // ------------------------------------------------------------------ hari libur
  listHariLibur: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["guru"]);
    const db = getDb();
    const rows = await db
      .select()
      .from(hariLibur)
      .orderBy(hariLibur.tanggal);
    return rows;
  }),

  // ------------------------------------------------------------------ kelas pengganti (make-up class)
  myKelasPengganti: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["guru"]);
    const db = getDb();
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
      })
      .from(kelasPengganti)
      .innerJoin(kelasMapelGuru, eq(kelasPengganti.kelasMapelGuruId, kelasMapelGuru.id))
      .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
      .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
      .where(eq(kelasMapelGuru.guruId, user.id))
      .orderBy(desc(kelasPengganti.tanggalPengganti));
    return rows;
  }),

  createKelasPengganti: publicQuery
    .input(
      z.object({
        kelasMapelGuruId: z.number(),
        tanggalAsli: z.string().min(10, "Format tanggal YYYY-MM-DD"),
        tanggalPengganti: z.string().min(10, "Format tanggal YYYY-MM-DD"),
        jamMulai: z.string().min(4),
        jamSelesai: z.string().min(4),
        ruang: z.string().optional(),
        alasan: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      await requireOwnedKmg(user.id, input.kelasMapelGuruId);
      const db = getDb();
      const [{ id }] = await db
        .insert(kelasPengganti)
        .values({
          kelasMapelGuruId: input.kelasMapelGuruId,
          tanggalAsli: input.tanggalAsli,
          tanggalPengganti: input.tanggalPengganti,
          jamMulai: input.jamMulai,
          jamSelesai: input.jamSelesai,
          ruang: input.ruang ?? "Ruang Kelas",
          alasan: input.alasan ?? "Pengganti sesi libur",
          status: "dijadwalkan",
        })
        .returning({ id: kelasPengganti.id });
      return { id };
    }),

  updateKelasPengganti: publicQuery
    .input(
      z.object({
        id: z.number(),
        tanggalPengganti: z.string().min(10).optional(),
        jamMulai: z.string().min(4).optional(),
        jamSelesai: z.string().min(4).optional(),
        ruang: z.string().optional(),
        alasan: z.string().optional(),
        status: z.enum(["dijadwalkan", "selesai", "dibatalkan"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const existing = await db
        .select({
          id: kelasPengganti.id,
          kmgId: kelasPengganti.kelasMapelGuruId,
        })
        .from(kelasPengganti)
        .where(eq(kelasPengganti.id, input.id))
        .limit(1);
      const kp = existing.at(0);
      if (!kp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sesi pengganti tidak ditemukan." });
      }
      await requireOwnedKmg(user.id, kp.kmgId);

      const updateData: Partial<typeof kelasPengganti.$inferInsert> = {};
      if (input.tanggalPengganti) updateData.tanggalPengganti = input.tanggalPengganti;
      if (input.jamMulai) updateData.jamMulai = input.jamMulai;
      if (input.jamSelesai) updateData.jamSelesai = input.jamSelesai;
      if (input.ruang !== undefined) updateData.ruang = input.ruang;
      if (input.alasan !== undefined) updateData.alasan = input.alasan;
      if (input.status) updateData.status = input.status;

      await db.update(kelasPengganti).set(updateData).where(eq(kelasPengganti.id, input.id));
      return { success: true };
    }),

  deleteKelasPengganti: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();
      const existing = await db
        .select({
          id: kelasPengganti.id,
          kmgId: kelasPengganti.kelasMapelGuruId,
        })
        .from(kelasPengganti)
        .where(eq(kelasPengganti.id, input.id))
        .limit(1);
      const kp = existing.at(0);
      if (!kp) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sesi pengganti tidak ditemukan." });
      }
      await requireOwnedKmg(user.id, kp.kmgId);
      await db.delete(kelasPengganti).where(eq(kelasPengganti.id, input.id));
      return { success: true };
    }),

  // ================================================================== CBT UJIAN & KUIS ONLINE
  listUjian: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["guru"]);
    const db = getDb();

    const kmgs = await db
      .select({ id: kelasMapelGuru.id })
      .from(kelasMapelGuru)
      .where(eq(kelasMapelGuru.guruId, user.id));

    if (kmgs.length === 0) return [];

    const kmgIds = kmgs.map((k) => k.id);

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
        createdAt: ujian.createdAt,
        kelasNama: kelas.nama,
        mapelNama: mapel.nama,
      })
      .from(ujian)
      .innerJoin(kelasMapelGuru, eq(ujian.kelasMapelGuruId, kelasMapelGuru.id))
      .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
      .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
      .where(inArray(ujian.kelasMapelGuruId, kmgIds))
      .orderBy(desc(ujian.id));

    // Ambil rekapitulasi peserta & soal
    const examIds = examRows.map((e) => e.id);
    const subRows = examIds.length
      ? await db
          .select({
            ujianId: ujianSiswa.ujianId,
            status: ujianSiswa.status,
            nilai: ujianSiswa.nilai,
          })
          .from(ujianSiswa)
          .where(inArray(ujianSiswa.ujianId, examIds))
      : [];

    const questionCounts = examIds.length
      ? await db
          .select({
            ujianId: soalUjian.ujianId,
            count: sql<number>`count(${soalUjian.id})`,
          })
          .from(soalUjian)
          .where(inArray(soalUjian.ujianId, examIds))
          .groupBy(soalUjian.ujianId)
      : [];

    const qCountMap = new Map<number, number>();
    for (const q of questionCounts) {
      qCountMap.set(q.ujianId, Number(q.count));
    }

    return examRows.map((e) => {
      const subs = subRows.filter((s) => s.ujianId === e.id && s.status === "selesai");
      const validScores = subs.map((s) => s.nilai).filter((n): n is number => n !== null);
      const avgScore =
        validScores.length > 0
          ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
          : null;

      return {
        ...e,
        totalSoal: qCountMap.get(e.id) ?? 0,
        totalSelesai: subs.length,
        rataRataNilai: avgScore,
      };
    });
  }),

  ujianDetail: publicQuery
    .input(z.object({ ujianId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();

      const [exam] = await db
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
        })
        .from(ujian)
        .innerJoin(kelasMapelGuru, eq(ujian.kelasMapelGuruId, kelasMapelGuru.id))
        .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
        .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
        .where(eq(ujian.id, input.ujianId))
        .limit(1);

      if (!exam) throw new TRPCError({ code: "NOT_FOUND", message: "Ujian tidak ditemukan." });
      await requireOwnedKmg(user.id, exam.kelasMapelGuruId);

      const questions = await db
        .select()
        .from(soalUjian)
        .where(eq(soalUjian.ujianId, input.ujianId))
        .orderBy(asc(soalUjian.nomorUrut));

      return { exam, questions };
    }),

  createUjian: publicQuery
    .input(
      z.object({
        kmgId: z.number(),
        judul: z.string().min(1, "Judul ujian wajib diisi"),
        deskripsi: z.string().optional(),
        kategori: z.enum(["Kuis_Harian", "PTS_UTS", "PAS_UAS", "Tryout"]),
        durasiMenit: z.number().min(5).max(180),
        kkm: z.number().min(0).max(100).default(75),
        tanggalMulai: z.string(),
        tanggalSelesai: z.string(),
        acakSoal: z.boolean().default(false),
        tampilkanHasil: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      await requireOwnedKmg(user.id, input.kmgId);
      const db = getDb();

      const [{ id }] = await db
        .insert(ujian)
        .values({
          kelasMapelGuruId: input.kmgId,
          judul: input.judul.trim(),
          deskripsi: input.deskripsi?.trim() || null,
          kategori: input.kategori,
          durasiMenit: input.durasiMenit,
          kkm: input.kkm,
          tanggalMulai: input.tanggalMulai,
          tanggalSelesai: input.tanggalSelesai,
          acakSoal: input.acakSoal,
          tampilkanHasil: input.tampilkanHasil,
        })
        .returning({ id: ujian.id });

      return { id };
    }),

  saveSoalUjian: publicQuery
    .input(
      z.object({
        ujianId: z.number(),
        questions: z.array(
          z.object({
            pertanyaan: z.string().min(1, "Pertanyaan wajib diisi"),
            pilihanA: z.string().min(1, "Pilihan A wajib diisi"),
            pilihanB: z.string().min(1, "Pilihan B wajib diisi"),
            pilihanC: z.string().min(1, "Pilihan C wajib diisi"),
            pilihanD: z.string().min(1, "Pilihan D wajib diisi"),
            kunciJawaban: z.enum(["A", "B", "C", "D"]),
            pembahasan: z.string().optional(),
            poin: z.number().default(20),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();

      const [exam] = await db
        .select({ id: ujian.id, kmgId: ujian.kelasMapelGuruId })
        .from(ujian)
        .where(eq(ujian.id, input.ujianId))
        .limit(1);

      if (!exam) throw new TRPCError({ code: "NOT_FOUND", message: "Ujian tidak ditemukan." });
      await requireOwnedKmg(user.id, exam.kmgId);

      // Hapus soal lama dan replace dengan bank soal baru
      await db.delete(soalUjian).where(eq(soalUjian.ujianId, input.ujianId));

      if (input.questions.length > 0) {
        const rowsToInsert = input.questions.map((q, idx) => ({
          ujianId: input.ujianId,
          nomorUrut: idx + 1,
          pertanyaan: q.pertanyaan.trim(),
          pilihanA: q.pilihanA.trim(),
          pilihanB: q.pilihanB.trim(),
          pilihanC: q.pilihanC.trim(),
          pilihanD: q.pilihanD.trim(),
          kunciJawaban: q.kunciJawaban,
          pembahasan: q.pembahasan?.trim() || null,
          poin: q.poin,
        }));
        await db.insert(soalUjian).values(rowsToInsert);
      }

      return { success: true, count: input.questions.length };
    }),

  listPesertaUjian: publicQuery
    .input(z.object({ ujianId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();

      const [exam] = await db
        .select({
          id: ujian.id,
          kmgId: ujian.kelasMapelGuruId,
          judul: ujian.judul,
          kkm: ujian.kkm,
          kelasId: kelasMapelGuru.kelasId,
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
      await requireOwnedKmg(user.id, exam.kmgId);

      // Ambil seluruh siswa di kelas
      const studentRows = await db
        .select({
          siswaId: schoolUsers.id,
          siswaNama: schoolUsers.name,
          siswaEmail: schoolUsers.email,
        })
        .from(kelasSiswa)
        .innerJoin(schoolUsers, eq(kelasSiswa.siswaId, schoolUsers.id))
        .where(eq(kelasSiswa.kelasId, exam.kelasId))
        .orderBy(schoolUsers.name);

      // Ambil record ujian siswa
      const participantRows = await db
        .select()
        .from(ujianSiswa)
        .where(eq(ujianSiswa.ujianId, input.ujianId));

      const partMap = new Map<number, typeof participantRows[0]>();
      for (const p of participantRows) {
        partMap.set(p.siswaId, p);
      }

      const rows = studentRows.map((s) => {
        const record = partMap.get(s.siswaId);
        return {
          siswaId: s.siswaId,
          siswaNama: s.siswaNama,
          siswaEmail: s.siswaEmail,
          status: record?.status ?? "belum_mulai",
          nilai: record?.nilai ?? null,
          totalBenar: record?.totalBenar ?? 0,
          totalSalah: record?.totalSalah ?? 0,
          pelanggaranTab: record?.pelanggaranTab ?? 0,
          waktuMulai: record?.waktuMulai ?? null,
          waktuSelesai: record?.waktuSelesai ?? null,
          isTuntas: record?.nilai !== null && record?.nilai !== undefined ? record.nilai >= exam.kkm : false,
        };
      });

      const finishedRows = rows.filter((r) => r.status === "selesai" && r.nilai !== null);
      const validScores = finishedRows.map((r) => r.nilai!);
      const avg = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
      const max = validScores.length > 0 ? Math.max(...validScores) : null;
      const min = validScores.length > 0 ? Math.min(...validScores) : null;
      const tuntas = finishedRows.filter((r) => r.isTuntas).length;

      return {
        exam,
        rows,
        stats: {
          totalSiswa: rows.length,
          totalSelesai: finishedRows.length,
          rataRata: avg,
          nilaiTertinggi: max,
          nilaiTerendah: min,
          tuntasCount: tuntas,
          tuntasRate: finishedRows.length > 0 ? Math.round((tuntas / finishedRows.length) * 100) : 0,
        },
      };
    }),

  deleteUjian: publicQuery
    .input(z.object({ ujianId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["guru"]);
      const db = getDb();

      const [exam] = await db
        .select({ id: ujian.id, kmgId: ujian.kelasMapelGuruId })
        .from(ujian)
        .where(eq(ujian.id, input.ujianId))
        .limit(1);

      if (!exam) throw new TRPCError({ code: "NOT_FOUND", message: "Ujian tidak ditemukan." });
      await requireOwnedKmg(user.id, exam.kmgId);

      await db.delete(ujianSiswa).where(eq(ujianSiswa.ujianId, input.ujianId));
      await db.delete(soalUjian).where(eq(soalUjian.ujianId, input.ujianId));
      await db.delete(ujian).where(eq(ujian.id, input.ujianId));

      return { success: true };
    }),
});
