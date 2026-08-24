import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unionId: text("unionId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// LMS Sekolah — skema inti (lihat PRD section 12)
// ============================================================================

/** User aplikasi LMS: Admin, Guru, Siswa, Orang Tua (login email+password). */
export const schoolUsers = sqliteTable("school_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  role: text("role", { enum: ["admin", "guru", "siswa", "orang_tua"] }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type SchoolUser = typeof schoolUsers.$inferSelect;
export type SchoolRole = "admin" | "guru" | "siswa" | "orang_tua";

/** Kelas (rombel). Wali kelas bersifat administratif. */
export const kelas = sqliteTable("kelas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull(),
  waliKelasId: integer("waliKelasId")
    .notNull()
    .references(() => schoolUsers.id),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type Kelas = typeof kelas.$inferSelect;

/** Mata pelajaran. */
export const mapel = sqliteTable("mapel", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nama: text("nama").notNull().unique(),
});

export type Mapel = typeof mapel.$inferSelect;

/**
 * Relasi inti: "guru X mengajar mapel Y di kelas Z" (Kelas_Mapel_Guru).
 */
export const kelasMapelGuru = sqliteTable(
  "kelas_mapel_guru",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kelasId: integer("kelasId")
      .notNull()
      .references(() => kelas.id),
    mapelId: integer("mapelId")
      .notNull()
      .references(() => mapel.id),
    guruId: integer("guruId")
      .notNull()
      .references(() => schoolUsers.id),
  },
  (table) => ({
    uniqKelasMapel: uniqueIndex("uniq_kelas_mapel").on(
      table.kelasId,
      table.mapelId,
    ),
  }),
);

export type KelasMapelGuru = typeof kelasMapelGuru.$inferSelect;

/** Relasi many-to-many kelas ↔ siswa. */
export const kelasSiswa = sqliteTable(
  "kelas_siswa",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kelasId: integer("kelasId")
      .notNull()
      .references(() => kelas.id),
    siswaId: integer("siswaId")
      .notNull()
      .references(() => schoolUsers.id),
  },
  (table) => ({
    uniqKelasSiswa: uniqueIndex("uniq_kelas_siswa").on(
      table.kelasId,
      table.siswaId,
    ),
  }),
);

export type KelasSiswa = typeof kelasSiswa.$inferSelect;

/** Relasi many-to-many orang tua ↔ siswa (1 orang tua bisa >1 anak). */
export const orangTuaSiswa = sqliteTable(
  "orang_tua_siswa",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orangTuaId: integer("orangTuaId")
      .notNull()
      .references(() => schoolUsers.id),
    siswaId: integer("siswaId")
      .notNull()
      .references(() => schoolUsers.id),
  },
  (table) => ({
    uniqOrtuSiswa: uniqueIndex("uniq_ortu_siswa").on(
      table.orangTuaId,
      table.siswaId,
    ),
  }),
);

export type OrangTuaSiswa = typeof orangTuaSiswa.$inferSelect;

/** Tugas terikat ke kombinasi kelas-mapel-guru spesifik. */
export const tugas = sqliteTable("tugas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kelasMapelGuruId: integer("kelasMapelGuruId")
    .notNull()
    .references(() => kelasMapelGuru.id),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),
  deadline: integer("deadline", { mode: "timestamp" }).notNull(),
  lampiranNama: text("lampiranNama"),
  lampiranData: text("lampiranData"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type Tugas = typeof tugas.$inferSelect;

/** Submission siswa. */
export const submission = sqliteTable(
  "submission",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tugasId: integer("tugasId")
      .notNull()
      .references(() => tugas.id),
    siswaId: integer("siswaId")
      .notNull()
      .references(() => schoolUsers.id),
    isiText: text("isiText"),
    fileNama: text("fileNama"),
    fileData: text("fileData"),
    fileMime: text("fileMime"),
    waktuSubmit: integer("waktuSubmit", { mode: "timestamp" })
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  (table) => ({
    uniqTugasSiswa: uniqueIndex("uniq_tugas_siswa").on(
      table.tugasId,
      table.siswaId,
    ),
  }),
);

export type Submission = typeof submission.$inferSelect;

/** Nilai per submission. */
export const nilai = sqliteTable("nilai", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submissionId")
    .notNull()
    .unique()
    .references(() => submission.id),
  nilai: integer("nilai"),
  feedback: text("feedback"),
  guruId: integer("guruId")
    .notNull()
    .references(() => schoolUsers.id),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type Nilai = typeof nilai.$inferSelect;

/** Jadwal mingguan per kombinasi kelas-mapel. */
export const jadwal = sqliteTable("jadwal", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kelasMapelGuruId: integer("kelasMapelGuruId")
    .notNull()
    .references(() => kelasMapelGuru.id),
  hari: text("hari", {
    enum: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  }).notNull(),
  jamMulai: text("jamMulai").notNull(),
  jamSelesai: text("jamSelesai").notNull(),
});

export type Jadwal = typeof jadwal.$inferSelect;

// ============================================================================
// Fitur Tambahan Operasional Sekolah Nyata (Pengumuman, Materi, Presensi)
// ============================================================================

/** Papan Pengumuman Sekolah & Surat Edaran. */
export const pengumuman = sqliteTable("pengumuman", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  judul: text("judul").notNull(),
  konten: text("konten").notNull(),
  kategori: text("kategori", {
    enum: ["Akademik", "Kegiatan", "Ujian", "Libur", "Umum"],
  }).default("Umum").notNull(),
  targetRole: text("targetRole", {
    enum: ["semua", "guru", "siswa", "orang_tua"],
  }).default("semua").notNull(),
  authorNama: text("authorNama").default("Admin Sekolah").notNull(),
  pinned: integer("pinned", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type Pengumuman = typeof pengumuman.$inferSelect;

/** Materi Pembelajaran & Modul Ajar Digital (E-Library / Modul Guru). */
export const materi = sqliteTable("materi", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kelasMapelGuruId: integer("kelasMapelGuruId")
    .notNull()
    .references(() => kelasMapelGuru.id),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),
  fileNama: text("fileNama"),
  fileData: text("fileData"),
  fileMime: text("fileMime"),
  linkUrl: text("linkUrl"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type Materi = typeof materi.$inferSelect;

/** Presensi / Absensi Harian Siswa per Sesi Pembelajaran. */
export const presensi = sqliteTable(
  "presensi",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kelasMapelGuruId: integer("kelasMapelGuruId")
      .notNull()
      .references(() => kelasMapelGuru.id),
    siswaId: integer("siswaId")
      .notNull()
      .references(() => schoolUsers.id),
    tanggal: text("tanggal").notNull(), // Format YYYY-MM-DD
    status: text("status", {
      enum: ["hadir", "sakit", "izin", "alpa"],
    }).default("hadir").notNull(),
    catatan: text("catatan"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  (table) => ({
    uniqPresensiSiswa: uniqueIndex("uniq_presensi_siswa").on(
      table.kelasMapelGuruId,
      table.siswaId,
      table.tanggal,
    ),
  }),
);

export type Presensi = typeof presensi.$inferSelect;

/** Kalender Hari Libur Nasional, Cuti Bersama, & Libur Akademik Sekolah. */
export const hariLibur = sqliteTable("hari_libur", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tanggal: text("tanggal").notNull(), // Format YYYY-MM-DD
  nama: text("nama").notNull(),
  keterangan: text("keterangan"),
  tipe: text("tipe", {
    enum: ["nasional", "sekolah", "cuti_bersama"],
  }).default("nasional").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type HariLibur = typeof hariLibur.$inferSelect;

/** Jadwal Sesi Kelas Pengganti (Make-up Class) untuk sesi yang terbentur hari libur. */
export const kelasPengganti = sqliteTable("kelas_pengganti", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kelasMapelGuruId: integer("kelasMapelGuruId")
    .notNull()
    .references(() => kelasMapelGuru.id),
  tanggalAsli: text("tanggalAsli").notNull(), // Tanggal sesi reguler yang libur
  tanggalPengganti: text("tanggalPengganti").notNull(), // Tanggal pelaksanaan sesi pengganti
  jamMulai: text("jamMulai").notNull(),
  jamSelesai: text("jamSelesai").notNull(),
  ruang: text("ruang"),
  alasan: text("alasan"),
  status: text("status", {
    enum: ["dijadwalkan", "selesai", "dibatalkan"],
  }).default("dijadwalkan").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type KelasPengganti = typeof kelasPengganti.$inferSelect;

/** Administrasi Keuangan, SPP & Tagihan Pendidikan Siswa */
export const tagihanSiswa = sqliteTable("tagihan_siswa", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siswaId: integer("siswaId")
    .notNull()
    .references(() => schoolUsers.id),
  kategori: text("kategori", {
    enum: ["SPP", "DSP_Gedung", "Ujian", "Kegiatan_Ekskul", "Seragam_Buku", "Lainnya"],
  }).default("SPP").notNull(),
  judul: text("judul").notNull(),
  nominal: integer("nominal").notNull(),
  bulan: integer("bulan"),
  tahun: integer("tahun").notNull(),
  jatuhTempo: text("jatuhTempo").notNull(),
  status: text("status", {
    enum: ["belum_bayar", "menunggu_verifikasi", "lunas", "dibatalkan"],
  }).default("belum_bayar").notNull(),
  tanggalBayar: text("tanggalBayar"),
  metodeBayar: text("metodeBayar"),
  nomorTransaksi: text("nomorTransaksi"),
  catatan: text("catatan"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type TagihanSiswa = typeof tagihanSiswa.$inferSelect;
export type InsertTagihanSiswa = typeof tagihanSiswa.$inferInsert;

/** ============================================================================
 * CBT (Computer-Based Testing) & Kuis Online Interaktif
 * ============================================================================ */

/** Paket Ujian / Kuis Online Guru */
export const ujian = sqliteTable("ujian", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kelasMapelGuruId: integer("kelasMapelGuruId")
    .notNull()
    .references(() => kelasMapelGuru.id),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),
  kategori: text("kategori", {
    enum: ["Kuis_Harian", "PTS_UTS", "PAS_UAS", "Tryout"],
  }).default("Kuis_Harian").notNull(),
  durasiMenit: integer("durasiMenit").default(30).notNull(), // Durasi pengerjaan dalam menit
  kkm: integer("kkm").default(75).notNull(),
  tanggalMulai: text("tanggalMulai").notNull(), // YYYY-MM-DD HH:mm
  tanggalSelesai: text("tanggalSelesai").notNull(), // YYYY-MM-DD HH:mm
  acakSoal: integer("acakSoal", { mode: "boolean" }).default(false).notNull(),
  tampilkanHasil: integer("tampilkanHasil", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type Ujian = typeof ujian.$inferSelect;
export type InsertUjian = typeof ujian.$inferInsert;

/** Bank Soal Pilihan Ganda CBT */
export const soalUjian = sqliteTable("soal_ujian", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ujianId: integer("ujianId")
    .notNull()
    .references(() => ujian.id),
  nomorUrut: integer("nomorUrut").notNull(),
  pertanyaan: text("pertanyaan").notNull(),
  pilihanA: text("pilihanA").notNull(),
  pilihanB: text("pilihanB").notNull(),
  pilihanC: text("pilihanC").notNull(),
  pilihanD: text("pilihanD").notNull(),
  kunciJawaban: text("kunciJawaban", { enum: ["A", "B", "C", "D"] }).notNull(),
  pembahasan: text("pembahasan"),
  poin: integer("poin").default(20).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type SoalUjian = typeof soalUjian.$inferSelect;
export type InsertSoalUjian = typeof soalUjian.$inferInsert;

/** Rekaman Peserta & Hasil Ujian Siswa */
export const ujianSiswa = sqliteTable(
  "ujian_siswa",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ujianId: integer("ujianId")
      .notNull()
      .references(() => ujian.id),
    siswaId: integer("siswaId")
      .notNull()
      .references(() => schoolUsers.id),
    status: text("status", {
      enum: ["belum_mulai", "sedang_mengerjakan", "selesai"],
    }).default("belum_mulai").notNull(),
    waktuMulai: integer("waktuMulai", { mode: "timestamp" }),
    waktuSelesai: integer("waktuSelesai", { mode: "timestamp" }),
    nilai: integer("nilai"), // Nilai skala 0-100
    totalBenar: integer("totalBenar").default(0).notNull(),
    totalSalah: integer("totalSalah").default(0).notNull(),
    jawabanJson: text("jawabanJson"), // JSON string record { [soalId]: "A" | "B" | "C" | "D" }
    pelanggaranTab: integer("pelanggaranTab").default(0).notNull(), // Counter pindah tab
    createdAt: integer("createdAt", { mode: "timestamp" })
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
  },
  (table) => ({
    uniqUjianSiswa: uniqueIndex("uniq_ujian_siswa").on(
      table.ujianId,
      table.siswaId,
    ),
  }),
);

export type UjianSiswa = typeof ujianSiswa.$inferSelect;
export type InsertUjianSiswa = typeof ujianSiswa.$inferInsert;
