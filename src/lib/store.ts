import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Panen = {
  id: string;
  jenis: string;
  tanggal: string;
  jumlahPohon: number;
  totalHasil: number;
  status: string;
  riwayat?: Riwayat[];
};

export type Pascapanen = {
  id: string;
  komoditas: string;
  tanggal: string;
  proses: string;
  beratMasuk: number;
  beratKeluar: number;
  status: string;
  riwayat?: Riwayat[];
};

export type Riwayat = {
  waktu: string;
  keterangan?: string;
  perubahan: {
    field: string;
    sebelum: string;
    sesudah: string;
  }[];
};

export type Laporan = {
  id: string;
  kategori?: string;
  tanggal: string;
  nama: string;
  jumlahHasil: number;
  upah: number;
  riwayat?: Riwayat[];
};

type CollectionKey = 'panen' | 'pascapanen' | 'laporan';

type CollectionItem = Panen | Pascapanen | Laporan;

const TABLES: Record<CollectionKey, string> = {
  panen: 'panen',
  pascapanen: 'pascapanen',
  laporan: 'laporan_karyawan',
};

// Mengambil data dari Supabase
async function fetchCollection(key: CollectionKey) {
  const selectQuery = key === 'laporan' ? '*' : '*, komoditas(nama)';

  const { data, error } = await supabase.from(TABLES[key]).select(selectQuery).order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    if (key === 'panen') {
      return {
        id: row.id,
        jenis: row.komoditas?.nama ?? '',
        tanggal: row.tanggal,
        jumlahPohon: Number(row.jumlah_pohon),
        totalHasil: Number(row.total_hasil),
        status: row.status,
        riwayat: row.riwayat ?? [],
      } satisfies Panen;
    }

    if (key === 'pascapanen') {
      return {
        id: row.id,
        komoditas: row.komoditas?.nama ?? '',
        tanggal: row.tanggal,
        proses: row.proses,
        beratMasuk: Number(row.berat_masuk),
        beratKeluar: Number(row.berat_keluar),
        status: row.status,
        riwayat: row.riwayat ?? [],
      } satisfies Pascapanen;
    }

    return {
      id: row.id,
      kategori: row.kategori,
      tanggal: row.tanggal,
      nama: row.nama,
      jumlahHasil: Number(row.jumlah_hasil),
      upah: Number(row.upah),
      riwayat: row.riwayat ?? [],
    } satisfies Laporan;
  });
}

// Mencari ID komoditas berdasarkan nama
async function getKomoditasId(nama: string): Promise<string> {
  const { data, error } = await supabase.from('komoditas').select('id').eq('nama', nama).single();

  if (error) throw error;

  if (!data) {
    throw new Error(`Komoditas ${nama} tidak ditemukan.`);
  }

  return data.id;
}

// Mengubah format frontend menjadi kolom database
async function toDatabase(key: CollectionKey, item: any) {
  if (key === 'panen') {
    const komoditasId = await getKomoditasId(item.jenis);

    return {
      komoditas_id: komoditasId,
      tanggal: item.tanggal,
      jumlah_pohon: item.jumlahPohon,
      total_hasil: item.totalHasil,
      status: item.status,
      riwayat: item.riwayat ?? [],
    };
  }

  if (key === 'pascapanen') {
    const komoditasId = await getKomoditasId(item.komoditas);

    return {
      komoditas_id: komoditasId,
      panen_id: null,
      tanggal: item.tanggal,
      proses: item.proses,
      berat_masuk: item.beratMasuk,
      berat_keluar: item.beratKeluar,
      status: item.status,
      riwayat: item.riwayat ?? [],
    };
  }

  return {
    karyawan_id: null,
    kategori: item.kategori,
    tanggal: item.tanggal,
    nama: item.nama,
    jumlah_hasil: item.jumlahHasil,
    upah: item.upah,
    riwayat: item.riwayat ?? [],
  };
}

// Menampilkan pesan error tanpa mengubah tampilan aplikasi
function handleError(action: string, error: unknown) {
  console.error(`Supabase ${action}:`, error);

  const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat menghubungi database.';

  window.alert(`Gagal ${action}: ${message}`);
}

// Hook utama CRUD
export function useCollection<T extends { id: string }>(key: CollectionKey) {
  const [items, setItems] = useState<T[]>([]);

  // READ
  const load = useCallback(async () => {
    try {
      const data = await fetchCollection(key);
      setItems(data as unknown as T[]);
    } catch (error) {
      console.error('Gagal mengambil data Supabase:', error);
    }
  }, [key]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const data = await fetchCollection(key);

        if (active) {
          setItems(data as unknown as T[]);
        }
      } catch (error) {
        console.error('Gagal memuat data:', error);
      }
    };

    initialize();

    return () => {
      active = false;
    };
  }, [key]);

  // CREATE
  const add = useCallback(
    async (item: Omit<T, 'id'>): Promise<boolean> => {
      try {
        const payload = await toDatabase(key, item as Record<string, any>);

        const { error } = await supabase.from(TABLES[key]).insert(payload as any);

        if (error) throw error;

        await load();

        return true;
      } catch (error) {
        handleError('menambahkan data', error);
        return false;
      }
    },
    [key, load],
  );

  // UPDATE
  const update = useCallback(
    async (id: string, item: Omit<T, 'id'>): Promise<boolean> => {
      try {
        const payload = await toDatabase(key, item as Record<string, any>);

        const { error } = await supabase
          .from(TABLES[key])
          .update(payload as any)
          .eq('id', id);

        if (error) throw error;

        await load();

        return true;
      } catch (error) {
        handleError('memperbarui data', error);
        return false;
      }
    },
    [key, load],
  );

  // DELETE
  const remove = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from(TABLES[key]).delete().eq('id', id);

        if (error) throw error;

        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch (error) {
        handleError('menghapus data', error);
      }
    },
    [key],
  );

  return {
    items,
    add,
    update,
    remove,
    load,
  };
}

// Format rupiah
export const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);

// Format tanggal
export const tanggalPanjang = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

// Membuat riwayat perubahan
export function buatRiwayat(lama: Record<string, unknown>, baru: Record<string, unknown>, labels: Record<string, string>, riwayat: Riwayat[] | undefined, keterangan: string): Riwayat[] {
  const log = [...(riwayat ?? [])];

  const perubahan = Object.keys(labels)
    .filter((k) => String(lama[k]) !== String(baru[k]))
    .map((k) => ({
      field: labels[k] as string,
      sebelum: String(lama[k]),
      sesudah: String(baru[k]),
    }));

  if (perubahan.length) {
    log.push({
      waktu: new Date().toISOString(),
      keterangan,
      perubahan,
    });
  }

  return log;
}
