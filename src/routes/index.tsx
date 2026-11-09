import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { BarChart3, Lightbulb, Package, Scale, Sprout, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Shell, StatCard } from '@/components/shell';
import { rupiah, useCollection, type Laporan, type Panen, type Pascapanen } from '@/lib/store';
import { useAuth } from '@/lib/auth';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Beranda — Sistem Perkebunan' },
      { name: 'description', content: 'Ringkasan dan analisis data panen, pascapanen, dan laporan karyawan perkebunan.' },
    ],
  }),
  component: Index,
});

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

// Warna untuk tiap komoditas di grafik
const WARNA = ['#0f5c2e', '#d97706', '#7c4a1e', '#65a30d', '#0e7490', '#be123c'];

const angka = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n);
const persen = (n: number) => `${angka(n)}%`;

// Ubah Date menjadi 'YYYY-MM-DD' (zona waktu lokal)
function keyTanggal(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const h = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${h}`;
}

const labelTanggal = (d: Date) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d);

function sapaan(jam: number) {
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 18) return 'Selamat sore';
  return 'Selamat malam';
}

// Jumlahkan nilai per kelompok
function kelompokkan<T>(items: T[], kunci: (i: T) => string, nilai: (i: T) => number) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = kunci(item) || 'Lainnya';
    map.set(k, (map.get(k) ?? 0) + nilai(item));
  }
  return map;
}

// Persentase perubahan 7 hari terakhir vs 7 hari sebelumnya, untuk komoditas tertentu
function hitungPerubahan(tren: Record<string, number | string>[], nama: string[]) {
  const jumlah = (rows: typeof tren) => rows.reduce((s, r) => s + nama.reduce((t, n) => t + Number(r[n] ?? 0), 0), 0);
  const akhir = jumlah(tren.slice(-7));
  const sebelum = jumlah(tren.slice(-14, -7));
  return sebelum > 0 ? ((akhir - sebelum) / sebelum) * 100 : null;
}

/* ------------------------------------------------------------------ */
/* Halaman                                                             */
/* ------------------------------------------------------------------ */

function Index() {
  const panen = useCollection<Panen>('panen').items;
  const pasca = useCollection<Pascapanen>('pascapanen').items;
  const laporan = useCollection<Laporan>('laporan').items;
  const { user } = useAuth();

  // Tanggal & jam diambil di browser supaya tidak beda dengan server (SSR)
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const nama = (user?.user_metadata?.name as string | undefined) ?? user?.email?.split('@')[0] ?? 'admin';

  const analisis = useMemo(() => {
    const totalHasil = panen.reduce((s, i) => s + i.totalHasil, 0);
    const totalGaji = laporan.reduce((s, i) => s + i.jumlahHasil * i.upah, 0);

    /* 2. Kontribusi komoditas (dihitung dulu agar warnanya konsisten) */
    const komoditas = [...kelompokkan(panen, (p) => p.jenis, (p) => p.totalHasil)]
      .map(([name, value]) => ({ name, value, pct: totalHasil > 0 ? (value / totalHasil) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .map((k, i) => ({ ...k, warna: WARNA[i % WARNA.length] }));

    /* 1. Tren hasil panen 30 hari terakhir, dipisah per komoditas ---- */
    const perHari = new Map<string, Record<string, number>>();
    for (const p of panen) {
      const k = p.tanggal.slice(0, 10);
      const row = perHari.get(k) ?? {};
      const jenis = p.jenis || 'Lainnya';
      row[jenis] = (row[jenis] ?? 0) + p.totalHasil;
      perHari.set(k, row);
    }
    const hariIni = now ?? new Date();
    const tren = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() - (29 - i));
      const row: Record<string, number | string> = { tanggal: labelTanggal(d) };
      const isi = perHari.get(keyTanggal(d)) ?? {};
      for (const k of komoditas) row[k.name] = isi[k.name] ?? 0;
      return row;
    });
    const tujuhHari = panen
      .filter((p) => {
        const d = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate() - 6);
        return p.tanggal.slice(0, 10) >= keyTanggal(d) && p.tanggal.slice(0, 10) <= keyTanggal(hariIni);
      })
      .reduce((s, p) => s + p.totalHasil, 0);
    const perubahan = hitungPerubahan(tren, komoditas.map((k) => k.name));

    /* 3. Biaya tenaga kerja per kg --------------------------------- */
    const biayaPerKg = totalHasil > 0 ? totalGaji / totalHasil : null;
    const gajiPerKategori = kelompokkan(laporan, (l) => (l.kategori ?? '').toLowerCase(), (l) => l.jumlahHasil * l.upah);
    const biayaKomoditas = komoditas
      .map((k) => {
        const gaji = gajiPerKategori.get(k.name.toLowerCase()) ?? 0;
        return { name: k.name, gaji, perKg: k.value > 0 ? gaji / k.value : 0 };
      })
      .filter((k) => k.gaji > 0)
      .sort((a, b) => b.perKg - a.perKg);

    /* 4. Penyusutan pascapanen ------------------------------------- */
    const masuk = kelompokkan(pasca, (p) => p.komoditas, (p) => p.beratMasuk);
    const keluar = kelompokkan(pasca, (p) => p.komoditas, (p) => p.beratKeluar);
    const susut = [...masuk]
      .filter(([, m]) => m > 0)
      .map(([name, m]) => {
        const k = keluar.get(name) ?? 0;
        return { name, masuk: m, keluar: k, susut: ((m - k) / m) * 100 };
      })
      .sort((a, b) => b.susut - a.susut);

    /* 5. Karyawan dengan gaji tertinggi ---------------------------- */
    const topKaryawan = [...kelompokkan(laporan, (l) => l.nama, (l) => l.jumlahHasil * l.upah)].sort((a, b) => b[1] - a[1])[0];

    /* 6. Insight otomatis ------------------------------------------ */
    const insight: { teks: string; tone: 'naik' | 'turun' | 'netral' }[] = [];
    if (komoditas[0]) {
      insight.push({ teks: `${komoditas[0].name} menjadi komoditas andalan dengan kontribusi ${persen(komoditas[0].pct)} dari total hasil panen.`, tone: 'netral' });
    }
    if (perubahan !== null) {
      insight.push({
        teks: `Hasil panen 7 hari terakhir ${perubahan >= 0 ? 'naik' : 'turun'} ${persen(Math.abs(perubahan))} dibanding 7 hari sebelumnya.`,
        tone: perubahan >= 0 ? 'naik' : 'turun',
      });
    } else if (tujuhHari > 0) {
      insight.push({ teks: `${angka(tujuhHari)} kg hasil panen tercatat dalam 7 hari terakhir.`, tone: 'naik' });
    }
    if (biayaPerKg !== null && totalGaji > 0) {
      insight.push({ teks: `Rata-rata biaya tenaga kerja ${rupiah(biayaPerKg)} untuk setiap kg hasil panen.`, tone: 'netral' });
    }
    if (biayaKomoditas.length > 1) {
      insight.push({ teks: `${biayaKomoditas[0].name} memiliki biaya tenaga kerja per kg paling tinggi (${rupiah(biayaKomoditas[0].perKg)}/kg).`, tone: 'turun' });
    }
    if (susut[0]) {
      insight.push({ teks: `Penyusutan terbesar saat pascapanen terjadi pada ${susut[0].name}, yaitu ${persen(susut[0].susut)} dari berat awal.`, tone: 'turun' });
    }
    if (topKaryawan) {
      insight.push({ teks: `${topKaryawan[0]} adalah karyawan dengan pendapatan tertinggi (${rupiah(topKaryawan[1])}).`, tone: 'netral' });
    }

    return { totalHasil, totalGaji, tren, tujuhHari, perubahan, komoditas, biayaPerKg, biayaKomoditas, susut, insight };
  }, [panen, pasca, laporan, now]);

  const a = analisis;

  // Filter grafik tren: 'Semua' atau nama komoditas
  const [filter, setFilter] = useState('Semua');
  const tampil = filter === 'Semua' ? a.komoditas : a.komoditas.filter((k) => k.name === filter);
  const perubahanTren = hitungPerubahan(a.tren, tampil.map((k) => k.name));

  return (
    <Shell title="Beranda" heading="Beranda" subtitle="Ringkasan dan analisis kegiatan kebun">
      {/* Banner sapaan */}
      {/* HP: satu baris sapaan + ringkasan singkat. Desktop: versi besar. */}
      <div className="relative mb-2 overflow-hidden rounded-lg bg-linear-to-br from-primary to-[#0a3f20] px-3 py-2 text-primary-foreground sm:mb-6 sm:rounded-2xl sm:p-8">
        <Sprout className="pointer-events-none absolute -right-3 -bottom-4 h-10 w-10 opacity-10 sm:-right-6 sm:-bottom-8 sm:h-48 sm:w-48" />
        {/* HP: sapaan + nama dalam satu baris */}
        <p className="text-xs font-semibold sm:text-sm sm:font-normal sm:opacity-80">
          {now ? sapaan(now.getHours()) : 'Selamat datang'},<span className="sm:hidden"> {nama} 👋</span>
        </p>
        <h3 className="hidden font-bold tracking-tight sm:mt-1 sm:block sm:text-3xl">{nama} 👋</h3>
        <p className="max-w-xl text-[10px] opacity-85 sm:mt-3 sm:text-sm sm:opacity-90">
          {a.tujuhHari > 0 ? `${angka(a.tujuhHari)} kg panen dalam 7 hari terakhir.` : 'Belum ada panen dalam 7 hari terakhir.'}
          <span className="hidden sm:inline"> Berikut ringkasan dan analisis datanya.</span>
        </p>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Hasil Panen" value={`${angka(a.totalHasil)} kg`} icon={BarChart3} />
        <StatCard label="Data Panen" value={String(panen.length)} icon={Sprout} />
        <StatCard label="Proses Pascapanen" value={String(pasca.length)} icon={Package} />
        <StatCard label="Total Gaji Karyawan" value={rupiah(a.totalGaji)} icon={Users} />
      </div>

      {/* Tren + komoditas */}
      <div className="mt-2 grid gap-2 sm:mt-6 sm:gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Tren Hasil Panen"
          desc={filter === 'Semua' ? 'Hasil panen per hari per komoditas, 30 hari terakhir' : `Hasil panen ${filter} per hari, 30 hari terakhir`}
          aside={
            perubahanTren !== null && (
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${perubahanTren >= 0 ? 'bg-accent text-accent-foreground' : 'bg-red-50 text-red-600'}`}>
                {perubahanTren >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {persen(Math.abs(perubahanTren))} vs 7 hari lalu
              </span>
            )
          }
        >
          {/* Tombol filter komoditas */}
          {a.komoditas.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1 sm:mb-4 sm:gap-2">
              {['Semua', ...a.komoditas.map((k) => k.name)].map((nama) => {
                const aktif = filter === nama;
                const warna = a.komoditas.find((k) => k.name === nama)?.warna;
                return (
                  <button
                    key={nama}
                    type="button"
                    onClick={() => setFilter(nama)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium sm:px-3 sm:py-1 sm:text-xs transition-colors ${aktif ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-accent'}`}
                  >
                    {warna && <span className="h-2 w-2 rounded-full" style={{ background: aktif ? 'currentColor' : warna }} />}
                    {nama}
                  </button>
                );
              })}
            </div>
          )}

          {now ? (
            <div className="h-32 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={a.tren} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="tanggal" tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" minTickGap={28} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} stroke="var(--muted-foreground)" unit=" kg" width={52} />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                    formatter={(v: number, nama: string) => [`${angka(v)} kg`, nama]}
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}
                  />
                  {tampil.map((k, i) => (
                    <Bar key={k.name} dataKey={k.name} stackId="panen" fill={k.warna} maxBarSize={28} radius={i === tampil.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-32 animate-pulse rounded-lg bg-muted sm:h-64" />
          )}
        </Panel>

        <Panel title="Kontribusi Komoditas" desc="Persentase dari total hasil panen">
          {a.komoditas.length === 0 ? (
            <Kosong teks="Belum ada data panen." />
          ) : (
            <div className="flex items-center gap-4 sm:block">
              <div className="relative h-20 w-20 shrink-0 sm:h-44 sm:w-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={a.komoditas} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none">
                      {a.komoditas.map((k) => (
                        <Cell key={k.name} fill={k.warna} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${angka(v)} kg`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-foreground sm:text-lg">{angka(a.totalHasil)}</span>
                  <span className="text-[10px] text-muted-foreground sm:text-xs">kg</span>
                </div>
              </div>
              <ul className="flex-1 space-y-1 sm:mt-4 sm:space-y-2">
                {a.komoditas.map((k) => (
                  <li key={k.name} className="flex items-center justify-between gap-2 text-[11px] sm:text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <span className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5" style={{ background: k.warna }} />
                      {k.name}
                    </span>
                    <span className="font-semibold text-foreground">{persen(k.pct)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* Insight + biaya + susut */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-4 lg:grid-cols-3">
        <Panel className="col-span-2 lg:col-span-1" title="Insight Otomatis" desc="Disusun dari data terbaru" icon={Lightbulb}>
          {a.insight.length === 0 ? (
            <Kosong teks="Tambahkan data untuk melihat insight." />
          ) : (
            <ul className="space-y-1.5 sm:space-y-3">
              {a.insight.map((ins, i) => (
                <li key={i} className="flex gap-2 text-[10px] leading-snug text-foreground sm:gap-3 sm:text-sm sm:leading-relaxed">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full sm:mt-1.5 sm:h-2 sm:w-2 ${ins.tone === 'naik' ? 'bg-primary' : ins.tone === 'turun' ? 'bg-amber-500' : 'bg-muted-foreground/50'}`} />
                  {ins.teks}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Biaya Tenaga Kerja per Kg" desc="Total gaji ÷ total hasil panen" icon={Wallet}>
          {a.biayaPerKg === null ? (
            <Kosong teks="Belum ada data panen." />
          ) : (
            <>
              <p className="text-sm font-bold tracking-tight whitespace-nowrap text-foreground sm:text-3xl">
                {rupiah(a.biayaPerKg)}
                <span className="ml-0.5 text-[10px] font-medium text-muted-foreground sm:ml-1 sm:text-sm">/kg</span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
                {rupiah(a.totalGaji)} ÷ {angka(a.totalHasil)} kg
              </p>
              {a.biayaKomoditas.length > 0 && (
                <ul className="mt-2 space-y-1.5 border-t border-border pt-2 sm:mt-5 sm:space-y-3 sm:pt-4">
                  {a.biayaKomoditas.map((k) => (
                    <li key={k.name} className="flex flex-col text-[10px] leading-tight sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:text-sm">
                      <span className="text-muted-foreground">{k.name}</span>
                      <span className="text-[11px] font-semibold text-foreground sm:text-sm">{rupiah(k.perKg)}/kg</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Panel>

        <Panel title="Penyusutan Pascapanen" desc="Berat yang hilang dari berat masuk ke keluar" icon={Scale}>
          {a.susut.length === 0 ? (
            <Kosong teks="Belum ada data pascapanen." />
          ) : (
            <ul className="space-y-2 sm:space-y-4">
              {a.susut.map((s) => (
                <li key={s.name}>
                  <div className="mb-0.5 flex items-center justify-between text-[10px] sm:mb-1.5 sm:text-sm">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="font-semibold text-amber-600">{persen(s.susut)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted sm:h-2">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, Math.max(0, s.susut))}%` }} />
                  </div>
                  <p className="mt-0.5 text-[9px] text-muted-foreground sm:mt-1 sm:text-xs">
                    {angka(s.masuk)} kg → {angka(s.keluar)} kg
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Komponen kecil                                                      */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  desc,
  icon: Icon,
  aside,
  className = '',
  children,
}: {
  title: string;
  desc?: string;
  icon?: React.ComponentType<{ className?: string }>;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card p-2.5 sm:rounded-xl sm:p-5 ${className}`}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-1.5 sm:mb-4 sm:gap-3">
        <div className="flex items-start gap-2.5 sm:gap-3">
          {Icon && (
            <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent sm:flex sm:h-9 sm:w-9 sm:rounded-lg text-accent-foreground">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div>
            <h3 className="text-[11px] leading-tight font-bold text-foreground sm:text-base">{title}</h3>
            {desc && <p className="hidden text-xs text-muted-foreground sm:block">{desc}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Kosong({ teks }: { teks: string }) {
  return <p className="py-4 text-center text-[11px] text-muted-foreground sm:py-8 sm:text-sm">{teks}</p>;
}