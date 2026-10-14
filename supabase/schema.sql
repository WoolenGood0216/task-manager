-- Jalankan di Supabase Dashboard > SQL Editor.
-- RLS memastikan setiap akun hanya dapat membaca/mengubah tugas miliknya sendiri.
create table if not exists public.tasks (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.tasks enable row level security;

drop policy if exists "Users can read own tasks" on public.tasks;
create policy "Users can read own tasks"
on public.tasks for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks"
on public.tasks for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
on public.tasks for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
on public.tasks for delete to authenticated
using (auth.uid() = user_id);

-- Bucket private untuk lampiran maksimal 10 MB. Buat bucket ini melalui Storage UI
-- (nama: task-attachments, Public: OFF, File size limit: 10 MB), lalu jalankan policies di bawah.
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "Users manage own task attachments" on storage.objects;
create policy "Users manage own task attachments"
on storage.objects for all to authenticated
using (bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
