import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Users, Sprout, Package, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { tanggalPanjang } from '@/lib/store';

const nav = [
  { to: '/', label: 'Beranda', icon: LayoutDashboard },
  { to: '/panen', label: 'Data Panen', icon: Sprout },
  { to: '/pascapanen', label: 'Data Pascapanen', icon: Package },
  { to: '/laporan', label: 'Laporan Karyawan', icon: Users },
] as const;

export function Shell({ title, heading, subtitle, action, children }: { title: string; heading: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [today, setToday] = useState('');
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setToday(tanggalPanjang(new Date())), []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`${open ? 'w-64' : 'w-16'} sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 sm:flex`}>
        <div className="flex h-16 items-center justify-between px-4">
          {open && <span className="text-base font-bold tracking-tight text-sidebar-foreground">Perkebunan</span>}
          <button onClick={() => setOpen((o) => !o)} aria-label="Ubah lebar menu" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent">
            {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {nav.map((item) => {
            const active = item.to === '/' ? path === '/' : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {open && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {open && (
          <div className="border-t border-border px-5 py-4">
            <p className="text-sm font-semibold text-sidebar-foreground">admin</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
          <span className="text-xs text-muted-foreground">{today}</span>
        </header>

        <main className="flex-1 p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{heading}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {action}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'blue' }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone === 'green' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`}>{children}</span>;
}
