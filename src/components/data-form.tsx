import { useEffect, useRef, useState, type ReactNode } from "react";
import { DayPicker } from "react-day-picker";
import { id } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { CalendarRange, ChevronDown, Filter, X } from "lucide-react";
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

  // Kunci scroll halaman di belakang modal
  useEffect(() => {
    if (!open) return;
    const sebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = sebelumnya;
    };
  }, [open]);

  if (!open) return null;

  return (
    // Di HP: muncul dari bawah (bottom sheet). Di desktop: di tengah layar.
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-4">
      <div
        ref={ref}
        className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[90vh] sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2 sm:border-0 sm:px-6 sm:pt-6 sm:pb-0">
          <h3 className="text-[13px] font-bold text-foreground sm:text-lg">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-md p-1 text-muted-foreground hover:text-foreground sm:hidden">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* Bagian isian yang bisa di-scroll (2 kolom, di HP juga) */}
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-2 gap-y-2 overflow-y-auto px-3 py-2 sm:gap-4 sm:px-6 sm:pt-5 sm:pb-2">{children}</div>
          {/* Tombol di luar area scroll, jadi tidak ada isian yang tembus di bawahnya */}
          <div className="flex gap-2 border-t border-border px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:justify-end sm:border-0 sm:px-6 sm:pt-2 sm:pb-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary sm:flex-none sm:px-4 sm:py-2 sm:text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none sm:px-4 sm:py-2 sm:text-sm"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Date -> 'YYYY-MM-DD' (zona waktu lokal)
const kunciTanggal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const hariIni = () => kunciTanggal(new Date());

// Tanggal n hari sebelum hari ini
const hariLalu = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return kunciTanggal(d);
};

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  options,
  full,
  error,
  integer,
  placeholder,
  required = true,
  onChange,
}: {
  label: string;
  name: string;
  type?: string | undefined;
  defaultValue?: string | number | undefined;
  options?: string[] | undefined;
  full?: boolean | undefined;
  /** Pesan error yang ditampilkan di bawah input */
  error?: string | undefined;
  /** Untuk input angka: hanya boleh bilangan bulat (tanpa koma) */
  integer?: boolean | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  onChange?: (() => void) | undefined;
}) {
  const isDate = type === "date";
  const isNumber = type === "number";
  const cls = `mt-0.5 h-8 w-full min-w-0 rounded-md border bg-background px-2 py-1 text-xs leading-tight text-foreground outline-none sm:mt-1.5 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm ${
    error ? "border-destructive focus:border-destructive" : "border-input focus:border-ring"
  }`;

  // Tolak karakter minus, plus, dan 'e' di input angka (dan koma/titik jika bilangan bulat)
  const blokirKarakter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const terlarang = integer ? ["-", "+", "e", "E", ".", ","] : ["-", "+", "e", "E"];
    if (terlarang.includes(e.key)) e.preventDefault();
  };
  return (
    <label className={`block min-w-0 text-[10px] font-medium text-foreground sm:text-sm ${full ? "col-span-full" : ""}`}>
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
          step={isNumber ? (integer ? "1" : "any") : undefined}
          inputMode={isNumber ? (integer ? "numeric" : "decimal") : undefined}
          defaultValue={isDate ? defaultValue || hariIni() : defaultValue}
          readOnly={isDate}
          placeholder={placeholder}
          title={isDate ? "Tanggal terisi otomatis sesuai hari ini" : undefined}
          className={isDate ? `${cls} cursor-not-allowed bg-secondary/60` : cls}
          onKeyDown={isNumber ? blokirKarakter : undefined}
          onWheel={isNumber ? (e) => e.currentTarget.blur() : undefined}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          required={required}
        />
      )}
      {isDate && <span className="mt-0.5 block text-[9px] font-normal text-muted-foreground sm:mt-1 sm:text-xs">Terisi otomatis</span>}
      {error && <span className="mt-0.5 block text-[10px] leading-tight font-medium text-destructive sm:mt-1 sm:text-xs">{error}</span>}
    </label>
  );
}

/**
 * Di layar HP (< 640px) tabel tetap berbentuk tabel seperti desktop, tapi versi mini:
 * huruf & jarak diperkecil, kolom pertama menempel di kiri saat tabel digeser ke samping.
 */
const CSS_TABEL_HP = `
@media (max-width: 639px) {
  .tabel-hp { font-size: 11px; }
  .tabel-hp th, .tabel-hp td { padding: 0.5rem 0.625rem !important; white-space: nowrap; }
  .tabel-hp th { font-size: 10px; }
  .tabel-hp td :is(span, button) { font-size: 10px; }
  .tabel-hp td > span { padding: 0.0625rem 0.4375rem; }
  /* Kolom pertama (mis. Jenis Tanaman) tetap terlihat saat digeser */
  .tabel-hp th:first-child, .tabel-hp td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    box-shadow: 1px 0 0 var(--border);
  }
  .tabel-hp td:first-child { background: var(--card); font-weight: 600; }
  .tabel-hp th:first-child { background: color-mix(in oklab, var(--secondary) 60%, var(--card)); }
}
`;

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <style>{CSS_TABEL_HP}</style>
      <table className="tabel-hp w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/60">
            {head.map((h) => (
              <th key={h} className="px-5 py-3 text-left text-xs font-semibold whitespace-nowrap text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground sm:hidden">Geser tabel ke samping untuk melihat semua kolom →</p>
    </div>
  );
}

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2.5 text-xs font-semibold sm:gap-3">
      <button onClick={onEdit} className="text-primary hover:underline">
        Edit
      </button>
      <button onClick={onDelete} className="text-destructive hover:underline">
        Hapus
      </button>
    </div>
  );
}

/**
 * Validasi keterangan edit:
 * - wajib diisi, hanya huruf dan spasi di antara kata
 * - minimal 5 huruf (spasi tidak dihitung)
 * - tidak boleh huruf berulang (aaa), pola berulang (asasas), atau kata tanpa huruf vokal (sdfgh)
 * Mengembalikan pesan error, atau null kalau valid.
 */
export function validasiKeterangan(nilai: string): string | null {
  const teks = nilai.trim().replace(/\s+/g, " ");
  const huruf = teks.replace(/ /g, "");

  if (teks === "") return "Keterangan edit wajib diisi.";
  if (!/^[A-Za-z ]+$/.test(teks)) return "Keterangan hanya boleh berisi huruf, tanpa angka atau simbol.";
  if (huruf.length < 5) return "Keterangan minimal 5 huruf.";
  if (/([A-Za-z])\1\1/i.test(huruf)) return "Keterangan tidak boleh berisi huruf berulang seperti \"aaa\".";
  if (/([a-z]{2,4})\1{2,}/i.test(huruf)) return "Keterangan tidak boleh berisi pola berulang seperti \"asasas\".";
  if (new Set(huruf.toLowerCase()).size < 3) return "Keterangan terlihat tidak bermakna, tulis alasan yang jelas.";
  const kataAneh = teks.split(" ").find((k) => k.length >= 4 && !/[aiueo]/i.test(k));
  if (kataAneh) return `Kata "${kataAneh}" tidak dikenali, tulis alasan yang jelas.`;

  return null;
}

/** Merapikan keterangan sebelum disimpan (hapus spasi berlebih) */
export const rapikanKeterangan = (nilai: string) => nilai.trim().replace(/\s+/g, " ");

export function KeteranganEdit({
  error,
  onChange,
  validasiBrowser = true,
}: {
  error?: string | undefined;
  onChange?: (() => void) | undefined;
  /** true = pakai validasi bawaan browser (halaman yang belum memakai validasiKeterangan) */
  validasiBrowser?: boolean | undefined;
} = {}) {
  return (
    <label className="col-span-full block text-[10px] font-medium text-foreground sm:text-sm">
      Keterangan Edit (wajib)
      <textarea
        name="keterangan"
        required={validasiBrowser}
        minLength={validasiBrowser ? 3 : undefined}
        rows={2}
        placeholder="Contoh: salah input jumlah hasil panen"
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        className={`mt-0.5 w-full rounded-md border bg-background px-2 py-1 text-xs leading-snug text-foreground outline-none sm:mt-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm ${
          error ? "border-destructive focus:border-destructive" : "border-input focus:border-ring"
        }`}
      />
      {error ? (
        <span className="mt-0.5 block text-[10px] font-medium sm:mt-1 sm:text-xs text-destructive">{error}</span>
      ) : (
        !validasiBrowser && <span className="mt-0.5 block text-[10px] font-normal sm:mt-1 sm:text-xs text-muted-foreground">Hanya huruf, minimal 5 huruf.</span>
      )}
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

/* ------------------------------------------------------------------ */
/* Filter                                                              */
/* ------------------------------------------------------------------ */

export type Rentang = "terbaru" | "30" | "7" | "custom";
export type FilterWaktu = { rentang: Rentang; dari: string; sampai: string };
export const FILTER_WAKTU_AWAL: FilterWaktu = { rentang: "terbaru", dari: "", sampai: "" };

const PILIHAN_RENTANG: { value: Rentang; label: string }[] = [
  { value: "terbaru", label: "Terbaru" },
  { value: "30", label: "30 hari terakhir" },
  { value: "7", label: "7 hari terakhir" },
  { value: "custom", label: "Custom" },
];

/**
 * Menyaring data berdasarkan rentang waktu, lalu mengurutkan dari tanggal terbaru.
 * - terbaru : semua data
 * - 30 / 7  : data N hari terakhir (termasuk hari ini)
 * - custom  : data antara tanggal "dari" dan "sampai"
 */
export function saringWaktu<T extends { tanggal: string }>(items: T[], f: FilterWaktu): T[] {
  const tgl = (t: string) => t.slice(0, 10);
  let hasil = items;

  if (f.rentang === "30" || f.rentang === "7") {
    const batas = hariLalu(Number(f.rentang) - 1);
    hasil = items.filter((i) => tgl(i.tanggal) >= batas);
  } else if (f.rentang === "custom") {
    hasil = items.filter((i) => (!f.dari || tgl(i.tanggal) >= f.dari) && (!f.sampai || tgl(i.tanggal) <= f.sampai));
  }

  return [...hasil].sort((a, b) => tgl(b.tanggal).localeCompare(tgl(a.tanggal)));
}

/** Dropdown kecil dengan ikon di kiri dan panah di kanan */
function DropdownFilter({
  icon: Icon,
  label,
  value,
  onChange,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
      <Icon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-border bg-card pr-7 pl-8 text-xs font-medium text-foreground outline-none focus:border-ring sm:h-9 sm:text-sm"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

// 'YYYY-MM-DD' -> Date (zona waktu lokal)
const keDate = (s: string) => (s ? new Date(`${s}T00:00:00`) : undefined);

const formatPendek = (s: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${s}T00:00:00`));

// Warna & ukuran kalender disesuaikan dengan tema hijau aplikasi
const TEMA_KALENDER = {
  "--rdp-accent-color": "var(--primary)",
  "--rdp-accent-background-color": "var(--accent)",
  "--rdp-range_middle-color": "var(--accent-foreground)",
  "--rdp-day-height": "28px",
  "--rdp-day-width": "30px",
  "--rdp-day_button-height": "26px",
  "--rdp-day_button-width": "26px",
  "--rdp-nav-height": "1.75rem",
  "--rdp-nav_button-height": "1.5rem",
  "--rdp-nav_button-width": "1.5rem",
  "--rdp-weekday-padding": "0.25rem 0",
  fontSize: "11px",
} as React.CSSProperties;

// Judul bulan & panah navigasi diperkecil
const CSS_KALENDER = `
.kalender-mini .rdp-caption_label { font-size: 12px; font-weight: 700; }
.kalender-mini .rdp-chevron { width: 14px; height: 14px; }
.kalender-mini .rdp-weekday { font-size: 10px; }
.kalender-mini .rdp-selected { font-size: 11px; }
`;

/** Baris filter: dropdown kategori + dropdown rentang waktu (+ kalender untuk Custom) */
export function FilterBar({
  pilihan,
  kategori,
  onKategori,
  waktu,
  onWaktu,
  labelKategori = "Komoditas",
}: {
  pilihan: string[];
  kategori: string;
  onKategori: (v: string) => void;
  waktu: FilterWaktu;
  onWaktu: (v: FilterWaktu) => void;
  labelKategori?: string;
}) {
  const [kalenderTerbuka, setKalenderTerbuka] = useState(false);
  const isCustom = waktu.rentang === "custom";

  // Klik 1 = tanggal awal, klik 2 = tanggal akhir, klik berikutnya = mulai rentang baru
  const pilihTanggal = (tanggal: Date, modifiers: { disabled?: boolean }) => {
    if (modifiers.disabled) return;
    const t = kunciTanggal(tanggal);
    const sedangMemilihAkhir = waktu.dari && waktu.dari === waktu.sampai;

    if (!sedangMemilihAkhir) {
      onWaktu({ ...waktu, dari: t, sampai: t });
    } else if (t < waktu.dari) {
      onWaktu({ ...waktu, dari: t, sampai: waktu.dari });
    } else {
      onWaktu({ ...waktu, sampai: t });
    }
  };

  const ringkasan = !waktu.dari
    ? "Pilih tanggal"
    : waktu.dari === waktu.sampai
      ? formatPendek(waktu.dari)
      : `${formatPendek(waktu.dari)} – ${formatPendek(waktu.sampai)}`;

  return (
    <div className="my-3 space-y-2 sm:my-6">
      <div className="flex gap-2">
        <DropdownFilter icon={Filter} label={labelKategori} value={kategori} onChange={onKategori}>
          <option value="Semua">Semua {labelKategori.toLowerCase()}</option>
          {pilihan.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </DropdownFilter>

        <DropdownFilter
          icon={CalendarRange}
          label="Rentang waktu"
          value={waktu.rentang}
          onChange={(v) => {
            const rentang = v as Rentang;
            if (rentang === "custom") {
              // Mulai dari kosong & langsung buka kalender
              onWaktu({ rentang, dari: "", sampai: "" });
              setKalenderTerbuka(true);
            } else {
              onWaktu({ rentang, dari: "", sampai: "" });
              setKalenderTerbuka(false);
            }
          }}
        >
          {PILIHAN_RENTANG.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </DropdownFilter>
      </div>

      {isCustom && (
        <div className="sm:max-w-sm">
          {/* Ringkasan tanggal terpilih, klik untuk buka/tutup kalender */}
          <button
            type="button"
            onClick={() => setKalenderTerbuka((v) => !v)}
            className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-primary/40 bg-accent/40 px-2.5 text-xs font-medium text-foreground sm:h-9 sm:text-sm"
          >
            <span className="flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-primary" />
              {ringkasan}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${kalenderTerbuka ? "rotate-180" : ""}`} />
          </button>

          {kalenderTerbuka && (
            <div className="mt-1.5 rounded-lg border border-border bg-card p-1.5 shadow-sm sm:w-fit">
              <style>{CSS_KALENDER}</style>
              <div className="kalender-mini flex justify-center">
                <DayPicker
                  mode="range"
                  locale={id}
                  selected={{ from: keDate(waktu.dari), to: keDate(waktu.sampai) }}
                  onDayClick={pilihTanggal}
                  disabled={{ after: new Date() }}
                  defaultMonth={keDate(waktu.dari) ?? new Date()}
                  style={TEMA_KALENDER}
                />
              </div>
              <p className="px-1 pb-1 text-center text-[9px] text-muted-foreground sm:text-[11px]">
                {!waktu.dari ? "Klik tanggal awal" : waktu.dari === waktu.sampai ? "Klik tanggal akhir (atau Selesai untuk 1 hari)" : "Rentang dipilih"}
              </p>
              <div className="flex gap-1.5 border-t border-border px-0.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => onWaktu({ ...waktu, dari: "", sampai: "" })}
                  className="flex-1 rounded-md border border-border py-1 text-[11px] font-medium text-foreground hover:bg-secondary"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setKalenderTerbuka(false)}
                  disabled={!waktu.dari}
                  className="flex-1 rounded-md bg-primary py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Selesai
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}