import { useState, useDeferredValue, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  Users,
  UserPlus,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SchoolLayout } from "@/components/SchoolLayout";
import { ADMIN_NAV } from "@/lib/nav";
import { ROLE_LABEL, type SchoolRole, exportToCSV } from "@/lib/lms";
import { EmptyState, TableSkeleton } from "@/components/lms-shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLES: SchoolRole[] = ["guru", "siswa", "orang_tua", "admin"];

function UserTable({
  role,
  searchQuery,
}: {
  role: SchoolRole;
  searchQuery: string;
}) {
  const users = trpc.admin.listUsers.useQuery({ role });
  const deferredSearch = useDeferredValue(searchQuery);

  const filtered = users.data?.filter(
    (u) =>
      u.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(deferredSearch.toLowerCase()),
  );

  if (users.isLoading) {
    return <TableSkeleton rows={5} columns={3} />;
  }

  if (filtered?.length === 0) {
    return (
      <EmptyState 
        icon={Users}
        title={searchQuery ? "Tidak ditemukan" : "Data Kosong"}
        description={searchQuery ? "Tidak ada pengguna yang cocok dengan pencarian." : `Belum ada pengguna dengan role ${ROLE_LABEL[role]}.`}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xl">
      <Table>
        <TableHeader className="bg-background">
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
              Nama Lengkap
            </TableHead>
            <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
              Email Akun
            </TableHead>
            <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
              Role
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/50">
          {filtered?.map((u) => (
            <TableRow
              key={u.id}
              className="hover:bg-secondary/80 transition-colors"
            >
              <TableCell className="font-semibold text-foreground text-sm py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold text-xs">
                    {u.name.charAt(0)}
                  </div>
                  <span>{u.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground py-3.5">{u.email}</TableCell>
              <TableCell className="text-right py-3.5">
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-background border border-border text-card-foreground">
                  {ROLE_LABEL[u.role as SchoolRole]}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminPengguna() {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SchoolRole | "">("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [searchRelasi, setSearchRelasi] = useState("");
  const deferredSearchRelasi = useDeferredValue(searchRelasi);

  const [ortuId, setOrtuId] = useState("");
  const [siswaId, setSiswaId] = useState("");


  const ortuList = trpc.admin.listUsers.useQuery({ role: "orang_tua" });
  const siswaList = trpc.admin.listUsers.useQuery({ role: "siswa" });
  const links = trpc.admin.listOrtuLinks.useQuery();

  const filteredLinks = (links.data ?? []).filter(
    (l) =>
      l.ortuNama.toLowerCase().includes(deferredSearchRelasi.toLowerCase()) ||
      l.siswaNama.toLowerCase().includes(deferredSearchRelasi.toLowerCase()),
  );

  const exportRelasiCSV = () => {
    if (!links.data || links.data.length === 0) {
      toast.error("Tidak ada data relasi untuk diekspor.");
      return;
    }
    const headers = ["No", "Nama Orang Tua", "Nama Siswa (Anak)"];
    const rows = links.data.map((l, idx) => [
      idx + 1,
      l.ortuNama,
      l.siswaNama,
    ]);
    exportToCSV("Daftar_Relasi_Orang_Tua_Siswa", headers, rows);
    toast.success("Daftar relasi orang tua dan siswa berhasil diekspor!");
  };

  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: async () => {
      setSuccess(`Pengguna ${email} berhasil dibuat.`);
      toast.success(`Akun pengguna ${name} (${ROLE_LABEL[role as SchoolRole]}) berhasil didaftarkan!`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("");
      await utils.admin.listUsers.invalidate();
      await utils.admin.stats.invalidate();
    },
    onError: (e) => setError(e.message),
  });

  const linkOrtu = trpc.admin.linkOrtuSiswa.useMutation({
    onSuccess: async () => {
      setOrtuId("");
      setSiswaId("");
      toast.success("Relasi akun orang tua dan siswa berhasil dihubungkan!");
      await utils.admin.listOrtuLinks.invalidate();
    },
    onError: (e) => setError(e.message),
  });

  const unlinkOrtu = trpc.admin.unlinkOrtuSiswa.useMutation({
    onSuccess: () => {
      toast.success("Relasi akun orang tua dan siswa berhasil diputus.");
      utils.admin.listOrtuLinks.invalidate();
    },
    onError: (e) => setError(e.message),
  });

  const submitUser = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!role) {
      setError("Pilih role pengguna.");
      return;
    }
    createUser.mutate({ name, email, password, role });
  };

  const submitLink = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!ortuId || !siswaId) {
      setError("Pilih akun orang tua dan siswa.");
      return;
    }
    linkOrtu.mutate({ orangTuaId: Number(ortuId), siswaId: Number(siswaId) });
  };

  const [activeRoleTab, setActiveRoleTab] = useState<SchoolRole>("guru");

  const downloadCsvTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Nama Lengkap,Email,Role,Password\n" +
      "Dimas Anggara,dimas@sekolah.demo,siswa,password123\n" +
      "Siti Nurhaliza,siti@sekolah.demo,siswa,password123\n" +
      "Rina Wijaya,rina@sekolah.demo,guru,password123\n" +
      "Bambang Soediro,bambang@sekolah.demo,orang_tua,password123\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import_pengguna_sekolah.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCurrentRoleCSV = async () => {
    const users = await utils.admin.listUsers.fetch({ role: activeRoleTab });
    if (!users || users.length === 0) {
      toast.error(`Tidak ada data pengguna ${ROLE_LABEL[activeRoleTab]} untuk diekspor.`);
      return;
    }
    const headers = ["No", "Nama Lengkap", "Email Akun", "Role Pengguna"];
    const rows = users.map((u, idx) => [
      idx + 1,
      u.name,
      u.email,
      ROLE_LABEL[activeRoleTab],
    ]);
    exportToCSV(`Daftar_Pengguna_${activeRoleTab}_Sekolah`, headers, rows);
    toast.success(`Daftar pengguna ${ROLE_LABEL[activeRoleTab]} berhasil diekspor!`);
  };

  return (
    <SchoolLayout role="admin" title="Pengguna & Relasi" nav={ADMIN_NAV}>
      {/* Alert Banners */}
      {error && (
        <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-100 dark:bg-[#F23F43]/15 border border-red-200 dark:border-[#F23F43]/30 text-xs text-red-600 dark:text-[#FF7074]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-green-100 dark:bg-[#23A559]/15 border border-green-200 dark:border-[#23A559]/30 text-xs text-green-600 dark:text-[#57F287]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* CSV Bulk Template & Utility Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-primary/20 text-blue-600 dark:text-[#70B8FF] flex items-center justify-center font-bold">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Template Import & Ekspor Pengguna
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Format standar untuk input data rombel siswa, guru, dan akun orang tua secara serentak
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={downloadCsvTemplate}
            variant="outline"
            className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl shrink-0"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Unduh Template CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 mb-8">
        {/* Create User Card */}
        <div className="lg:col-span-6">
          <Card className="bg-card border-border shadow-xl rounded-2xl h-full flex flex-col justify-between">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold font-brand text-foreground">
                  Buat Pengguna Baru
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Daftarkan Guru, Siswa, Orang Tua, atau Admin tambahan
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={submitUser} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-card-foreground">Nama Lengkap</Label>
                    <Input
                      placeholder="mis. Ratna Sari, M.Pd."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-card-foreground">Email Login</Label>
                    <Input
                      type="email"
                      placeholder="nama@sekolah.demo"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-card-foreground">Password</Label>
                    <Input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background border-border text-foreground text-xs rounded-xl h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-card-foreground">Role Sistem</Label>
                    <Select
                      value={role}
                      onValueChange={(v) => setRole(v as SchoolRole)}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                        <SelectValue placeholder="Pilih Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="focus:bg-secondary text-xs">
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={createUser.isPending}
                  className="w-full bg-primary hover:bg-[#0097E6] text-white rounded-xl text-xs font-bold h-10 shadow-md"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {createUser.isPending ? "Menyimpan..." : "Simpan Pengguna"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Link Parent-Student Card */}
        <div className="lg:col-span-6">
          <Card className="bg-card border-border shadow-xl rounded-2xl h-full flex flex-col justify-between">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-amber-600 dark:text-[#F0B232]" />
                <CardTitle className="text-base font-bold font-brand text-foreground">
                  Hubungkan Orang Tua & Anak
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Relasi 1 orang tua dapat terhubung ke lebih dari 1 siswa (FR-15)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={submitLink} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-card-foreground">Akun Orang Tua</Label>
                    <Select value={ortuId} onValueChange={setOrtuId}>
                      <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                        <SelectValue placeholder="Pilih Orang Tua" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {ortuList.data?.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)} className="focus:bg-secondary text-xs">
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-card-foreground">Akun Siswa (Anak)</Label>
                    <Select value={siswaId} onValueChange={setSiswaId}>
                      <SelectTrigger className="bg-background border-border text-foreground text-xs rounded-xl h-10">
                        <SelectValue placeholder="Pilih Siswa" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {siswaList.data?.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} className="focus:bg-secondary text-xs">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={linkOrtu.isPending || !ortuId || !siswaId}
                  className="w-full bg-[#23A559] hover:bg-[#1f914d] text-white rounded-xl text-xs font-bold h-10 shadow-md"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {linkOrtu.isPending ? "Menghubungkan..." : "Hubungkan Relasi"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Relasi Orang Tua List */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden mb-8">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600 dark:text-[#F0B232]" />
                <CardTitle className="text-base font-bold font-brand text-foreground">
                  Daftar Relasi Orang Tua & Siswa
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Menampilkan {filteredLinks.length} relasi aktif untuk monitoring anak
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={exportRelasiCSV}
                variant="outline"
                className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-[#23A559]" />
                Ekspor Relasi (CSV)
              </Button>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari orang tua atau siswa..."
                  value={searchRelasi}
                  onChange={(e) => setSearchRelasi(e.target.value)}
                  className="pl-8 h-9 bg-background border-border text-foreground text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[450px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Orang Tua
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground py-3.5">
                  Siswa (Anak)
                </TableHead>
                <TableHead className="text-xs font-bold uppercase text-muted-foreground text-right py-3.5">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {filteredLinks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    {searchRelasi ? "Tidak ada relasi yang cocok dengan pencarian." : "Belum ada relasi orang tua dan anak."}
                  </TableCell>
                </TableRow>
              )}
              {filteredLinks.map((l) => (
                <TableRow
                  key={l.id}
                  className="hover:bg-secondary/80 transition-colors"
                >
                  <TableCell className="font-semibold text-foreground text-sm py-3.5">
                    {l.ortuNama}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-blue-600 dark:text-[#70B8FF]">
                    {l.siswaNama}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-[#F23F43] hover:bg-red-100 dark:hover:bg-[#F23F43]/15 hover:text-red-600 dark:hover:text-[#FF7074] rounded-lg"
                      disabled={unlinkOrtu.isPending}
                      onClick={() => {
                          if (confirm(`Putus relasi antara ${l.ortuNama} dan ${l.siswaNama}?`)) {
                            unlinkOrtu.mutate({ id: l.id });
                          }
                        }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Putus Relasi
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Directory Tabs with Search Filter */}
      <Card className="bg-card border-border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold font-brand text-foreground">
                Direktori Seluruh Pengguna
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Daftar akun pengguna terdaftar berdasarkan role
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={exportCurrentRoleCSV}
                variant="outline"
                className="h-9 bg-background border-border text-foreground hover:bg-secondary text-xs font-semibold rounded-xl"
              >
                <Download className="mr-1.5 h-3.5 w-3.5 text-[#23A559]" />
                Ekspor Data {ROLE_LABEL[activeRoleTab]} (CSV)
              </Button>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="h-9 pl-9 bg-background border-border text-foreground text-xs rounded-xl focus:border-primary"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs
            value={activeRoleTab}
            onValueChange={(val) => setActiveRoleTab(val as SchoolRole)}
            className="space-y-4"
          >
            <TabsList className="bg-background border border-border p-1 rounded-xl">
              {ROLES.map((r) => (
                <TabsTrigger
                  key={r}
                  value={r}
                  className="data-[state=active]:bg-secondary data-[state=active]:text-foreground rounded-lg text-xs font-bold py-1.5 px-4 text-muted-foreground"
                >
                  {ROLE_LABEL[r]}
                </TabsTrigger>
              ))}
            </TabsList>
            {ROLES.map((r) => (
              <TabsContent key={r} value={r}>
                <UserTable role={r} searchQuery={searchUser} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </SchoolLayout>
  );
}
