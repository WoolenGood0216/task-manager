
"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "Belum dimulai" | "Dikerjakan" | "Selesai";
type Priority = "Rendah" | "Sedang" | "Tinggi";

type Task = {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  createdAt: number;
  category?: string;
  url?: string;
};

const statuses: Status[] = ["Belum dimulai", "Dikerjakan", "Selesai"];
const priorities: Priority[] = ["Rendah", "Sedang", "Tinggi"];
const categories = ["Sekolah", "Proyek", "Pribadi", "Lainnya"];

const priorityColors: Record<Priority, string> = {
  Rendah: "bg-slate-100 text-slate-700",
  Sedang: "bg-amber-100 text-amber-800",
  Tinggi: "bg-rose-100 text-rose-800",
};

const emptyForm = {
  title: "",
  description: "",
  status: "Belum dimulai" as Status,
  priority: "Sedang" as Priority,
  dueDate: "",
  category: "Pribadi",
  url: "",
};

function validUrl(value: string): boolean {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Task>;

  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.description === "string" &&
    statuses.includes(item.status as Status) &&
    priorities.includes(item.priority as Priority) &&
    typeof item.dueDate === "string" &&
    typeof item.createdAt === "number" &&
    (item.url === undefined || typeof item.url === "string") &&
    (item.category === undefined || typeof item.category === "string")
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [sort, setSort] = useState("Tenggat");
  const [showForm, setShowForm] = useState(false);
  const [dark, setDark] = useState(false);
  const [notice, setNotice] = useState("");
  const [importKey, setImportKey] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("task-manager-v1");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTasks(parsed.filter(isTask).map((task) => ({
            ...task,
            category: task.category || "Pribadi",
            url: task.url || "",
          })));
        }
      }

      setDark(localStorage.getItem("task-manager-dark") === "true");
    } catch {
      setNotice("Data lokal tidak dapat dibaca.");
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      localStorage.setItem("task-manager-v1", JSON.stringify(tasks));
    }
  }, [tasks, ready]);

  useEffect(() => {
    if (ready) {
      localStorage.setItem("task-manager-dark", String(dark));
    }
  }, [dark, ready]);

  const completed = tasks.filter((t) => t.status === "Selesai").length;
  const active = tasks.length - completed;
  const overdue = tasks.filter(
    (t) => t.status !== "Selesai" && t.dueDate && t.dueDate < todayLocal()
  ).length;
  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  const filteredTasks = useMemo(() => {
    const result = tasks.filter((t) => {
      const matchesQuery =
        `${t.title} ${t.description} ${t.category || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());

      return (
        matchesQuery &&
        (filter === "Semua" || t.status === filter) &&
        (categoryFilter === "Semua" ||
          (t.category || "Pribadi") === categoryFilter)
      );
    });

    return result.sort((a, b) => {
      if (sort === "Prioritas") {
        const rank = { Tinggi: 0, Sedang: 1, Rendah: 2 };
        return rank[a.priority] - rank[b.priority];
      }

      if (sort === "Terbaru") return b.createdAt - a.createdAt;

      if (sort === "Tenggat") {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
      }

      return Number(a.status === "Selesai") -
        Number(b.status === "Selesai");
    });
  }, [tasks, query, filter, categoryFilter, sort]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      category: task.category || "Pribadi",
      url: task.url || "",
    });
    setShowForm(true);
  }

  function saveTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const title = form.title.trim();
    const url = form.url.trim();

    if (!title) return;

    if (!validUrl(url)) {
      setNotice("Tautan harus menggunakan http:// atau https://");
      return;
    }

    if (editingId) {
      setTasks((current) =>
        current.map((t) =>
          t.id === editingId
            ? { ...t, ...form, title, url }
            : t
        )
      );
      setNotice("Tugas berhasil diperbarui.");
    } else {
      const task: Task = {
        ...form,
        title,
        url,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };

      setTasks((current) => [task, ...current]);
      setNotice("Tugas berhasil ditambahkan.");
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function deleteTask(id: string) {
    if (window.confirm("Yakin ingin menghapus tugas ini?")) {
      setTasks((current) => current.filter((t) => t.id !== id));
      setNotice("Tugas telah dihapus.");
    }
  }

  function changeStatus(id: string, status: Status) {
    setTasks((current) =>
      current.map((t) => (t.id === id ? { ...t, status } : t))
    );
  }

  function exportTasks() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexora-task-manager-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Backup tugas berhasil dibuat.");
  }

  async function importTasks(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());

      if (!Array.isArray(parsed) || !parsed.every(isTask)) {
        throw new Error("Format tidak sesuai");
      }

      const normalized: Task[] = parsed.map((t) => ({
        ...t,
        category: t.category || "Pribadi",
        url: t.url || "",
      }));

      if (
        window.confirm(
          `Impor ${normalized.length} tugas? Daftar tugas saat ini akan diganti.`
        )
      ) {
        setTasks(normalized);
        setNotice("Backup berhasil dipulihkan.");
      }
    } catch {
      setNotice("File backup tidak valid.");
    } finally {
      setImportKey((key) => key + 1);
    }
  }

  const bg = dark
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-50 text-slate-900";
  const panel = dark
    ? "border-slate-800 bg-slate-900"
    : "border-slate-200 bg-white";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const inputStyle = `mt-2 w-full rounded-xl border ${
    dark
      ? "border-slate-700 bg-slate-800 text-white"
      : "border-slate-200 bg-white text-slate-900"
  } px-3 py-3 outline-none focus:border-indigo-500`;

  return (
    <main className={`min-h-screen transition-colors ${bg}`}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-widest text-indigo-500">
              NEXORA
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Task Manager
            </h1>
            <p className={`mt-2 text-sm ${muted}`}>
              Atur tugas, tenggat, dan referensi dalam satu tempat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDark(!dark)}
              className={`rounded-xl border px-3 py-2 ${
                dark ? "border-slate-700" : "border-slate-200"
              }`}
            >
              {dark ? "☀️ Terang" : "🌙 Gelap"}
            </button>
            <button
              onClick={exportTasks}
              className={`rounded-xl border px-3 py-2 ${
                dark ? "border-slate-700" : "border-slate-200"
              }`}
            >
              Ekspor
            </button>
            <label className={`cursor-pointer rounded-xl border px-3 py-2 ${
              dark ? "border-slate-700" : "border-slate-200"
            }`}>
              Impor
              <input
                key={importKey}
                type="file"
                accept=".json,application/json"
                onChange={importTasks}
                className="hidden"
              />
            </label>
            <button
              onClick={openCreate}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
            >
              + Tambah Tugas
            </button>
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className={`mb-5 flex items-center justify-between rounded-xl border p-3 text-sm ${panel}`}
          >
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="Tutup notifikasi"
              className="ml-3 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total tugas", value: tasks.length, icon: "📋" },
            { label: "Belum selesai", value: active, icon: "⏳" },
            { label: "Terlambat", value: overdue, icon: "⚠️" },
            { label: "Selesai", value: `${completed} (${progress}%)`, icon: "✅" },
          ].map((item) => (
            <div key={item.label} className={`rounded-2xl border p-5 shadow-sm ${panel}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${muted}`}>{item.label}</p>
                <span>{item.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className={`mt-6 rounded-2xl border p-5 shadow-sm ${panel}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Progres keseluruhan</h2>
              <p className={`mt-1 text-sm ${muted}`}>
                {completed} dari {tasks.length} tugas selesai
              </p>
            </div>
            <span className="font-bold text-indigo-500">{progress}%</span>
          </div>
          <div className={`mt-4 h-3 overflow-hidden rounded-full ${
            dark ? "bg-slate-800" : "bg-slate-100"
          }`}>
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Daftar Tugas</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari tugas atau kategori..."
                aria-label="Cari tugas"
                className={`rounded-xl border px-4 py-3 outline-none focus:border-indigo-500 ${
                  dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
                }`}
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter kategori"
                className={`rounded-xl border px-3 py-3 ${
                  dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
                }`}
              >
                <option value="Semua">Semua kategori</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Urutkan tugas"
                className={`rounded-xl border px-3 py-3 ${
                  dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
                }`}
              >
                <option>Tenggat</option>
                <option>Prioritas</option>
                <option>Terbaru</option>
              </select>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {["Semua", ...statuses].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  filter === s
                    ? "bg-indigo-600 text-white"
                    : `border ${dark ? "border-slate-700" : "border-slate-200"}`
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {!ready ? (
            <p className={`py-12 text-center ${muted}`}>Memuat tugas...</p>
          ) : filteredTasks.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-12 text-center ${panel}`}>
              <p className="text-3xl">📝</p>
              <h3 className="mt-3 font-semibold">Belum ada tugas</h3>
              <p className={`mt-1 text-sm ${muted}`}>
                Tambahkan tugas pertama untuk memulai.
              </p>
              <button onClick={openCreate} className="mt-4 font-semibold text-indigo-500">
                + Buat tugas baru
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTasks.map((task) => {
                const isOverdue =
                  task.status !== "Selesai" &&
                  task.dueDate !== "" &&
                  task.dueDate < todayLocal();

                return (
                  <article
                    key={task.id}
                    className={`rounded-2xl border p-5 shadow-sm ${panel}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className={`break-words text-lg font-bold ${
                          task.status === "Selesai" ? "text-slate-400 line-through" : ""
                        }`}>
                          {task.title}
                        </h3>
                        <p className={`mt-1 text-xs ${muted}`}>
                          {task.category || "Pribadi"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className={`mt-3 whitespace-pre-wrap break-words text-sm ${muted}`}>
                        {task.description}
                      </p>
                    )}

                    <div className={`mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs ${muted}`}>
                      <span>
                        📅 {task.dueDate || "Tanpa tenggat"}
                      </span>
                      {isOverdue && (
                        <span className="font-semibold text-rose-500">
                          Terlambat
                        </span>
                      )}
                    </div>

                    {task.url && validUrl(task.url) && (
                      <a
                        href={task.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className="mt-4 flex items-center gap-2 break-all rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        <span aria-hidden="true">🔗</span>
                        <span className="min-w-0 flex-1">
                          Buka tautan referensi
                          <span className="mt-1 block break-all text-xs font-normal">
                            {task.url}
                          </span>
                        </span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    )}

                    <div className={`mt-5 flex flex-wrap items-center gap-2 border-t pt-4 ${
                      dark ? "border-slate-800" : "border-slate-100"
                    }`}>
                      <select
                        aria-label={`Status ${task.title}`}
                        value={task.status}
                        onChange={(e) => changeStatus(task.id, e.target.value as Status)}
                        className={`min-w-0 flex-1 rounded-lg border px-2 py-2 text-sm ${
                          dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
                        }`}
                      >
                        {statuses.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={() => openEdit(task)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="rounded-lg px-3 py-2 text-sm text-rose-500 hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowForm(false);
            }}
          >
            <form
              onSubmit={saveTask}
              className={`my-auto w-full max-w-lg rounded-2xl border p-6 shadow-xl ${panel}`}
            >
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Tugas" : "Tambah Tugas"}
              </h2>

              <label className="mt-5 block text-sm font-medium">
                Nama tugas *
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Belajar jaringan komputer"
                  className={inputStyle}
                />
              </label>

              <label className="mt-4 block text-sm font-medium">
                Deskripsi
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detail tugas..."
                  className={inputStyle}
                />
              </label>

              <label className="mt-4 block text-sm font-medium">
                Tautan referensi (opsional)
                <input
                  type="url"
                  maxLength={2048}
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com"
                  className={inputStyle}
                />
                <span className={`mt-1 block text-xs ${muted}`}>
                  Masukkan URL lengkap, termasuk https://
                </span>
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Prioritas
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className={inputStyle}
                  >
                    {priorities.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Status
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                    className={inputStyle}
                  >
                    {statuses.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Kategori
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputStyle}
                  >
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Tenggat waktu
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className={inputStyle}
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-300 px-4 py-3"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
