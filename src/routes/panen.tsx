import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { BarChart3, ClipboardList, Leaf, Plus } from 'lucide-react';
import { Badge, Shell, StatCard } from '@/components/shell';
import { EditedLink, Field, KeteranganEdit, Modal, RiwayatDialog, RowActions, Table } from '@/components/data-form';
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

function PanenPage() {
  const { items, add, update, remove } = useCollection<Panen>('panen');
  const [filter, setFilter] = useState('Semua');
  const [editing, setEditing] = useState<Panen | null>(null);
  const [open, setOpen] = useState(false);
  const [riwayat, setRiwayat] = useState<Panen | null>(null);

  const rows = filter === 'Semua' ? items : items.filter((i) => i.jenis === filter);
  const totalHasil = items.reduce((s, i) => s + i.totalHasil, 0);
  const unik = new Set(items.map((i) => i.jenis)).size;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const f = new FormData(e.currentTarget);

    const data = {
      jenis: String(f.get('jenis')),
      tanggal: String(f.get('tanggal')),
      jumlahPohon: Number(f.get('jumlahPohon')),
      totalHasil: Number(f.get('totalHasil')),
      status: String(f.get('status')),
    };

    let success = false;

    if (editing) {
      const log = buatRiwayat(editing, data, LABEL, editing.riwayat, String(f.get('keterangan') ?? '').trim());

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

    setOpen(false);
    setEditing(null);
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
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Panen
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Data" value={String(items.length)} icon={ClipboardList} />
        <StatCard label="Total Hasil" value={`${totalHasil} kg`} icon={BarChart3} />
        <StatCard label="Tanaman Unik" value={String(unik)} icon={Leaf} />
      </div>

      <div className="my-6 flex flex-wrap gap-2">
        {['Semua', ...JENIS].map((j) => (
          <button
            key={j}
            onClick={() => setFilter(j)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${filter === j ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-secondary'}`}
          >
            {j}
          </button>
        ))}
      </div>

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
              Belum ada data panen.
            </td>
          </tr>
        )}
      </Table>

      <Modal
        open={open}
        title={editing ? 'Edit Panen' : 'Tambah Panen'}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
      >
        <Field label="Jenis Tanaman" name="jenis" options={JENIS} defaultValue={editing?.jenis} />
        <Field label="Tanggal Panen" name="tanggal" type="date" defaultValue={editing?.tanggal} />
        <Field label="Jumlah Pohon" name="jumlahPohon" type="number" defaultValue={editing?.jumlahPohon ?? 0} />
        <Field label="Total Hasil (kg)" name="totalHasil" type="number" defaultValue={editing?.totalHasil ?? 0} />
        <Field label="Status" name="status" options={STATUS} defaultValue={editing?.status} full />
        {editing && <KeteranganEdit />}
      </Modal>

      {riwayat && <RiwayatDialog subtitle={riwayat.jenis} riwayat={riwayat.riwayat ?? []} onClose={() => setRiwayat(null)} />}
    </Shell>
  );
}
