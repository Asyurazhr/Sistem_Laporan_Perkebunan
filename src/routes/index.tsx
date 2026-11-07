import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Package, Sprout, Users } from "lucide-react";
import { Shell, StatCard } from "@/components/shell";
import { rupiah, useCollection, type Laporan, type Panen, type Pascapanen } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beranda — Sistem Perkebunan" },
      {
        name: "description",
        content: "Ringkasan data panen, pascapanen, dan laporan karyawan perkebunan.",
      },
      { property: "og:title", content: "Beranda — Sistem Perkebunan" },
      {
        property: "og:description",
        content: "Ringkasan data panen, pascapanen, dan laporan karyawan perkebunan.",
      },
    ],
  }),
  component: Index,
});

const menu = [
  { to: "/panen", label: "Data Panen", desc: "Catat hasil panen setiap musim", icon: Sprout },
  { to: "/pascapanen", label: "Data Pascapanen", desc: "Proses hingga siap jual", icon: Package },
  { to: "/laporan", label: "Laporan Karyawan", desc: "Hasil kerja dan gaji", icon: Users },
] as const;

function Index() {
  const panen = useCollection<Panen>("panen").items;
  const pasca = useCollection<Pascapanen>("pascapanen").items;
  const laporan = useCollection<Laporan>("laporan").items;

  const totalHasil = panen.reduce((s, i) => s + i.totalHasil, 0);
  const totalGaji = laporan.reduce((s, i) => s + i.jumlahHasil * i.upah, 0);

  return (
    <Shell
      title="Beranda"
      heading="Beranda"
      subtitle="Ringkasan kegiatan kebun hari ini"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Hasil Panen" value={`${totalHasil} kg`} icon={BarChart3} />
        <StatCard label="Data Panen" value={String(panen.length)} icon={Sprout} />
        <StatCard label="Proses Pascapanen" value={String(pasca.length)} icon={Package} />
        <StatCard label="Total Gaji Karyawan" value={rupiah(totalGaji)} icon={Users} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {menu.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <m.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-bold text-foreground group-hover:text-primary">{m.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
