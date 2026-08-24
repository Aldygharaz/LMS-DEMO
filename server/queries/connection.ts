// @ts-nocheck
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../../db/schema";

import { env } from "../lib/env";

const url = env.databaseUrl || "file:local.db";
const authToken = env.databaseAuthToken;

const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

/** Auto-create SQLite tables if they do not exist and seed initial demo data */
export async function ensureDbInitialized() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unionId TEXT NOT NULL UNIQUE,
      name TEXT,
      email TEXT,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updatedAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      lastSignInAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS school_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS kelas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      waliKelasId INTEGER NOT NULL REFERENCES school_users(id),
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS mapel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS kelas_mapel_guru (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelasId INTEGER NOT NULL REFERENCES kelas(id),
      mapelId INTEGER NOT NULL REFERENCES mapel(id),
      guruId INTEGER NOT NULL REFERENCES school_users(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_kelas_mapel ON kelas_mapel_guru(kelasId, mapelId);
    CREATE TABLE IF NOT EXISTS kelas_siswa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelasId INTEGER NOT NULL REFERENCES kelas(id),
      siswaId INTEGER NOT NULL REFERENCES school_users(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_kelas_siswa ON kelas_siswa(kelasId, siswaId);
    CREATE TABLE IF NOT EXISTS orang_tua_siswa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orangTuaId INTEGER NOT NULL REFERENCES school_users(id),
      siswaId INTEGER NOT NULL REFERENCES school_users(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_ortu_siswa ON orang_tua_siswa(orangTuaId, siswaId);
    CREATE TABLE IF NOT EXISTS tugas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelasMapelGuruId INTEGER NOT NULL REFERENCES kelas_mapel_guru(id),
      judul TEXT NOT NULL,
      deskripsi TEXT,
      deadline INTEGER NOT NULL,
      lampiranNama TEXT,
      lampiranData TEXT,
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS submission (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tugasId INTEGER NOT NULL REFERENCES tugas(id),
      siswaId INTEGER NOT NULL REFERENCES school_users(id),
      isiText TEXT,
      fileNama TEXT,
      fileData TEXT,
      fileMime TEXT,
      waktuSubmit INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_tugas_siswa ON submission(tugasId, siswaId);
    CREATE TABLE IF NOT EXISTS nilai (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submissionId INTEGER NOT NULL UNIQUE REFERENCES submission(id),
      nilai INTEGER,
      feedback TEXT,
      guruId INTEGER NOT NULL REFERENCES school_users(id),
      updatedAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS jadwal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelasMapelGuruId INTEGER NOT NULL REFERENCES kelas_mapel_guru(id),
      hari TEXT NOT NULL,
      jamMulai TEXT NOT NULL,
      jamSelesai TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pengumuman (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      konten TEXT NOT NULL,
      kategori TEXT NOT NULL DEFAULT 'Umum',
      targetRole TEXT NOT NULL DEFAULT 'semua',
      authorNama TEXT NOT NULL DEFAULT 'Admin Sekolah',
      pinned INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS materi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelasMapelGuruId INTEGER NOT NULL REFERENCES kelas_mapel_guru(id),
      judul TEXT NOT NULL,
      deskripsi TEXT,
      fileNama TEXT,
      fileData TEXT,
      fileMime TEXT,
      linkUrl TEXT,
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS presensi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelasMapelGuruId INTEGER NOT NULL REFERENCES kelas_mapel_guru(id),
      siswaId INTEGER NOT NULL REFERENCES school_users(id),
      tanggal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'hadir',
      catatan TEXT,
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_presensi_siswa ON presensi(kelasMapelGuruId, siswaId, tanggal);
    CREATE TABLE IF NOT EXISTS hari_libur (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      nama TEXT NOT NULL,
      keterangan TEXT,
      tipe TEXT NOT NULL DEFAULT 'nasional',
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS kelas_pengganti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelasMapelGuruId INTEGER NOT NULL REFERENCES kelas_mapel_guru(id),
      tanggalAsli TEXT NOT NULL,
      tanggalPengganti TEXT NOT NULL,
      jamMulai TEXT NOT NULL,
      jamSelesai TEXT NOT NULL,
      ruang TEXT,
      alasan TEXT,
      status TEXT NOT NULL DEFAULT 'dijadwalkan',
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS tagihan_siswa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      siswaId INTEGER NOT NULL REFERENCES school_users(id),
      kategori TEXT NOT NULL DEFAULT 'SPP',
      judul TEXT NOT NULL,
      nominal INTEGER NOT NULL,
      bulan INTEGER,
      tahun INTEGER NOT NULL,
      jatuhTempo TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'belum_bayar',
      tanggalBayar TEXT,
      metodeBayar TEXT,
      nomorTransaksi TEXT,
      catatan TEXT,
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS ujian (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelasMapelGuruId INTEGER NOT NULL REFERENCES kelas_mapel_guru(id),
      judul TEXT NOT NULL,
      deskripsi TEXT,
      kategori TEXT NOT NULL DEFAULT 'Kuis_Harian',
      durasiMenit INTEGER NOT NULL DEFAULT 30,
      kkm INTEGER NOT NULL DEFAULT 75,
      tanggalMulai TEXT NOT NULL,
      tanggalSelesai TEXT NOT NULL,
      acakSoal INTEGER NOT NULL DEFAULT 0,
      tampilkanHasil INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS soal_ujian (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ujianId INTEGER NOT NULL REFERENCES ujian(id),
      nomorUrut INTEGER NOT NULL,
      pertanyaan TEXT NOT NULL,
      pilihanA TEXT NOT NULL,
      pilihanB TEXT NOT NULL,
      pilihanC TEXT NOT NULL,
      pilihanD TEXT NOT NULL,
      kunciJawaban TEXT NOT NULL,
      pembahasan TEXT,
      poin INTEGER NOT NULL DEFAULT 20,
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE TABLE IF NOT EXISTS ujian_siswa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ujianId INTEGER NOT NULL REFERENCES ujian(id),
      siswaId INTEGER NOT NULL REFERENCES school_users(id),
      status TEXT NOT NULL DEFAULT 'belum_mulai',
      waktuMulai INTEGER,
      waktuSelesai INTEGER,
      nilai INTEGER,
      totalBenar INTEGER NOT NULL DEFAULT 0,
      totalSalah INTEGER NOT NULL DEFAULT 0,
      jawabanJson TEXT,
      pelanggaranTab INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_ujian_siswa ON ujian_siswa(ujianId, siswaId);
  `);

  const existing = await client.execute(
    "SELECT id FROM school_users WHERE email = 'admin@sekolah.demo' LIMIT 1",
  );

  if (existing.rows.length === 0) {
    const { populate150StudentsData } = await import("../../db/seedLarge");
    await populate150StudentsData();
  }
}

export function getDb() {
  return db;
}
