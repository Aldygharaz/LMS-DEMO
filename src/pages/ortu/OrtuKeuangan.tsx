import { useEffect, useState } from "react";
import {
  CreditCard,
  Clock,
  Printer,
  Download,
  Receipt,
  QrCode,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ORTU_NAV } from "./OrtuDashboard";
import { formatRupiah, exportToCSV } from "@/lib/lms";
import { Button } from "@/components/ui/button";
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

export default function OrtuKeuangan() {
  const utils = trpc.useUtils();
  const childrenQuery = trpc.ortu.myChildren.useQuery();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [tab, setTab] = useState<"all" | "unpaid" | "paid">("all");
  const [payModalTagihan, setPayModalTagihan] = useState<any | null>(null);
  const [receiptTagihan, setReceiptTagihan] = useState<any | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("Transfer Bank BCA");
  const [paymentNote, setPaymentNote] = useState("");

  useEffect(() => {
    if (childrenQuery.data && childrenQuery.data.length > 0 && selectedChildId === null) {
      setSelectedChildId(childrenQuery.data[0].id);
    }
  }, [childrenQuery.data, selectedChildId]);

  const tagihanQuery = trpc.ortu.childTagihanList.useQuery(
    { siswaId: selectedChildId! },
    { enabled: selectedChildId !== null },
  );

  const submitPaymentMutation = trpc.ortu.submitBuktiBayar.useMutation({
    onSuccess: () => {
      utils.ortu.childTagihanList.invalidate();
      setPayModalTagihan(null);
      toast.success("Konfirmasi pembayaran berhasil dikirim! Admin akan segera memverifikasi.");
    },
    onError: (err) => toast.error(err.message),
  });

  const children = childrenQuery.data ?? [];
  const activeChild = children.find((c) => c.id === selectedChildId);
  const childName = activeChild?.name ?? "Siswa";

  const rows = tagihanQuery.data?.rows ?? [];
  const summary = tagihanQuery.data?.summary ?? {
    totalNominal: 0,
    lunasNominal: 0,
    menunggakNominal: 0,
    verifikasiNominal: 0,
    countLunas: 0,
    countBelum: 0,
    countMenunggu: 0,
  };

  const filteredRows = rows.filter((r) => {
    if (tab === "unpaid") return r.status === "belum_bayar" || r.status === "menunggu_verifikasi";
    if (tab === "paid") return r.status === "lunas";
    return true;
  });

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("Tidak ada data tagihan untuk diekspor.");
      return;
    }
    const headers = [
      "No",
      "Nomor Transaksi",
      "Nama Siswa",
      "Kategori",
      "Judul Tagihan",
      "Nominal (IDR)",
      "Status",
      "Jatuh Tempo",
      "Tanggal Pembayaran",
      "Metode Pembayaran",
    ];
    const dataRows = rows.map((r, idx) => [
      idx + 1,
      r.nomorTransaksi || "-",
      childName,
      KATEGORI_LABEL[r.kategori] || r.kategori,
      r.judul,
      r.nominal,
      STATUS_BADGE[r.status]?.label || r.status,
      r.jatuhTempo,
      r.tanggalBayar || "-",
      r.metodeBayar || "-",
    ]);
    exportToCSV(`Tagihan_SPP_${childName.replace(/\s+/g, "_")}`, headers, dataRows);
    toast.success("Riwayat tagihan & pembayaran berhasil diekspor!");
  };

  return (
    <SchoolLayout role="orang_tua" title="Keuangan & SPP Ananda" nav={ORTU_NAV}>
      {/* Top Banner & Child Selector */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg print:hidden">
        <div>
          <h2 className="text-xl font-bold font-brand text-foreground">
            Portal Administrasi Keuangan Ananda
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rincian tagihan SPP bulanan, pembayaran sarana pendidikan, dan riwayat kuitansi resmi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {children.length > 1 && (
            <Select
              value={selectedChildId ? String(selectedChildId) : ""}
              onValueChange={(val) => setSelectedChildId(Number(val))}
            >
              <SelectTrigger className="w-56 bg-background border-border text-foreground text-xs rounded-xl h-10">
                <SelectValue placeholder="Pilih Anak" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground text-xs">
                {children.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    Ananda: {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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
            Cetak Rekap
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Total Tagihan Semester Ini
          </span>
          <p className="text-2xl font-extrabold text-foreground mt-1">
            {formatRupiah(summary.totalNominal)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {rows.length} Pos Pembayaran
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-green-600 dark:text-[#57F287] block">
            Sudah Terbayar (Lunas)
          </span>
          <p className="text-2xl font-extrabold text-green-600 dark:text-[#57F287] mt-1">
            {formatRupiah(summary.lunasNominal)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {summary.countLunas} Pembayaran Terverifikasi
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
          <span className="text-[10px] uppercase font-bold text-red-600 dark:text-[#FF7074] block">
            Sisa Tagihan (Belum Lunas)
          </span>
          <p className="text-2xl font-extrabold text-red-600 dark:text-[#FF7074] mt-1">
            {formatRupiah(summary.menunggakNominal + summary.verifikasiNominal)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {summary.countBelum} Tagihan Belum Dibayar
            {summary.countMenunggu > 0 && ` (${summary.countMenunggu} menunggu verifikasi)`}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold font-brand text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Buku Keuangan Ananda: {childName}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Menampilkan {filteredRows.length} dari {rows.length} total tagihan
              </CardDescription>
            </div>

            <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl text-xs print:hidden">
              {[
                { id: "all", label: "Semua" },
                { id: "unpaid", label: "Perlu Dibayar" },
                { id: "paid", label: "Riwayat Lunas" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id as any)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    tab === t.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 max-h-[600px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 w-12 text-center">
                  No
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Rincian Tagihan
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Nominal (IDR)
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Jatuh Tempo / Bayar
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5 print:hidden text-right pr-6">
                  Aksi / Bukti
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Tidak ada catatan tagihan pada kategori ini.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((r, idx) => {
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
                        <div className="font-bold text-sm text-foreground">{r.judul}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Kategori: {KATEGORI_LABEL[r.kategori] || r.kategori}
                          {r.nomorTransaksi && (
                            <span className="ml-1 text-blue-600 dark:text-[#70B8FF] font-mono">
                              &bull; #{r.nomorTransaksi}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-extrabold text-sm text-foreground font-mono">
                        {formatRupiah(r.nominal)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${badge.class}`}
                        >
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-card-foreground">
                          {r.status === "lunas" && r.tanggalBayar ? (
                            <span className="text-green-600 dark:text-[#57F287] font-semibold">
                              Lunas: {r.tanggalBayar}
                            </span>
                          ) : (
                            <span>Batas: {r.jatuhTempo}</span>
                          )}
                        </div>
                        {r.metodeBayar && (
                          <div className="text-[10px] text-muted-foreground">
                            Via: {r.metodeBayar}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="print:hidden text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === "belum_bayar" && (
                            <Button
                              size="sm"
                              onClick={() => setPayModalTagihan(r)}
                              className="h-8 rounded-lg bg-primary hover:bg-[#0873C4] text-white text-xs font-bold shadow-sm"
                            >
                              <CreditCard className="mr-1 h-3.5 w-3.5" />
                              Bayar Sekarang
                            </Button>
                          )}

                          {r.status === "lunas" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReceiptTagihan(r)}
                              className="h-8 rounded-lg bg-background border-border text-green-600 dark:text-[#57F287] hover:bg-secondary text-xs font-semibold"
                            >
                              <Receipt className="mr-1 h-3.5 w-3.5" />
                              Lihat Kuitansi
                            </Button>
                          )}

                          {r.status === "menunggu_verifikasi" && (
                            <span className="text-xs text-amber-600 dark:text-[#FEE75C] font-semibold italic flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Diproses
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Pembayaran SPP Online */}
      {payModalTagihan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-primary/20 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-brand text-foreground">
                    Pembayaran: {payModalTagihan.judul}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Pilih kanal pembayaran resmi Sokara Academy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayModalTagihan(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-background border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block">Total Tagihan</span>
                  <p className="text-xl font-extrabold text-foreground">
                    {formatRupiah(payModalTagihan.nominal)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Siswa</span>
                  <p className="text-sm font-bold text-foreground">{childName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">Metode Pembayaran:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "Transfer Bank BCA", desc: "No. Rek: 8870-1234-5678" },
                    { id: "Virtual Account Mandiri", desc: "VA: 8900-1122-3344" },
                    { id: "QRIS Sokara Pay", desc: "Scan instan via GoPay/OVO/ShopeePay" },
                    { id: "Kasir Tunai Sekolah", desc: "Bayar di loket TU Sekolah" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedMethod === m.id
                          ? "bg-blue-100 dark:bg-primary/15 border-primary text-white"
                          : "bg-background border-border text-muted-foreground hover:border-border"
                      }`}
                    >
                      <div className="text-xs font-bold text-foreground">{m.id}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Catatan Pengirim (Opsional):</label>
                <input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full bg-background border border-border text-foreground text-xs rounded-xl h-10 px-3"
                  placeholder="Contoh: Transfer atas nama Ibu Dewi"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayModalTagihan(null)}
                  className="h-10 rounded-xl bg-background border-border text-muted-foreground text-xs font-semibold"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={submitPaymentMutation.isPending}
                  onClick={() =>
                    submitPaymentMutation.mutate({
                      tagihanId: payModalTagihan.id,
                      siswaId: selectedChildId!,
                      metodeBayar: selectedMethod,
                      catatan: paymentNote || undefined,
                    })
                  }
                  className="h-10 rounded-xl bg-[#23A559] hover:bg-[#1E8A4B] text-white text-xs font-bold shadow-md"
                >
                  {submitPaymentMutation.isPending ? "Mengonfirmasi..." : "Konfirmasi Pembayaran"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kuitansi Resmi Pembayaran SPP (Printable) */}
      {receiptTagihan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white text-black p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header Kuitansi Resmi */}
            <div className="border-b-2 border-black pb-3 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-brand tracking-tight text-black">
                  SOKARA ACADEMY &bull; KUITANSI RESMI
                </h2>
                <p className="text-[10px] text-slate-600">
                  Tanda Bukti Pembayaran Administrasi Sekolah
                </p>
              </div>
              <div className="text-right font-mono text-[9px] text-slate-600">
                <p className="font-bold text-black text-xs">{receiptTagihan.nomorTransaksi || "TR-202608-OFFICIAL"}</p>
                <p>Status: LUNAS</p>
              </div>
            </div>

            {/* Detail Transaksi */}
            <div className="space-y-2 text-xs text-slate-800 mb-6">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Telah Terima Dari:</span>
                <span className="font-bold text-black">Wali Murid Ananda {childName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Untuk Pembayaran:</span>
                <span className="font-bold text-black">{receiptTagihan.judul}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Tanggal Transaksi:</span>
                <span className="font-semibold text-black">{receiptTagihan.tanggalBayar || "2026-08-08"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Metode Pembayaran:</span>
                <span className="font-semibold text-black">{receiptTagihan.metodeBayar || "Transfer Bank"}</span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-black bg-slate-50 px-2 rounded">
                <span className="font-bold text-black text-sm">JUMLAH NOMINAL:</span>
                <span className="font-extrabold text-black text-base font-mono">
                  {formatRupiah(receiptTagihan.nominal)}
                </span>
              </div>
            </div>

            {/* Signature & Seal Block */}
            <div className="flex justify-between items-end text-xs text-slate-700 pt-2">
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-1 flex items-center justify-center rounded-lg border border-slate-300">
                  <QrCode className="h-10 w-10 text-slate-800" />
                </div>
                <span className="text-[9px] text-slate-500">E-Verifikasi Sah</span>
              </div>
              <div className="text-center w-40">
                <p className="text-[10px] text-slate-500 mb-10">Bendahara Sekolah,</p>
                <p className="font-bold text-black border-t border-black pt-1">Kasir Administrasi</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-2 print:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReceiptTagihan(null)}
                className="h-9 text-xs rounded-xl"
              >
                Tutup
              </Button>
              <Button
                type="button"
                onClick={() => window.print()}
                className="h-9 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-foreground font-bold"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Cetak Kuitansi
              </Button>
            </div>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
