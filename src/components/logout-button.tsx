import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth';

/** Tombol ikon logout dengan dialog konfirmasi */
export function LogoutButton({ className = '' }: { className?: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
    navigate({ to: '/login', replace: true });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          title="Keluar"
          aria-label="Keluar"
          className={`rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 ${className}`}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
          <AlertDialogDescription>Kamu perlu login lagi untuk mengakses data perkebunan.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} disabled={loading} className="bg-red-600 text-white hover:bg-red-700">
            {loading ? 'Keluar...' : 'Keluar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Bagian bawah sidebar: nama admin + tombol logout */
export function SidebarUser({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useAuth();
  const name = (user?.user_metadata?.name as string | undefined) ?? user?.email?.split('@')[0] ?? 'admin';

  if (collapsed) {
    return (
      <div className="flex justify-center border-t border-border py-4">
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sidebar-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">Admin</p>
      </div>
      <LogoutButton />
    </div>
  );
}