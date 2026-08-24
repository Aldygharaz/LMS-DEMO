export type SchoolRole = "admin" | "guru" | "siswa" | "orang_tua";

export const ROLE_LABEL: Record<SchoolRole, string> = {
  admin: "Admin",
  guru: "Guru",
  siswa: "Siswa",
  orang_tua: "Orang Tua",
};

export const ROLE_HOME: Record<SchoolRole, string> = {
  admin: "/admin",
  guru: "/guru",
  siswa: "/siswa",
  orang_tua: "/ortu",
};

export const HARI_LIST = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

export function hariIni(): (typeof HARI_LIST)[number] {
  const day = new Date().getDay(); // 0=Minggu
  return HARI_LIST[day - 1] ?? "Senin";
}

export function formatTanggal(d: Date | string): string {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTanggalWaktu(d: Date | string): string {
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Humanized relative time (e.g. 5 menit yang lalu, Kemarin) */
export function timeAgo(d: Date | string): string {
  const date = new Date(d);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari yang lalu`;
  
  return formatTanggal(date);
}

export function isDeadlineLewat(deadline: Date | string): boolean {
  return new Date(deadline).getTime() < Date.now();
}

/** Sisa waktu menuju deadline dalam bahasa Indonesia. */
export function sisaWaktu(deadline: Date | string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return "Deadline lewat";
  const hari = Math.floor(diff / (24 * 60 * 60 * 1000));
  const jam = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (hari > 0) return `${hari} hari lagi`;
  if (jam > 0) return `${jam} jam lagi`;
  return "Kurang dari 1 jam";
}

/** Unduh file dari data base64. */
export function downloadBase64(
  fileNama: string,
  dataBase64: string,
  mime = "application/octet-stream",
) {
  const byteChars = atob(dataBase64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileNama;
  a.click();
  URL.revokeObjectURL(url);
}

/** Baca File → base64 (tanpa prefix data:...). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Poka-Yoke: Validasi rentang waktu jam mulai dan jam selesai (format HH:mm) */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return false;
  return startTime < endTime;
}

/** Kaizen Yokoten: Centralized standardized CSV exporter with UTF-8 BOM for Excel compatibility */
export function exportToCSV(
  fileName: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
) {
  const sanitizeCell = (cell: string | number | boolean | null | undefined) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvHeader = headers.map(sanitizeCell).join(",");
  const csvBody = rows
    .map((row) => row.map(sanitizeCell).join(","))
    .join("\r\n");

  const fullContent = `\uFEFF${csvHeader}\r\n${csvBody}`;
  const blob = new Blob([fullContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Universal Currency Formatter (IDR / Rupiah)
 * Menampilkan format Rp dengan pemisah ribuan titik (.)
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "Rp 0";
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/**
 * Format input angka secara real-time dengan pemisah ribuan titik (.)
 * Contoh: "350000" -> "350.000"
 */
export function formatRupiahInput(val: string | number): string {
  const digits = String(val).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

export function parseRupiah(str: string): number {
  const digits = str.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * Standar Penilaian Akademik (Kurikulum Merdeka / K13)
 * A: >= 88 (Sangat Baik)
 * B: 75 - 87 (Baik / Tuntas KKM)
 * C: 60 - 74 (Cukup / Remedial)
 * D: < 60 (Perlu Bimbingan)
 */
export function hitungPredikat(score: number | null | undefined): "A" | "B" | "C" | "D" | "—" {
  if (score === null || score === undefined || isNaN(score)) return "—";
  if (score >= 88) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  return "D";
}

export function hitungKetuntasan(score: number | null | undefined, kkm = 75): boolean {
  if (score === null || score === undefined || isNaN(score)) return false;
  return score >= kkm;
}

export function getPredikatBadgeClass(predikat: string): string {
  switch (predikat) {
    case "A":
      return "bg-green-100 dark:bg-[#23A559]/20 text-green-700 dark:text-[#57F287] border-green-300 dark:border-[#23A559]/40";
    case "B":
      return "bg-blue-100 dark:bg-[#0984E3]/20 text-blue-700 dark:text-[#70B8FF] border-blue-300 dark:border-[#0984E3]/40";
    case "C":
      return "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-700 dark:text-[#FEE75C] border-amber-300 dark:border-[#F0B232]/40";
    case "D":
      return "bg-red-100 dark:bg-[#F23F43]/20 text-red-700 dark:text-[#FF7074] border-red-300 dark:border-[#F23F43]/40";
    default:
      return "bg-secondary text-muted-foreground border-border";
  }
}

