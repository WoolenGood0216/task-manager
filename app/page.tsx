"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Status = "todo" | "doing" | "done";
type Priority = "low" | "medium" | "high";
type TaskLink = { id: string; label: string; url: string };
type Subtask = { id: string; title: string; done: boolean };
type Attachment = { id: string; name: string; path: string; url?: string; size: number };
type Task = {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  category: string;
  subject: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  links: TaskLink[];
  subtasks: Subtask[];
  attachments: Attachment[];
  notes: string;
  grade: string;
};

const STORAGE_KEY = "tugas-manager-v3";
const THEME_KEY = "tugas-manager-theme";
const DELETED_KEY = "tugas-manager-deleted-v3";
const BUCKET = "task-attachments";
const statuses: { value: Status; label: string }[] = [
  { value: "todo", label: "Belum dikerjakan" },
  { value: "doing", label: "Sedang dikerjakan" },
  { value: "done", label: "Selesai" },
];
const priorities: { value: Priority; label: string }[] = [
  { value: "low", label: "Rendah" },
  { value: "medium", label: "Sedang" },
  { value: "high", label: "Tinggi" },
];
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const today = () => new Date().toISOString().slice(0, 10);
const emptyTask = (): Task => ({
  id: uid(), title: "", description: "", status: "todo", priority: "medium",
  category: "Sekolah", subject: "", dueDate: "", createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(), links: [], subtasks: [], attachments: [], notes: "", grade: "",
});
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function normalizeTask(raw: any): Task {
  // Supports importing v2 exports and the previous single-link format.
  const links: TaskLink[] = Array.isArray(raw.links)
    ? raw.links.map((x: any) => ({ id: String(x.id || uid()), label: String(x.label || "Tautan"), url: String(x.url || "") }))
    : raw.link ? [{ id: uid(), label: "Tautan lama", url: String(raw.link) }] : [];
  return {
    id: String(raw.id || uid()), title: String(raw.title || "Tugas tanpa judul"),
    description: String(raw.description || ""), status: statuses.some(s => s.value === raw.status) ? raw.status : "todo",
    priority: priorities.some(p => p.value === raw.priority) ? raw.priority : "medium",
    category: String(raw.category || "Sekolah"), subject: String(raw.subject || ""),
    dueDate: String(raw.dueDate || ""), createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()), links,
    subtasks: Array.isArray(raw.subtasks) ? raw.subtasks.map((x: any) => ({ id: String(x.id || uid()), title: String(x.title || ""), done: Boolean(x.done) })) : [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map((x: any) => ({
      id: String(x.id || uid()), name: String(x.name || "Lampiran"), path: String(x.path || ""),
      url: x.url ? String(x.url) : undefined, size: Number(x.size || 0)
    })) : [],
    notes: String(raw.notes || ""), grade: String(raw.grade || ""),
  };
}

function formatDate(value: string) {
  if (!value) return "Tanpa tenggat";
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
function isOverdue(t: Task) { return Boolean(t.dueDate && t.dueDate < today() && t.status !== "done"); }
function isSoon(t: Task) {
  if (!t.dueDate || t.status === "done") return false;
  const diff = Math.ceil((new Date(`${t.dueDate}T00:00:00`).getTime() - new Date(`${today()}T00:00:00`).getTime()) / 86400000);
  return diff >= 0 && diff <= 2;
}

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<"list" | "board" | "calendar">("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due");
  const [editing, setEditing] = useState<Task | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [message, setMessage] = useState("");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [userEmail, setUserEmail] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [onlineUser, setOnlineUser] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setTasks(parsed.map(normalizeTask));
      } else {
        const old = localStorage.getItem("task-manager-tasks");
        if (old) {
          const parsed = JSON.parse(old);
          if (Array.isArray(parsed)) setTasks(parsed.map(normalizeTask));
        }
      }
      setDark(localStorage.getItem(THEME_KEY) === "dark");
    } catch {
      setMessage("Data lokal tidak bisa dibaca. Coba impor cadangan JSON.");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
    catch { setMessage("Penyimpanan lokal penuh. Ekspor cadangan dan hapus lampiran berukuran besar."); }
  }, [tasks, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
  }, [dark, ready]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const due = tasks.filter(t => isSoon(t) || isOverdue(t));
      const lastKey = `tm-notified-${today()}`;
      const seen = JSON.parse(sessionStorage.getItem(lastKey) || "[]") as string[];
      const fresh = due.filter(t => !seen.includes(t.id));
      fresh.forEach(t => new Notification(isOverdue(t) ? "Tugas terlambat" : "Tenggat tugas mendekat", {
        body: `${t.title} — ${formatDate(t.dueDate)}`,
      }));
      if (fresh.length) sessionStorage.setItem(lastKey, JSON.stringify([...seen, ...fresh.map(t => t.id)]));
    }
  }, [tasks]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setOnlineUser(data.session?.user || null);
      setUserEmail(data.session?.user?.email || "");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setOnlineUser(session?.user || null);
      setUserEmail(session?.user?.email || "");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 3500); };
  const saveTask = (e: FormEvent) => {
    e.preventDefault();
    if (!editing?.title.trim()) { notify("Judul tugas wajib diisi."); return; }
    const clean = normalizeTask({ ...editing, title: editing.title.trim(), updatedAt: new Date().toISOString() });
    setTasks(old => old.some(t => t.id === clean.id) ? old.map(t => t.id === clean.id ? clean : t) : [clean, ...old]);
    setEditing(null); setSubtaskDraft(""); setLinkLabel(""); setLinkUrl(""); notify("Tugas tersimpan.");
  };
  const updateTask = (id: string, patch: Partial<Task>) =>
    setTasks(old => old.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t));
  const deleteTask = (id: string) => {
    if (confirm("Hapus tugas ini? Tindakan ini tidak bisa dibatalkan.")) {
      try {
        const deleted = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]") as string[];
        localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(new Set([...deleted, id]))));
      } catch { /* deletion still works locally; export a backup if browser storage is unavailable */ }
      setTasks(old => old.filter(t => t.id !== id)); notify("Tugas dihapus.");
    }
  };
  const addLink = () => {
    if (!editing || !linkUrl.trim()) return;
    let parsed: URL;
    try { parsed = new URL(linkUrl.trim()); } catch { notify("URL tidak valid. Gunakan https:// atau http://."); return; }
    if (!["http:", "https:"].includes(parsed.protocol)) { notify("Hanya tautan HTTP/HTTPS yang diizinkan."); return; }
    setEditing({ ...editing, links: [...editing.links, { id: uid(), label: linkLabel.trim() || "Tautan", url: parsed.toString() }] });
    setLinkLabel(""); setLinkUrl("");
  };
  const addSubtask = () => {
    if (!editing || !subtaskDraft.trim()) return;
    setEditing({ ...editing, subtasks: [...editing.subtasks, { id: uid(), title: subtaskDraft.trim(), done: false }] });
    setSubtaskDraft("");
  };
  const addAttachment = async (taskId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { notify("Maksimal ukuran satu lampiran adalah 10 MB."); return; }
    if (supabase && onlineUser) {
      const path = `${onlineUser.id}/${taskId}/${uid()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) { notify(`Upload gagal: ${error.message}`); return; }
      updateTask(taskId, { attachments: [...(tasks.find(t => t.id === taskId)?.attachments || []), { id: uid(), name: file.name, path, size: file.size }] });
      notify("Lampiran diunggah ke penyimpanan online.");
    } else {
      // Local-only attachment metadata is not a file backup; keep the file itself outside localStorage.
      notify("Lampiran online memerlukan login Supabase. Simpan file ini di perangkat dan tambahkan catatannya pada tugas.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const arr = tasks.filter(t => {
      const haystack = [t.title, t.description, t.category, t.subject, t.notes, ...t.links.map(l => `${l.label} ${l.url}`)].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) &&
        (statusFilter === "all" || t.status === statusFilter) &&
        (priorityFilter === "all" || t.priority === priorityFilter) &&
        (categoryFilter === "all" || t.category === categoryFilter);
    });
    return arr.sort((a, b) => {
      if (sortBy === "created") return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === "priority") return ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]);
      if (sortBy === "title") return a.title.localeCompare(b.title, "id");
      return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
    });
  }, [tasks, query, statusFilter, priorityFilter, categoryFilter, sortBy]);

  const stats = {
    total: tasks.length, done: tasks.filter(t => t.status === "done").length,
    doing: tasks.filter(t => t.status === "doing").length,
    overdue: tasks.filter(isOverdue).length,
    soon: tasks.filter(isSoon).length,
  };
  const categories = Array.from(new Set(tasks.map(t => t.category).filter(Boolean)));
  const completion = stats.total ? Math.round(stats.done / stats.total * 100) : 0;
  const openEditor = (task?: Task) => { setEditing(task ? structuredClone(task) : emptyTask()); setSubtaskDraft(""); setLinkLabel(""); setLinkUrl(""); };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), tasks }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `tugas-manager-backup-${today()}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const list = Array.isArray(parsed) ? parsed : parsed.tasks;
      if (!Array.isArray(list) || !list.every(x => x && typeof x === "object")) throw new Error("Format tidak dikenali");
      if (!confirm(`Impor ${list.length} tugas? Tugas saat ini akan digabung berdasarkan ID.`)) return;
      const imported = list.map(normalizeTask);
      setTasks(old => {
        const map = new Map(old.map(t => [t.id, t]));
        imported.forEach(t => map.set(t.id, t));
        return Array.from(map.values());
      });
      notify(`${imported.length} tugas berhasil diimpor.`);
    } catch { notify("File JSON tidak valid atau rusak."); }
  };

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSyncing(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    setSyncing(false);
    notify(error ? `Login gagal: ${error.message}` : "Login berhasil.");
  };
  const signUp = async () => {
    if (!supabase) return;
    setSyncing(true);
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    setSyncing(false);
    notify(error ? `Daftar gagal: ${error.message}` : "Permintaan akun dikirim. Periksa email jika verifikasi diaktifkan.");
  };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); };
  const syncNow = async () => {
    if (!supabase || !onlineUser) return;
    setSyncing(true);
    const { data, error } = await supabase.from("tasks").select("id,payload,updated_at").eq("user_id", onlineUser.id);
    if (error) { setSyncing(false); notify(`Gagal mengambil data: ${error.message}`); return; }
    const remote = (data || []).map((r: any) => normalizeTask(r.payload));
    let deletedIds: string[] = [];
    try { deletedIds = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]"); } catch { deletedIds = []; }
    const deletedSet = new Set(deletedIds);
    const merged = new Map<string, Task>();
    [...remote, ...tasks].filter(t => !deletedSet.has(t.id)).forEach(t => {
      const existing = merged.get(t.id);
      if (!existing || t.updatedAt >= existing.updatedAt) merged.set(t.id, t);
    });
    const all = Array.from(merged.values());
    if (deletedIds.length) {
      const { error: deleteError } = await supabase.from("tasks").delete().eq("user_id", onlineUser.id).in("id", deletedIds);
      if (deleteError) { setSyncing(false); notify(`Gagal menyinkronkan penghapusan: ${deleteError.message}`); return; }
    }
    const rows = all.map(t => ({ id: t.id, user_id: onlineUser.id, payload: t, updated_at: t.updatedAt }));
    const { error: upsertError } = rows.length
      ? await supabase.from("tasks").upsert(rows, { onConflict: "user_id,id" })
      : { error: null };
    setSyncing(false);
    if (upsertError) { notify(`Sinkronisasi gagal: ${upsertError.message}`); return; }
    localStorage.removeItem(DELETED_KEY);
    setTasks(all); notify(`Sinkronisasi selesai: ${all.length} tugas.`);
  };

  const monthLabel = month.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const calendarCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = (first.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(start).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [month]);

  if (!ready) return <main className="page"><div className="panel">Memuat Tugas Manager…</div></main>;

  return (
    <main className={`page ${dark ? "theme-dark" : ""}`}>
      <header className="topbar">
        <div><p className="eyebrow">RUANG KERJA PRIBADI</p><h1>Tugas Manager <span>v3</span></h1><p className="muted">Satu tempat untuk tugas sekolah, proyek, dan target pribadi.</p></div>
        <div className="top-actions">
          <button className="btn secondary" onClick={() => setDark(v => !v)}>{dark ? "☀️ Terang" : "🌙 Gelap"}</button>
          <button className="btn secondary" onClick={exportJson}>Ekspor JSON</button>
          <label className="btn secondary file-button">Impor JSON<input type="file" accept="application/json,.json" onChange={e => { void importJson(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>
          <button className="btn primary" onClick={() => openEditor()}>＋ Tugas baru</button>
        </div>
      </header>

      {message && <div className="toast" role="status">{message}</div>}

      <section className="stats-grid">
        <article className="stat-card"><span>Total tugas</span><strong>{stats.total}</strong><small>Semua kategori</small></article>
        <article className="stat-card"><span>Selesai</span><strong>{stats.done}</strong><small>{completion}% dari seluruh tugas</small><div className="progress"><i style={{ width: `${completion}%` }} /></div></article>
        <article className="stat-card"><span>Sedang dikerjakan</span><strong>{stats.doing}</strong><small>Dalam proses</small></article>
        <article className={`stat-card ${stats.overdue ? "danger-card" : ""}`}><span>Terlambat</span><strong>{stats.overdue}</strong><small>{stats.soon} tenggat dalam 2 hari</small></article>
      </section>

      <section className="panel sync-panel">
        <div><h2>Sinkronisasi online</h2><p className="muted">{!supabase ? "Belum dikonfigurasi. Tambahkan kredensial Supabase di environment Vercel." : onlineUser ? `Masuk sebagai ${userEmail}` : "Masuk atau buat akun untuk menyinkronkan tugas antarperangkat."}</p></div>
        {!supabase ? <span className="pill">Mode lokal</span> : onlineUser ? <div className="inline-actions"><button className="btn secondary" disabled={syncing} onClick={syncNow}>{syncing ? "Menyinkronkan…" : "Sinkronkan sekarang"}</button><button className="btn ghost" onClick={signOut}>Keluar</button></div> :
          <form className="auth-form" onSubmit={signIn}><input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required /><input type="password" placeholder="Kata sandi (min. 6 karakter)" value={authPassword} onChange={e => setAuthPassword(e.target.value)} minLength={6} required /><button className="btn primary" disabled={syncing}>{syncing ? "Memproses…" : "Masuk"}</button><button type="button" className="btn secondary" disabled={syncing} onClick={signUp}>Daftar</button></form>}
      </section>

      <section className="toolbar panel">
        <div className="search-wrap"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari judul, catatan, mapel, atau tautan…" /></div>
        <select aria-label="Filter status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">Semua status</option>{statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <select aria-label="Filter prioritas" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}><option value="all">Semua prioritas</option>{priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
        <select aria-label="Filter kategori" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">Semua kategori</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select aria-label="Urutkan tugas" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="due">Tenggat terdekat</option><option value="priority">Prioritas</option><option value="created">Terbaru dibuat</option><option value="title">Nama A–Z</option></select>
      </section>

      <nav className="view-tabs" aria-label="Tampilan tugas">
        <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>☷ Daftar</button>
        <button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>▦ Papan</button>
        <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>▦ Kalender</button>
        <span className="muted">{filtered.length} tugas ditampilkan</span>
      </nav>

      {view === "list" && <section className="task-list">
        {filtered.length === 0 ? <div className="empty panel"><div>🗂️</div><h3>Belum ada tugas yang cocok</h3><p className="muted">Tambahkan tugas baru atau ubah filter pencarian.</p><button className="btn primary" onClick={() => openEditor()}>＋ Buat tugas</button></div> :
          filtered.map(t => <TaskCard key={t.id} task={t} onEdit={() => openEditor(t)} onDelete={() => deleteTask(t.id)} onStatus={status => updateTask(t.id, { status })} onSubtask={(subId, done) => updateTask(t.id, { subtasks: t.subtasks.map(s => s.id === subId ? { ...s, done } : s) })} onAttachment={file => void addAttachment(t.id, file)} supabase={supabase} userId={onlineUser?.id} notify={notify} />)}
      </section>}

      {view === "board" && <section className="board">
        {statuses.map(s => <div className="board-column" key={s.value}><div className="column-heading"><h3>{s.label}</h3><span>{filtered.filter(t => t.status === s.value).length}</span></div>
          {filtered.filter(t => t.status === s.value).map(t => <article className="board-card" key={t.id}><div className="card-top"><PriorityBadge priority={t.priority} /><span className="muted small">{t.category}</span></div><h4>{t.title}</h4>{t.subject && <p className="muted small">{t.subject}</p>}{t.dueDate && <p className={`due ${isOverdue(t) ? "overdue" : ""}`}>◷ {formatDate(t.dueDate)}</p>}<div className="board-actions"><select aria-label={`Ubah status ${t.title}`} value={t.status} onChange={e => updateTask(t.id, { status: e.target.value as Status })}>{statuses.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select><button className="btn ghost" onClick={() => openEditor(t)}>Edit</button></div></article>)}
          <button className="add-to-column" onClick={() => { const t = emptyTask(); t.status = s.value; setEditing(t); }}>＋ Tambah tugas</button>
        </div>)}
      </section>}

      {view === "calendar" && <section className="panel calendar-panel"><div className="calendar-head"><button className="btn secondary" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>← Sebelumnya</button><h2>{monthLabel}</h2><button className="btn secondary" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Berikutnya →</button></div><div className="calendar-grid">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(d => <div className="weekday" key={d}>{d}</div>)}{calendarCells.map((day, i) => { const key = day ? `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : ""; const dayTasks = filtered.filter(t => t.dueDate === key); return <div className={`calendar-day ${day ? "" : "blank"}`} key={`${key}-${i}`}><span className="day-number">{day || ""}</span>{dayTasks.map(t => <button className={`calendar-task ${t.status}`} key={t.id} title={t.title} onClick={() => openEditor(t)}>{t.title}</button>)}{day && <button className="calendar-add" aria-label={`Tambah tugas tanggal ${day}`} onClick={() => { const t = emptyTask(); t.dueDate = key; setEditing(t); }}>＋</button>}</div>; })}</div><p className="muted small">Klik tugas untuk mengedit, atau tanda ＋ untuk membuat tugas pada tanggal tersebut.</p></section>}

      {editing && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setEditing(null); }}><section className="modal panel" role="dialog" aria-modal="true" aria-labelledby="editor-title"><div className="modal-head"><div><p className="eyebrow">DETAIL TUGAS</p><h2 id="editor-title">{tasks.some(t => t.id === editing.id) ? "Edit tugas" : "Tugas baru"}</h2></div><button className="btn ghost" onClick={() => setEditing(null)} aria-label="Tutup">✕</button></div>
        <form onSubmit={saveTask} className="editor-form">
          <label>Judul tugas *<input autoFocus value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} required maxLength={160} placeholder="Contoh: Praktik konfigurasi VLAN" /></label>
          <label>Deskripsi<textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} placeholder="Detail tugas atau instruksi…" /></label>
          <div className="form-grid"><label>Status<select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as Status })}>{statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label><label>Prioritas<select value={editing.priority} onChange={e => setEditing({ ...editing, priority: e.target.value as Priority })}>{priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label><label>Kategori<input value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="Sekolah / Pribadi / Proyek" /></label><label>Mata pelajaran / proyek<input value={editing.subject} onChange={e => setEditing({ ...editing, subject: e.target.value })} placeholder="TJKT, Matematika, NEXORA…" /></label><label>Tenggat<input type="date" value={editing.dueDate} onChange={e => setEditing({ ...editing, dueDate: e.target.value })} /></label><label>Nilai (opsional)<input value={editing.grade} onChange={e => setEditing({ ...editing, grade: e.target.value })} placeholder="Mis. 90 atau belum dinilai" /></label></div>
          <div className="editor-section"><h3>Subtugas</h3><div className="inline-input"><input value={subtaskDraft} onChange={e => setSubtaskDraft(e.target.value)} placeholder="Tambah langkah kecil…" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }} /><button type="button" className="btn secondary" onClick={addSubtask}>Tambah</button></div>{editing.subtasks.map(s => <div className="subtask-row" key={s.id}><input type="checkbox" checked={s.done} onChange={e => setEditing({ ...editing, subtasks: editing.subtasks.map(x => x.id === s.id ? { ...x, done: e.target.checked } : x) })} /><span className={s.done ? "completed" : ""}>{s.title}</span><button type="button" className="icon-button" onClick={() => setEditing({ ...editing, subtasks: editing.subtasks.filter(x => x.id !== s.id) })}>Hapus</button></div>)}</div>
          <div className="editor-section"><h3>Tautan bernama</h3><div className="form-grid"><label>Nama tautan<input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Materi, Google Drive…" /></label><label>URL<input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" /></label></div><button type="button" className="btn secondary" onClick={addLink}>＋ Tambah tautan</button>{editing.links.map(l => <div className="link-row" key={l.id}><div><strong>{l.label}</strong><p className="small muted break">{l.url}</p></div><button type="button" className="icon-button" onClick={() => setEditing({ ...editing, links: editing.links.filter(x => x.id !== l.id) })}>Hapus</button></div>)}</div>
          <div className="editor-section"><h3>Catatan</h3><textarea rows={3} value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Catatan pengerjaan, ide, atau hasil…" /></div>
          <div className="editor-section"><h3>Lampiran</h3><p className="muted small">Upload online tersedia setelah login Supabase; batas 10 MB per file.</p><label className="btn secondary file-button">Pilih file<input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) { notify("Simpan tugas terlebih dahulu, lalu unggah lampiran dari kartu tugas."); } e.currentTarget.value = ""; }} /></label>{editing.attachments.map(a => <div className="link-row" key={a.id}><span>{a.name} <small className="muted">({Math.ceil(a.size/1024)} KB)</small></span><span className="small muted">Lampiran tersimpan</span></div>)}</div>
          <div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setEditing(null)}>Batal</button><button type="submit" className="btn primary">Simpan tugas</button></div>
        </form>
      </section></div>}
      <footer className="footer"><span>Tugas Manager v3 · Data lokal otomatis tersimpan di browser ini.</span><span>Cadangkan data secara berkala melalui Ekspor JSON.</span></footer>
    </main>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority-badge ${priority}`}>{priority === "high" ? "● Tinggi" : priority === "medium" ? "● Sedang" : "● Rendah"}</span>;
}

function TaskCard({ task, onEdit, onDelete, onStatus, onSubtask, onAttachment, supabase, userId, notify }: {
  task: Task; onEdit: () => void; onDelete: () => void; onStatus: (s: Status) => void;
  onSubtask: (id: string, done: boolean) => void; onAttachment: (f: File) => void;
  supabase: SupabaseClient | null; userId?: string; notify: (s: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const completed = task.subtasks.filter(s => s.done).length;
  const upload = async (file?: File) => {
    if (!file) return;
    if (!supabase || !userId) { notify("Login Supabase diperlukan untuk mengunggah lampiran online."); return; }
    setUploading(true); onAttachment(file); setUploading(false);
  };
  const openAttachment = async (a: Attachment) => {
    if (!supabase || !userId || !a.path) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.path, 60);
    if (error || !data?.signedUrl) { notify("Lampiran tidak dapat dibuka."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return <article className={`task-card panel ${task.status === "done" ? "task-done" : ""}`}>
    <div className="task-main"><div className="task-title-row"><button className="expand-button" onClick={() => setExpanded(v => !v)} aria-label="Buka detail">{expanded ? "▾" : "▸"}</button><h3>{task.title}</h3>{isOverdue(task) && <span className="tag overdue-tag">Terlambat</span>}{isSoon(task) && !isOverdue(task) && <span className="tag soon-tag">Segera</span>}</div>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-meta"><PriorityBadge priority={task.priority} /><span className="tag">{task.category}</span>{task.subject && <span className="tag">{task.subject}</span>}{task.dueDate && <span className={`due ${isOverdue(task) ? "overdue" : ""}`}>◷ {formatDate(task.dueDate)}</span>}</div>
      {task.subtasks.length > 0 && <div className="subtask-progress"><span>Subtugas {completed}/{task.subtasks.length}</span><div className="progress"><i style={{ width: `${completed / task.subtasks.length * 100}%` }} /></div></div>}
    </div>
    <div className="task-actions"><select aria-label={`Status ${task.title}`} value={task.status} onChange={e => onStatus(e.target.value as Status)}>{statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select><button className="btn secondary" onClick={onEdit}>Edit</button><button className="btn ghost danger-text" onClick={onDelete}>Hapus</button></div>
    {expanded && <div className="task-details">
      {task.notes && <div><h4>Catatan</h4><p className="preserve">{task.notes}</p></div>}
      {task.grade && <p><strong>Nilai:</strong> {task.grade}</p>}
      {task.subtasks.length > 0 && <div><h4>Subtugas</h4>{task.subtasks.map(s => <label className="subtask-row" key={s.id}><input type="checkbox" checked={s.done} onChange={e => onSubtask(s.id, e.target.checked)} /><span className={s.done ? "completed" : ""}>{s.title}</span></label>)}</div>}
      {task.links.length > 0 && <div><h4>Tautan</h4><div className="detail-links">{task.links.map(l => <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}</div></div>}
      <div><h4>Lampiran</h4>{task.attachments.map(a => <button className="attachment-link" key={a.id} onClick={() => void openAttachment(a)}>{a.name} ↗</button>)}<label className="btn secondary file-button">{uploading ? "Mengunggah…" : "＋ Unggah lampiran"}<input type="file" disabled={uploading} onChange={e => { void upload(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label></div>
    </div>}
  </article>;
}
