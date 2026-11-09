import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { BarChart3, ClipboardList, Coins, Plus } from 'lucide-react';
import { Badge, Shell, StatCard } from '@/components/shell';
import {
  EditedLink,
  FILTER_WAKTU_AWAL,
  Field,
  FilterBar,
  KeteranganEdit,
  Modal,
  RiwayatDialog,
  RowActions,
  Table,
  rapikanKeterangan,
  saringWaktu,
  validasiKeterangan,
  type FilterWaktu,
} from '@/components/data-form';
import { rupiah, useCollection, type Laporan, type Riwayat } from '@/lib/store';

export const Route = createFileRoute('/laporan')({
  head: () => ({
    meta: [
      { title: 'Laporan Karyawan — Perkebunan' },
      { name: 'description', content: 'Kelola laporan hasil kerja dan gaji karyawan kebun.' },
      { property: 'og:title', content: 'Laporan Karyawan — Perkebunan' },
      { property: 'og:description', content: 'Kelola laporan hasil kerja dan gaji karyawan kebun.' },
    ],
  }),
  component: LaporanPage,
});

const KATEGORI = ['Cengkeh', 'Kopi', 'Kakao', 'Pascapanen'];
const LABEL: Record<string, string> = {
  kategori: 'Kategori',
  tanggal: 'Tanggal',
  nama: 'Nama Karyawan',
  jumlahHasil: 'Jumlah Hasil Kerja',
  upah: 'Upah per Satuan',
};

type ErrorLaporan = Partial<Record<'nama' | 'jumlahHasil' | 'upah' | 'keterangan', string>>;

/** Merapikan nama: hapus spasi berlebih (mis. "  budi   santoso " -> "budi santoso") */
const rapikanNama = (nama: string) => nama.trim().replace(/\s+/g, ' ');

// Aturan validasi input laporan karyawan
function validasiLaporan(namaMentah: string, jumlahHasil: string, upah: string): ErrorLaporan {
  const err: ErrorLaporan = {};

  // Nama: hanya huruf (boleh spasi, titik, dan petik untuk nama seperti "M. Rizki" atau "Ma'ruf")
  const nama = rapikanNama(namaMentah);
  const jumlahHuruf = nama.replace(/[^A-Za-z]/g, '').length;
  if (nama === '') err.nama = 'Nama karyawan wajib diisi.';
  else if (!/^[A-Za-z][A-Za-z .']*$/.test(nama)) err.nama = 'Nama hanya boleh berisi huruf, tanpa angka atau simbol.';
  else if (jumlahHuruf < 3) err.nama = 'Nama minimal 3 huruf.';
  else if (/([A-Za-z])\1\1/i.test(nama)) err.nama = 'Nama tidak boleh berisi huruf berulang seperti "aaa".';
  else if (nama.length > 50) err.nama = 'Nama maksimal 50 karakter.';

  // Jumlah hasil kerja (kg): boleh desimal, harus > 0
  const hasil = Number(jumlahHasil);
  if (jumlahHasil.trim() === '') err.jumlahHasil = 'Jumlah hasil kerja wajib diisi.';
  else if (!Number.isFinite(hasil)) err.jumlahHasil = 'Jumlah hasil kerja harus berupa angka.';
  else if (hasil <= 0) err.jumlahHasil = 'Jumlah hasil kerja harus lebih dari 0.';

  // Upah (Rp): bilangan bulat, harus > 0
  const nilaiUpah = Number(upah);
  if (upah.trim() === '') err.upah = 'Upah wajib diisi.';
  else if (!Number.isFinite(nilaiUpah)) err.upah = 'Upah harus berupa angka.';
  else if (!Number.isInteger(nilaiUpah)) err.upah = 'Upah harus bilangan bulat (tanpa koma).';
  else if (nilaiUpah <= 0) err.upah = 'Upah harus lebih dari Rp 0.';

  return err;
}

function LaporanPage() {
  const { items, add, update, remove } = useCollection<Laporan>('laporan');
  const [filter, setFilter] = useState('Semua');
  const [waktu, setWaktu] = useState<FilterWaktu>(FILTER_WAKTU_AWAL);
  const [editing, setEditing] = useState<Laporan | null>(null);
  const [open, setOpen] = useState(false);
  const [riwayat, setRiwayat] = useState<Laporan | null>(null);
  const [errors, setErrors] = useState<ErrorLaporan>({});

  // Saring berdasarkan kategori, lalu rentang waktu (hasil diurutkan dari tanggal terbaru)
  const rows = saringWaktu(filter === 'Semua' ? items : items.filter((i) => (i.kategori ?? 'Cengkeh') === filter), waktu);

  // Statistik mengikuti data yang sedang ditampilkan (sesuai filter)
  const totalGaji = rows.reduce((s, i) => s + i.jumlahHasil * i.upah, 0);
  const rata = rows.length ? Math.round(rows.reduce((s, i) => s + i.jumlahHasil, 0) / rows.length) : 0;

  const tutupModal = () => {
    setOpen(false);
    setEditing(null);
    setErrors({});
  };

  const bukaModal = (data: Laporan | null) => {
    setEditing(data);
    setErrors({});
    setOpen(true);
  };

  // Hapus pesan error sebuah kolom ketika admin mulai mengetik ulang
  const hapusError = (field: keyof ErrorLaporan) => () => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    // Validasi dulu, jangan simpan kalau masih ada yang salah
    const err = validasiLaporan(String(f.get('nama') ?? ''), String(f.get('jumlahHasil') ?? ''), String(f.get('upah') ?? ''));
    if (editing) {
      const errKet = validasiKeterangan(String(f.get('keterangan') ?? ''));
      if (errKet) err.keterangan = errKet;
    }
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    const data = {
      kategori: String(f.get('kategori')),
      tanggal: String(f.get('tanggal')),
      nama: rapikanNama(String(f.get('nama'))),
      jumlahHasil: Number(f.get('jumlahHasil')),
      upah: Number(f.get('upah')),
    };

    let success = false;
    if (editing) {
      const prev = { ...editing, kategori: editing.kategori ?? 'Cengkeh' };
      const perubahan = (Object.keys(LABEL) as (keyof typeof data)[])
        .filter((k) => String(prev[k]) !== String(data[k]))
        .map((k) => ({ field: LABEL[k] ?? k, sebelum: String(prev[k]), sesudah: String(data[k]) }));
      const log: Riwayat[] = [...(editing.riwayat ?? [])];
      const keterangan = rapikanKeterangan(String(f.get('keterangan') ?? ''));
      if (perubahan.length) log.push({ waktu: new Date().toISOString(), keterangan, perubahan });
      success = await update(editing.id, { ...data, riwayat: log });
    } else {
      success = await add({ ...data, riwayat: [] });
    }

    if (!success) return;
    tutupModal();
  };

  return (
    <Shell
      title="Laporan Karyawan"
      heading="Laporan Karyawan"
      subtitle="Kelola laporan hasil kerja dan gaji karyawan"
      action={
        <button
          onClick={() => bukaModal(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Laporan
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        <StatCard label="Total Laporan" value={String(rows.length)} icon={ClipboardList} />
        <StatCard label="Total Gaji" value={rupiah(totalGaji)} icon={Coins} />
        <StatCard label="Rata-rata Hasil Kerja" value={String(rata)} icon={BarChart3} />
      </div>

      <FilterBar pilihan={KATEGORI} kategori={filter} onKategori={setFilter} waktu={waktu} onWaktu={setWaktu} labelKategori="Kategori" />

      <Table head={['Kategori', 'Tanggal', 'Nama Karyawan', 'Jumlah Hasil Kerja', 'Upah per Satuan', 'Total Gaji', 'Aksi', 'Keterangan']}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0">
            <td className="px-5 py-3.5">
              <Badge tone="blue">{r.kategori ?? 'Cengkeh'}</Badge>
            </td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.tanggal}</td>
            <td className="px-5 py-3.5 font-medium text-foreground">{r.nama}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.jumlahHasil}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{rupiah(r.upah)}</td>
            <td className="px-5 py-3.5 font-semibold text-foreground">{rupiah(r.jumlahHasil * r.upah)}</td>
            <td className="px-5 py-3.5">
              <RowActions onEdit={() => bukaModal(r)} onDelete={() => remove(r.id)} />
            </td>
            <td className="px-5 py-3.5">
              <EditedLink riwayat={r.riwayat} onClick={() => setRiwayat(r)} />
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
              {items.length === 0 ? 'Belum ada laporan karyawan.' : 'Tidak ada laporan yang sesuai filter.'}
            </td>
          </tr>
        )}
      </Table>

      <Modal open={open} title={editing ? 'Edit Laporan' : 'Tambah Laporan'} onClose={tutupModal} onSubmit={submit}>
        <Field label="Kategori" name="kategori" options={KATEGORI} defaultValue={editing?.kategori} />
        <Field label="Tanggal" name="tanggal" type="date" defaultValue={editing?.tanggal} />
        <Field
          label="Nama Karyawan"
          name="nama"
          full
          required={false}
          placeholder="Contoh: Budi Santoso"
          defaultValue={editing?.nama}
          error={errors.nama}
          onChange={hapusError('nama')}
        />
        <Field
          label="Jumlah Hasil Kerja (kg)"
          name="jumlahHasil"
          type="number"
          required={false}
          placeholder="Contoh: 12,5"
          defaultValue={editing?.jumlahHasil ?? ''}
          error={errors.jumlahHasil}
          onChange={hapusError('jumlahHasil')}
        />
        <Field
          label="Upah per Kg (Rp)"
          name="upah"
          type="number"
          integer
          required={false}
          placeholder="Contoh: 3000"
          defaultValue={editing?.upah ?? ''}
          error={errors.upah}
          onChange={hapusError('upah')}
        />
        {editing && <KeteranganEdit validasiBrowser={false} error={errors.keterangan} onChange={hapusError('keterangan')} />}
      </Modal>

      {riwayat && <RiwayatDialog subtitle={riwayat.nama} riwayat={riwayat.riwayat ?? []} onClose={() => setRiwayat(null)} />}
    </Shell>
  );
}