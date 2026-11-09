import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { BarChart3, ClipboardList, Leaf, Plus } from 'lucide-react';
import { Badge, Shell, StatCard } from '@/components/shell';
import { EditedLink, FILTER_WAKTU_AWAL, Field, FilterBar, KeteranganEdit, Modal, RiwayatDialog, RowActions, Table, rapikanKeterangan, saringWaktu, validasiKeterangan, type FilterWaktu } from '@/components/data-form';
import { buatRiwayat, useCollection, type Panen } from '@/lib/store';

export const Route = createFileRoute('/panen')({
  head: () => ({
    meta: [
      { title: 'Data Panen — Perkebunan' },
      { name: 'description', content: 'Catat hasil panen setiap musim per jenis tanaman.' },
      { property: 'og:title', content: 'Data Panen — Perkebunan' },
      { property: 'og:description', content: 'Catat hasil panen setiap musim per jenis tanaman.' },
    ],
  }),
  component: PanenPage,
});

const JENIS = ['Cengkeh', 'Kopi', 'Kakao'];
const STATUS = ['Baru', 'Diproses', 'Selesai'];
const LABEL: Record<string, string> = {
  jenis: 'Jenis Tanaman',
  tanggal: 'Tanggal Panen',
  jumlahPohon: 'Jumlah Pohon',
  totalHasil: 'Total Hasil (kg)',
  status: 'Status',
};

type ErrorPanen = Partial<Record<'jumlahPohon' | 'totalHasil' | 'keterangan', string>>;

// Aturan validasi input panen
function validasiPanen(jumlahPohon: string, totalHasil: string): ErrorPanen {
  const err: ErrorPanen = {};

  const pohon = Number(jumlahPohon);
  if (jumlahPohon.trim() === '') err.jumlahPohon = 'Jumlah pohon wajib diisi.';
  else if (!Number.isFinite(pohon)) err.jumlahPohon = 'Jumlah pohon harus berupa angka.';
  else if (!Number.isInteger(pohon)) err.jumlahPohon = 'Jumlah pohon harus bilangan bulat.';
  else if (pohon < 1) err.jumlahPohon = 'Jumlah pohon minimal 1.';

  const hasil = Number(totalHasil);
  if (totalHasil.trim() === '') err.totalHasil = 'Total hasil wajib diisi.';
  else if (!Number.isFinite(hasil)) err.totalHasil = 'Total hasil harus berupa angka.';
  else if (hasil <= 0) err.totalHasil = 'Total hasil harus lebih dari 0 kg.';

  return err;
}

function PanenPage() {
  const { items, add, update, remove } = useCollection<Panen>('panen');
  const [filter, setFilter] = useState('Semua');
  const [waktu, setWaktu] = useState<FilterWaktu>(FILTER_WAKTU_AWAL);
  const [editing, setEditing] = useState<Panen | null>(null);
  const [open, setOpen] = useState(false);
  const [riwayat, setRiwayat] = useState<Panen | null>(null);
  const [errors, setErrors] = useState<ErrorPanen>({});

  const tutupModal = () => {
    setOpen(false);
    setEditing(null);
    setErrors({});
  };

  // Hapus pesan error sebuah kolom ketika admin mulai mengetik ulang
  const hapusError = (field: keyof ErrorPanen) => () => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  // Saring berdasarkan komoditas, lalu rentang waktu (hasil diurutkan dari tanggal terbaru)
  const rows = saringWaktu(filter === 'Semua' ? items : items.filter((i) => i.jenis === filter), waktu);
  const totalHasil = items.reduce((s, i) => s + i.totalHasil, 0);
  const unik = new Set(items.map((i) => i.jenis)).size;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const f = new FormData(e.currentTarget);

    // Validasi dulu, jangan simpan kalau masih ada yang salah
    const err = validasiPanen(String(f.get('jumlahPohon') ?? ''), String(f.get('totalHasil') ?? ''));
    if (editing) {
      const errKet = validasiKeterangan(String(f.get('keterangan') ?? ''));
      if (errKet) err.keterangan = errKet;
    }
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    const data = {
      jenis: String(f.get('jenis')),
      tanggal: String(f.get('tanggal')),
      jumlahPohon: Number(f.get('jumlahPohon')),
      totalHasil: Number(f.get('totalHasil')),
      status: String(f.get('status')),
    };

    let success = false;

    if (editing) {
      const log = buatRiwayat(editing, data, LABEL, editing.riwayat, rapikanKeterangan(String(f.get('keterangan') ?? '')));

      success = await update(editing.id, {
        ...data,
        riwayat: log,
      });
    } else {
      success = await add({
        ...data,
        riwayat: [],
      });
    }

    if (!success) return;

    tutupModal();
  };

  return (
    <Shell
      title="Data Panen"
      heading="Data Panen"
      subtitle="Catat hasil panen setiap musim"
      action={
        <button
          onClick={() => {
            setEditing(null);
            setErrors({});
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Panen
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        <StatCard label="Total Data" value={String(items.length)} icon={ClipboardList} />
        <StatCard label="Total Hasil" value={`${totalHasil} kg`} icon={BarChart3} />
        <StatCard label="Tanaman Unik" value={String(unik)} icon={Leaf} />
      </div>

      <FilterBar pilihan={JENIS} kategori={filter} onKategori={setFilter} waktu={waktu} onWaktu={setWaktu} />

      <Table head={['Jenis Tanaman', 'Tanggal Panen', 'Jumlah Pohon', 'Total Hasil', 'Status', 'Aksi', 'Keterangan']}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0">
            <td className="px-5 py-3.5 font-medium text-foreground">{r.jenis}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.tanggal}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.jumlahPohon}</td>
            <td className="px-5 py-3.5">
              <Badge>{r.totalHasil} kg</Badge>
            </td>
            <td className="px-5 py-3.5">
              <Badge tone="blue">{r.status}</Badge>
            </td>
            <td className="px-5 py-3.5">
              <RowActions
                onEdit={() => {
                  setEditing(r);
                  setErrors({});
                  setOpen(true);
                }}
                onDelete={() => remove(r.id)}
              />
            </td>
            <td className="px-5 py-3.5">
              <EditedLink riwayat={r.riwayat} onClick={() => setRiwayat(r)} />
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
              {items.length === 0 ? 'Belum ada data panen.' : 'Tidak ada data panen yang sesuai filter.'}
            </td>
          </tr>
        )}
      </Table>

      <Modal
        open={open}
        title={editing ? 'Edit Panen' : 'Tambah Panen'}
        onClose={tutupModal}
        onSubmit={submit}
      >
        <Field label="Jenis Tanaman" name="jenis" options={JENIS} defaultValue={editing?.jenis} />
        <Field label="Tanggal Panen" name="tanggal" type="date" defaultValue={editing?.tanggal} />
        <Field
          label="Jumlah Pohon"
          name="jumlahPohon"
          type="number"
          integer
          required={false}
          placeholder="Minimal 1"
          defaultValue={editing?.jumlahPohon ?? ''}
          error={errors.jumlahPohon}
          onChange={hapusError('jumlahPohon')}
        />
        <Field
          label="Total Hasil (kg)"
          name="totalHasil"
          type="number"
          required={false}
          placeholder="Contoh: 12,5"
          defaultValue={editing?.totalHasil ?? ''}
          error={errors.totalHasil}
          onChange={hapusError('totalHasil')}
        />
        <Field label="Status" name="status" options={STATUS} defaultValue={editing?.status} full />
        {editing && <KeteranganEdit validasiBrowser={false} error={errors.keterangan} onChange={hapusError('keterangan')} />}
      </Modal>

      {riwayat && <RiwayatDialog subtitle={riwayat.jenis} riwayat={riwayat.riwayat ?? []} onClose={() => setRiwayat(null)} />}
    </Shell>
  );
}