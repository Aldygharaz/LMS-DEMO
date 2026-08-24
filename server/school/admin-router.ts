// @ts-nocheck
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  jadwal,
  kelas,
  kelasMapelGuru,
  kelasSiswa,
  mapel,
  orangTuaSiswa,
  pengumuman,
  presensi,
  schoolUsers,
  tugas,
  hariLibur,
  kelasPengganti,
  tagihanSiswa,
} from "@db/schema";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { hashPassword, requireSchoolUser } from "./auth";

const hariEnum = z.enum(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]);
const jamRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const adminRouter = createRouter({
  // ------------------------------------------------------------------ stats
  stats: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["admin"]);
    const db = getDb();
    const total = async (qb: PromiseLike<{ n: number | string }[]>) =>
      Number((await qb).at(0)?.n ?? 0);
    const [kelasCount, mapelCount, tugasCount, guruCount, siswaCount, ortuCount] =
      await Promise.all([
        total(db.select({ n: sql<number>`count(*)` }).from(kelas)),
        total(db.select({ n: sql<number>`count(*)` }).from(mapel)),
        total(db.select({ n: sql<number>`count(*)` }).from(tugas)),
        total(
          db
            .select({ n: sql<number>`count(*)` })
            .from(schoolUsers)
            .where(eq(schoolUsers.role, "guru")),
        ),
        total(
          db
            .select({ n: sql<number>`count(*)` })
            .from(schoolUsers)
            .where(eq(schoolUsers.role, "siswa")),
        ),
        total(
          db
            .select({ n: sql<number>`count(*)` })
            .from(schoolUsers)
            .where(eq(schoolUsers.role, "orang_tua")),
        ),
      ]);
    return { kelasCount, mapelCount, tugasCount, guruCount, siswaCount, ortuCount };
  }),

  // ------------------------------------------------------------------ users
  listUsers: publicQuery
    .input(z.object({ role: z.enum(["admin", "guru", "siswa", "orang_tua"]) }))
    .query(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      return db
        .select({
          id: schoolUsers.id,
          name: schoolUsers.name,
          email: schoolUsers.email,
          role: schoolUsers.role,
        })
        .from(schoolUsers)
        .where(eq(schoolUsers.role, input.role))
        .orderBy(schoolUsers.name);
    }),

  createUser: publicQuery
    .input(
      z.object({
        name: z.string().min(1, "Nama wajib diisi"),
        email: z.string().email("Format email tidak valid"),
        password: z.string().min(6, "Password minimal 6 karakter"),
        role: z.enum(["admin", "guru", "siswa", "orang_tua"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const email = input.email.toLowerCase().trim();
      const existing = await db
        .select({ id: schoolUsers.id })
        .from(schoolUsers)
        .where(eq(schoolUsers.email, email))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email sudah terdaftar.",
        });
      }
      const passwordHash = await hashPassword(input.password);
      const [{ id }] = await db
        .insert(schoolUsers)
        .values({ name: input.name, email, passwordHash, role: input.role })
        .returning({ id: schoolUsers.id });
      return { id };
    }),

  // ------------------------------------------------------------------ mapel
  listMapel: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["admin", "guru"]);
    return getDb().select().from(mapel).orderBy(mapel.nama);
  }),

  createMapel: publicQuery
    .input(z.object({ nama: z.string().min(1, "Nama mapel wajib diisi") }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const existing = await db
        .select({ id: mapel.id })
        .from(mapel)
        .where(eq(mapel.nama, input.nama.trim()))
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Mapel sudah ada." });
      }
      const [{ id }] = await db
        .insert(mapel)
        .values({ nama: input.nama.trim() })
        .returning({ id: mapel.id });
      return { id };
    }),

  // ------------------------------------------------------------------ kelas
  listKelas: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["admin"]);
    const db = getDb();
    const kelasRows = await db
      .select({
        id: kelas.id,
        nama: kelas.nama,
        waliKelasId: kelas.waliKelasId,
        waliNama: schoolUsers.name,
        createdAt: kelas.createdAt,
      })
      .from(kelas)
      .innerJoin(schoolUsers, eq(kelas.waliKelasId, schoolUsers.id))
      .orderBy(kelas.nama);
    const counts = await db
      .select({ kelasId: kelasSiswa.kelasId, n: sql<number>`count(*)` })
      .from(kelasSiswa)
      .groupBy(kelasSiswa.kelasId);
    const countByKelas = new Map(counts.map((c) => [c.kelasId, Number(c.n)]));
    return kelasRows.map((k) => ({
      ...k,
      jumlahSiswa: countByKelas.get(k.id) ?? 0,
    }));
  }),

  createKelas: publicQuery
    .input(
      z.object({
        nama: z.string().min(1, "Nama kelas wajib diisi"),
        waliKelasId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const wali = await db
        .select({ id: schoolUsers.id, role: schoolUsers.role })
        .from(schoolUsers)
        .where(eq(schoolUsers.id, input.waliKelasId))
        .limit(1);
      if (!wali.at(0) || wali.at(0)!.role !== "guru") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Wali kelas harus seorang guru.",
        });
      }
      const [{ id }] = await db
        .insert(kelas)
        .values({ nama: input.nama.trim(), waliKelasId: input.waliKelasId })
        .returning({ id: kelas.id });
      return { id };
    }),

  kelasDetail: publicQuery
    .input(z.object({ kelasId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const k = await db
        .select({
          id: kelas.id,
          nama: kelas.nama,
          waliKelasId: kelas.waliKelasId,
          waliNama: schoolUsers.name,
        })
        .from(kelas)
        .innerJoin(schoolUsers, eq(kelas.waliKelasId, schoolUsers.id))
        .where(eq(kelas.id, input.kelasId))
        .limit(1);
      const kelasRow = k.at(0);
      if (!kelasRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan." });
      }

      const siswaList = await db
        .select({
          id: schoolUsers.id,
          name: schoolUsers.name,
          email: schoolUsers.email,
        })
        .from(kelasSiswa)
        .innerJoin(schoolUsers, eq(kelasSiswa.siswaId, schoolUsers.id))
        .where(eq(kelasSiswa.kelasId, input.kelasId))
        .orderBy(schoolUsers.name);

      const pengampu = await db
        .select({
          id: kelasMapelGuru.id,
          mapelId: mapel.id,
          mapelNama: mapel.nama,
          guruId: schoolUsers.id,
          guruNama: schoolUsers.name,
        })
        .from(kelasMapelGuru)
        .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
        .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
        .where(eq(kelasMapelGuru.kelasId, input.kelasId));

      const jadwalRows = await db
        .select({
          id: jadwal.id,
          kelasMapelGuruId: jadwal.kelasMapelGuruId,
          hari: jadwal.hari,
          jamMulai: jadwal.jamMulai,
          jamSelesai: jadwal.jamSelesai,
          mapelNama: mapel.nama,
          guruNama: schoolUsers.name,
        })
        .from(jadwal)
        .innerJoin(
          kelasMapelGuru,
          eq(jadwal.kelasMapelGuruId, kelasMapelGuru.id),
        )
        .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
        .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
        .where(eq(kelasMapelGuru.kelasId, input.kelasId));

      return { kelas: kelasRow, siswaList, pengampu, jadwalList: jadwalRows };
    }),

  addSiswaToKelas: publicQuery
    .input(z.object({ kelasId: z.number(), siswaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin", "guru"]);
      const db = getDb();
      const siswa = await db
        .select({ id: schoolUsers.id, role: schoolUsers.role })
        .from(schoolUsers)
        .where(eq(schoolUsers.id, input.siswaId))
        .limit(1);
      if (siswa.at(0)?.role !== "siswa") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User bukan siswa." });
      }
      const existing = await db
        .select({ id: kelasSiswa.id })
        .from(kelasSiswa)
        .where(
          and(
            eq(kelasSiswa.kelasId, input.kelasId),
            eq(kelasSiswa.siswaId, input.siswaId),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Siswa sudah ada di kelas ini.",
        });
      }
      await db.insert(kelasSiswa).values(input);
      return { success: true };
    }),

  removeSiswaFromKelas: publicQuery
    .input(z.object({ kelasId: z.number(), siswaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin", "guru"]);
      await getDb()
        .delete(kelasSiswa)
        .where(
          and(
            eq(kelasSiswa.kelasId, input.kelasId),
            eq(kelasSiswa.siswaId, input.siswaId),
          ),
        );
      return { success: true };
    }),

  // ------------------------------------------------------ assign guru-mapel
  assignGuru: publicQuery
    .input(
      z.object({ kelasId: z.number(), mapelId: z.number(), guruId: z.number() }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const guru = await db
        .select({ id: schoolUsers.id, role: schoolUsers.role })
        .from(schoolUsers)
        .where(eq(schoolUsers.id, input.guruId))
        .limit(1);
      if (guru.at(0)?.role !== "guru") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User bukan guru." });
      }
      const existing = await db
        .select({ id: kelasMapelGuru.id })
        .from(kelasMapelGuru)
        .where(
          and(
            eq(kelasMapelGuru.kelasId, input.kelasId),
            eq(kelasMapelGuru.mapelId, input.mapelId),
          ),
        )
        .limit(1);
      if (existing.at(0)) {
        // Ganti guru pengampu; record historis nilai tetap menyimpan guru lama
        await db
          .update(kelasMapelGuru)
          .set({ guruId: input.guruId })
          .where(eq(kelasMapelGuru.id, existing.at(0)!.id));
        return { id: existing.at(0)!.id, replaced: true };
      }
      const [{ id }] = await db.insert(kelasMapelGuru).values(input).returning({ id: kelasMapelGuru.id });
      return { id, replaced: false };
    }),

  removePengampu: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const tugasCount = await db
        .select({ n: sql<number>`count(*)` })
        .from(tugas)
        .where(eq(tugas.kelasMapelGuruId, input.id));
      if (Number(tugasCount.at(0)?.n ?? 0) > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Kombinasi kelas-mapel ini sudah punya tugas dan tidak bisa dihapus (histori harus dijaga).",
        });
      }
      await db.delete(jadwal).where(eq(jadwal.kelasMapelGuruId, input.id));
      await db.delete(kelasMapelGuru).where(eq(kelasMapelGuru.id, input.id));
      return { success: true };
    }),

  // ------------------------------------------------------------------ jadwal
  addJadwal: publicQuery
    .input(
      z.object({
        kelasMapelGuruId: z.number(),
        hari: hariEnum,
        jamMulai: z.string().regex(jamRegex, "Format jam HH:MM"),
        jamSelesai: z.string().regex(jamRegex, "Format jam HH:MM"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin", "guru"]);
      if (input.jamSelesai <= input.jamMulai) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Jam selesai harus lebih besar dari jam mulai.",
        });
      }

      const db = getDb();

      // Ambil detail KMG target
      const [kmgTarget] = await db
        .select({
          kelasId: kelasMapelGuru.kelasId,
          guruId: kelasMapelGuru.guruId,
          kelasNama: kelas.nama,
          mapelNama: mapel.nama,
          guruNama: schoolUsers.name,
        })
        .from(kelasMapelGuru)
        .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
        .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
        .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
        .where(eq(kelasMapelGuru.id, input.kelasMapelGuruId))
        .limit(1);

      if (!kmgTarget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kombinasi kelas-mapel-guru tidak ditemukan." });
      }

      // Ambil seluruh jadwal pada hari yang sama untuk audit bentrok
      const existingSchedules = await db
        .select({
          id: jadwal.id,
          hari: jadwal.hari,
          jamMulai: jadwal.jamMulai,
          jamSelesai: jadwal.jamSelesai,
          kelasId: kelasMapelGuru.kelasId,
          guruId: kelasMapelGuru.guruId,
          kelasNama: kelas.nama,
          mapelNama: mapel.nama,
          guruNama: schoolUsers.name,
        })
        .from(jadwal)
        .innerJoin(kelasMapelGuru, eq(jadwal.kelasMapelGuruId, kelasMapelGuru.id))
        .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
        .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
        .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
        .where(eq(jadwal.hari, input.hari));

      for (const s of existingSchedules) {
        const isOverlap = s.jamMulai < input.jamSelesai && s.jamSelesai > input.jamMulai;
        if (isOverlap) {
          // Bentrok 1: Kelas yang sama sudah ada pelajaran di jam tersebut
          if (s.kelasId === kmgTarget.kelasId) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Jadwal bentrok: Kelas ${s.kelasNama} sudah memiliki pelajaran ${s.mapelNama} (${s.jamMulai} - ${s.jamSelesai}) pada hari ${input.hari}.`,
            });
          }
          // Bentrok 2: Guru yang sama sudah mengajar di kelas lain pada jam tersebut
          if (s.guruId === kmgTarget.guruId) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Jadwal bentrok: Guru ${s.guruNama} sudah terjadwal mengajar di Kelas ${s.kelasNama} (${s.jamMulai} - ${s.jamSelesai}) pada hari ${input.hari}.`,
            });
          }
        }
      }

      const [{ id }] = await db
        .insert(jadwal)
        .values(input)
        .returning({ id: jadwal.id });
      return { id };
    }),

  removeJadwal: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin", "guru"]);
      await getDb().delete(jadwal).where(eq(jadwal.id, input.id));
      return { success: true };
    }),

  // --------------------------------------------------------- orang tua-anak
  listOrtuLinks: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["admin"]);
    const db = getDb();
    const ortuAlias = schoolUsers;
    const rows = await db
      .select({
        id: orangTuaSiswa.id,
        orangTuaId: orangTuaSiswa.orangTuaId,
        siswaId: orangTuaSiswa.siswaId,
      })
      .from(orangTuaSiswa);
    const userIds = [
      ...new Set(rows.flatMap((r) => [r.orangTuaId, r.siswaId])),
    ];
    const users = userIds.length
      ? await db
          .select({ id: ortuAlias.id, name: ortuAlias.name })
          .from(ortuAlias)
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({
      ...r,
      ortuNama: nameById.get(r.orangTuaId) ?? "",
      siswaNama: nameById.get(r.siswaId) ?? "",
    }));
  }),

  linkOrtuSiswa: publicQuery
    .input(z.object({ orangTuaId: z.number(), siswaId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const ortu = await db
        .select({ role: schoolUsers.role })
        .from(schoolUsers)
        .where(eq(schoolUsers.id, input.orangTuaId))
        .limit(1);
      if (ortu.at(0)?.role !== "orang_tua") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User pertama harus ber-role orang tua.",
        });
      }
      const siswa = await db
        .select({ role: schoolUsers.role })
        .from(schoolUsers)
        .where(eq(schoolUsers.id, input.siswaId))
        .limit(1);
      if (siswa.at(0)?.role !== "siswa") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User kedua harus ber-role siswa.",
        });
      }
      const existing = await db
        .select({ id: orangTuaSiswa.id })
        .from(orangTuaSiswa)
        .where(
          and(
            eq(orangTuaSiswa.orangTuaId, input.orangTuaId),
            eq(orangTuaSiswa.siswaId, input.siswaId),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Relasi sudah ada." });
      }
      await db.insert(orangTuaSiswa).values(input);
      return { success: true };
    }),

  unlinkOrtuSiswa: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      await getDb().delete(orangTuaSiswa).where(eq(orangTuaSiswa.id, input.id));
      return { success: true };
    }),

  /** Siswa yang belum masuk kelas tertentu (untuk dropdown assign). */
  listSiswaNotInKelas: publicQuery
    .input(z.object({ kelasId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin", "guru"]);
      const db = getDb();
      const inKelas = await db
        .select({ siswaId: kelasSiswa.siswaId })
        .from(kelasSiswa)
        .where(eq(kelasSiswa.kelasId, input.kelasId));
      const ids = new Set(inKelas.map((r) => r.siswaId));
      const all = await db
        .select({
          id: schoolUsers.id,
          name: schoolUsers.name,
          email: schoolUsers.email,
        })
        .from(schoolUsers)
        .where(eq(schoolUsers.role, "siswa"))
        .orderBy(schoolUsers.name);
      return all.filter((u) => !ids.has(u.id));
    }),

  // ------------------------------------------------------------------ pengumuman
  listPengumuman: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["admin", "guru", "siswa", "orang_tua"]);
    const db = getDb();
    return db
      .select()
      .from(pengumuman)
      .orderBy(desc(pengumuman.pinned), desc(pengumuman.createdAt));
  }),

  createPengumuman: publicQuery
    .input(
      z.object({
        judul: z.string().min(3, "Judul minimal 3 karakter"),
        konten: z.string().min(5, "Isi pengumuman minimal 5 karakter"),
        kategori: z.enum(["Akademik", "Kegiatan", "Ujian", "Libur", "Umum"]),
        targetRole: z.enum(["semua", "guru", "siswa", "orang_tua"]),
        pinned: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const [{ id }] = await db
        .insert(pengumuman)
        .values({
          judul: input.judul,
          konten: input.konten,
          kategori: input.kategori,
          targetRole: input.targetRole,
          pinned: input.pinned,
          authorNama: user.name,
        })
        .returning({ id: pengumuman.id });
      return { id };
    }),

  deletePengumuman: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      await getDb().delete(pengumuman).where(eq(pengumuman.id, input.id));
      return { success: true };
    }),

  // ------------------------------------------------------------------ presensi summary
  presensiOverview: publicQuery
    .input(z.object({ tanggal: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const tgl = input.tanggal || new Date().toISOString().slice(0, 10);

      const rows = await db
        .select({
          id: presensi.id,
          tanggal: presensi.tanggal,
          status: presensi.status,
          catatan: presensi.catatan,
          siswaNama: schoolUsers.name,
          kelasNama: kelas.nama,
          mapelNama: mapel.nama,
        })
        .from(presensi)
        .innerJoin(schoolUsers, eq(presensi.siswaId, schoolUsers.id))
        .innerJoin(kelasMapelGuru, eq(presensi.kelasMapelGuruId, kelasMapelGuru.id))
        .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
        .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
        .where(eq(presensi.tanggal, tgl));

      const totalHadir = rows.filter((r) => r.status === "hadir").length;
      const totalSakit = rows.filter((r) => r.status === "sakit").length;
      const totalIzin = rows.filter((r) => r.status === "izin").length;
      const totalAlpa = rows.filter((r) => r.status === "alpa").length;

      return {
        tanggal: tgl,
        summary: { totalHadir, totalSakit, totalIzin, totalAlpa, total: rows.length },
        rows,
      };
    }),

  // ------------------------------------------------------------------ hari libur
  listHariLibur: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["admin", "guru", "siswa", "orang_tua"]);
    const db = getDb();
    const rows = await db
      .select()
      .from(hariLibur)
      .orderBy(hariLibur.tanggal);
    return rows;
  }),

  createHariLibur: publicQuery
    .input(
      z.object({
        tanggal: z.string().min(10, "Format tanggal YYYY-MM-DD"),
        nama: z.string().min(3, "Nama hari libur wajib diisi"),
        keterangan: z.string().optional(),
        tipe: z.enum(["nasional", "sekolah", "cuti_bersama"]).default("nasional"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const [{ id }] = await db
        .insert(hariLibur)
        .values({
          tanggal: input.tanggal,
          nama: input.nama,
          keterangan: input.keterangan,
          tipe: input.tipe,
        })
        .returning({ id: hariLibur.id });
      return { id };
    }),

  deleteHariLibur: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      await getDb().delete(hariLibur).where(eq(hariLibur.id, input.id));
      return { success: true };
    }),

  // ------------------------------------------------------------------ kelas pengganti
  listKelasPengganti: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["admin", "guru", "siswa", "orang_tua"]);
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
        guruNama: schoolUsers.name,
      })
      .from(kelasPengganti)
      .innerJoin(kelasMapelGuru, eq(kelasPengganti.kelasMapelGuruId, kelasMapelGuru.id))
      .innerJoin(kelas, eq(kelasMapelGuru.kelasId, kelas.id))
      .innerJoin(mapel, eq(kelasMapelGuru.mapelId, mapel.id))
      .innerJoin(schoolUsers, eq(kelasMapelGuru.guruId, schoolUsers.id))
      .orderBy(desc(kelasPengganti.tanggalPengganti));
    return rows;
  }),

  // ------------------------------------------------------------------ keuangan & spp
  listTagihan: publicQuery
    .input(
      z.object({
        status: z.enum(["semua", "belum_bayar", "menunggu_verifikasi", "lunas", "dibatalkan"]).optional(),
        kategori: z.enum(["semua", "SPP", "DSP_Gedung", "Ujian", "Kegiatan_Ekskul", "Seragam_Buku", "Lainnya"]).optional(),
        bulan: z.number().optional(),
        tahun: z.number().optional(),
        kelasId: z.number().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();

      const baseQuery = db
        .select({
          id: tagihanSiswa.id,
          siswaId: tagihanSiswa.siswaId,
          siswaNama: schoolUsers.name,
          siswaEmail: schoolUsers.email,
          kategori: tagihanSiswa.kategori,
          judul: tagihanSiswa.judul,
          nominal: tagihanSiswa.nominal,
          bulan: tagihanSiswa.bulan,
          tahun: tagihanSiswa.tahun,
          jatuhTempo: tagihanSiswa.jatuhTempo,
          status: tagihanSiswa.status,
          tanggalBayar: tagihanSiswa.tanggalBayar,
          metodeBayar: tagihanSiswa.metodeBayar,
          nomorTransaksi: tagihanSiswa.nomorTransaksi,
          catatan: tagihanSiswa.catatan,
          createdAt: tagihanSiswa.createdAt,
          kelasNama: kelas.nama,
        })
        .from(tagihanSiswa)
        .innerJoin(schoolUsers, eq(tagihanSiswa.siswaId, schoolUsers.id))
        .leftJoin(kelasSiswa, eq(schoolUsers.id, kelasSiswa.siswaId))
        .leftJoin(kelas, eq(kelasSiswa.kelasId, kelas.id))
        .orderBy(desc(tagihanSiswa.id));

      const rows = await baseQuery;

      return rows.filter((r) => {
        if (input?.status && input.status !== "semua" && r.status !== input.status) return false;
        if (input?.kategori && input.kategori !== "semua" && r.kategori !== input.kategori) return false;
        if (input?.bulan && r.bulan !== input.bulan) return false;
        if (input?.tahun && r.tahun !== input.tahun) return false;
        return true;
      });
    }),

  rekapKeuangan: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["admin"]);
    const db = getDb();
    const rows = await db.select().from(tagihanSiswa);

    const totalNominal = rows.reduce((acc, r) => acc + r.nominal, 0);
    const lunasNominal = rows
      .filter((r) => r.status === "lunas")
      .reduce((acc, r) => acc + r.nominal, 0);
    const menunggakNominal = rows
      .filter((r) => r.status === "belum_bayar")
      .reduce((acc, r) => acc + r.nominal, 0);
    const verifikasiNominal = rows
      .filter((r) => r.status === "menunggu_verifikasi")
      .reduce((acc, r) => acc + r.nominal, 0);

    const countLunas = rows.filter((r) => r.status === "lunas").length;
    const countMenunggu = rows.filter((r) => r.status === "menunggu_verifikasi").length;
    const countBelum = rows.filter((r) => r.status === "belum_bayar").length;

    const kolektibilitas =
      totalNominal > 0 ? Math.round((lunasNominal / totalNominal) * 100) : 0;

    return {
      totalNominal,
      lunasNominal,
      menunggakNominal,
      verifikasiNominal,
      countTotal: rows.length,
      countLunas,
      countMenunggu,
      countBelum,
      kolektibilitas,
    };
  }),

  createTagihan: publicQuery
    .input(
      z.object({
        siswaId: z.number(),
        kategori: z.enum(["SPP", "DSP_Gedung", "Ujian", "Kegiatan_Ekskul", "Seragam_Buku", "Lainnya"]),
        judul: z.string().min(1, "Judul tagihan wajib diisi"),
        nominal: z.number().min(1000, "Nominal minimal Rp 1.000"),
        bulan: z.number().nullable().optional(),
        tahun: z.number(),
        jatuhTempo: z.string().min(1, "Jatuh tempo wajib diisi"),
        catatan: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();
      const [{ id }] = await db
        .insert(tagihanSiswa)
        .values({
          siswaId: input.siswaId,
          kategori: input.kategori,
          judul: input.judul,
          nominal: input.nominal,
          bulan: input.bulan ?? null,
          tahun: input.tahun,
          jatuhTempo: input.jatuhTempo,
          catatan: input.catatan,
          status: "belum_bayar",
        })
        .returning({ id: tagihanSiswa.id });
      return { id };
    }),

  batchGenerateSPP: publicQuery
    .input(
      z.object({
        bulan: z.number().min(1).max(12),
        tahun: z.number(),
        nominal: z.number().min(1000),
        jatuhTempo: z.string(),
        kelasId: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();

      // Ambil daftar siswa target
      let targetSiswaIds: number[] = [];
      if (input.kelasId) {
        const rows = await db
          .select({ siswaId: kelasSiswa.siswaId })
          .from(kelasSiswa)
          .where(eq(kelasSiswa.kelasId, input.kelasId));
        targetSiswaIds = rows.map((r) => r.siswaId);
      } else {
        const rows = await db
          .select({ id: schoolUsers.id })
          .from(schoolUsers)
          .where(eq(schoolUsers.role, "siswa"));
        targetSiswaIds = rows.map((r) => r.id);
      }

      if (targetSiswaIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tidak ada siswa yang ditemukan untuk digenerate tagihan SPP.",
        });
      }

      // Poka-Yoke: Cek tagihan SPP yang sudah ada di bulan & tahun ini agar tidak duplikat
      const existing = await db
        .select({ siswaId: tagihanSiswa.siswaId })
        .from(tagihanSiswa)
        .where(
          and(
            eq(tagihanSiswa.kategori, "SPP"),
            eq(tagihanSiswa.bulan, input.bulan),
            eq(tagihanSiswa.tahun, input.tahun),
          ),
        );
      const existingSet = new Set(existing.map((e) => e.siswaId));

      const MONTH_NAMES = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
      ];
      const bulanNama = MONTH_NAMES[input.bulan - 1] ?? `Bulan ${input.bulan}`;

      const toInsert = targetSiswaIds
        .filter((sId) => !existingSet.has(sId))
        .map((sId) => ({
          siswaId: sId,
          kategori: "SPP" as const,
          judul: `SPP Bulan ${bulanNama} ${input.tahun}`,
          nominal: input.nominal,
          bulan: input.bulan,
          tahun: input.tahun,
          jatuhTempo: input.jatuhTempo,
          status: "belum_bayar" as const,
        }));

      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += 50) {
          await db.insert(tagihanSiswa).values(toInsert.slice(i, i + 50));
        }
      }

      return {
        totalTarget: targetSiswaIds.length,
        generated: toInsert.length,
        skippedExisting: targetSiswaIds.length - toInsert.length,
      };
    }),

  updateStatusTagihan: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["belum_bayar", "menunggu_verifikasi", "lunas", "dibatalkan"]),
        metodeBayar: z.string().optional(),
        tanggalBayar: z.string().optional(),
        catatan: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      const db = getDb();

      const updateData: any = {
        status: input.status,
      };

      if (input.status === "lunas") {
        updateData.tanggalBayar = input.tanggalBayar || new Date().toISOString().slice(0, 10);
        updateData.metodeBayar = input.metodeBayar || "Kasir / Verifikasi Admin";
        updateData.nomorTransaksi = `TR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(input.id).padStart(4, "0")}`;
      } else if (input.status === "belum_bayar") {
        updateData.tanggalBayar = null;
        updateData.metodeBayar = null;
        updateData.nomorTransaksi = null;
      }

      if (input.catatan !== undefined) {
        updateData.catatan = input.catatan;
      }

      await db.update(tagihanSiswa).set(updateData).where(eq(tagihanSiswa.id, input.id));
      return { success: true };
    }),

  deleteTagihan: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireSchoolUser(ctx, ["admin"]);
      await getDb().delete(tagihanSiswa).where(eq(tagihanSiswa.id, input.id));
      return { success: true };
    }),
});
