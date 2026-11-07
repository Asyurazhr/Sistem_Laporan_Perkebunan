import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Riwayat } from "@/lib/store";

export function Modal({
  open,
  title,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div ref={ref} className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          {children}
          <div className="col-span-full mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const hariIni = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  options,
  full,
}: {
  label: string;
  name: string;
  type?: string | undefined;
  defaultValue?: string | number | undefined;
  options?: string[] | undefined;
  full?: boolean | undefined;
}) {
  const isDate = type === "date";
  const cls =
    "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring";
  return (
    <label className={`block text-sm font-medium text-foreground ${full ? "col-span-full" : ""}`}>
      {label}
      {options ? (
        <select name={name} defaultValue={defaultValue as string} className={cls} required>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          step={type === "number" ? "any" : undefined}
          defaultValue={isDate ? defaultValue || hariIni() : defaultValue}
          readOnly={isDate}
          title={isDate ? "Tanggal terisi otomatis sesuai hari ini" : undefined}
          className={isDate ? `${cls} cursor-not-allowed bg-secondary/60` : cls}
          required
        />
      )}
      {isDate && <span className="mt-1 block text-xs font-normal text-muted-foreground">Terisi otomatis (real-time)</span>}
    </label>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/60">
            {head.map((h) => (
              <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-3 text-xs font-semibold">
      <button onClick={onEdit} className="text-primary hover:underline">
        Edit
      </button>
      <button onClick={onDelete} className="text-destructive hover:underline">
        Hapus
      </button>
    </div>
  );
}

export function KeteranganEdit() {
  return (
    <label className="col-span-full block text-sm font-medium text-foreground">
      Keterangan Edit (wajib)
      <textarea
        name="keterangan"
        required
        minLength={3}
        rows={3}
        placeholder="Jelaskan alasan perubahan data ini"
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
      />
    </label>
  );
}

const waktu = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(iso));

export function EditedLink({ riwayat, onClick }: { riwayat?: Riwayat[] | undefined; onClick: () => void }) {
  return riwayat?.length ? (
    <button onClick={onClick} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
      Edited ({riwayat.length}×)
    </button>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  );
}

export function RiwayatDialog({
  subtitle,
  riwayat,
  onClose,
}: {
  subtitle: string;
  riwayat: Riwayat[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Riwayat Edit</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          {[...riwayat].reverse().map((h, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold text-primary">Diedit {waktu(h.waktu)}</p>
              {h.keterangan && (
                <p className="mt-1 text-sm text-foreground">
                  <span className="font-medium">Keterangan:</span> {h.keterangan}
                </p>
              )}
              <ul className="mt-2 space-y-1.5 text-sm">
                {h.perubahan.map((p, j) => (
                  <li key={j} className="text-foreground">
                    <span className="font-medium">{p.field}:</span>{" "}
                    <span className="text-destructive line-through">{p.sebelum}</span>
                    {" → "}
                    <span className="font-semibold">{p.sesudah}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
