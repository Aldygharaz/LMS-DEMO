import { useState, useDeferredValue, type FormEvent } from "react";
import {
  Plus,
  Search,
  Download,
  Printer,
  Sparkles,
  X,
  Receipt,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ADMIN_NAV } from "@/lib/nav";
import { formatRupiah, formatRupiahInput, parseRupiah, exportToCSV } from "@/lib/lms";
import { EmptyState, TableSkeleton } from "@/components/lms-shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  lunas: {
    label: "Lunas",
    class: "bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287] border-[#23A559]/40",
  },
  menunggu_verifikasi: {
    label: "Menunggu Verifikasi",
    class: "bg-amber-100 dark:bg-[#F0B232]/20 text-amber-600 dark:text-[#FEE75C] border-[#F0B232]/40",
  },
  belum_bayar: {
    label: "Belum Bayar",
    class: "bg-red-100 dark:bg-[#F23F43]/20 text-red-600 dark:text-[#FF7074] border-[#F23F43]/40",
  },
  dibatalkan: {
    label: "Dibatalkan",
    class: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  },
};

const KATEGORI_LABEL: Record<string, string> = {
  SPP: "SPP Bulanan",
  DSP_Gedung: "Uang Gedung (DSP)",
  Ujian: "Biaya Ujian",
  Kegiatan_Ekskul: "Kegiatan & Ekskul",
  Seragam_Buku: "Seragam & Buku",
  Lainnya: "Lainnya",
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function AdminKeuangan() {
  const utils = trpc.useUtils();
  const tagihanQuery = trpc.admin.listTagihan.useQuery();
  const rekapQuery = trpc.admin.rekapKeuangan.useQuery();
  const kelasQuery = trpc.admin.listKelas.useQuery();
  const siswaQuery = trpc.admin.listUsers.useQuery({ role: "siswa" });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [kategoriFilter, setKategoriFilter] = useState("semua");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Form Batch Generator State
  const [batchBulan, setBatchBulan] = useState(String(new Date().getMonth() + 1));
  const [batchTahun, setBatchTahun] = useState("2026");
  const [batchNominalStr, setBatchNominalStr] = useState("350.000");
  const [batchJatuhTempo, setBatchJatuhTempo] = useState("2026-08-10");
  const [batchKelasId, setBatchKelasId] = useState<string>("all");

  // Form Manual Single Tagihan State
  const [manualSiswaId, setManualSiswaId] = useState("");
  const [manualKategori, setManualKategori] = useState<"SPP" | "DSP_Gedung" | "Ujian" | "Kegiatan_Ekskul" | "Seragam_Buku" | "Lainnya">("SPP");
  const [manualJudul, setManualJudul] = useState("");
  const [manualNominalStr, setManualNominalStr] = useState("350.000");
  const [manualJatuhTempo, setManualJatuhTempo] = useState(new Date().toISOString().slice(0, 10));
  const [manualCatatan, setManualCatatan] = useState("");

  // Mutations
  const batchMutation = trpc.admin.batchGenerateSPP.useMutation({
    onSuccess: (res) => {
      utils.admin.listTagihan.invalidate();
      utils.admin.rekapKeuangan.invalidate();
      setShowBatchModal(false);
      toast.success(
        `Berhasil generate ${res.generated} tagihan SPP (${res.skippedExisting} dilewati karena sudah ada).`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const manualMutation = trpc.admin.createTagihan.useMutation({
    onSuccess: () => {
      utils.admin.listTagihan.invalidate();
      utils.admin.rekapKeuangan.invalidate();
      setShowManualModal(false);
      setManualJudul("");
      toast.success("Tagihan baru berhasil dibuat.");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.admin.updateStatusTagihan.useMutation({
    onSuccess: () => {
      utils.admin.listTagihan.invalidate();
      utils.admin.rekapKeuangan.invalidate();
      toast.success("Status tagihan berhasil diperbarui.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.admin.deleteTagihan.useMutation({
    onSuccess: () => {
      utils.admin.listTagihan.invalidate();
      utils.admin.rekapKeuangan.invalidate();
      toast.success("Tagihan berhasil dihapus.");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleBatchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nominal = parseRupiah(batchNominalStr);
    if (!nominal || nominal < 1000) {
      toast.error("Nominal SPP tidak valid.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin *Generate SPP Massal*?\n\nProses ini akan membuat tagihan permanen untuk banyak siswa secara bersamaan.`)) {
      batchMutation.mutate({
        bulan: Number(batchBulan),
        tahun: Number(batchTahun),
        nominal,
        jatuhTempo: batchJatuhTempo,
        kelasId: batchKelasId === "all" ? null : Number(batchKelasId),
      });
    }
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manualSiswaId) {
      toast.error("Pilih siswa terlebih dahulu.");
      return;
    }
    const nominal = parseRupiah(manualNominalStr);
    if (!nominal || nominal < 1000) {
      toast.error("Nominal tagihan tidak valid.");
      return;
    }
    manualMutation.mutate({
      siswaId: Number(manualSiswaId),
      kategori: manualKategori,
      judul: manualJudul || `${KATEGORI_LABEL[manualKategori]} TP 2026`,
      nominal,
      tahun: new Date().getFullYear(),
      jatuhTempo: manualJatuhTempo,
      catatan: manualCatatan || undefined,
    });
  };

  const rows = tagihanQuery.data ?? [];
  const rekap = rekapQuery.data ?? {
    totalNominal: 0,
    lunasNominal: 0,
    menunggakNominal: 0,
    verifikasiNominal: 0,
    countTotal: 0,
    countLunas: 0,
    countMenunggu: 0,
    countBelum: 0,
    kolektibilitas: 0,
  };

  const deferredSearch = useDeferredValue(search);
  const filteredRows = rows.filter((r) => {
    const matchStatus =
      statusFilter === "semua" || r.status === statusFilter;
    const matchKategori =
      kategoriFilter === "semua" || r.kategori === kategoriFilter;
    const matchSearch =
      r.siswaNama.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      r.siswaEmail.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      r.judul.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      (r.nomorTransaksi && r.nomorTransaksi.toLowerCase().includes(deferredSearch.toLowerCase()));
    return matchStatus && matchKategori && matchSearch;
  });

  const handleExportCSV = () => {
    if (!filteredRows || filteredRows.length === 0) {
      toast.error("Tidak ada data tagihan untuk diekspor.");
      return;
    }
    const headers = [
      "No",
      "Nomor Transaksi",
      "Nama Siswa",
      "Email Siswa",
      "Kelas",
      "Kategori",
      "Judul Tagihan",
      "Nominal (IDR)",
      "Status",
      "Jatuh Tempo",
      "Tanggal Bayar",
      "Metode Pembayaran",
      "Catatan",
    ];
    const dataRows = filteredRows.map((r, idx) => [
      idx + 1,
      r.nomorTransaksi || "-",
      r.siswaNama,
      r.siswaEmail,
      r.kelasNama || "-",
      KATEGORI_LABEL[r.kategori] || r.kategori,
      r.judul,
      r.nominal,
      STATUS_BADGE[r.status]?.label || r.status,
      r.jatuhTempo,
      r.tanggalBayar || "-",
      r.metodeBayar || "-",
      r.catatan || "-",
    ]);
    exportToCSV("Laporan_Keuangan_SPP_Sekolah", headers, dataRows);
    toast.success("Laporan keuangan berhasil diekspor!");
  };

  return (
    <SchoolLayout role="admin" title="Keuangan & SPP Sekolah" nav={ADMIN_NAV}>
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Administrasi Keuangan &amp; SPP
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manajemen tagihan SPP bulanan, uang pangkal/gedung, verifikasi pembayaran orang tua, dan rekapitulasi kas masuk
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="h-10 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold shadow-md"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Generate SPP Massal
          </Button>

          <Button
            type="button"
            onClick={() => setShowManualModal(true)}
            variant="outline"
            className="h-10 rounded-xl bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold"
          >
            <Plus className="mr-1.5 h-4 w-4 text-green-600 dark:text-[#57F287]" />
            Tambah Tagihan
          </Button>

          <Button
            type="button"
            onClick={handleExportCSV}
            variant="outline"
            className="h-10 rounded-xl bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold"
          >
            <Download className="mr-1.5 h-4 w-4 text-[#23A559]" />
            Ekspor CSV
          </Button>

          <Button
            type="button"
            onClick={() => window.print()}
            variant="outline"
            className="h-10 rounded-xl bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold"
          >
            <Printer className="mr-1.5 h-4 w-4 text-blue-600 dark:text-[#70B8FF]" />
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* KPI Financial Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Total Tagihan Terbit
          </span>
          <p className="text-xl font-extrabold text-foreground mt-1">
            {formatRupiah(rekap.totalNominal)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {rekap.countTotal} Lembar Tagihan
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-green-600 dark:text-[#57F287] block">
            Total Kas Masuk (Lunas)
          </span>
          <p className="text-xl font-extrabold text-green-600 dark:text-[#57F287] mt-1">
            {formatRupiah(rekap.lunasNominal)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {rekap.countLunas} Siswa &bull; Kolektibilitas: {rekap.kolektibilitas}%
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-red-600 dark:text-[#FF7074] block">
            Total Piutang (Menunggak)
          </span>
          <p className="text-xl font-extrabold text-red-600 dark:text-[#FF7074] mt-1">
            {formatRupiah(rekap.menunggakNominal)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {rekap.countBelum} Tagihan Belum Dibayar
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-[#FEE75C] block">
            Menunggu Verifikasi
          </span>
          <p className="text-xl font-extrabold text-amber-600 dark:text-[#FEE75C] mt-1">
            {formatRupiah(rekap.verifikasiNominal)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {rekap.countMenunggu} Bukti Transfer Perlu Dicek
          </span>
        </div>
      </div>

      {/* Main Table Card with Search & Filters */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold font-brand text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Daftar Tagihan &amp; Pembayaran Siswa
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Menampilkan {filteredRows.length} dari {rows.length} total tagihan
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 print:hidden">
              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl text-xs">
                {[
                  { id: "semua", label: "Semua" },
                  { id: "lunas", label: "Lunas" },
                  { id: "menunggu_verifikasi", label: "Verifikasi" },
                  { id: "belum_bayar", label: "Belum Bayar" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      statusFilter === st.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Kategori Select */}
              <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
                <SelectTrigger className="w-40 bg-background border-border text-foreground text-xs rounded-xl h-9">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground text-xs">
                  <SelectItem value="semua">Semua Kategori</SelectItem>
                  <SelectItem value="SPP">SPP Bulanan</SelectItem>
                  <SelectItem value="DSP_Gedung">Uang Gedung (DSP)</SelectItem>
                  <SelectItem value="Ujian">Biaya Ujian</SelectItem>
                  <SelectItem value="Kegiatan_Ekskul">Kegiatan &amp; Ekskul</SelectItem>
                  <SelectItem value="Seragam_Buku">Seragam &amp; Buku</SelectItem>
                </SelectContent>
              </Select>

              {/* Search Box */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari siswa, no. transaksi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl focus:border-primary"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 max-h-[600px] overflow-y-auto overflow-x-auto">
          {tagihanQuery.isLoading ? (
            <div className="p-4"><TableSkeleton rows={8} columns={5} /></div>
          ) : filteredRows.length === 0 ? (
            <EmptyState 
              title="Data Kosong" 
              description="Tidak ada catatan tagihan atau pembayaran yang sesuai filter." 
            />
          ) : (
            <Table>
              <TableHeader className="bg-background sticky top-0 z-10">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 w-12 text-center">
                    No
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                    Siswa &amp; Rombel
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                    Rincian Tagihan
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                    Nominal / Jatuh Tempo
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-center">
                    Metode &amp; No. Transaksi
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 text-right pr-6">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r, idx) => {
                  const badge = STATUS_BADGE[r.status] ?? {
                    label: r.status,
                    class: "bg-gray-500/20 text-gray-300",
                  };
                  return (
                    <TableRow
                      key={r.id}
                      className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                    >
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-sm text-foreground">{r.siswaNama}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.kelasNama ? `Kelas ${r.kelasNama}` : "Siswa"} &bull; {r.siswaEmail}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold text-foreground">{r.judul}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {r.kategori} &bull; Periode: {r.bulan}/{r.tahun}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-sm text-foreground">
                          {formatRupiah(r.nominal)}
                        </div>
                        <div className="text-[11px] text-red-600 dark:text-[#FF7074]">
                          Batas: {r.jatuhTempo}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`${badge.class} text-[10px] uppercase font-bold tracking-wider py-0.5`}
                        >
                          {badge.label}
                        </Badge>
                        {r.tanggalBayar && (
                          <div className="text-[9px] text-muted-foreground mt-1 font-mono">
                            {r.tanggalBayar}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.metodeBayar ? (
                          <>
                            <div className="text-xs font-bold text-foreground uppercase">
                              {r.metodeBayar}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {r.nomorTransaksi || "-"}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="print:hidden text-right pr-6">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px] rounded-xl font-medium">
                              {r.status === "menunggu_verifikasi" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: r.id,
                                      status: "lunas",
                                    })
                                  }
                                  className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                >
                                  Verifikasi Lunas
                                </DropdownMenuItem>
                              )}

                              {r.status === "belum_bayar" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: r.id,
                                      status: "lunas",
                                    })
                                  }
                                  className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                >
                                  Tandai Lunas
                                </DropdownMenuItem>
                              )}

                              {r.status === "lunas" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: r.id,
                                      status: "belum_bayar",
                                    })
                                  }
                                  className="text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                                >
                                  Batal Lunas
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Hapus tagihan "${r.judul}" untuk ${r.siswaNama}?`)) {
                                    deleteMutation.mutate({ id: r.id });
                                  }
                                }}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                Hapus Tagihan
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Batch Generate SPP Massal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-primary/20 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-brand text-foreground">
                    Generate SPP Massal
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Terbitkan tagihan SPP serentak untuk seluruh siswa atau rombel terpilih
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bulan SPP</Label>
                  <Select value={batchBulan} onValueChange={setBatchBulan}>
                    <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                      <SelectValue placeholder="Pilih Bulan" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground text-xs">
                      {MONTH_NAMES.map((m, idx) => (
                        <SelectItem key={m} value={String(idx + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tahun Anggaran</Label>
                  <Input
                    value={batchTahun}
                    onChange={(e) => setBatchTahun(e.target.value)}
                    className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Target Siswa / Rombel</Label>
                <Select value={batchKelasId} onValueChange={setBatchKelasId}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                    <SelectValue placeholder="Semua Siswa Aktif" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground text-xs">
                    <SelectItem value="all">Seluruh 150 Siswa (Semua Rombel)</SelectItem>
                    {kelasQuery.data?.map((k) => (
                      <SelectItem key={k.id} value={String(k.id)}>
                        Kelas {k.nama} ({k.jumlahSiswa} Siswa)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nominal SPP (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    value={batchNominalStr}
                    onChange={(e) => setBatchNominalStr(formatRupiahInput(e.target.value))}
                    className="pl-10 bg-background border-border text-foreground text-xs font-bold rounded-xl h-10"
                    placeholder="350.000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Batas Jatuh Tempo</Label>
                <Input
                  type="date"
                  value={batchJatuhTempo}
                  onChange={(e) => setBatchJatuhTempo(e.target.value)}
                  className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                />
              </div>

              <div className="p-3 rounded-xl bg-primary/10 border border-blue-200 dark:border-primary/30 text-xs text-blue-600 dark:text-[#70B8FF]">
                <strong>Poka-Yoke Duplicate Guard:</strong> Sistem otomatis mendeteksi dan melewati siswa yang sudah memiliki tagihan SPP pada bulan &amp; tahun yang sama.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBatchModal(false)}
                  className="h-10 rounded-xl bg-background border-border text-muted-foreground text-xs font-semibold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={batchMutation.isPending}
                  className="h-10 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold"
                >
                  {batchMutation.isPending ? "Memproses..." : "Eksekusi Generate SPP"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Tagihan Manual Single */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 dark:bg-[#23A559]/20 text-green-600 dark:text-[#57F287]">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-brand text-foreground">
                    Tambah Tagihan Manual
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Buat tagihan khusus (Uang Gedung, Ujian, Ekskul) untuk siswa tertentu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pilih Siswa</Label>
                <Select value={manualSiswaId} onValueChange={setManualSiswaId}>
                  <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                    <SelectValue placeholder="Pilih Siswa" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground text-xs max-h-56">
                    {siswaQuery.data?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Kategori Tagihan</Label>
                  <Select
                    value={manualKategori}
                    onValueChange={(val: any) => setManualKategori(val)}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground text-xs">
                      <SelectItem value="SPP">SPP Bulanan</SelectItem>
                      <SelectItem value="DSP_Gedung">Uang Gedung (DSP)</SelectItem>
                      <SelectItem value="Ujian">Biaya Ujian</SelectItem>
                      <SelectItem value="Kegiatan_Ekskul">Kegiatan &amp; Ekskul</SelectItem>
                      <SelectItem value="Seragam_Buku">Seragam &amp; Buku</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nominal (Rp)</Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      value={manualNominalStr}
                      onChange={(e) => setManualNominalStr(formatRupiahInput(e.target.value))}
                      className="pl-10 bg-background border-border text-foreground text-xs font-bold rounded-xl h-10"
                      placeholder="350.000"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Judul / Keterangan Tagihan</Label>
                <Input
                  value={manualJudul}
                  onChange={(e) => setManualJudul(e.target.value)}
                  className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  placeholder="Contoh: Uang Gedung TP 2026/2027"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Batas Jatuh Tempo</Label>
                <Input
                  type="date"
                  value={manualJatuhTempo}
                  onChange={(e) => setManualJatuhTempo(e.target.value)}
                  className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Catatan Administratif (Opsional)</Label>
                <Input
                  value={manualCatatan}
                  onChange={(e) => setManualCatatan(e.target.value)}
                  className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                  placeholder="Contoh: Pembayaran dapat diangsur 2x"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowManualModal(false)}
                  className="h-10 rounded-xl bg-background border-border text-muted-foreground text-xs font-semibold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={manualMutation.isPending}
                  className="h-10 rounded-xl bg-[#23A559] hover:bg-[#1E8A4B] text-white text-xs font-bold"
                >
                  {manualMutation.isPending ? "Menyimpan..." : "Simpan Tagihan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
