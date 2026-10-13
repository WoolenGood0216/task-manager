
"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "Belum dikerjakan" | "Sedang dikerjakan" | "Selesai";
type Priority = "Rendah" | "Sedang" | "Tinggi";

type TaskLink = {
  id: string;
  name: string;
  url: string;
};

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
  links?: TaskLink[];
};

type TaskForm = {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  category: string;
};

const STORAGE_KEY = "task-manager-v1";
const THEME_KEY = "task-manager-dark";

const STATUSES: Status[] = [
  "Belum dikerjakan",
  "Sedang dikerjakan",
  "Selesai",
];

const PRIORITIES: Priority[] = ["Rendah", "Sedang", "Tinggi"];

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  status: "Belum dikerjakan",
  priority: "Sedang",
  dueDate: "",
  category: "",
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidStatus(value: unknown): value is Status {
  return STATUSES.includes(value as Status);
}

function isValidPriority(value: unknown): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

function validUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Record<string, unknown>;

  if (
    typeof item.id !== "string" ||
    typeof item.title !== "string" ||
    typeof item.description !== "string" ||
    !isValidStatus(item.status) ||
    !isValidPriority(item.priority) ||
    typeof item.dueDate !== "string"
  ) {
    return null;
  }

  const links: TaskLink[] = Array.isArray(item.links)
    ? item.links
        .filter(
          (link): link is Record<string, unknown> =>
            !!link && typeof link === "object"
        )
        .filter(
          (link) =>
            typeof link.id === "string" &&
            typeof link.name === "string" &&
            typeof link.url === "string" &&
            validUrl(link.url)
        )
        .map((link) => ({
          id: link.id as string,
          name: link.name as string,
          url: link.url as string,
        }))
    : [];

  // Memindahkan tautan lama ke format banyak tautan.
  if (links.length === 0 && typeof item.url === "string" && validUrl(item.url)) {
    links.push({
      id: createId(),
      name: "Tautan referensi",
      url: item.url,
    });
  }

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate,
    createdAt:
      typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    category: typeof item.category === "string" ? item.category : "",
    url: "",
    links,
  };
}

function statusColor(status: Status) {
  if (status === "Selesai") {
    return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  }

  if (status === "Sedang dikerjakan") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
}

function priorityColor(priority: Priority) {
  if (priority === "Tinggi") {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  }

  if (priority === "Sedang") {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  }

  return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [priorityFilter, setPriorityFilter] = useState("Semua");
  const [sortBy, setSortBy] = useState("Terbaru");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);

  const [links, setLinks] = useState<TaskLink[]>([]);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setTasks(
            parsed
              .map(normalizeTask)
              .filter((task): task is Task => task !== null)
          );
        }
      }

      setDarkMode(localStorage.getItem(THEME_KEY) === "true");
    } catch {
      console.error("Gagal membaca data tugas dari browser.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, loaded]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);

    if (loaded) {
      localStorage.setItem(THEME_KEY, String(darkMode));
    }
  }, [darkMode, loaded]);

  const completed = tasks.filter((task) => task.status === "Selesai").length;
  const inProgress = tasks.filter(
    (task) => task.status === "Sedang dikerjakan"
  ).length;
  const pending = tasks.filter(
    (task) => task.status === "Belum dikerjakan"
  ).length;

  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  const overdue = tasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate < new Date().toISOString().slice(0, 10) &&
      task.status !== "Selesai"
  ).length;

  const filteredTasks = useMemo(() => {
    const result = tasks.filter((task) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword) ||
        (task.category ?? "").toLowerCase().includes(keyword) ||
        (task.links ?? []).some(
          (link) =>
            link.name.toLowerCase().includes(keyword) ||
            link.url.toLowerCase().includes(keyword)
        );

      const matchesStatus =
        statusFilter === "Semua" || task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "Semua" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    result.sort((a, b) => {
      if (sortBy === "Tenggat terdekat") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }

      if (sortBy === "Prioritas tertinggi") {
        const rank = { Tinggi: 3, Sedang: 2, Rendah: 1 };
        return rank[b.priority] - rank[a.priority];
      }

      if (sortBy === "Judul A-Z") {
        return a.title.localeCompare(b.title);
      }

      return b.createdAt - a.createdAt;
    });

    return result;
  }, [tasks, search, statusFilter, priorityFilter, sortBy]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLinks([]);
    setLinkName("");
    setLinkUrl("");
    setLinkError("");
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditingId(task.id);

    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      category: task.category ?? "",
    });

    setLinks(
      task.links?.length
        ? task.links.map((link) => ({ ...link }))
        : task.url && validUrl(task.url)
          ? [
              {
                id: createId(),
                name: "Tautan referensi",
                url: task.url,
              },
            ]
          : []
    );

    setLinkName("");
    setLinkUrl("");
    setLinkError("");
    setModalOpen(true);
  }

  function addLink() {
    const name = linkName.trim();
    const url = linkUrl.trim();

    if (!name) {
      setLinkError("Masukkan nama tautan terlebih dahulu.");
      return;
    }

    if (!validUrl(url)) {
      setLinkError("URL harus valid dan diawali http:// atau https://.");
      return;
    }

    setLinks((current) => [...current, { id: createId(), name, url }]);
    setLinkName("");
    setLinkUrl("");
    setLinkError("");
  }

  function removeLink(id: string) {
    setLinks((current) => current.filter((link) => link.id !== id));
  }

  function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();

    if (!title) return;

    if (editingId) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingId
            ? {
                ...task,
                ...form,
                title,
                url: "",
                links: links.map((link) => ({ ...link })),
              }
            : task
        )
      );
    } else {
      const newTask: Task = {
        id: createId(),
        ...form,
        title,
        createdAt: Date.now(),
        url: "",
        links: links.map((link) => ({ ...link })),
      };

      setTasks((current) => [newTask, ...current]);
    }

    setModalOpen(false);
  }

  function deleteTask(id: string) {
    if (!window.confirm("Yakin ingin menghapus tugas ini?")) return;
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function exportTasks() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nexora-task-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importTasks(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));

        if (!Array.isArray(parsed)) {
          throw new Error("Format cadangan harus berupa array JSON.");
        }

        const imported = parsed
          .map(normalizeTask)
          .filter((task): task is Task => task !== null);

        if (imported.length === 0 && parsed.length > 0) {
          throw new Error("Tidak ada data tugas yang valid di file.");
        }

        if (
          window.confirm(
            `Impor ${imported.length} tugas? Data tugas saat ini akan diganti.`
          )
        ) {
          setTasks(imported);
          alert("Cadangan berhasil diimpor.");
        }
      } catch (error) {
        alert(
          error instanceof Error
            ? `Gagal mengimpor: ${error.message}`
            : "File JSON tidak valid."
        );
      }

      event.target.value = "";
    };

    reader.onerror = () => {
      alert("File tidak dapat dibaca.");
      event.target.value = "";
    };

    reader.readAsText(file);
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-200">
        Memuat NEXORA Task Manager...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              NEXORA
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Task Manager
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Atur tugas, pantau progres, dan simpan semua referensi dalam satu tempat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {darkMode ? "☀️ Mode terang" : "🌙 Mode gelap"}
            </button>

            <button
              onClick={exportTasks}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Ekspor JSON
            </button>

            <label className="cursor-pointer rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
              Impor JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={importTasks}
                className="hidden"
              />
            </label>

            <button
              onClick={openCreate}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Tambah tugas
            </button>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total tugas", value: tasks.length },
            { label: "Belum dikerjakan", value: pending },
            { label: "Sedang dikerjakan", value: inProgress },
            { label: "Selesai", value: completed },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Progres keseluruhan</h2>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {progress}%
            </span>
          </div>

          <div
            className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {overdue > 0
              ? `${overdue} tugas melewati tenggat waktu.`
              : "Tidak ada tugas yang melewati tenggat waktu."}
          </p>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari judul, kategori, atau tautan..."
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="Semua">Semua status</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="Semua">Semua prioritas</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                Prioritas {priority}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option>Terbaru</option>
            <option>Tenggat terdekat</option>
            <option>Prioritas tertinggi</option>
            <option>Judul A-Z</option>
          </select>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Daftar tugas</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredTasks.length} tugas
            </span>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-16 text-center dark:border-gray-700">
              <p className="text-lg font-semibold">Belum ada tugas yang cocok</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Tambahkan tugas baru atau ubah filter pencarian.
              </p>
              {tasks.length === 0 && (
                <button
                  onClick={openCreate}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Buat tugas pertama
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredTasks.map((task) => {
                const taskLinks =
                  task.links?.length
                    ? task.links
                    : task.url && validUrl(task.url)
                      ? [
                          {
                            id: "legacy-link",
                            name: "Tautan referensi",
                            url: task.url,
                          },
                        ]
                      : [];

                return (
                  <article
                    key={task.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(task.status)}`}
                      >
                        {task.status}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityColor(task.priority)}`}
                      >
                        Prioritas {task.priority}
                      </span>

                      {task.category && (
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                          {task.category}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 break-words text-lg font-bold">
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600 dark:text-gray-400">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                      {task.dueDate && (
                        <span>
                          📅 Tenggat:{" "}
                          {new Date(
                            `${task.dueDate}T00:00:00`
                          ).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      )}

                      <span>🔗 {taskLinks.length} tautan</span>
                    </div>

                    {taskLinks.length > 0 && (
                      <div className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/70">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Tautan referensi
                        </p>

                        <ul className="space-y-2">
                          {taskLinks.map((link) => (
                            <li key={link.id} className="break-all text-sm">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                ↗ {link.name}
                              </a>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {link.url}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <button
                        onClick={() => openEdit(task)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
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

        <footer className="mt-12 border-t border-gray-200 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          NEXORA Task Manager · Data disimpan di browser perangkat ini.
        </footer>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit tugas" : "Tambah tugas"}
              </h2>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveTask} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Judul tugas *
                </label>
                <input
                  required
                  autoFocus
                  maxLength={150}
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  placeholder="Contoh: Membuat website NEXORA"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Deskripsi
                </label>
                <textarea
                  rows={3}
                  maxLength={3000}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Detail tugas atau catatan..."
                  className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as Status,
                      })
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Prioritas
                  </label>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        priority: event.target.value as Priority,
                      })
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Kategori
                  </label>
                  <input
                    maxLength={60}
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    placeholder="Contoh: Sekolah, Coding"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tenggat waktu
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm({ ...form, dueDate: event.target.value })
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-4">
                  <h3 className="font-semibold">Tautan referensi</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Tambahkan beberapa tautan, misalnya GitHub, dokumentasi,
                    video, atau sumber belajar.
                  </p>
                </div>

                {links.length > 0 && (
                  <ul className="mb-4 space-y-3">
                    {links.map((link) => (
                      <li
                        key={link.id}
                        className="flex min-w-0 items-start justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold">
                            {link.name}
                          </p>
                          <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">
                            {link.url}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeLink(link.id)}
                          className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-950"
                        >
                          Hapus
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-3">
                  <input
                    value={linkName}
                    onChange={(event) => setLinkName(event.target.value)}
                    placeholder="Nama tautan, misalnya GitHub"
                    maxLength={100}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                  />

                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
                  />

                  {linkError && (
                    <p className="text-sm text-red-600">{linkError}</p>
                  )}

                  <button
                    type="button"
                    onClick={addLink}
                    className="w-full rounded-xl border border-blue-300 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
                  >
                    + Tambahkan tautan
                  </button>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {editingId ? "Simpan perubahan" : "Simpan tugas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
