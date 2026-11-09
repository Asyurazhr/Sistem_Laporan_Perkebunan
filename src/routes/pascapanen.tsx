import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Package, Percent, Scale, Plus } from 'lucide-react';
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
import { buatRiwayat, useCollection, type Pascapanen } from '@/lib/store';

export const Route = createFileRoute('/pascapanen')({
  head: () => ({
    meta: [
      { title: 'Data Pascapanen — Perkebunan' },
      { name: 'description', content: 'Pantau proses pengeringan, sortasi, dan pengemasan hasil panen.' },
      { property: 'og:title', content: 'Data Pascapanen — Perkebunan' },
      { property: 'og:description', content: 'Pantau proses pengeringan, sortasi, dan pengemasan hasil panen.' },
    ],
  }),
  component: PascapanenPage,
});

const KOMODITAS = ['Cengkeh', 'Kopi', 'Kakao'];
const PROSES = ['Pengeringan', 'Sortasi', 'Pengemasan', 'Penyimpanan'];
const STATUS = ['Proses', 'Selesai'];
const LABEL: Record<string, string> = {
  komoditas: 'Komoditas',
  tanggal: 'Tanggal',
  proses: 'Proses',
  beratMasuk: 'Berat Masuk (kg)',
  beratKeluar: 'Berat Keluar (kg)',
  status: 'Status',
};

type ErrorPascapanen = Partial<Record<'beratMasuk' | 'beratKeluar' | 'keterangan', string>>;

// Aturan validasi input pascapanen
function validasiPascapanen(beratMasuk: string, beratKeluar: string): ErrorPascapanen {
  const err: ErrorPascapanen = {};

  const masuk = Number(beratMasuk);
  if (beratMasuk.trim() === '') err.beratMasuk = 'Berat masuk wajib diisi.';
  else if (!Number.isFinite(masuk)) err.beratMasuk = 'Berat masuk harus berupa angka.';
  else if (masuk <= 0) err.beratMasuk = 'Berat masuk harus lebih dari 0 kg.';

  const keluar = Number(beratKeluar);
  if (beratKeluar.trim() === '') err.beratKeluar = 'Berat keluar wajib diisi.';
  else if (!Number.isFinite(keluar)) err.beratKeluar = 'Berat keluar harus berupa angka.';
  else if (keluar <= 0) err.beratKeluar = 'Berat keluar harus lebih dari 0 kg.';
  // Setelah dikeringkan/disortir berat tidak mungkin bertambah
  else if (!err.beratMasuk && keluar > masuk) err.beratKeluar = `Berat keluar tidak boleh lebih dari berat masuk (${masuk} kg).`;

  return err;
}

function PascapanenPage() {
  const { items, add, update, remove } = useCollection<Pascapanen>('pascapanen');
  const [filter, setFilter] = useState('Semua');
  const [waktu, setWaktu] = useState<FilterWaktu>(FILTER_WAKTU_AWAL);
  const [editing, setEditing] = useState<Pascapanen | null>(null);
  const [open, setOpen] = useState(false);
  const [riwayat, setRiwayat] = useState<Pascapanen | null>(null);
  const [errors, setErrors] = useState<ErrorPascapanen>({});

  // Saring berdasarkan komoditas, lalu rentang waktu (hasil diurutkan dari tanggal terbaru)
  const rows = saringWaktu(filter === 'Semua' ? items : items.filter((i) => i.komoditas === filter), waktu);

  const masuk = items.reduce((s, i) => s + i.beratMasuk, 0);
  const keluar = items.reduce((s, i) => s + i.beratKeluar, 0);
  const rendemen = masuk ? ((keluar / masuk) * 100).toFixed(1) : '0.0';

  const tutupModal = () => {
    setOpen(false);
    setEditing(null);
    setErrors({});
  };

  const bukaModal = (data: Pascapanen | null) => {
    setEditing(data);
    setErrors({});
    setOpen(true);
  };

  // Hapus pesan error sebuah kolom ketika admin mulai mengetik ulang
  const hapusError = (field: keyof ErrorPascapanen) => () => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    // Validasi dulu, jangan simpan kalau masih ada yang salah
    const err = validasiPascapanen(String(f.get('beratMasuk') ?? ''), String(f.get('beratKeluar') ?? ''));
    if (editing) {
      const errKet = validasiKeterangan(String(f.get('keterangan') ?? ''));
      if (errKet) err.keterangan = errKet;
    }
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    const data = {
      komoditas: String(f.get('komoditas')),
      tanggal: String(f.get('tanggal')),
      proses: String(f.get('proses')),
      beratMasuk: Number(f.get('beratMasuk')),
      beratKeluar: Number(f.get('beratKeluar')),
      status: String(f.get('status')),
    };

    let success = false;
    if (editing) {
      const log = buatRiwayat(editing, data, LABEL, editing.riwayat, rapikanKeterangan(String(f.get('keterangan') ?? '')));
      success = await update(editing.id, { ...data, riwayat: log });
    } else {
      success = await add({ ...data, riwayat: [] });
    }

    if (!success) return;
    tutupModal();
  };

  return (
    <Shell
      title="Data Pascapanen"
      heading="Data Pascapanen"
      subtitle="Kelola proses setelah panen hingga siap jual"
      action={
        <button
          onClick={() => bukaModal(null)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Pascapanen
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        <StatCard label="Total Proses" value={String(items.length)} icon={Package} />
        <StatCard label="Berat Keluar" value={`${keluar} kg`} icon={Scale} />
        <StatCard label="Rendemen" value={`${rendemen}%`} icon={Percent} />
      </div>

      <FilterBar pilihan={KOMODITAS} kategori={filter} onKategori={setFilter} waktu={waktu} onWaktu={setWaktu} />

      <Table head={['Komoditas', 'Tanggal', 'Proses', 'Berat Masuk', 'Berat Keluar', 'Status', 'Aksi', 'Keterangan']}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0">
            <td className="px-5 py-3.5 font-medium text-foreground">{r.komoditas}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.tanggal}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.proses}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.beratMasuk} kg</td>
            <td className="px-5 py-3.5">
              <Badge>{r.beratKeluar} kg</Badge>
            </td>
            <td className="px-5 py-3.5">
              <Badge tone="blue">{r.status}</Badge>
            </td>
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
              {items.length === 0 ? 'Belum ada data pascapanen.' : 'Tidak ada data pascapanen yang sesuai filter.'}
            </td>
          </tr>
        )}
      </Table>

      <Modal open={open} title={editing ? 'Edit Pascapanen' : 'Tambah Pascapanen'} onClose={tutupModal} onSubmit={submit}>
        <Field label="Komoditas" name="komoditas" options={KOMODITAS} defaultValue={editing?.komoditas} />
        <Field label="Tanggal" name="tanggal" type="date" defaultValue={editing?.tanggal} />
        <Field label="Proses" name="proses" options={PROSES} defaultValue={editing?.proses} />
        <Field label="Status" name="status" options={STATUS} defaultValue={editing?.status} />
        <Field
          label="Berat Masuk (kg)"
          name="beratMasuk"
          type="number"
          required={false}
          placeholder="Contoh: 20"
          defaultValue={editing?.beratMasuk ?? ''}
          error={errors.beratMasuk}
          onChange={hapusError('beratMasuk')}
        />
        <Field
          label="Berat Keluar (kg)"
          name="beratKeluar"
          type="number"
          required={false}
          placeholder="Maks. berat masuk"
          defaultValue={editing?.beratKeluar ?? ''}
          error={errors.beratKeluar}
          onChange={hapusError('beratKeluar')}
        />
        {editing && <KeteranganEdit validasiBrowser={false} error={errors.keterangan} onChange={hapusError('keterangan')} />}
      </Modal>

      {riwayat && <RiwayatDialog subtitle={riwayat.komoditas} riwayat={riwayat.riwayat ?? []} onClose={() => setRiwayat(null)} />}
    </Shell>
  );
}