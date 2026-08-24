import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  kelas,
  kelasMapelGuru,
  kelasSiswa,
  mapel,
  orangTuaSiswa,
  pengumuman,
  presensi,
  schoolUsers,
  hariLibur,
  kelasPengganti,
  tagihanSiswa,
  ujian,
  ujianSiswa,
} from "@db/schema";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { requireSchoolUser } from "./auth";
import { getSiswaGrades, getSiswaOverview } from "./queries";

/** Pastikan siswa memang anak yang terhubung ke orang tua ini (FR-2). */
async function requireLinkedChild(orangTuaId: number, siswaId: number) {
  const db = getDb();
  const rows = await db
    .select({ id: orangTuaSiswa.id })
    .from(orangTuaSiswa)
    .where(
      and(
        eq(orangTuaSiswa.orangTuaId, orangTuaId),
        eq(orangTuaSiswa.siswaId, siswaId),
      ),
    )
    .limit(1);
  if (rows.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Siswa ini tidak terhubung ke akun Anda.",
    });
  }
}

export const ortuRouter = createRouter({
  /** Daftar anak yang terhubung (mendukung >1 anak, FR-15). */
  myChildren: publicQuery.query(async ({ ctx }) => {
    const user = await requireSchoolUser(ctx, ["orang_tua"]);
    return getDb()
      .select({ id: schoolUsers.id, name: schoolUsers.name })
      .from(orangTuaSiswa)
      .innerJoin(schoolUsers, eq(orangTuaSiswa.siswaId, schoolUsers.id))
      .where(eq(orangTuaSiswa.orangTuaId, user.id))
      .orderBy(schoolUsers.name);
  }),

  childDashboard: publicQuery
    .input(z.object({ siswaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["orang_tua"]);
      await requireLinkedChild(user.id, input.siswaId);
      return getSiswaOverview(input.siswaId);
    }),

  childGrades: publicQuery
    .input(z.object({ siswaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["orang_tua"]);
      await requireLinkedChild(user.id, input.siswaId);
      return getSiswaGrades(input.siswaId);
    }),

  childPresensi: publicQuery
    .input(z.object({ siswaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["orang_tua"]);
      await requireLinkedChild(user.id, input.siswaId);
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
        .where(eq(presensi.siswaId, input.siswaId))
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

  listPengumuman: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["orang_tua"]);
    const db = getDb();
    return db
      .select()
      .from(pengumuman)
      .where(inArray(pengumuman.targetRole, ["semua", "orang_tua"]))
      .orderBy(desc(pengumuman.pinned), desc(pengumuman.createdAt));
  }),

  // ------------------------------------------------------------------ hari libur
  listHariLibur: publicQuery.query(async ({ ctx }) => {
    await requireSchoolUser(ctx, ["orang_tua"]);
    const db = getDb();
    const rows = await db
      .select()
      .from(hariLibur)
      .orderBy(hariLibur.tanggal);
    return rows;
  }),

  // ------------------------------------------------------------------ kelas pengganti anak
  childKelasPengganti: publicQuery
    .input(z.object({ siswaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["orang_tua"]);
      await requireLinkedChild(user.id, input.siswaId);
      const db = getDb();

      // Dapatkan rombel anak
      const childClasses = await db
        .select({ kelasId: kelasSiswa.kelasId })
        .from(kelasSiswa)
        .where(eq(kelasSiswa.siswaId, input.siswaId));

      if (childClasses.length === 0) return [];

      const kelasIds = childClasses.map((c) => c.kelasId);

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

  // ------------------------------------------------------------------ keuangan & tagihan anak
  childTagihanList: publicQuery
    .input(z.object({ siswaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["orang_tua"]);
      await requireLinkedChild(user.id, input.siswaId);
      const db = getDb();

      const rows = await db
        .select()
        .from(tagihanSiswa)
        .where(eq(tagihanSiswa.siswaId, input.siswaId))
        .orderBy(desc(tagihanSiswa.id));

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

      return {
        rows,
        summary: {
          totalNominal,
          lunasNominal,
          menunggakNominal,
          verifikasiNominal,
          countLunas: rows.filter((r) => r.status === "lunas").length,
          countBelum: rows.filter((r) => r.status === "belum_bayar").length,
          countMenunggu: rows.filter((r) => r.status === "menunggu_verifikasi").length,
        },
      };
    }),

  submitBuktiBayar: publicQuery
    .input(
      z.object({
        tagihanId: z.number(),
        siswaId: z.number(),
        metodeBayar: z.string().min(1, "Metode pembayaran wajib dipilih"),
        catatan: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["orang_tua"]);
      await requireLinkedChild(user.id, input.siswaId);
      const db = getDb();

      // Verifikasi tagihan memang milik siswa ini
      const tagihan = await db
        .select()
        .from(tagihanSiswa)
        .where(and(eq(tagihanSiswa.id, input.tagihanId), eq(tagihanSiswa.siswaId, input.siswaId)))
        .limit(1);

      if (tagihan.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Data tagihan tidak ditemukan.",
        });
      }

      await db
        .update(tagihanSiswa)
        .set({
          status: "menunggu_verifikasi",
          metodeBayar: input.metodeBayar,
          tanggalBayar: new Date().toISOString().slice(0, 10),
          nomorTransaksi: `TR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(input.tagihanId).padStart(4, "0")}`,
          catatan: input.catatan || "Konfirmasi pembayaran dikirim oleh wali murid via portal orang tua.",
        })
        .where(eq(tagihanSiswa.id, input.tagihanId));

      return { success: true };
    }),

  // ================================================================== CBT Ujian & Kuis Anak
  childUjianList: publicQuery
    .input(z.object({ siswaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["orang_tua"]);
      await requireLinkedChild(user.id, input.siswaId);
      const db = getDb();

      // Rombel anak
      const childClasses = await db
        .select({ kelasId: kelasSiswa.kelasId })
        .from(kelasSiswa)
        .where(eq(kelasSiswa.siswaId, input.siswaId));

      if (childClasses.length === 0) return [];
      const kelasIds = childClasses.map((c) => c.kelasId);

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
      const childResults = examIds.length
        ? await db
            .select()
            .from(ujianSiswa)
            .where(and(inArray(ujianSiswa.ujianId, examIds), eq(ujianSiswa.siswaId, input.siswaId)))
        : [];

      const resultMap = new Map<number, typeof childResults[0]>();
      for (const r of childResults) {
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

  // ================================================================== E-RAPOR RESMI ANAK
  childOfficialRapor: publicQuery
    .input(z.object({ siswaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await requireSchoolUser(ctx, ["orang_tua"]);
      await requireLinkedChild(user.id, input.siswaId);
      const db = getDb();

      // Data siswa
      const [childUser] = await db
        .select()
        .from(schoolUsers)
        .where(eq(schoolUsers.id, input.siswaId))
        .limit(1);

      if (!childUser) throw new TRPCError({ code: "NOT_FOUND", message: "Data anak tidak ditemukan." });

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
        .where(eq(kelasSiswa.siswaId, input.siswaId))
        .limit(1);

      // Rekap nilai seluruh mata pelajaran
      const grades = await getSiswaGrades(input.siswaId);

      // Rekap presensi
      const presensiRows = await db
        .select({ status: presensi.status })
        .from(presensi)
        .where(eq(presensi.siswaId, input.siswaId));

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
        .where(and(eq(ujianSiswa.siswaId, input.siswaId), eq(ujianSiswa.status, "selesai")));

      const validCbt = cbtRows.map((c) => c.nilai).filter((n): n is number => n !== null);
      const avgCbt = validCbt.length > 0 ? Math.round(validCbt.reduce((a, b) => a + b, 0) / validCbt.length) : null;

      return {
        student: {
          id: childUser.id,
          name: childUser.name,
          email: childUser.email,
          nisn: `00${childUser.id + 8392019}`,
          nis: `2026${String(childUser.id).padStart(4, "0")}`,
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
