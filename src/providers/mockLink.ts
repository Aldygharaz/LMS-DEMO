import { TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { AppRouter } from '../../server/router';

// State
let currentUser: any = null;

// --- DUMMY DATA (RICH DEMO) ---

const dummyPengumuman = [
  { id: 1, judul: 'Libur Semester Genap', konten: 'Berdasarkan kalender akademik, libur semester genap akan dimulai pada tanggal 15 hingga 30 bulan ini. Harap seluruh siswa menyelesaikan ujian sebelum tanggal tersebut.', kategori: 'Umum', targetRole: 'semua', authorNama: 'Admin Utama', createdAt: Date.now() - 86400000 * 2, pinned: 1 },
  { id: 2, judul: 'Rapat Orang Tua Murid', konten: 'Diberitahukan kepada seluruh orang tua siswa kelas 10 dan 11, pembagian rapor akan dilaksanakan secara tatap muka pada hari Sabtu mendatang.', kategori: 'Akademik', targetRole: 'orang_tua', authorNama: 'Kepala Sekolah', createdAt: Date.now() - 86400000 * 5, pinned: 0 },
  { id: 3, judul: 'Perbaikan Sistem CBT', konten: 'Akan ada maintenance server untuk sistem Ujian pada malam Minggu dari pukul 22.00 - 04.00 WIB.', kategori: 'Sistem', targetRole: 'semua', authorNama: 'Tim IT', createdAt: Date.now() - 86400000, pinned: 0 },
];

const dummySiswaList = [
  { id: 101, name: 'Andi Pratama', email: 'andi@sekolah.demo', nisn: '0051234567', gender: 'L' },
  { id: 102, name: 'Budi Santoso', email: 'budi.siswa@sekolah.demo', nisn: '0051234568', gender: 'L' },
  { id: 103, name: 'Citra Kirana', email: 'citra@sekolah.demo', nisn: '0051234569', gender: 'P' },
  { id: 104, name: 'Dewi Lestari', email: 'dewi@sekolah.demo', nisn: '0051234570', gender: 'P' },
  { id: 105, name: 'Eko Putra', email: 'eko@sekolah.demo', nisn: '0051234571', gender: 'L' },
];

const dummyGuruList = [
  { id: 201, name: 'Bapak Ahmad', email: 'ahmad@guru.demo', nip: '198001012005011001', mapel: 'Matematika' },
  { id: 202, name: 'Ibu Siti', email: 'siti@guru.demo', nip: '198502022008022002', mapel: 'Fisika' },
];

const dummyKelasMapel = [
  { id: 1, mapelId: 1, mapelNama: 'Matematika Lanjut', kelasId: 1, kelasNama: '10 IPA 1', totalSiswa: 32, guruNama: 'Bapak Ahmad' },
  { id: 2, mapelId: 2, mapelNama: 'Fisika Dasar', kelasId: 1, kelasNama: '10 IPA 1', totalSiswa: 32, guruNama: 'Ibu Siti' },
  { id: 3, mapelId: 1, mapelNama: 'Matematika Lanjut', kelasId: 2, kelasNama: '10 IPA 2', totalSiswa: 30, guruNama: 'Bapak Ahmad' },
];

const dummyKelasList = [
  { id: 1, nama: '10 IPA 1', waliKelasNama: 'Bapak Ahmad', waliKelasId: 201, totalSiswa: 32 },
  { id: 2, nama: '10 IPA 2', waliKelasNama: 'Ibu Siti', waliKelasId: 202, totalSiswa: 30 },
  { id: 3, nama: '10 IPS 1', waliKelasNama: 'Bapak Sudirman', waliKelasId: 203, totalSiswa: 28 },
];

const dummyJadwalList = [
  { id: 1, hari: 'Senin', jamMulai: '07:00', jamSelesai: '08:30', mapelNama: 'Matematika Lanjut', guruNama: 'Bapak Ahmad', kelasMapelGuruId: 1, kelasNama: '10 IPA 1' },
  { id: 2, hari: 'Senin', jamMulai: '08:30', jamSelesai: '10:00', mapelNama: 'Fisika Dasar', guruNama: 'Ibu Siti', kelasMapelGuruId: 2, kelasNama: '10 IPA 1' },
  { id: 3, hari: 'Selasa', jamMulai: '07:00', jamSelesai: '08:30', mapelNama: 'Matematika Lanjut', guruNama: 'Bapak Ahmad', kelasMapelGuruId: 3, kelasNama: '10 IPA 2' },
];

const dummyTagihan = [
  { id: 1, judul: 'SPP Bulan Agustus 2026', kategori: 'SPP', nominal: 350000, status: 'belum_bayar', jatuhTempo: '2026-08-30', bulan: 8, tahun: 2026, siswaNama: 'Andi Pratama', kelasNama: '10 IPA 1' },
  { id: 2, judul: 'Uang Pangkal / DSP', kategori: 'DSP_Gedung', nominal: 2500000, status: 'lunas', tanggalBayar: '2026-07-15', metodeBayar: 'Transfer Bank', nomorTransaksi: 'TR-2607-0002', jatuhTempo: '2026-07-31', siswaNama: 'Andi Pratama', kelasNama: '10 IPA 1' },
  { id: 3, judul: 'SPP Bulan Agustus 2026', kategori: 'SPP', nominal: 350000, status: 'menunggu_verifikasi', jatuhTempo: '2026-08-30', bulan: 8, tahun: 2026, siswaNama: 'Budi Santoso', kelasNama: '10 IPA 1' },
];

const dummyUjianList = [
  { id: 1, judul: 'Ujian Tengah Semester - Matematika', tipe: 'UTS', durasi: 90, status: 'published', waktuMulai: new Date().toISOString(), waktuSelesai: new Date(Date.now() + 86400000 * 3).toISOString(), mapelNama: 'Matematika Lanjut', kelasNama: '10 IPA 1', totalPeserta: 32, submittedCount: 15 },
  { id: 2, judul: 'Kuis Fisika Gerak Lurus', tipe: 'Kuis', durasi: 45, status: 'draft', waktuMulai: new Date(Date.now() + 86400000).toISOString(), waktuSelesai: new Date(Date.now() + 86400000 * 2).toISOString(), mapelNama: 'Fisika Dasar', kelasNama: '10 IPA 1', totalPeserta: 32, submittedCount: 0 },
];

const dummyAssignments = [
  { id: 1, judul: 'Latihan Soal Aljabar Linear', deskripsi: 'Kerjakan soal 1-10 di LKS halaman 45. Upload dalam bentuk PDF.', kelasNama: '10 IPA 1', mapelNama: 'Matematika Lanjut', deadline: Date.now() + 86400000 * 2, createdAt: Date.now() - 86400000, totalSiswa: 32, submittedCount: 28 },
  { id: 2, judul: 'Praktikum Pendulum Sederhana', deskripsi: 'Buat video praktikum dan laporan pengamatan gaya gravitasi bumi.', kelasNama: '10 IPA 1', mapelNama: 'Fisika Dasar', deadline: Date.now() + 86400000 * 5, createdAt: Date.now(), totalSiswa: 32, submittedCount: 5 },
];

// --- HANDLERS MAPPING ---

const handlers: Record<string, (input?: any) => any> = {
  // --- AUTH ---
  'auth.me': () => currentUser,
  'schoolAuth.me': () => currentUser,
  'schoolAuth.login': (input) => {
    let role = 'admin';
    let name = 'Admin Super';
    if (input.email.includes('guru')) { role = 'guru'; name = 'Bapak Ahmad'; }
    if (input.email.includes('siswa') || input.email.includes('andi')) { role = 'siswa'; name = 'Andi Pratama'; }
    if (input.email.includes('ortu') || input.email.includes('hartono')) { role = 'orang_tua'; name = 'Bapak Hartono'; }
    
    currentUser = { id: 1, name, email: input.email, role, avatar: '' };
    return currentUser;
  },
  'schoolAuth.logout': () => { currentUser = null; return { success: true }; },
  
  // --- ADMIN ---
  'admin.stats': () => ({ siswaCount: 450, guruCount: 35, kelasCount: 15, mapelCount: 20 }),
  'admin.listPengumuman': () => dummyPengumuman,
  'admin.createPengumuman': () => ({ id: 4 }),
  'admin.deletePengumuman': () => ({ success: true }),
  'admin.presensiOverview': () => ({ totalHadir: 420, totalSakit: 12, totalIzin: 10, totalAlpa: 8, rasioHadir: 93 }),
  'admin.listKelas': () => dummyKelasList,
  'admin.kelasDetail': (input) => {
    const k = dummyKelasList.find(x => x.id === input?.kelasId) || dummyKelasList[0];
    return { 
      kelas: k, 
      siswaList: dummySiswaList, 
      pengampu: dummyKelasMapel.filter(x => x.kelasId === k.id), 
      jadwalList: dummyJadwalList.filter(x => x.kelasNama === k.nama) 
    };
  },
  'admin.rekapKeuangan': () => ({ totalNominal: 15000000, lunasNominal: 9000000, menunggakNominal: 3500000, verifikasiNominal: 2500000, countTotal: 150, countLunas: 90, countMenunggu: 25, countBelum: 35, kolektibilitas: 60 }),
  'admin.tagihanList': () => dummyTagihan,
  'admin.listHariLibur': () => [{ id: 1, tanggal: '2026-08-17', keterangan: 'HUT Kemerdekaan RI' }],
  'admin.listKelasPengganti': () => [{ id: 1, kelasNama: '10 IPA 1', mapelNama: 'Fisika Dasar', guruNama: 'Ibu Siti', jadwalAsli: '2026-08-20', jadwalPengganti: '2026-08-21', status: 'disetujui' }],
  'admin.createHariLibur': () => ({ success: true }),
  'admin.deleteHariLibur': () => ({ success: true }),
  'admin.listMapel': () => [{ id: 1, nama: 'Matematika Lanjut', kelompok: 'A', kkm: 75 }, { id: 2, nama: 'Fisika Dasar', kelompok: 'C', kkm: 70 }],
  'admin.listPengguna': () => [...dummySiswaList, ...dummyGuruList].map(u => ({ ...u, role: 'name' in u && u.name.includes('Ahmad') ? 'guru' : 'siswa' })),
  'admin.presensiBulanan': () => ({ 
      summary: { totalHadir: 420, sakit: 12, izin: 10, alpa: 8 }, 
      daily: Array.from({length: 30}).map((_, i) => ({ tanggal: \`2026-08-\${String(i+1).padStart(2,'0')}\`, hadir: Math.floor(Math.random() * 20) + 400 })) 
  }),
  
  // --- GURU ---
  'guru.myAssignments': () => dummyAssignments,
  'guru.mySchedule': () => dummyJadwalList.filter(x => x.guruNama === currentUser?.name || x.guruNama === 'Bapak Ahmad'),
  'guru.myKelasMapel': () => dummyKelasMapel.filter(x => x.guruNama === currentUser?.name || x.guruNama === 'Bapak Ahmad'),
  'guru.listHariLibur': () => [{ id: 1, tanggal: '2026-08-17', keterangan: 'HUT Kemerdekaan RI' }],
  'guru.myKelasPengganti': () => [],
  'guru.createKelasPengganti': () => ({ success: true }),
  'guru.updateKelasPengganti': () => ({ success: true }),
  'guru.deleteKelasPengganti': () => ({ success: true }),
  'guru.kelasMapelDetail': () => ({ info: dummyKelasMapel[0], siswaList: dummySiswaList }),
  'guru.createTugas': () => ({ success: true }),
  'guru.updateTugas': () => ({ success: true }),
  'guru.deleteTugas': () => ({ success: true }),
  'guru.listMateri': () => [{ id: 1, judul: 'Bab 1: Eksponen dan Logaritma', tipe: 'pdf', url: '#', createdAt: Date.now() }],
  'guru.createMateri': () => ({ success: true }),
  'guru.updateMateri': () => ({ success: true }),
  'guru.deleteMateri': () => ({ success: true }),
  'guru.getPresensi': () => dummySiswaList.map(s => ({ siswaId: s.id, nama: s.name, status: 'hadir' })),
  'guru.savePresensi': () => ({ success: true }),
  'guru.rekapNilaiKelas': () => ({ headers: ['TGS-1', 'UTS'], rows: dummySiswaList.map(s => ({ siswaId: s.id, nama: s.name, nilai: { 'TGS-1': 85, 'UTS': 90 } })) }),
  'guru.gradeSubmission': () => ({ success: true }),
  'guru.tugasSubmissions': () => dummySiswaList.map(s => ({ id: s.id, siswaNama: s.name, status: 'graded', nilai: 85, fileUrl: '#', submittedAt: Date.now() - 3600000 })),
  'guru.listUjian': () => dummyUjianList,
  'guru.createUjian': () => ({ success: true }),
  'guru.deleteUjian': () => ({ success: true }),
  'guru.ujianDetail': () => ({ info: dummyUjianList[0], soal: [{ id: 1, pertanyaan: 'Berapa 2+2?', tipe: 'PILIHAN_GANDA', poin: 10, opsi: [{ id: 1, teks: '4', isBenar: true }, { id: 2, teks: '5', isBenar: false }] }] }),
  'guru.listPesertaUjian': () => dummySiswaList.map(s => ({ siswaNama: s.name, status: 'selesai', nilaiAkhir: 95, waktuMulai: new Date().toISOString(), waktuSelesai: new Date().toISOString() })),
  'guru.saveSoalUjian': () => ({ success: true }),
  'guru.waliKelasInfo': () => ({ kelas: dummyKelasList[0], totalSiswa: 32, murid: dummySiswaList.map(s => ({ ...s, persentaseHadir: 95 })), tagihan: [] }),
  'guru.dashboard': () => ({ jadwalHariIni: dummyJadwalList, pengumuman: dummyPengumuman }),
  
  // --- SISWA ---
  'siswa.dashboard': () => ({ pengumuman: dummyPengumuman, jadwalHariIni: dummyJadwalList.filter(x => x.kelasNama === '10 IPA 1'), tugasAktif: dummyAssignments, ujianAktif: dummyUjianList, persentaseHadir: 98 }),
  'siswa.listPengumuman': () => dummyPengumuman,
  'siswa.myKelasPengganti': () => [],
  'siswa.listHariLibur': () => [{ id: 1, tanggal: '2026-08-17', keterangan: 'HUT Kemerdekaan RI' }],
  'siswa.myTagihanList': () => dummyTagihan.filter(t => t.siswaNama.includes('Andi')),
  'siswa.listMateri': () => [{ id: 1, judul: 'Bab 1: Eksponen dan Logaritma', tipe: 'pdf', mapelNama: 'Matematika Lanjut', createdAt: Date.now() }],
  'siswa.myPresensi': () => ({ summary: { totalHadir: 45, sakit: 0, izin: 1, alpa: 0 }, records: [{ tanggal: new Date().toISOString(), status: 'hadir', mapelNama: 'Matematika' }] }),
  'siswa.myOfficialRapor': () => ({ semester: 1, tahun: 2026, nilai: [{ mapelNama: 'Matematika Lanjut', kkm: 75, nilaiAkhir: 88, predikat: 'B', deskripsi: 'Sangat baik dalam aljabar' }] }),
  'siswa.submitTugas': () => ({ success: true }),
  'siswa.myUjianList': () => dummyUjianList,
  'siswa.startUjian': () => ({ success: true, sesiId: 999 }),
  'siswa.submitJawabanUjian': () => ({ success: true }),
  'siswa.reportTabViolation': () => ({ success: true }),
  'siswa.ujianReviewDetail': () => ({ info: dummyUjianList[0], soal: [{ id: 1, pertanyaan: 'Berapa 2+2?', tipe: 'PILIHAN_GANDA', poin: 10, opsi: [{ id: 1, teks: '4', isBenar: true }, { id: 2, teks: '5', isBenar: false }] }], jawabanSiswa: { 1: { opsiId: 1, isBenar: true, poinDidapat: 10 } } }),
  'siswa.myJadwal': () => dummyJadwalList.filter(x => x.kelasNama === '10 IPA 1'),
  
  // --- ORANG TUA ---
  'ortu.childDashboard': () => ({ pengumuman: dummyPengumuman, jadwalHariIni: dummyJadwalList.filter(x => x.kelasNama === '10 IPA 1'), tugasAktif: dummyAssignments, persentaseHadir: 98 }),
  'ortu.childKelasPengganti': () => [],
  'ortu.myChildren': () => [{ id: 101, name: 'Andi Pratama', avatar: '', kelasNama: '10 IPA 1', nisn: '0051234567' }],
  'ortu.childTagihanList': () => dummyTagihan.filter(t => t.siswaNama.includes('Andi')),
  'ortu.submitBuktiBayar': () => ({ success: true }),
  'ortu.childPresensi': () => ({ summary: { totalHadir: 45, sakit: 0, izin: 1, alpa: 0 }, records: [] }),
  'ortu.childUjianList': () => dummyUjianList,
  'ortu.childOfficialRapor': () => ({ semester: 1, tahun: 2026, nilai: [{ mapelNama: 'Matematika Lanjut', kkm: 75, nilaiAkhir: 88, predikat: 'B' }] }),
  'ortu.listHariLibur': () => [{ id: 1, tanggal: '2026-08-17', keterangan: 'HUT Kemerdekaan RI' }],
  'ortu.listPengumuman': () => dummyPengumuman
};

// --- TRPC MOCK LINK IMPLEMENTATION ---

export const mockLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      console.log(\`[TRPC Mock] \${op.path}\`, op.input);
      
      const handler = handlers[op.path];
      
      setTimeout(() => {
        if (handler) {
          try {
            const data = handler(op.input);
            observer.next({ result: { type: 'data', data } });
            observer.complete();
          } catch (err) {
            console.error(\`[TRPC Mock Error] \${op.path}:\`, err);
            observer.error(err as any);
          }
        } else {
          console.warn(\`[TRPC Mock] Unhandled endpoint: \${op.path}. Returning empty array.\`);
          // Fallback array aman untuk mencegah .length atau .map crash
          observer.next({ result: { type: 'data', data: [] } });
          observer.complete();
        }
      }, 350); // Simulate network latency
    });
  };
};
