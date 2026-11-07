import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { BarChart3, ClipboardList, Coins, Plus } from 'lucide-react';
import { Badge, Shell, StatCard } from '@/components/shell';
import { EditedLink, Field, KeteranganEdit, Modal, RiwayatDialog, RowActions, Table } from '@/components/data-form';
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

function LaporanPage() {
  const { items, add, update, remove } = useCollection<Laporan>('laporan');
  const [filter, setFilter] = useState('Semua');
  const [editing, setEditing] = useState<Laporan | null>(null);
  const [open, setOpen] = useState(false);
  const [riwayat, setRiwayat] = useState<Laporan | null>(null);

  const rows = filter === 'Semua' ? items : items.filter((i) => (i.kategori ?? 'Cengkeh') === filter);
  const totalGaji = rows.reduce((s, i) => s + i.jumlahHasil * i.upah, 0);
  const rata = rows.length ? Math.round(rows.reduce((s, i) => s + i.jumlahHasil, 0) / rows.length) : 0;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      kategori: String(f.get('kategori')),
      tanggal: String(f.get('tanggal')),
      nama: String(f.get('nama')),
      jumlahHasil: Number(f.get('jumlahHasil')),
      upah: Number(f.get('upah')),
    };
    if (editing) {
      const prev = { ...editing, kategori: editing.kategori ?? 'Cengkeh' };
      const perubahan = (Object.keys(LABEL) as (keyof typeof data)[]).filter((k) => String(prev[k]) !== String(data[k])).map((k) => ({ field: LABEL[k] ?? k, sebelum: String(prev[k]), sesudah: String(data[k]) }));
      const log: Riwayat[] = [...(editing.riwayat ?? [])];
      const keterangan = String(f.get('keterangan') ?? '').trim();
      if (perubahan.length) log.push({ waktu: new Date().toISOString(), keterangan, perubahan });
      update(editing.id, { ...data, riwayat: log });
    } else add({ ...data, riwayat: [] });
    setOpen(false);
    setEditing(null);
  };

  return (
    <Shell
      title="Laporan Karyawan"
      heading="Laporan Karyawan"
      subtitle="Kelola laporan hasil kerja dan gaji karyawan"
      action={
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Laporan
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Laporan" value={String(rows.length)} icon={ClipboardList} />
        <StatCard label="Total Gaji" value={rupiah(totalGaji)} icon={Coins} />
        <StatCard label="Rata-rata Jumlah Hasil Kerja" value={String(rata)} icon={BarChart3} />
      </div>

      <div className="my-6 flex flex-wrap gap-2">
        {['Semua', ...KATEGORI].map((j) => (
          <button
            key={j}
            onClick={() => setFilter(j)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${filter === j ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-secondary'}`}
          >
            {j}
          </button>
        ))}
      </div>

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
              <RowActions
                onEdit={() => {
                  setEditing(r);
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
            <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
              Belum ada laporan karyawan.
            </td>
          </tr>
        )}
      </Table>

      <Modal
        open={open}
        title={editing ? 'Edit Laporan' : 'Tambah Laporan'}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
      >
        <Field label="Kategori" name="kategori" options={KATEGORI} defaultValue={editing?.kategori} />
        <Field label="Tanggal" name="tanggal" type="date" defaultValue={editing?.tanggal} />
        <Field label="Nama Karyawan" name="nama" defaultValue={editing?.nama} full />
        <Field label="Jumlah Hasil Kerja (Per Kg)" name="jumlahHasil" type="number" defaultValue={editing?.jumlahHasil ?? 0} />
        <Field label="Upah per Kg (Rp)" name="upah" type="number" defaultValue={editing?.upah ?? 0} />
        {editing && <KeteranganEdit />}
      </Modal>

      {riwayat && <RiwayatDialog subtitle={riwayat.nama} riwayat={riwayat.riwayat ?? []} onClose={() => setRiwayat(null)} />}
    </Shell>
  );
}
