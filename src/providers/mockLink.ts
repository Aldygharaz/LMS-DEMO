import { TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { AppRouter } from '../../server/router';

// Dummy Database In-Memory
let currentUser: any = null;

const dummyPengumuman = [
  { id: 1, judul: 'Libur Semester Genap', konten: 'Libur dari tanggal 10 sampai 24', kategori: 'Umum', targetRole: 'semua', authorNama: 'Admin', createdAt: Date.now(), pinned: 1 }
];
const dummyKelasMapel = [
  { id: 1, mapelNama: 'Matematika', kelasNama: '10 IPA 1', totalSiswa: 30 }
];

const handlers: Record<string, (input: any) => any> = {
  'auth.me': () => currentUser,
  'schoolAuth.me': () => currentUser,
  'schoolAuth.login': (input) => {
    let role = 'admin';
    if (input.email.includes('guru')) role = 'guru';
    if (input.email.includes('siswa')) role = 'siswa';
    if (input.email.includes('budi')) role = 'guru';
    if (input.email.includes('andi')) role = 'siswa';
    if (input.email.includes('hartono')) role = 'orang_tua';
    currentUser = { id: 1, name: 'Demo User', email: input.email, role, avatar: '' };
    return currentUser;
  },
  'schoolAuth.logout': () => { currentUser = null; return { success: true }; },
  
  // Admin
  'admin.stats': () => ({ totalSiswa: 150, totalGuru: 12, totalKelas: 6, totalMapel: 10 }),
  'admin.listPengumuman': () => dummyPengumuman,
  'admin.createPengumuman': () => ({ id: 2 }),
  'admin.deletePengumuman': () => ({ success: true }),
  'admin.presensiOverview': () => ({ totalHadir: 140, totalSakit: 5, totalIzin: 3, totalAlpa: 2, rasioHadir: 95 }),
  'admin.listKelas': () => [{ id: 1, nama: '10 IPA 1', waliKelasNama: 'Budi Santoso', totalSiswa: 30 }],
  'admin.kelasDetail': () => ({ kelas: { id: 1, nama: '10 IPA 1', waliKelasNama: 'Budi Santoso' }, siswa: [{ id: 1, name: 'Andi Pratama', email: 'andi@sekolah.demo' }], mapel: dummyKelasMapel }),
  'admin.rekapKeuangan': () => ({ totalNominal: 5000000, lunasNominal: 4000000, menunggakNominal: 1000000, verifikasiNominal: 0, countTotal: 50, countLunas: 40, countMenunggu: 0, countBelum: 10, kolektibilitas: 80 }),
  'admin.tagihanList': () => [],
  
  // Guru
  'guru.myAssignments': () => [{ id: 1, judul: 'PR Aljabar', kelasNama: '10 IPA 1', mapelNama: 'Matematika', deadline: Date.now() + 86400000, createdAt: Date.now(), totalSiswa: 30, submittedCount: 15 }],
  'guru.mySchedule': () => [{ id: 1, hari: 'Senin', jamMulai: '07:00', jamSelesai: '08:30', kelasNama: '10 IPA 1', mapelNama: 'Matematika' }],
  'guru.myKelasMapel': () => dummyKelasMapel,
  'guru.listHariLibur': () => [],
  'guru.myKelasPengganti': () => [],
  'guru.createKelasPengganti': () => ({ success: true }),
  'guru.updateKelasPengganti': () => ({ success: true }),
  'guru.deleteKelasPengganti': () => ({ success: true }),
  'guru.kelasMapelDetail': () => ({ info: dummyKelasMapel[0], siswaList: [{ id: 1, nama: 'Andi Pratama' }] }),
  'guru.createTugas': () => ({ success: true }),
  'guru.updateTugas': () => ({ success: true }),
  'guru.deleteTugas': () => ({ success: true }),
  'guru.listMateri': () => [],
  'guru.createMateri': () => ({ success: true }),
  'guru.updateMateri': () => ({ success: true }),
  'guru.deleteMateri': () => ({ success: true }),
  'guru.getPresensi': () => [],
  'guru.savePresensi': () => ({ success: true }),
  'guru.rekapNilaiKelas': () => ({ headers: [], rows: [] }),
  'guru.gradeSubmission': () => ({ success: true }),
  'guru.tugasSubmissions': () => [],
  'guru.listUjian': () => [],
  'guru.createUjian': () => ({ success: true }),
  'guru.deleteUjian': () => ({ success: true }),
  'guru.ujianDetail': () => ({ info: { id: 1, judul: 'UTS Matematika' }, soal: [] }),
  'guru.listPesertaUjian': () => [],
  'guru.saveSoalUjian': () => ({ success: true }),
  'guru.waliKelasInfo': () => ({ id: 1, nama: '10 IPA 1', totalSiswa: 30, murid: [], tagihan: [] }),
  
  // Siswa
  'siswa.dashboard': () => ({ pengumuman: dummyPengumuman, jadwalHariIni: [], tugasAktif: [], ujianAktif: [], persentaseHadir: 100 }),
  'siswa.listPengumuman': () => dummyPengumuman,
  'siswa.myKelasPengganti': () => [],
  'siswa.listHariLibur': () => [],
  'siswa.myTagihanList': () => [],
  'siswa.listMateri': () => [],
  'siswa.myPresensi': () => [],
  'siswa.myOfficialRapor': () => null,
  'siswa.submitTugas': () => ({ success: true }),
  'siswa.myUjianList': () => [],
  'siswa.startUjian': () => ({ success: true }),
  'siswa.submitJawabanUjian': () => ({ success: true }),
  'siswa.reportTabViolation': () => ({ success: true }),
  'siswa.ujianReviewDetail': () => ({ info: null, soal: [], jawabanSiswa: {} }),
  
  // Ortu
  'ortu.childDashboard': () => ({ pengumuman: dummyPengumuman, jadwalHariIni: [], tugasAktif: [], persentaseHadir: 100 }),
  'ortu.childKelasPengganti': () => [],
  'ortu.myChildren': () => [{ id: 1, name: 'Andi Pratama', avatar: '', kelasNama: '10 IPA 1' }],
  'ortu.childTagihanList': () => [],
  'ortu.submitBuktiBayar': () => ({ success: true }),
  'ortu.childPresensi': () => [],
  'ortu.childUjianList': () => [],
  'ortu.childOfficialRapor': () => null,
  'ortu.listHariLibur': () => [],
  'ortu.listPengumuman': () => dummyPengumuman
};

export const mockLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      console.log(`[TRPC Mock] ${op.path}`, op.input);
      
      const handler = handlers[op.path];
      
      setTimeout(() => {
        if (handler) {
          try {
            const data = handler(op.input);
            observer.next({ result: { type: 'data', data } });
            observer.complete();
          } catch (err) {
            observer.error(err as any);
          }
        } else {
          console.warn(`[TRPC Mock] Unhandled endpoint: ${op.path}`);
          // Return default empty object/array to prevent crashes
          observer.next({ result: { type: 'data', data: [] } });
          observer.complete();
        }
      }, 300); // Simulate network latency
    });
  };
};
