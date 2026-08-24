import { getDb } from "../api/queries/connection";
import { hashPassword } from "../api/school/auth";
import {
  jadwal,
  kelas,
  kelasMapelGuru,
  kelasSiswa,
  mapel,
  nilai,
  orangTuaSiswa,
  pengumuman,
  presensi,
  schoolUsers,
  submission,
  tugas,
  materi,
  hariLibur,
  kelasPengganti,
  tagihanSiswa,
  ujian,
  soalUjian,
  ujianSiswa,
} from "./schema";

const PASSWORD = "password123";
const DAY = 24 * 60 * 60 * 1000;

export async function populate150StudentsData() {
  const db = getDb();
  console.log("Memulai pengisian 150 siswa & ekosistem sekolah lengkap...");

  const hash = await hashPassword(PASSWORD);

  // 1. Bersihkan data demo lama jika ada
  await db.delete(kelasPengganti);
  await db.delete(hariLibur);
  await db.delete(presensi);
  await db.delete(nilai);
  await db.delete(submission);
  await db.delete(tugas);
  await db.delete(materi);
  await db.delete(jadwal);
  await db.delete(kelasMapelGuru);
  await db.delete(orangTuaSiswa);
  await db.delete(kelasSiswa);
  await db.delete(kelas);
  await db.delete(mapel);
  await db.delete(pengumuman);
  await db.delete(schoolUsers);

  console.log("Tabel lama telah dibersihkan.");

  // 2. Admin
  await db.insert(schoolUsers).values({
    name: "Admin Sekolah",
    email: "admin@sekolah.demo",
    passwordHash: hash,
    role: "admin",
  });

  // 3. Guru (15 Guru Mata Pelajaran & Wali Kelas)
  const guruList = [
    { name: "Budi Santoso, S.Pd.", email: "budi@sekolah.demo", mapel: "Matematika" },
    { name: "Siti Rahma, S.Pd.", email: "siti@sekolah.demo", mapel: "Bahasa Indonesia" },
    { name: "Agus Wijaya, M.Pd.", email: "agus@sekolah.demo", mapel: "Fisika" },
    { name: "Rina Wijaya, S.Pd.", email: "rina@sekolah.demo", mapel: "Bahasa Inggris" },
    { name: "Hendra Kurniawan, S.Pd.", email: "hendra@sekolah.demo", mapel: "Kimia" },
    { name: "Nurul Hidayah, S.Si.", email: "nurul@sekolah.demo", mapel: "Biologi" },
    { name: "Bambang Pamungkas, M.Pd.", email: "bambang.p@sekolah.demo", mapel: "Sejarah Indonesia" },
    { name: "Ratna Sari, S.E.", email: "ratna@sekolah.demo", mapel: "Ekonomi" },
    { name: "Wahyu Pratama, S.Pd.", email: "wahyu@sekolah.demo", mapel: "Geografi" },
    { name: "Indah Permatasari, S.Sos.", email: "indah@sekolah.demo", mapel: "Sosiologi" },
    { name: "Dian Kartika, S.Sn.", email: "dian@sekolah.demo", mapel: "Seni Budaya" },
    { name: "Doni Prasetyo, S.Pd.", email: "doni@sekolah.demo", mapel: "Penjasorkes" },
    { name: "Eko Nugroho, S.Kom.", email: "eko@sekolah.demo", mapel: "Informatika" },
    { name: "Sri Lestari, M.Pd.", email: "sri@sekolah.demo", mapel: "PPKn" },
    { name: "Maya Anggraini, S.Psi.", email: "maya@sekolah.demo", mapel: "Bimbingan Konseling" },
  ];

  const guruIdMap: Record<string, number> = {};
  for (const g of guruList) {
    const [{ id }] = await db
      .insert(schoolUsers)
      .values({ name: g.name, email: g.email, passwordHash: hash, role: "guru" })
      .returning({ id: schoolUsers.id });
    guruIdMap[g.email] = id;
  }

  // 4. Mata Pelajaran
  const mapelNames = [
    "Matematika",
    "Bahasa Indonesia",
    "Bahasa Inggris",
    "Fisika",
    "Kimia",
    "Biologi",
    "Sejarah Indonesia",
    "Ekonomi",
    "Geografi",
    "Sosiologi",
    "Informatika",
    "PPKn",
    "Penjasorkes",
    "Seni Budaya",
  ];

  const mapelIdMap: Record<string, number> = {};
  for (const m of mapelNames) {
    const [{ id }] = await db
      .insert(mapel)
      .values({ nama: m })
      .returning({ id: mapel.id });
    mapelIdMap[m] = id;
  }

  // 5. Kelas (5 Rombel untuk 1 Angkatan 150 Siswa = 30 Siswa / Rombel)
  const kelasData = [
    { nama: "10 IPA 1", waliId: guruIdMap["budi@sekolah.demo"] },
    { nama: "10 IPA 2", waliId: guruIdMap["siti@sekolah.demo"] },
    { nama: "10 IPA 3", waliId: guruIdMap["agus@sekolah.demo"] },
    { nama: "10 IPS 1", waliId: guruIdMap["rina@sekolah.demo"] },
    { nama: "10 IPS 2", waliId: guruIdMap["hendra@sekolah.demo"] },
  ];

  const kelasIdMap: Record<string, number> = {};
  for (const k of kelasData) {
    const [{ id }] = await db
      .insert(kelas)
      .values({ nama: k.nama, waliKelasId: k.waliId })
      .returning({ id: kelas.id });
    kelasIdMap[k.nama] = id;
  }

  // 6. 150 Siswa (1 Angkatan Kelas 10)
  const FIRST_NAMES = [
    "Andi", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hafiz", "Intan", "Joko", "Kirana",
    "Lutfi", "Maulana", "Nabila", "Oscar", "Putri", "Qori", "Rian", "Salsabila", "Taufik", "Utami",
    "Vino", "Wulan", "Xavier", "Yoga", "Zahra", "Aditya", "Bella", "Cahyo", "Dian", "Erlangga",
    "Fitri", "Galih", "Hanif", "Irfan", "Jessica", "Kevin", "Laras", "Mirza", "Nadia", "Okto",
    "Pandu", "Qonita", "Rafi", "Sinta", "Tommy", "Umar", "Vina", "Wahyu", "Yusuf", "Zulfa",
  ];
  const LAST_NAMES = [
    "Pratama", "Lestari", "Saputra", "Nurhaliza", "Ramadhan", "Maharani", "Kurniawan", "Sari",
    "Santoso", "Hidayat", "Wijaya", "Kusuma", "Permana", "Utama", "Setiawan", "Putra", "Putri",
    "Nugroho", "Wibowo", "Siregar", "Nasution", "Firmansyah", "Gunawan", "Handayani", "Wahyudi",
    "Anggraini", "Susanto", "Wardhana", "Hermawan", "Pangestu", "Subagyo", "Mahendra", "Saputri",
  ];

  // Buat 150 nama unik
  const studentNames: string[] = [
    "Andi Pratama",
    "Citra Lestari",
    "Dimas Saputra",
    "Eka Nurhaliza",
    "Fajar Ramadhan",
    "Gita Maharani",
  ];

  let fnIdx = 6;
  let lnIdx = 6;
  while (studentNames.length < 150) {
    const fn = FIRST_NAMES[fnIdx % FIRST_NAMES.length];
    const ln = LAST_NAMES[lnIdx % LAST_NAMES.length];
    const num = Math.floor(studentNames.length / 50) > 0 ? ` ${Math.floor(studentNames.length / 50) + 1}` : "";
    const candidate = `${fn} ${ln}${num}`;
    if (!studentNames.includes(candidate)) {
      studentNames.push(candidate);
    }
    fnIdx++;
    lnIdx += 2;
  }

  const studentUserIds: number[] = [];
  const studentEmailMap: Record<number, string> = {};

  for (let i = 0; i < studentNames.length; i++) {
    const name = studentNames[i];
    let email = "";
    if (i === 0) email = "andi@sekolah.demo";
    else if (i === 1) email = "citra@sekolah.demo";
    else if (i === 2) email = "dimas@sekolah.demo";
    else if (i === 3) email = "eka@sekolah.demo";
    else if (i === 4) email = "fajar@sekolah.demo";
    else if (i === 5) email = "gita@sekolah.demo";
    else {
      const clean = name.toLowerCase().replace(/[^a-z]/g, "");
      email = `${clean}${i + 1}@sekolah.demo`;
    }

    const [{ id }] = await db
      .insert(schoolUsers)
      .values({ name, email, passwordHash: hash, role: "siswa" })
      .returning({ id: schoolUsers.id });
    studentUserIds.push(id);
    studentEmailMap[id] = email;
  }

  // 7. Alokasikan 150 Siswa ke 5 Rombel (Masing-masing 30 siswa)
  const kelasNames = ["10 IPA 1", "10 IPA 2", "10 IPA 3", "10 IPS 1", "10 IPS 2"];
  const kelasStudentsMap: Record<string, number[]> = {
    "10 IPA 1": [],
    "10 IPA 2": [],
    "10 IPA 3": [],
    "10 IPS 1": [],
    "10 IPS 2": [],
  };

  for (let i = 0; i < studentUserIds.length; i++) {
    const kName = kelasNames[Math.floor(i / 30)];
    const kId = kelasIdMap[kName];
    const sId = studentUserIds[i];
    kelasStudentsMap[kName].push(sId);
    await db.insert(kelasSiswa).values({ kelasId: kId, siswaId: sId });
  }

  // 8. Orang Tua (50 Akun Wali Murid)
  const ortuNames = [
    "Hartono Wibowo",
    "Dewi Anggraini",
    "Bambang Soediro",
    "Rina Kusuma",
    "Hendra Setiawan",
    "Siti Maryam",
    "Ahmad Fauzi",
    "Sri Wahyuni",
    "Dedi Supriadi",
    "Nurul Komariyah",
    "Gunawan Wibisono",
    "Indah Puspitasari",
    "Wahyu Triyono",
    "Yuni Astuti",
    "Budi Waluyo",
    "Ratna Dewi",
    "Eko Prabowo",
    "Endang Sulastri",
    "Hadi Santoso",
    "Lestari Handayani",
    "Mulyadi",
    "Nina Herawati",
    "Purwanto",
    "Rahmawati",
    "Subagyo",
    "Tati Suharti",
    "Usman Effendi",
    "Vera Yuliana",
    "Widodo",
    "Yanti Susanti",
    "Zainal Arifin",
    "Anjarwati",
    "Basuki Rahmat",
    "Cici Paramida",
    "Danang Sutrisno",
    "Erna Juwita",
    "Farid Wajdi",
    "Gatot Subroto",
    "Hariyanto",
    "Irma Suryani",
    "Joko Riyanto",
    "Kartini",
    "Lukman Hakim",
    "Maimunah",
    "Nasirun",
    "Oktaviana",
    "Priyanto",
    "Qomarudin",
    "Rosdiana",
    "Samsul Bahri",
  ];

  const ortuUserIds: number[] = [];
  for (let i = 0; i < ortuNames.length; i++) {
    const name = ortuNames[i];
    let email = "";
    if (i === 0) email = "hartono@sekolah.demo";
    else if (i === 1) email = "dewi@sekolah.demo";
    else {
      const clean = name.toLowerCase().replace(/[^a-z]/g, "");
      email = `${clean}${i + 1}@sekolah.demo`;
    }

    const [{ id }] = await db
      .insert(schoolUsers)
      .values({ name, email, passwordHash: hash, role: "orang_tua" })
      .returning({ id: schoolUsers.id });
    ortuUserIds.push(id);
  }

  // Hubungkan Orang Tua ke Siswa (Sebagian orang tua punya 2-3 anak)
  // Hartono -> Andi & Citra
  await db.insert(orangTuaSiswa).values([
    { orangTuaId: ortuUserIds[0], siswaId: studentUserIds[0] }, // Hartono -> Andi
    { orangTuaId: ortuUserIds[0], siswaId: studentUserIds[1] }, // Hartono -> Citra
    { orangTuaId: ortuUserIds[1], siswaId: studentUserIds[3] }, // Dewi -> Eka
    { orangTuaId: ortuUserIds[1], siswaId: studentUserIds[4] }, // Dewi -> Fajar
  ]);

  // Hubungkan sisa orang tua ke siswa lainnya
  for (let i = 2; i < ortuUserIds.length; i++) {
    const studentIdx = (i * 3) % studentUserIds.length;
    await db.insert(orangTuaSiswa).values({
      orangTuaId: ortuUserIds[i],
      siswaId: studentUserIds[studentIdx],
    });
  }

  // 9. Kelas Mapel Guru (Pengampu Kurikulum)
  const kmgList = [
    // 10 IPA 1
    { kelas: "10 IPA 1", mapel: "Matematika", guru: "budi@sekolah.demo" },
    { kelas: "10 IPA 1", mapel: "Bahasa Indonesia", guru: "siti@sekolah.demo" },
    { kelas: "10 IPA 1", mapel: "Bahasa Inggris", guru: "rina@sekolah.demo" },
    { kelas: "10 IPA 1", mapel: "Fisika", guru: "agus@sekolah.demo" },
    { kelas: "10 IPA 1", mapel: "Kimia", guru: "hendra@sekolah.demo" },
    { kelas: "10 IPA 1", mapel: "Biologi", guru: "nurul@sekolah.demo" },
    { kelas: "10 IPA 1", mapel: "Informatika", guru: "eko@sekolah.demo" },
    { kelas: "10 IPA 1", mapel: "Sejarah Indonesia", guru: "bambang.p@sekolah.demo" },

    // 10 IPA 2
    { kelas: "10 IPA 2", mapel: "Matematika", guru: "budi@sekolah.demo" },
    { kelas: "10 IPA 2", mapel: "Bahasa Indonesia", guru: "siti@sekolah.demo" },
    { kelas: "10 IPA 2", mapel: "Bahasa Inggris", guru: "rina@sekolah.demo" },
    { kelas: "10 IPA 2", mapel: "Fisika", guru: "agus@sekolah.demo" },
    { kelas: "10 IPA 2", mapel: "Kimia", guru: "hendra@sekolah.demo" },
    { kelas: "10 IPA 2", mapel: "Biologi", guru: "nurul@sekolah.demo" },
    { kelas: "10 IPA 2", mapel: "Informatika", guru: "eko@sekolah.demo" },

    // 10 IPA 3
    { kelas: "10 IPA 3", mapel: "Matematika", guru: "budi@sekolah.demo" },
    { kelas: "10 IPA 3", mapel: "Bahasa Indonesia", guru: "siti@sekolah.demo" },
    { kelas: "10 IPA 3", mapel: "Fisika", guru: "agus@sekolah.demo" },
    { kelas: "10 IPA 3", mapel: "Kimia", guru: "hendra@sekolah.demo" },

    // 10 IPS 1
    { kelas: "10 IPS 1", mapel: "Matematika", guru: "budi@sekolah.demo" },
    { kelas: "10 IPS 1", mapel: "Bahasa Indonesia", guru: "siti@sekolah.demo" },
    { kelas: "10 IPS 1", mapel: "Bahasa Inggris", guru: "rina@sekolah.demo" },
    { kelas: "10 IPS 1", mapel: "Ekonomi", guru: "ratna@sekolah.demo" },
    { kelas: "10 IPS 1", mapel: "Geografi", guru: "wahyu@sekolah.demo" },
    { kelas: "10 IPS 1", mapel: "Sosiologi", guru: "indah@sekolah.demo" },

    // 10 IPS 2
    { kelas: "10 IPS 2", mapel: "Matematika", guru: "budi@sekolah.demo" },
    { kelas: "10 IPS 2", mapel: "Bahasa Indonesia", guru: "siti@sekolah.demo" },
    { kelas: "10 IPS 2", mapel: "Ekonomi", guru: "ratna@sekolah.demo" },
    { kelas: "10 IPS 2", mapel: "Geografi", guru: "wahyu@sekolah.demo" },
  ];

  const kmgIdMap: Record<string, number> = {};
  for (const item of kmgList) {
    const kId = kelasIdMap[item.kelas];
    const mId = mapelIdMap[item.mapel];
    const gId = guruIdMap[item.guru];
    const [{ id }] = await db
      .insert(kelasMapelGuru)
      .values({ kelasId: kId, mapelId: mId, guruId: gId })
      .returning({ id: kelasMapelGuru.id });
    kmgIdMap[`${item.kelas}-${item.mapel}`] = id;
  }

  // 10. Jadwal Pelajaran Komprehensif (Senin - Jumat)
  const jadwalData = [
    // 10 IPA 1
    { kmg: `${kelasNames[0]}-Matematika`, hari: "Senin", jamMulai: "07:00", jamSelesai: "08:30" },
    { kmg: `${kelasNames[0]}-Bahasa Indonesia`, hari: "Senin", jamMulai: "08:45", jamSelesai: "10:15" },
    { kmg: `${kelasNames[0]}-Fisika`, hari: "Selasa", jamMulai: "07:00", jamSelesai: "08:30" },
    { kmg: `${kelasNames[0]}-Kimia`, hari: "Selasa", jamMulai: "08:45", jamSelesai: "10:15" },
    { kmg: `${kelasNames[0]}-Bahasa Inggris`, hari: "Rabu", jamMulai: "07:00", jamSelesai: "08:30" },
    { kmg: `${kelasNames[0]}-Biologi`, hari: "Rabu", jamMulai: "08:45", jamSelesai: "10:15" },
    { kmg: `${kelasNames[0]}-Informatika`, hari: "Kamis", jamMulai: "07:00", jamSelesai: "08:30" },
    { kmg: `${kelasNames[0]}-Matematika`, hari: "Kamis", jamMulai: "08:45", jamSelesai: "10:15" },
    { kmg: `${kelasNames[0]}-Sejarah Indonesia`, hari: "Jumat", jamMulai: "07:00", jamSelesai: "08:30" },

    // 10 IPA 2
    { kmg: `${kelasNames[1]}-Fisika`, hari: "Senin", jamMulai: "07:00", jamSelesai: "08:30" },
    { kmg: `${kelasNames[1]}-Matematika`, hari: "Selasa", jamMulai: "08:45", jamSelesai: "10:15" },
    { kmg: `${kelasNames[1]}-Bahasa Indonesia`, hari: "Rabu", jamMulai: "07:00", jamSelesai: "08:30" },
    { kmg: `${kelasNames[1]}-Kimia`, hari: "Kamis", jamMulai: "07:00", jamSelesai: "08:30" },

    // 10 IPS 1
    { kmg: `${kelasNames[3]}-Ekonomi`, hari: "Senin", jamMulai: "07:00", jamSelesai: "08:30" },
    { kmg: `${kelasNames[3]}-Geografi`, hari: "Selasa", jamMulai: "07:00", jamSelesai: "08:30" },
    { kmg: `${kelasNames[3]}-Sosiologi`, hari: "Rabu", jamMulai: "07:00", jamSelesai: "08:30" },
    { kmg: `${kelasNames[3]}-Bahasa Inggris`, hari: "Kamis", jamMulai: "07:00", jamSelesai: "08:30" },
  ];

  for (const j of jadwalData) {
    if (kmgIdMap[j.kmg]) {
      await db.insert(jadwal).values({
        kelasMapelGuruId: kmgIdMap[j.kmg],
        hari: j.hari as any,
        jamMulai: j.jamMulai,
        jamSelesai: j.jamSelesai,
      });
    }
  }

  // 11. Tugas & Penilaian Masal (Untuk 30 siswa 10 IPA 1 & lainnya)
  const now = Date.now();
  await db
    .insert(tugas)
    .values({
      kelasMapelGuruId: kmgIdMap[`${kelasNames[0]}-Matematika`],
      judul: "Latihan Persamaan Kuadrat",
      deskripsi: "Kerjakan soal nomor 1-10 di buku paket halaman 87. Tulis langkah penyelesaian lengkap, bukan hanya jawaban akhir.",
      deadline: new Date(now + 3 * DAY),
    });

  const [{ id: tugasMtk2 }] = await db
    .insert(tugas)
    .values({
      kelasMapelGuruId: kmgIdMap[`${kelasNames[0]}-Matematika`],
      judul: "PR Fungsi Linear",
      deskripsi: "Buat grafik fungsi f(x) = 2x + 3 dan tentukan gradien serta titik potong sumbu-y.",
      deadline: new Date(now - 2 * DAY),
    })
    .returning({ id: tugas.id });

  await db
    .insert(tugas)
    .values({
      kelasMapelGuruId: kmgIdMap[`${kelasNames[0]}-Bahasa Indonesia`],
      judul: "Ringkasan Teks Berita Aktual",
      deskripsi: "Pilih satu berita dari media massa nasional, buat ringkasan maksimal 200 kata dengan memperhatikan unsur 5W+1H.",
      deadline: new Date(now + 5 * DAY),
    });

  const [{ id: tugasFisika }] = await db
    .insert(tugas)
    .values({
      kelasMapelGuruId: kmgIdMap[`${kelasNames[0]}-Fisika`],
      judul: "Laporan Praktikum Hukum Newton",
      deskripsi: "Kumpulkan laporan praktikum lengkap: tujuan, alat, prosedur, data pengamatan, dan kesimpulan.",
      deadline: new Date(now - 1 * DAY),
    })
    .returning({ id: tugas.id });

  // Buat submissions & nilai untuk 30 siswa 10 IPA 1
  const ipa1Students = kelasStudentsMap["10 IPA 1"];
  const budiId = guruIdMap["budi@sekolah.demo"];
  const agusId = guruIdMap["agus@sekolah.demo"];

  for (let i = 0; i < ipa1Students.length; i++) {
    const sId = ipa1Students[i];
    // Siswa submit PR Fungsi Linear
    if (i < 26) {
      // 26 dari 30 siswa sudah kumpul
      const isLate = i % 5 === 0;
      const [{ id: subId }] = await db
        .insert(submission)
        .values({
          tugasId: tugasMtk2,
          siswaId: sId,
          isiText: `Gradien garis = 2, titik potong sumbu-y di (0, 3). Penyelesaian langkah demi langkah telah selesai oleh ${studentNames[i]}.`,
          waktuSubmit: new Date(now - (isLate ? 1 : 3) * DAY),
        })
        .returning({ id: submission.id });

      // Dinilai
      const score = 70 + (i % 6) * 5; // 70, 75, 80, 85, 90, 95
      await db.insert(nilai).values({
        submissionId: subId,
        nilai: score,
        feedback: score >= 85 ? "Penjelasan sangat runtut dan grafik rapi." : "Perhatikan ketelitian dalam perhitungan konstanta.",
        guruId: budiId,
      });
    }

    // Sebagian siswa submit Laporan Praktikum Fisika
    if (i < 22) {
      const [{ id: subFisId }] = await db
        .insert(submission)
        .values({
          tugasId: tugasFisika,
          siswaId: sId,
          isiText: `Laporan praktikum Hukum Newton ke-1 dan ke-2 dengan 5 kali iterasi data gerak lurus berubah beraturan.`,
          waktuSubmit: new Date(now - 2 * DAY),
        })
        .returning({ id: submission.id });

      const fisScore = 75 + (i % 5) * 5;
      await db.insert(nilai).values({
        submissionId: subFisId,
        nilai: fisScore,
        feedback: "Analisis data praktikum valid dan grafik percepatan tertera jelas.",
        guruId: agusId,
      });
    }
  }

  // 12. Presensi Harian Masal (7 Hari Terakhir untuk Seluruh 150 Siswa)
  const today = new Date();
  const dateStrings: string[] = [];
  for (let d = 0; d < 7; d++) {
    const dt = new Date(today.getTime() - d * DAY);
    const dateStr = dt.toISOString().split("T")[0];
    dateStrings.push(dateStr);
  }

  const primaryKmgId = kmgIdMap[`${kelasNames[0]}-Matematika`];
  if (primaryKmgId) {
    for (const tgl of dateStrings) {
      for (let i = 0; i < ipa1Students.length; i++) {
        const sId = ipa1Students[i];
        let status: "hadir" | "sakit" | "izin" | "alpa" = "hadir";
        let catatan: string | null = null;
        if (i === 5) {
          status = "sakit";
          catatan = "Surat keterangan dokter terlampir";
        } else if (i === 12) {
          status = "izin";
          catatan = "Mengikuti seleksi olimpiade sains kabupaten";
        } else if (i === 28) {
          status = "alpa";
          catatan = "Tanpa keterangan konfirmasi";
        }

        try {
          await db.insert(presensi).values({
            kelasMapelGuruId: primaryKmgId,
            siswaId: sId,
            tanggal: tgl,
            status,
            catatan,
          });
        } catch {
          // ignore unique constraint
        }
      }
    }
  }

  // 13. Pengumuman Sekolah
  await db.insert(pengumuman).values([
    {
      judul: "Jadwal Pelaksanaan Penilaian Tengah Semester (PTS) Ganjil",
      konten: "Diberitahukan kepada seluruh siswa kelas 10 bahwa PTS Ganjil akan diselenggarakan pada tanggal 24-29 Agustus 2026. Harap mengecek kelengkapan administrasi dan kartu ujian masing-masing rombel.",
      kategori: "Ujian" as const,
      targetRole: "semua" as const,
      authorNama: "Admin Sekolah",
      pinned: true,
    },
    {
      judul: "Surat Edaran Libur Nasional & Cuti Bersama",
      konten: "Menindaklanjuti SKB 3 Menteri, kegiatan belajar mengajar pada tanggal 1 September diliburkan dalam rangka memperingati Maulid Nabi Muhammad SAW. KBM aktif kembali seperti biasa pada tanggal 2 September.",
      kategori: "Libur" as const,
      targetRole: "semua" as const,
      authorNama: "Admin Sekolah",
      pinned: false,
    },
    {
      judul: "Pertemuan Evaluasi Perwalian & Pembagian Rapor Sisip",
      konten: "Undangan kepada seluruh orang tua/wali murid kelas 10 untuk menghadiri pertemuan evaluasi tengah semester bersama dewan wali kelas di Aula Utama Lantai 2.",
      kategori: "Kegiatan" as const,
      targetRole: "orang_tua" as const,
      authorNama: "Admin Sekolah",
      pinned: false,
    },
  ]);

  // 15. Hari Libur Sekolah & Nasional
  await db.insert(hariLibur).values([
    {
      tanggal: "2026-08-17",
      nama: "Hari Kemerdekaan Republik Indonesia Ke-81",
      keterangan: "Libur Nasional memperingati HUT Proklamasi Kemerdekaan RI. Seluruh kegiatan pembelajaran diliburkan.",
      tipe: "nasional",
    },
    {
      tanggal: "2026-09-01",
      nama: "Maulid Nabi Muhammad SAW",
      keterangan: "Libur Nasional memperingati hari kelahiran Nabi Muhammad SAW.",
      tipe: "nasional",
    },
    {
      tanggal: "2026-09-25",
      nama: "Cuti Bersama Evaluasi Tengah Semester",
      keterangan: "Cuti akademik sekolah pasca pelaksanaan PTS Ganjil.",
      tipe: "cuti_bersama",
    },
    {
      tanggal: "2026-10-28",
      nama: "Hari Sumpah Pemuda (Upacara Khusus)",
      keterangan: "Kegiatan KBM reguler digantikan apel peringatan Sumpah Pemuda dan pentas seni budaya.",
      tipe: "sekolah",
    },
  ]);

  // 16. Kelas Pengganti (Make-up Class)
  if (primaryKmgId) {
    await db.insert(kelasPengganti).values([
      {
        kelasMapelGuruId: primaryKmgId,
        tanggalAsli: "2026-08-17",
        tanggalPengganti: "2026-08-22",
        jamMulai: "09:00",
        jamSelesai: "10:30",
        ruang: "Ruang Kelas 10 IPA 1",
        alasan: "Pengganti sesi Matematika yang terbentur Libur Nasional HUT RI",
        status: "dijadwalkan",
      },
    ]);
  }

  // 17. Tagihan SPP & Keuangan Siswa
  const tagihanList: any[] = [];

  for (let i = 0; i < studentUserIds.length; i++) {
    const sId = studentUserIds[i];

    // Tagihan SPP Juli 2026 (Semua Lunas)
    tagihanList.push({
      siswaId: sId,
      kategori: "SPP" as const,
      judul: "SPP Bulan Juli 2026",
      nominal: 350000,
      bulan: 7,
      tahun: 2026,
      jatuhTempo: "2026-07-10",
      status: "lunas" as const,
      tanggalBayar: "2026-07-08",
      metodeBayar: i % 2 === 0 ? "Transfer Bank BCA" : "Virtual Account Mandiri",
      nomorTransaksi: `TR-202607-${String(i + 1).padStart(4, "0")}`,
      catatan: "Pembayaran terverifikasi sistem otomatis.",
    });

    // Tagihan SPP Agustus 2026 (Bulan Berjalan)
    if (i < 120) {
      // 120 Siswa Lunas
      tagihanList.push({
        siswaId: sId,
        kategori: "SPP" as const,
        judul: "SPP Bulan Agustus 2026",
        nominal: 350000,
        bulan: 8,
        tahun: 2026,
        jatuhTempo: "2026-08-10",
        status: "lunas" as const,
        tanggalBayar: "2026-08-05",
        metodeBayar: i % 3 === 0 ? "QRIS Sokara Pay" : "Transfer Bank BCA",
        nomorTransaksi: `TR-202608-${String(i + 1).padStart(4, "0")}`,
        catatan: "Lunas tepat waktu.",
      });
    } else if (i < 138) {
      // 18 Siswa Menunggu Verifikasi
      tagihanList.push({
        siswaId: sId,
        kategori: "SPP" as const,
        judul: "SPP Bulan Agustus 2026",
        nominal: 350000,
        bulan: 8,
        tahun: 2026,
        jatuhTempo: "2026-08-10",
        status: "menunggu_verifikasi" as const,
        tanggalBayar: "2026-08-11",
        metodeBayar: "Transfer Bank Mandiri",
        nomorTransaksi: `TR-202608-${String(i + 1).padStart(4, "0")}`,
        catatan: "Bukti transfer telah diunggah orang tua, menunggu persetujuan admin.",
      });
    } else {
      // 12 Siswa Belum Bayar (Menunggak)
      tagihanList.push({
        siswaId: sId,
        kategori: "SPP" as const,
        judul: "SPP Bulan Agustus 2026",
        nominal: 350000,
        bulan: 8,
        tahun: 2026,
        jatuhTempo: "2026-08-10",
        status: "belum_bayar" as const,
        catatan: "Peringatan jatuh tempo dikirimkan ke wali murid.",
      });
    }

    // Biaya Uang Pangkal Gedung / DSP (hanya untuk siswa 0..29 rombel 10 IPA 1)
    if (i < 30) {
      tagihanList.push({
        siswaId: sId,
        kategori: "DSP_Gedung" as const,
        judul: "Uang Gedung & Sarana Pembelajaran TP 2026/2027",
        nominal: 2500000,
        bulan: null,
        tahun: 2026,
        jatuhTempo: "2026-09-30",
        status: i < 20 ? ("lunas" as const) : ("belum_bayar" as const),
        tanggalBayar: i < 20 ? "2026-07-15" : null,
        metodeBayar: i < 20 ? "Transfer Bank BNI" : null,
        nomorTransaksi: i < 20 ? `DSP-2026-${String(i + 1).padStart(4, "0")}` : null,
        catatan: "Biaya registrasi sarana dan fasilitas laboratorium.",
      });
    }
  }

  // Insert batch
  for (let i = 0; i < tagihanList.length; i += 50) {
    await db.insert(tagihanSiswa).values(tagihanList.slice(i, i + 50));
  }

  // 18. CBT (Computer-Based Testing) & Kuis Online Interaktif
  if (primaryKmgId) {
    const [{ id: ujianMathId }] = await db
      .insert(ujian)
      .values({
        kelasMapelGuruId: primaryKmgId,
        judul: "Kuis Harian 1: Aljabar Linier & Matriks",
        deskripsi: "Kuis formatif CBT menguji pemahaman konsep determinan matriks, invers, dan sistem persamaan linier dua variabel.",
        kategori: "Kuis_Harian" as const,
        durasiMenit: 30,
        kkm: 75,
        tanggalMulai: "2026-08-01 08:00",
        tanggalSelesai: "2026-08-30 23:59",
        acakSoal: true,
        tampilkanHasil: true,
      })
      .returning({ id: ujian.id });

    // Bank Soal Matematika
    const soalMath = [
      {
        ujianId: ujianMathId,
        nomorUrut: 1,
        pertanyaan: "Jika matriks A = [[2, 3], [1, 4]], berapakah determinan dari matriks A?",
        pilihanA: "5",
        pilihanB: "6",
        pilihanC: "8",
        pilihanD: "11",
        kunciJawaban: "A" as const,
        pembahasan: "Determinan = (ad - bc) = (2 * 4) - (3 * 1) = 8 - 3 = 5.",
        poin: 20,
      },
      {
        ujianId: ujianMathId,
        nomorUrut: 2,
        pertanyaan: "Diberikan sistem persamaan 2x + y = 7 dan x - y = 2. Nilai x yang memenuhi adalah...",
        pilihanA: "1",
        pilihanB: "2",
        pilihanC: "3",
        pilihanD: "4",
        kunciJawaban: "C" as const,
        pembahasan: "Jumlahkan kedua persamaan: 3x = 9 -> x = 3.",
        poin: 20,
      },
      {
        ujianId: ujianMathId,
        nomorUrut: 3,
        pertanyaan: "Transpose dari matriks baris [1, 5, 9] adalah...",
        pilihanA: "Matriks kolom [[1], [5], [9]]",
        pilihanB: "Matriks nol [[0, 0, 0]]",
        pilihanC: "Matriks identitas [[1, 0, 0]]",
        pilihanD: "Matriks skalar [[9, 5, 1]]",
        kunciJawaban: "A" as const,
        pembahasan: "Transpose matriks baris 1x3 menghasilkan matriks kolom 3x1.",
        poin: 20,
      },
      {
        ujianId: ujianMathId,
        nomorUrut: 4,
        pertanyaan: "Manakah di antara matriks berikut yang merupakan matriks identitas ordo 2x2?",
        pilihanA: "[[0, 1], [1, 0]]",
        pilihanB: "[[1, 0], [0, 1]]",
        pilihanC: "[[1, 1], [1, 1]]",
        pilihanD: "[[2, 0], [0, 2]]",
        kunciJawaban: "B" as const,
        pembahasan: "Matriks identitas memiliki elemen diagonal utama bernilai 1 dan elemen lainnya 0.",
        poin: 20,
      },
      {
        ujianId: ujianMathId,
        nomorUrut: 5,
        pertanyaan: "Jika A * B = I (matriks identitas), maka B disebut sebagai...",
        pilihanA: "Determinan dari A",
        pilihanB: "Transpose dari A",
        pilihanC: "Invers dari A (A^-1)",
        pilihanD: "Adjoin dari A",
        kunciJawaban: "C" as const,
        pembahasan: "Perkalian matriks dengan inversnya menghasilkan matriks identitas: A * A^-1 = I.",
        poin: 20,
      },
    ];

    await db.insert(soalUjian).values(soalMath);

    // Rekam peserta ujian kelas 10 IPA 1 (siswa 0..29)
    for (let i = 0; i < 30; i++) {
      const sId = studentUserIds[i];
      if (i < 24) {
        // 24 siswa sudah selesai mengerjakan
        const isPerfect = i % 3 === 0;
        const nilaiScore = isPerfect ? 100 : i % 2 === 0 ? 80 : 60;
        const totalBenar = isPerfect ? 5 : i % 2 === 0 ? 4 : 3;
        const totalSalah = 5 - totalBenar;

        await db.insert(ujianSiswa).values({
          ujianId: ujianMathId,
          siswaId: sId,
          status: "selesai" as const,
          waktuMulai: new Date(Date.now() - 3 * DAY),
          waktuSelesai: new Date(Date.now() - 3 * DAY + 22 * 60 * 1000),
          nilai: nilaiScore,
          totalBenar,
          totalSalah,
          jawabanJson: JSON.stringify({
            "1": "A",
            "2": isPerfect ? "C" : "A",
            "3": "A",
            "4": "B",
            "5": isPerfect ? "C" : "B",
          }),
          pelanggaranTab: i === 5 ? 1 : 0,
        });
      }
    }
  }

  console.log(`Seeding selesai: 1 Admin, ${guruList.length} Guru, ${studentNames.length} Siswa (150 siswa / 5 Rombel), ${ortuNames.length} Orang Tua, 4 Hari Libur, 1 Kelas Pengganti, ${tagihanList.length} Rekam Tagihan SPP, Paket CBT Ujian Online.`);
}
