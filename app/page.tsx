
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
};

const statuses: Status[] = ["Belum dimulai", "Dikerjakan", "Selesai"];
const priorities: Priority[] = ["Rendah", "Sedang", "Tinggi"];

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
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("task-manager-v1");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setTasks(parsed as Task[]);
      }
    } catch {
      console.error("Data tugas tidak dapat dibaca.");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      localStorage.setItem("task-manager-v1", JSON.stringify(tasks));
    }
  }, [tasks, ready]);

  const completed = tasks.filter((t) => t.status === "Selesai").length;
  const active = tasks.filter((t) => t.status !== "Selesai").length;
  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const matchesQuery =
          `${t.title} ${t.description}`
            .toLowerCase()
            .includes(query.toLowerCase());

        return (
          matchesQuery &&
          (filter === "Semua" || t.status === filter)
        );
      })
      .sort((a, b) => {
        const aDone = a.status === "Selesai" ? 1 : 0;
        const bDone = b.status === "Selesai" ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        if (a.dueDate && b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [tasks, query, filter]);

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
    });
    setShowForm(true);
  }

  function saveTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    if (editingId) {
      setTasks((current) =>
        current.map((t) =>
          t.id === editingId ? { ...t, ...form, title } : t
        )
      );
    } else {
      const task: Task = {
        ...form,
        title,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      setTasks((current) => [task, ...current]);
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function deleteTask(id: string) {
    if (window.confirm("Yakin ingin menghapus tugas ini?")) {
      setTasks((current) => current.filter((t) => t.id !== id));
    }
  }

  function changeStatus(id: string, status: Status) {
    setTasks((current) =>
      current.map((t) => (t.id === id ? { ...t, status } : t))
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              TASKSPACE
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Manajemen Tugas
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Rencanakan pekerjaanmu, selesaikan satu per satu.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Tambah Tugas
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total tugas", value: tasks.length, icon: "📋" },
            { label: "Belum selesai", value: active, icon: "⏳" },
            { label: "Selesai", value: completed, icon: "✅" },
            { label: "Progres", value: `${progress}%`, icon: "📈" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{item.label}</p>
                <span>{item.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Progres keseluruhan</h2>
              <p className="mt-1 text-sm text-slate-500">
                {completed} dari {tasks.length} tugas selesai
              </p>
            </div>
            <span className="font-semibold text-indigo-600">
              {progress}%
            </span>
          </div>
          <div
            className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold">Daftar Tugas</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari tugas..."
              aria-label="Cari tugas"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 sm:max-w-xs"
            />
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {["Semua", ...statuses].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  filter === status
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {!ready ? (
            <p className="py-12 text-center text-slate-500">
              Memuat tugas...
            </p>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
              <p className="text-3xl">📝</p>
              <h3 className="mt-3 font-semibold">Belum ada tugas</h3>
              <p className="mt-1 text-sm text-slate-500">
                Tambahkan tugas pertama untuk memulai.
              </p>
              <button
                onClick={openCreate}
                className="mt-4 font-semibold text-indigo-600 hover:underline"
              >
                + Buat tugas baru
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className={`break-words text-lg font-bold ${
                          task.status === "Selesai"
                            ? "text-slate-400 line-through"
                            : ""
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-500">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityColors[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>📅 {task.dueDate || "Tanpa tenggat"}</span>
                    <span>•</span>
                    <span>{task.status}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <select
                      aria-label={`Status tugas ${task.title}`}
                      value={task.status}
                      onChange={(e) =>
                        changeStatus(task.id, e.target.value as Status)
                      }
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(task)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowForm(false);
            }}
          >
            <form
              onSubmit={saveTask}
              className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
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
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="Contoh: Mengerjakan tugas jaringan"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="mt-4 block text-sm font-medium">
                Deskripsi
                <textarea
                  maxLength={2000}
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Detail tugas (opsional)"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Prioritas
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: e.target.value as Priority,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"
                  >
                    {priorities.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Status
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as Status,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block text-sm font-medium">
                Tenggat waktu
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 font-medium"
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
