import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Percent, Scale, Plus } from "lucide-react";
import { Badge, Shell, StatCard } from "@/components/shell";
import { EditedLink, Field, KeteranganEdit, Modal, RiwayatDialog, RowActions, Table } from "@/components/data-form";
import { buatRiwayat, useCollection, type Pascapanen } from "@/lib/store";

export const Route = createFileRoute("/pascapanen")({
  head: () => ({
    meta: [
      { title: "Data Pascapanen — Perkebunan" },
      { name: "description", content: "Pantau proses pengeringan, sortasi, dan pengemasan hasil panen." },
      { property: "og:title", content: "Data Pascapanen — Perkebunan" },
      {
        property: "og:description",
        content: "Pantau proses pengeringan, sortasi, dan pengemasan hasil panen.",
      },
    ],
  }),
  component: PascapanenPage,
});

const KOMODITAS = ["Cengkeh", "Kopi", "Kakao"];
const PROSES = ["Pengeringan", "Sortasi", "Pengemasan", "Penyimpanan"];
const STATUS = ["Proses", "Selesai"];
const LABEL: Record<string, string> = {
  komoditas: "Komoditas",
  tanggal: "Tanggal",
  proses: "Proses",
  beratMasuk: "Berat Masuk (kg)",
  beratKeluar: "Berat Keluar (kg)",
  status: "Status",
};

function PascapanenPage() {
  const { items, add, update, remove } = useCollection<Pascapanen>("pascapanen");
  const [filter, setFilter] = useState("Semua");
  const [editing, setEditing] = useState<Pascapanen | null>(null);
  const [open, setOpen] = useState(false);
  const [riwayat, setRiwayat] = useState<Pascapanen | null>(null);

  const masuk = items.reduce((s, i) => s + i.beratMasuk, 0);
  const keluar = items.reduce((s, i) => s + i.beratKeluar, 0);
  const rendemen = masuk ? ((keluar / masuk) * 100).toFixed(1) : "0.0";

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      komoditas: String(f.get("komoditas")),
      tanggal: String(f.get("tanggal")),
      proses: String(f.get("proses")),
      beratMasuk: Number(f.get("beratMasuk")),
      beratKeluar: Number(f.get("beratKeluar")),
      status: String(f.get("status")),
    };
    if (editing) {
      const log = buatRiwayat(editing, data, LABEL, editing.riwayat, String(f.get("keterangan") ?? "").trim());
      update(editing.id, { ...data, riwayat: log });
    } else add({ ...data, riwayat: [] });
    setOpen(false);
    setEditing(null);
  };

  return (
    <Shell
      title="Data Pascapanen"
      heading="Data Pascapanen"
      subtitle="Kelola proses setelah panen hingga siap jual"
      action={
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Pascapanen
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Proses" value={String(items.length)} icon={Package} />
        <StatCard label="Berat Keluar" value={`${keluar} kg`} icon={Scale} />
        <StatCard label="Rendemen" value={`${rendemen}%`} icon={Percent} />
      </div>

      <div className="my-6 flex flex-wrap gap-2">
        {["Semua", ...KOMODITAS].map((j) => (
          <button
            key={j}
            onClick={() => setFilter(j)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === j
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {j}
          </button>
        ))}
      </div>

      <div>
        <Table
          head={["Komoditas", "Tanggal", "Proses", "Berat Masuk", "Berat Keluar", "Status", "Aksi", "Keterangan"]}
        >
          {items.filter((i) => filter === "Semua" || i.komoditas === filter).map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-5 py-3.5 font-medium text-foreground">{r.komoditas}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{r.tanggal}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{r.proses}</td>
              <td className="px-5 py-3.5 text-muted-foreground">{r.beratMasuk} kg</td>
              <td className="px-5 py-3.5">
                <Badge>{r.beratKeluar} kg</Badge>
              </td>
              <td className="px-5 py-3.5">
                <Badge tone="blue">{r.status}</Badge>
              </td>
              <td className="px-5 py-3.5">
                <RowActions
                  onEdit={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                  onDelete={() => remove(r.id)}
                />
              </td>
              <td className="px-5 py-3.5">
                <EditedLink riwayat={r.riwayat} onClick={() => setRiwayat(r)} />
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                Belum ada data pascapanen.
              </td>
            </tr>
          )}
        </Table>
      </div>

      <Modal
        open={open}
        title={editing ? "Edit Pascapanen" : "Tambah Pascapanen"}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
      >
        <Field label="Komoditas" name="komoditas" options={KOMODITAS} defaultValue={editing?.komoditas} />
        <Field label="Tanggal" name="tanggal" type="date" defaultValue={editing?.tanggal} />
        <Field label="Proses" name="proses" options={PROSES} defaultValue={editing?.proses} />
        <Field label="Status" name="status" options={STATUS} defaultValue={editing?.status} />
        <Field label="Berat Masuk (kg)" name="beratMasuk" type="number" defaultValue={editing?.beratMasuk ?? 0} />
        <Field
          label="Berat Keluar (kg)"
          name="beratKeluar"
          type="number"
          defaultValue={editing?.beratKeluar ?? 0}
        />
        {editing && <KeteranganEdit />}
      </Modal>

      {riwayat && (
        <RiwayatDialog subtitle={riwayat.komoditas} riwayat={riwayat.riwayat ?? []} onClose={() => setRiwayat(null)} />
      )}
    </Shell>
  );
}
