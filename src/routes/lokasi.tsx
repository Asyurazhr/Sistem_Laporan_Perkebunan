import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, MapPin, X, Sprout, LandPlot, Trees } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal, Table, KeteranganEdit, EditedLink, RiwayatDialog } from '@/components/data-form';
import { Shell } from '@/components/shell';

export const Route = createFileRoute('/lokasi')({
  component: RouteComponent,
});

type Tanaman = {
  nama: string;
  luas: string;
  jumlahPohon: string;
};

type Perubahan = {
  field: string;
  sebelum: string;
  sesudah: string;
};

type Riwayat = {
  waktu: string;
  keterangan?: string;
  perubahan: Perubahan[];
};

type Lokasi = {
  id: string;
  nama: string;
  alamat: string;
  luas: number;
  satuan: 'hektare' | 'm²';
  tanaman: Tanaman[];
  riwayat?: Riwayat[];
};

function RouteComponent() {
  const [lokasi, setLokasi] = useState<Lokasi[]>([]);
  const [modalTerbuka, setModalTerbuka] = useState(false);
  const [modalLihat, setModalLihat] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);

  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [luas, setLuas] = useState('');
  const [satuan, setSatuan] = useState<'hektare' | 'm²'>('hektare');
  const [tanaman, setTanaman] = useState<Tanaman[]>([{ nama: '', luas: '', jumlahPohon: '0' }]);
  const [keterangan, setKeterangan] = useState('');
  const [riwayatTerpilih, setRiwayatTerpilih] = useState<Lokasi | null>(null);

  // Mengambil data lokasi langsung dari Supabase
  const loadLokasi = useCallback(async () => {
    try {
      const [{ data: lokasiData, error: lokasiError }, { data: tanamanData, error: tanamanError }, { data: riwayatData, error: riwayatError }] = await Promise.all([
        supabase.from('lokasi_kebun').select('*').order('created_at', { ascending: false }),
        supabase.from('lokasi_tanaman').select('*'),
        supabase.from('riwayat_lokasi').select('*').order('waktu', { ascending: true }),
      ]);

      if (lokasiError) throw lokasiError;
      if (tanamanError) throw tanamanError;
      if (riwayatError) throw riwayatError;

      const hasil: Lokasi[] = (lokasiData ?? []).map((item: any) => ({
        id: item.id,
        nama: item.nama,
        alamat: item.alamat,
        luas: Number(item.luas),
        satuan: item.satuan,
        tanaman: (tanamanData ?? [])
          .filter((t: any) => t.lokasi_id === item.id)
          .map((t: any) => ({
            nama: t.nama,
            luas: String(t.luas),
            jumlahPohon: String(t.jumlah_pohon ?? 0),
          })),
        riwayat: (riwayatData ?? [])
          .filter((r: any) => r.lokasi_id === item.id)
          .map((r: any) => ({
            waktu: r.waktu,
            keterangan: r.keterangan,
            perubahan: r.perubahan ?? [],
          })),
      }));

      setLokasi(hasil);
      return hasil;
    } catch (error) {
      console.error('Gagal mengambil data lokasi:', error);
      alert(`Gagal mengambil data lokasi: ${error instanceof Error ? error.message : 'Terjadi kesalahan database.'}`);
      return null;
    }
  }, []);

  // Memuat data langsung dari Supabase
  useEffect(() => {
    let aktif = true;

    const initialize = async () => {
      await loadLokasi();
      if (aktif) setSiap(true);
    };

    initialize();

    return () => {
      aktif = false;
    };
  }, [loadLokasi]);

  const resetForm = () => {
    setNama('');
    setAlamat('');
    setLuas('');
    setSatuan('hektare');
    setTanaman([{ nama: '', luas: '', jumlahPohon: '0' }]);
    setKeterangan('');
    setEditId(null);
  };

  const bukaTambah = () => {
    resetForm();
    setModalTerbuka(true);
  };

  const bukaEdit = (item: Lokasi) => {
    setEditId(item.id);
    setNama(item.nama);
    setAlamat(item.alamat);
    setLuas(String(item.luas));
    setSatuan(item.satuan);
    setTanaman(item.tanaman.map((t) => ({ ...t })));
    setKeterangan('');
    setModalTerbuka(true);
  };

  const bukaLihat = (item: Lokasi) => {
    setEditId(item.id);
    setNama(item.nama);
    setAlamat(item.alamat);
    setLuas(String(item.luas));
    setSatuan(item.satuan);
    setTanaman(item.tanaman.map((t) => ({ ...t })));
    setModalLihat(true);
  };

  const tutupLihat = () => {
    setModalLihat(false);
    resetForm();
  };

  const tambahTanaman = () => {
    setTanaman((prev) => [...prev, { nama: '', luas: '', jumlahPohon: '0' }]);
  };

  const hapusTanaman = (index: number) => {
    setTanaman((prev) => prev.filter((_, i) => i !== index));
  };

  const ubahTanaman = (index: number, field: keyof Tanaman, value: string) => {
    setTanaman((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const konversiKeM2 = (nilai: number, unit: 'hektare' | 'm²') => (unit === 'hektare' ? nilai * 10000 : nilai);

  const formatLuas = (nilai: number, unit: string) =>
    `${new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 2,
    }).format(nilai)} ${unit}`;

  // Menyimpan data lokasi ke Supabase
  const simpanLokasi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const daftarTanaman = tanaman.filter((item) => item.nama.trim() && item.luas.trim() && item.jumlahPohon.trim() !== '');

    if (!nama.trim() || !alamat.trim() || !luas || daftarTanaman.length === 0) {
      alert('Lengkapi data lokasi dan minimal satu jenis tanaman.');
      return;
    }

    const luasTotal = Number(luas);

    if (!Number.isFinite(luasTotal) || luasTotal <= 0) {
      alert('Luas lahan harus lebih dari 0.');
      return;
    }

    const luasTanaman = daftarTanaman.reduce((total, item) => total + Number(item.luas), 0);

    if (daftarTanaman.some((item) => !Number.isFinite(Number(item.luas)) || Number(item.luas) <= 0)) {
      alert('Luas setiap tanaman harus lebih dari 0.');
      return;
    }

    if (daftarTanaman.some((item) => !Number.isInteger(Number(item.jumlahPohon)) || Number(item.jumlahPohon) < 0)) {
      alert('Jumlah pohon harus berupa bilangan bulat dan tidak boleh negatif.');
      return;
    }

    if (konversiKeM2(luasTanaman, satuan) > konversiKeM2(luasTotal, satuan)) {
      alert('Total luas tanaman tidak boleh melebihi luas kebun.');
      return;
    }

    const dataBaru: Lokasi = {
      id: editId ?? '',
      nama: nama.trim(),
      alamat: alamat.trim(),
      luas: luasTotal,
      satuan,
      tanaman: daftarTanaman.map((item) => ({
        nama: item.nama.trim(),
        luas: item.luas,
        jumlahPohon: item.jumlahPohon,
      })),
    };

    try {
      if (editId) {
        const dataLama = lokasi.find((item) => item.id === editId);
        if (!dataLama) return;

        if (!keterangan.trim()) {
          alert('Keterangan Edit wajib diisi.');
          return;
        }

        const perubahan: Perubahan[] = [];

        const tambahPerubahan = (field: string, sebelum: string, sesudah: string) => {
          if (sebelum !== sesudah) {
            perubahan.push({ field, sebelum, sesudah });
          }
        };

        tambahPerubahan('Nama Kebun', dataLama.nama, dataBaru.nama);
        tambahPerubahan('Alamat / Lokasi', dataLama.alamat, dataBaru.alamat);
        tambahPerubahan('Luas Lahan', formatLuas(dataLama.luas, dataLama.satuan), formatLuas(dataBaru.luas, dataBaru.satuan));
        tambahPerubahan(
          'Jenis Tanaman',
          dataLama.tanaman.map((t) => `${t.nama} (${t.luas} ${dataLama.satuan}, ${t.jumlahPohon} pohon)`).join(', '),
          dataBaru.tanaman.map((t) => `${t.nama} (${t.luas} ${dataBaru.satuan}, ${t.jumlahPohon} pohon)`).join(', '),
        );

        if (perubahan.length === 0) {
          alert('Tidak ada perubahan data yang disimpan.');
          return;
        }

        // UPDATE data utama
        const { error: lokasiError } = await supabase
          .from('lokasi_kebun')
          .update({
            nama: dataBaru.nama,
            alamat: dataBaru.alamat,
            luas: dataBaru.luas,
            satuan: dataBaru.satuan,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editId);

        if (lokasiError) throw lokasiError;

        // Perbarui daftar tanaman
        const { error: hapusTanamanError } = await supabase.from('lokasi_tanaman').delete().eq('lokasi_id', editId);

        if (hapusTanamanError) throw hapusTanamanError;

        const { error: tanamanError } = await supabase.from('lokasi_tanaman').insert(
          dataBaru.tanaman.map((t) => ({
            lokasi_id: editId,
            nama: t.nama,
            luas: Number(t.luas),
            jumlah_pohon: Number(t.jumlahPohon),
          })),
        );

        if (tanamanError) throw tanamanError;

        // Tambahkan riwayat edit
        const { error: riwayatError } = await supabase.from('riwayat_lokasi').insert({
          lokasi_id: editId,
          waktu: new Date().toISOString(),
          keterangan: keterangan.trim(),
          perubahan,
        });

        if (riwayatError) throw riwayatError;
      } else {
        // INSERT data utama dan ambil ID asli dari Supabase
        const { data: lokasiTersimpan, error: lokasiError } = await supabase
          .from('lokasi_kebun')
          .insert({
            nama: dataBaru.nama,
            alamat: dataBaru.alamat,
            luas: dataBaru.luas,
            satuan: dataBaru.satuan,
          })
          .select('id')
          .single();

        if (lokasiError) throw lokasiError;

        if (!lokasiTersimpan?.id) {
          throw new Error('ID lokasi tidak berhasil diperoleh dari Supabase.');
        }

        // INSERT tanaman menggunakan ID lokasi dari Supabase
        const { error: tanamanError } = await supabase.from('lokasi_tanaman').insert(
          dataBaru.tanaman.map((t) => ({
            lokasi_id: lokasiTersimpan.id,
            nama: t.nama,
            luas: Number(t.luas),
            jumlah_pohon: Number(t.jumlahPohon),
          })),
        );

        if (tanamanError) {
          const { error: rollbackError } = await supabase.from('lokasi_kebun').delete().eq('id', lokasiTersimpan.id);

          if (rollbackError) {
            console.error('Gagal membatalkan lokasi setelah penyimpanan tanaman gagal:', rollbackError);
          }

          throw tanamanError;
        }
      }

      await loadLokasi();
      setModalTerbuka(false);
      resetForm();
    } catch (error) {
      console.error('Gagal menyimpan lokasi:', error);
      alert(`Gagal menyimpan lokasi: ${error instanceof Error ? error.message : 'Terjadi kesalahan database.'}`);
    }
  };

  // Menghapus lokasi dari Supabase
  const hapusLokasi = async (id: string) => {
    if (!confirm('Apakah kamu yakin ingin menghapus lokasi kebun ini?')) {
      return;
    }

    try {
      const { error } = await supabase.from('lokasi_kebun').delete().eq('id', id);

      if (error) throw error;

      setLokasi((prev) => prev.filter((item) => item.id !== id));

      if (riwayatTerpilih?.id === id) {
        setRiwayatTerpilih(null);
      }
    } catch (error) {
      console.error('Gagal menghapus lokasi:', error);
      alert(`Gagal menghapus lokasi: ${error instanceof Error ? error.message : 'Terjadi kesalahan database.'}`);
    }
  };

  const totalJenisTanaman = new Set(lokasi.flatMap((item) => item.tanaman.map((t) => t.nama.toLowerCase()))).size;

  const totalLuasHektare = lokasi.reduce((total, item) => total + konversiKeM2(item.luas, item.satuan), 0) / 10000;

  const totalPohon = lokasi.reduce((total, item) => total + item.tanaman.reduce((subtotal, t) => subtotal + Number(t.jumlahPohon || 0), 0), 0);

  const tombolTambah = (
    <button type="button" onClick={bukaTambah} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:px-4 sm:text-sm">
      <Plus className="h-4 w-4" />
      Tambah Lokasi
    </button>
  );

  return (
    <Shell title="Lokasi Perkebunan" heading="Lokasi Kebun" subtitle="Kelola lokasi kebun, luas lahan, dan jenis tanaman." action={tombolTambah}>
      <div className="space-y-4 sm:space-y-6">
        {/* Statistik lokasi kebun */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-border bg-card p-2 sm:p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground sm:gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
              <span className="text-[10px] sm:text-xs">Total Lokasi</span>
            </div>
            <p className="mt-1 text-sm font-bold text-foreground sm:mt-2 sm:text-xl">{lokasi.length}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-2 sm:p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground sm:gap-2">
              <Sprout className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
              <span className="text-[10px] sm:text-xs">Jenis Tanaman</span>
            </div>
            <p className="mt-1 text-sm font-bold text-foreground sm:mt-2 sm:text-xl">{totalJenisTanaman}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-2 sm:p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground sm:gap-2">
              <Trees className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
              <span className="text-[10px] sm:text-xs">Total Pohon</span>
            </div>
            <p className="mt-1 text-sm font-bold text-foreground sm:mt-2 sm:text-xl">{new Intl.NumberFormat('id-ID').format(totalPohon)}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-2 sm:p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground sm:gap-2">
              <LandPlot className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
              <span className="text-[10px] sm:text-xs">Total Luas Lahan</span>
            </div>
            <p className="mt-1 text-sm font-bold text-foreground sm:mt-2 sm:text-xl">
              {new Intl.NumberFormat('id-ID', {
                maximumFractionDigits: 2,
              }).format(totalLuasHektare)}{' '}
              <span className="text-xs font-medium sm:text-sm">ha</span>
            </p>
          </div>
        </div>

        {/* Daftar lokasi */}
        {!siap ? (
          <div className="rounded-xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">Memuat data lokasi...</div>
        ) : lokasi.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center">
            <MapPin className="mx-auto h-9 w-9 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">Belum ada lokasi kebun</h3>
            <p className="mt-1 text-xs text-muted-foreground">Tambahkan lokasi kebun untuk mulai mencatat luas lahan dan tanaman.</p>
            <button type="button" onClick={bukaTambah} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              Tambah Lokasi Pertama
            </button>
          </div>
        ) : (
          <Table head={['Nama Kebun', 'Alamat / Lokasi', 'Luas Lahan', 'Jumlah Tanaman', 'Total Pohon', 'Jenis Tanaman', 'Aksi']}>
            {lokasi.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-semibold text-foreground">{item.nama}</td>
                <td className="max-w-56 truncate px-5 py-3 text-muted-foreground">{item.alamat}</td>
                <td className="px-5 py-3 text-foreground">{formatLuas(item.luas, item.satuan)}</td>
                <td className="px-5 py-3 text-foreground">{item.tanaman.length}</td>
                <td className="px-5 py-3 text-foreground">{new Intl.NumberFormat('id-ID').format(item.tanaman.reduce((total, t) => total + Number(t.jumlahPohon || 0), 0))}</td>
                <td className="px-5 py-3 text-foreground">
                  <div className="flex flex-wrap gap-1">
                    {item.tanaman.map((t, i) => (
                      <span key={i} className="rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground">
                        {t.nama}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold sm:gap-3">
                    <button type="button" onClick={() => bukaLihat(item)} className="text-muted-foreground hover:underline">
                      Lihat
                    </button>
                    <button type="button" onClick={() => bukaEdit(item)} className="text-primary hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => hapusLokasi(item.id)} className="text-destructive hover:underline">
                      Hapus
                    </button>
                  </div>
                  <div className="mt-1">
                    <EditedLink riwayat={item.riwayat} onClick={() => setRiwayatTerpilih(item)} />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        {/* Form tambah dan edit lokasi */}
        <Modal
          open={modalTerbuka}
          title={editId ? 'Edit Lokasi Kebun' : 'Tambah Lokasi Kebun'}
          onClose={() => {
            setModalTerbuka(false);
            resetForm();
          }}
          onSubmit={simpanLokasi}
        >
          <label className="col-span-full block text-[10px] font-medium text-foreground sm:text-sm">
            Nama Kebun
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Kebun Cikuray"
              required
              className="mt-0.5 h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring sm:mt-1.5 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
            />
          </label>

          <label className="col-span-full block text-[10px] font-medium text-foreground sm:text-sm">
            Alamat / Keterangan Lokasi
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Masukkan alamat atau keterangan lokasi kebun"
              required
              rows={2}
              className="mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring sm:mt-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
            />
          </label>

          <label className="block text-[10px] font-medium text-foreground sm:text-sm">
            Luas Lahan
            <input
              type="number"
              min="0.01"
              step="any"
              value={luas}
              onChange={(e) => setLuas(e.target.value)}
              placeholder="Contoh: 2"
              required
              className="mt-0.5 h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring sm:mt-1.5 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
            />
          </label>

          <label className="block text-[10px] font-medium text-foreground sm:text-sm">
            Satuan Luas
            <select
              value={satuan}
              onChange={(e) => setSatuan(e.target.value as 'hektare' | 'm²')}
              className="mt-0.5 h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring sm:mt-1.5 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
            >
              <option value="hektare">Hektare (ha)</option>
              <option value="m²">Meter persegi (m²)</option>
            </select>
          </label>

          <div className="col-span-full border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-foreground sm:text-sm">Jenis Tanaman</h4>
                <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">Tambahkan satu atau lebih jenis tanaman beserta luasnya.</p>
              </div>
              <button type="button" onClick={tambahTanaman} className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[10px] font-semibold text-primary hover:bg-secondary sm:text-xs">
                <Plus className="h-3 w-3" />
                Tanaman
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {tanaman.map((item, index) => (
                <div key={index} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <label className="min-w-0 text-[10px] font-medium text-foreground sm:text-xs">
                    Nama Tanaman
                    <input
                      value={item.nama}
                      onChange={(e) => ubahTanaman(index, 'nama', e.target.value)}
                      placeholder="Contoh: Kopi"
                      required
                      className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring"
                    />
                  </label>

                  <label className="min-w-0 text-[10px] font-medium text-foreground sm:text-xs">
                    Luas ({satuan === 'hektare' ? 'ha' : 'm²'})
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.luas}
                      onChange={(e) => ubahTanaman(index, 'luas', e.target.value)}
                      placeholder="Contoh: 1"
                      required
                      className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring"
                    />
                  </label>

                  <label className="min-w-0 text-[10px] font-medium text-foreground sm:text-xs">
                    Jumlah Pohon
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.jumlahPohon}
                      onChange={(e) => ubahTanaman(index, 'jumlahPohon', e.target.value)}
                      placeholder="Contoh: 100"
                      required
                      className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-ring"
                    />
                  </label>

                  <button type="button" onClick={() => hapusTanaman(index)} disabled={tanaman.length === 1} aria-label="Hapus tanaman" className="mb-1 rounded-md p-1.5 text-destructive hover:bg-secondary disabled:opacity-30">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[10px] text-muted-foreground sm:text-xs">Total luas seluruh tanaman tidak boleh melebihi luas lahan kebun.</p>
          </div>

          {editId && <KeteranganEdit onChange={() => setKeterangan((document.querySelector('textarea[name="keterangan"]') as HTMLTextAreaElement)?.value ?? '')} />}
        </Modal>

        {/* Form lihat lokasi - seluruh isian hanya dapat dibaca */}
        {modalLihat && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-4">
            <div className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[90vh] sm:rounded-xl">
              <div className="flex items-center justify-between border-b border-border px-3 py-2 sm:border-0 sm:px-6 sm:pt-6 sm:pb-0">
                <h3 className="text-[13px] font-bold text-foreground sm:text-lg">Lihat Lokasi Kebun</h3>
                <button type="button" onClick={tutupLihat} aria-label="Tutup" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-2 gap-y-2 overflow-y-auto px-3 py-2 sm:gap-4 sm:px-6 sm:pt-5 sm:pb-6">
                <label className="col-span-full block text-[10px] font-medium text-foreground sm:text-sm">
                  Nama Kebun
                  <input value={nama} readOnly className="mt-0.5 h-8 w-full rounded-md border border-input bg-secondary px-2 text-xs text-foreground outline-none sm:mt-1.5 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm" />
                </label>

                <label className="col-span-full block text-[10px] font-medium text-foreground sm:text-sm">
                  Alamat / Keterangan Lokasi
                  <textarea value={alamat} readOnly rows={2} className="mt-0.5 w-full rounded-md border border-input bg-secondary px-2 py-1 text-xs text-foreground outline-none sm:mt-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm" />
                </label>

                <label className="block text-[10px] font-medium text-foreground sm:text-sm">
                  Luas Lahan
                  <input value={luas} readOnly className="mt-0.5 h-8 w-full rounded-md border border-input bg-secondary px-2 text-xs text-foreground outline-none sm:mt-1.5 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm" />
                </label>

                <label className="block text-[10px] font-medium text-foreground sm:text-sm">
                  Satuan Luas
                  <input
                    value={satuan === 'hektare' ? 'Hektare (ha)' : 'Meter persegi (m²)'}
                    readOnly
                    className="mt-0.5 h-8 w-full rounded-md border border-input bg-secondary px-2 text-xs text-foreground outline-none sm:mt-1.5 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
                  />
                </label>

                <div className="col-span-full border-t border-border pt-3">
                  <h4 className="text-xs font-bold text-foreground sm:text-sm">Jenis Tanaman</h4>
                  <div className="mt-3 space-y-2">
                    {tanaman.map((item, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <label className="min-w-0 text-[10px] font-medium text-foreground sm:text-xs">
                          Nama Tanaman
                          <input value={item.nama} readOnly className="mt-1 h-8 w-full rounded-md border border-input bg-secondary px-2 text-xs text-foreground outline-none" />
                        </label>
                        <label className="min-w-0 text-[10px] font-medium text-foreground sm:text-xs">
                          Luas ({satuan === 'hektare' ? 'ha' : 'm²'})
                          <input value={item.luas} readOnly className="mt-1 h-8 w-full rounded-md border border-input bg-secondary px-2 text-xs text-foreground outline-none" />
                        </label>
                        <label className="min-w-0 text-[10px] font-medium text-foreground sm:text-xs">
                          Jumlah Pohon
                          <input value={item.jumlahPohon} readOnly className="mt-1 h-8 w-full rounded-md border border-input bg-secondary px-2 text-xs text-foreground outline-none" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-border px-3 py-2 sm:px-6 sm:pb-6">
                <button type="button" onClick={tutupLihat} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary sm:text-sm">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dialog riwayat edit */}
        {riwayatTerpilih && <RiwayatDialog subtitle={riwayatTerpilih.nama} riwayat={riwayatTerpilih.riwayat ?? []} onClose={() => setRiwayatTerpilih(null)} />}
      </div>
    </Shell>
  );
}
