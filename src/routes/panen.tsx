import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { BarChart3, ClipboardList, Leaf, Plus } from 'lucide-react';
import { Badge, Shell, StatCard } from '@/components/shell';
import { EditedLink, FILTER_WAKTU_AWAL, Field, FilterBar, KeteranganEdit, Modal, RiwayatDialog, RowActions, Table, rapikanKeterangan, saringWaktu, validasiKeterangan, type FilterWaktu } from '@/components/data-form';
import { buatRiwayat, fetchLokasiKebun, fetchTanamanByLokasi, useCollection, type LokasiKebun, type LokasiTanaman, type Panen } from '@/lib/store';

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

const STATUS = ['Baru', 'Diproses', 'Selesai'];
const SATUAN_LUAS = ['ha', 'm²'];

const LABEL: Record<string, string> = {
  jenis: 'Jenis Tanaman',
  lokasiId: 'Lokasi Kebun',
  tanggal: 'Tanggal Panen',
  jumlahPohon: 'Jumlah Pohon',
  luasPanen: 'Luas Dipanen',
  satuanLuas: 'Satuan Luas',
  totalHasil: 'Total Hasil (kg)',
  status: 'Status',
};

type ErrorPanen = Partial<Record<'lokasiId' | 'jenis' | 'jumlahPohon' | 'luasPanen' | 'totalHasil' | 'keterangan', string>>;

function validasiPanen(lokasiId: string, jenis: string, jumlahPohon: string, luasPanen: string, totalHasil: string): ErrorPanen {
  const err: ErrorPanen = {};

  if (!lokasiId) err.lokasiId = 'Lokasi kebun wajib dipilih.';
  if (!jenis) err.jenis = 'Jenis tanaman wajib dipilih.';

  const pohon = Number(jumlahPohon);
  if (jumlahPohon.trim() === '') err.jumlahPohon = 'Jumlah pohon wajib diisi.';
  else if (!Number.isFinite(pohon)) err.jumlahPohon = 'Jumlah pohon harus berupa angka.';
  else if (!Number.isInteger(pohon)) err.jumlahPohon = 'Jumlah pohon harus bilangan bulat.';
  else if (pohon < 1) err.jumlahPohon = 'Jumlah pohon minimal 1.';

  const luas = Number(luasPanen);
  if (luasPanen.trim() === '') err.luasPanen = 'Luas panen wajib diisi.';
  else if (!Number.isFinite(luas)) err.luasPanen = 'Luas panen harus berupa angka.';
  else if (luas <= 0) err.luasPanen = 'Luas panen harus lebih dari 0.';

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

  const [lokasiList, setLokasiList] = useState<LokasiKebun[]>([]);
  const [tanamanList, setTanamanList] = useState<LokasiTanaman[]>([]);
  const [lokasiId, setLokasiId] = useState('');
  const [jenis, setJenis] = useState('');
  const [memuatLokasi, setMemuatLokasi] = useState(true);
  const [memuatTanaman, setMemuatTanaman] = useState(false);

  // Mengambil lokasi kebun yang sudah terdaftar di Supabase
  useEffect(() => {
    let aktif = true;

    const ambilLokasi = async () => {
      try {
        setMemuatLokasi(true);
        const data = await fetchLokasiKebun();

        if (aktif) setLokasiList(data);
      } catch (error) {
        console.error('Gagal mengambil lokasi kebun:', error);
        if (aktif) {
          window.alert('Gagal mengambil daftar lokasi kebun. Silakan coba lagi.');
        }
      } finally {
        if (aktif) setMemuatLokasi(false);
      }
    };

    ambilLokasi();

    return () => {
      aktif = false;
    };
  }, []);

  // Mengambil tanaman sesuai lokasi yang dipilih
  useEffect(() => {
    let aktif = true;

    const ambilTanaman = async () => {
      if (!lokasiId) {
        setTanamanList([]);
        setJenis('');
        setMemuatTanaman(false);
        return;
      }

      try {
        setMemuatTanaman(true);
        setTanamanList([]);

        const data = await fetchTanamanByLokasi(lokasiId);

        if (aktif) {
          setTanamanList(data);

          // Pertahankan jenis tanaman saat mengedit jika masih tersedia
          setJenis((sebelumnya) => (data.some((tanaman) => tanaman.nama.toLowerCase() === sebelumnya.toLowerCase()) ? sebelumnya : ''));
        }
      } catch (error) {
        console.error('Gagal mengambil tanaman berdasarkan lokasi:', error);

        if (aktif) {
          setTanamanList([]);
          setJenis('');
          window.alert('Gagal mengambil daftar tanaman dari lokasi tersebut.');
        }
      } finally {
        if (aktif) setMemuatTanaman(false);
      }
    };

    ambilTanaman();

    return () => {
      aktif = false;
    };
  }, [lokasiId]);

  const tutupModal = () => {
    setOpen(false);
    setEditing(null);
    setErrors({});
    setLokasiId('');
    setJenis('');
    setTanamanList([]);
  };

  const bukaTambah = () => {
    setEditing(null);
    setErrors({});
    setLokasiId('');
    setJenis('');
    setTanamanList([]);
    setOpen(true);
  };

  const bukaEdit = (data: Panen) => {
    setEditing(data);
    setErrors({});
    setLokasiId(data.lokasiId ?? '');
    setJenis(data.jenis);
    setOpen(true);
  };

  const hapusError = (field: keyof ErrorPanen) => () => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const rows = saringWaktu(filter === 'Semua' ? items : items.filter((i) => i.jenis === filter), waktu);

  const totalHasil = items.reduce((s, i) => s + i.totalHasil, 0);
  const unik = new Set(items.map((i) => i.jenis)).size;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const f = new FormData(e.currentTarget);

    const lokasiTerpilih = String(f.get('lokasiId') ?? '');
    const jenisTerpilih = String(f.get('jenis') ?? '');
    const luasPanenInput = String(f.get('luasPanen') ?? '');

    const err = validasiPanen(lokasiTerpilih, jenisTerpilih, String(f.get('jumlahPohon') ?? ''), luasPanenInput, String(f.get('totalHasil') ?? ''));

    if (editing) {
      const errKet = validasiKeterangan(String(f.get('keterangan') ?? ''));
      if (errKet) err.keterangan = errKet;
    }

    setErrors(err);
    if (Object.keys(err).length > 0) return;

    const lokasiNama = lokasiList.find((lokasi) => lokasi.id === lokasiTerpilih)?.nama ?? '';

    const data = {
      jenis: jenisTerpilih,
      lokasiId: lokasiTerpilih,
      lokasi: lokasiNama,
      tanggal: String(f.get('tanggal')),
      jumlahPohon: Number(f.get('jumlahPohon')),
      luasPanen: Number(luasPanenInput),
      satuanLuas: String(f.get('satuanLuas') ?? 'ha'),
      totalHasil: Number(f.get('totalHasil')),
      status: String(f.get('status')),
    };

    let success = false;

    if (editing) {
      const log = buatRiwayat(
        {
          ...editing,
          lokasiId: editing.lokasiId ?? '',
          lokasi: editing.lokasi ?? '',
          luasPanen: editing.luasPanen ?? '',
          satuanLuas: editing.satuanLuas ?? '',
        },
        data,
        LABEL,
        editing.riwayat,
        rapikanKeterangan(String(f.get('keterangan') ?? '')),
      );

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
        <button onClick={bukaTambah} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Tambah Panen
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        <StatCard label="Total Data" value={String(items.length)} icon={ClipboardList} />
        <StatCard label="Total Hasil" value={`${totalHasil} kg`} icon={BarChart3} />
        <StatCard label="Tanaman Unik" value={String(unik)} icon={Leaf} />
      </div>

      <FilterBar pilihan={[...new Set(items.map((i) => i.jenis))].sort()} kategori={filter} onKategori={setFilter} waktu={waktu} onWaktu={setWaktu} />

      <Table head={['Jenis Tanaman', 'Lokasi Kebun', 'Tanggal Panen', 'Jumlah Pohon', 'Luas Dipanen', 'Total Hasil', 'Status', 'Aksi', 'Keterangan']}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0">
            <td className="px-5 py-3.5 font-medium text-foreground">{r.jenis}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.lokasi || '—'}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.tanggal}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.jumlahPohon}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{r.luasPanen != null ? `${r.luasPanen} ${r.satuanLuas || ''}`.trim() : '—'}</td>
            <td className="px-5 py-3.5">
              <Badge>{r.totalHasil} kg</Badge>
            </td>
            <td className="px-5 py-3.5">
              <Badge tone="blue">{r.status}</Badge>
            </td>
            <td className="px-5 py-3.5">
              <RowActions onEdit={() => bukaEdit(r)} onDelete={() => remove(r.id)} />
            </td>
            <td className="px-5 py-3.5">
              <EditedLink riwayat={r.riwayat} onClick={() => setRiwayat(r)} />
            </td>
          </tr>
        ))}

        {rows.length === 0 && (
          <tr>
            <td colSpan={9} className="px-5 py-10 text-center text-sm text-muted-foreground">
              {items.length === 0 ? 'Belum ada data panen.' : 'Tidak ada data panen yang sesuai filter.'}
            </td>
          </tr>
        )}
      </Table>

      <Modal open={open} title={editing ? 'Edit Panen' : 'Tambah Panen'} onClose={tutupModal} onSubmit={submit}>
        <label className="block min-w-0 text-[10px] font-medium text-foreground sm:text-sm">
          Lokasi Kebun
          <select
            name="lokasiId"
            value={lokasiId}
            onChange={(e) => {
              setLokasiId(e.target.value);
              setJenis('');
              hapusError('lokasiId')();
              setErrors((prev) => ({ ...prev, jenis: undefined }));
            }}
            required
            disabled={memuatLokasi}
            className={`mt-0.5 h-8 w-full min-w-0 rounded-md border bg-background px-2 py-1 text-xs leading-tight text-foreground outline-none sm:mt-1.5 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm ${
              errors.lokasiId ? 'border-destructive' : 'border-input'
            }`}
          >
            <option value="">{memuatLokasi ? 'Memuat lokasi...' : 'Pilih lokasi kebun'}</option>
            {lokasiList.map((lokasi) => (
              <option key={lokasi.id} value={lokasi.id}>
                {lokasi.nama}
              </option>
            ))}
          </select>
          {errors.lokasiId && <span className="mt-0.5 block text-[10px] text-destructive sm:text-xs">{errors.lokasiId}</span>}
          {!memuatLokasi && lokasiList.length === 0 && <span className="mt-0.5 block text-[10px] text-muted-foreground sm:text-xs">Belum ada lokasi kebun yang terdaftar.</span>}
        </label>

        <label className="block min-w-0 text-[10px] font-medium text-foreground sm:text-sm">
          Jenis Tanaman
          <select
            name="jenis"
            value={jenis}
            onChange={(e) => {
              setJenis(e.target.value);
              hapusError('jenis')();
            }}
            required
            disabled={!lokasiId || memuatTanaman || tanamanList.length === 0}
            className={`mt-0.5 h-8 w-full min-w-0 rounded-md border bg-background px-2 py-1 text-xs leading-tight text-foreground outline-none sm:mt-1.5 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm ${
              errors.jenis ? 'border-destructive' : 'border-input'
            }`}
          >
            <option value="">{!lokasiId ? 'Pilih lokasi terlebih dahulu' : memuatTanaman ? 'Memuat tanaman...' : tanamanList.length === 0 ? 'Belum ada tanaman di lokasi ini' : 'Pilih jenis tanaman'}</option>
            {tanamanList.map((tanaman) => (
              <option key={tanaman.id} value={tanaman.nama}>
                {tanaman.nama}
              </option>
            ))}
          </select>
          {errors.jenis && <span className="mt-0.5 block text-[10px] text-destructive sm:text-xs">{errors.jenis}</span>}
        </label>

        <Field label="Tanggal Panen" name="tanggal" type="date" defaultValue={editing?.tanggal} />

        <Field label="Jumlah Pohon" name="jumlahPohon" type="number" integer required={false} placeholder="Minimal 1" defaultValue={editing?.jumlahPohon ?? ''} error={errors.jumlahPohon} onChange={hapusError('jumlahPohon')} />

        <Field label="Luas Dipanen" name="luasPanen" type="number" required={false} placeholder="Contoh: 2" defaultValue={editing?.luasPanen ?? ''} error={errors.luasPanen} onChange={hapusError('luasPanen')} />

        <Field label="Satuan Luas" name="satuanLuas" options={SATUAN_LUAS} defaultValue={editing?.satuanLuas ?? 'ha'} />

        <Field label="Total Hasil (kg)" name="totalHasil" type="number" required={false} placeholder="Contoh: 12,5" defaultValue={editing?.totalHasil ?? ''} error={errors.totalHasil} onChange={hapusError('totalHasil')} />

        <Field label="Status" name="status" options={STATUS} defaultValue={editing?.status} full />

        {editing && <KeteranganEdit validasiBrowser={false} error={errors.keterangan} onChange={hapusError('keterangan')} />}
      </Modal>

      {riwayat && <RiwayatDialog subtitle={`${riwayat.jenis} — ${riwayat.lokasi || 'Tanpa lokasi'}`} riwayat={riwayat.riwayat ?? []} onClose={() => setRiwayat(null)} />}
    </Shell>
  );
}
