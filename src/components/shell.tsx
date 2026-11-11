import { Link, useRouterState } from '@tanstack/react-router';
import { CalendarDays, LayoutDashboard, Users, Sprout, Package, MapPin, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { tanggalPanjang } from '@/lib/store';
import { SidebarUser, LogoutButton } from '@/components/logout-button';

const nav = [
  { to: '/', label: 'Beranda', short: 'Beranda', icon: LayoutDashboard },
  { to: '/panen', label: 'Data Panen', short: 'Panen', icon: Sprout },
  { to: '/pascapanen', label: 'Data Pascapanen', short: 'Pascapanen', icon: Package },
  { to: '/laporan', label: 'Laporan Karyawan', short: 'Laporan', icon: Users },
  { to: '/lokasi', label: 'Lokasi Perkebunan', short: 'Lokasi', icon: MapPin },
] as const;

export function Shell({ title, heading, subtitle, action, children }: { title: string; heading: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [today, setToday] = useState('');
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setToday(tanggalPanjang(new Date())), []);

  const isActive = (to: string) => (to === '/' ? path === '/' : path.startsWith(to));

  return (
    <div className="flex min-h-screen bg-background">
      {/* ===== Sidebar (tablet & desktop) ===== */}
      <aside className={`${open ? 'w-64' : 'w-16'} sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 sm:flex`}>
        <div className="flex h-16 items-center justify-between px-4">
          {open && <span className="text-base font-bold tracking-tight text-sidebar-foreground">Perkebunan</span>}
          <button onClick={() => setOpen((o) => !o)} aria-label="Ubah lebar menu" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent">
            {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={open ? undefined : item.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive(item.to) ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {open && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <SidebarUser collapsed={!open} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ===== Header ===== */}
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Logo kecil hanya di HP, karena sidebar tidak tampil */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground sm:hidden">
              <Sprout className="h-3.5 w-3.5" />
            </span>
            <h1 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-lg">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="hidden text-xs text-muted-foreground sm:inline">{today}</span>
            {/* Di HP sidebar tidak tampil, jadi tombol logout ada di header */}
            <LogoutButton className="sm:hidden" />
          </div>
        </header>

        {/* pb-24 memberi ruang untuk menu bawah di HP */}
        <main className="flex-1 px-3 pt-2.5 pb-16 sm:p-6">
          <div className="mb-2.5 flex items-center justify-between gap-2 sm:mb-6 sm:items-start sm:gap-4">
            {/* Desktop: judul besar + deskripsi */}
            <div className="hidden min-w-0 sm:block">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{heading}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {/* HP: deskripsi & tanggal di dalam kotak (judul sudah ada di header) */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 sm:hidden">
              <span className="h-7 w-1 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="text-[11px] leading-snug font-medium text-foreground">{subtitle}</p>
                {today && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    {today}
                  </p>
                )}
              </div>
            </div>
            {/* Di HP tombol aksi (mis. "Tambah Panen") hanya berupa tombol bulat "+" di kanan */}
            {action && (
              <div className="shrink-0 max-sm:[&>button]:h-8 max-sm:[&>button]:w-8 max-sm:[&>button]:justify-center max-sm:[&>button]:gap-0 max-sm:[&>button]:rounded-full max-sm:[&>button]:p-0 max-sm:[&>button]:text-[0px] max-sm:[&>button]:shadow-sm max-sm:[&_svg]:h-4 max-sm:[&_svg]:w-4">
                {action}
              </div>
            )}
          </div>
          {children}
        </main>
      </div>

      {/* ===== Menu bawah (khusus HP) ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-5">
          {nav.map((item) => {
            const active = isActive(item.to);
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <span className={`flex h-6 w-11 items-center justify-center rounded-full transition-colors ${active ? 'bg-accent' : ''}`}>
                  <item.icon className="h-4 w-4" />
                </span>
                {item.short}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  // HP: kartu mini (ikon kecil sebaris dengan label, angka di bawahnya). Desktop: ukuran normal.
  return (
    <div className="rounded-lg border border-border bg-card px-2 py-1.5 sm:flex sm:items-center sm:gap-4 sm:rounded-xl sm:p-5">
      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground sm:flex">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] leading-tight text-muted-foreground sm:truncate sm:text-xs">{label}</p>
        <p className="mt-0.5 text-[11px] leading-tight font-semibold break-words text-foreground sm:truncate sm:text-xl sm:font-bold">{value}</p>
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'blue' }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tone === 'green' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`}>{children}</span>;
}
