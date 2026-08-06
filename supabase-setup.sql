create extension if not exists pgcrypto;

create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  board_type text not null check (board_type in ('quote', 'reservation', 'notice')),
  title text not null,
  author text not null,
  content text not null,
  is_pinned boolean not null default false,
  is_secret boolean not null default false,
  password_hash text not null,
  admin_reply text,
  attachment_name text,
  attachment_path text,
  attachment_type text,
  attachment_size bigint,
  reply_attachment_name text,
  reply_attachment_path text,
  reply_attachment_type text,
  reply_attachment_size bigint,
  created_at timestamptz not null default now(),
  replied_at timestamptz
);

create table if not exists public.inquiry_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  category text not null,
  visa_nationality text,
  visa_departure text,
  visa_stay text,
  visa_status text,
  visa_record text,
  title text not null,
  content text not null,
  referral_path text,
  attachment_name text,
  attachment_path text,
  attachment_type text,
  attachment_size bigint,
  created_at timestamptz not null default now()
);

alter table public.board_posts
  add column if not exists is_pinned boolean not null default false,
  add column if not exists admin_reply text,
  add column if not exists attachment_name text,
  add column if not exists attachment_path text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint,
  add column if not exists reply_attachment_name text,
  add column if not exists reply_attachment_path text,
  add column if not exists reply_attachment_type text,
  add column if not exists reply_attachment_size bigint,
  add column if not exists replied_at timestamptz;

alter table public.board_posts enable row level security;
alter table public.inquiry_submissions enable row level security;

drop policy if exists "board posts insert for everyone" on public.board_posts;
drop policy if exists "board posts read for authenticated users" on public.board_posts;
drop policy if exists "board posts update for authenticated users" on public.board_posts;
drop policy if exists "board posts delete for authenticated users" on public.board_posts;
drop policy if exists "inquiry submissions insert for everyone" on public.inquiry_submissions;
drop policy if exists "inquiry submissions read for authenticated users" on public.inquiry_submissions;

create policy "board posts insert for everyone"
on public.board_posts
for insert
to anon, authenticated
with check (board_type in ('quote', 'reservation', 'notice'));

create policy "board posts read for authenticated users"
on public.board_posts
for select
to authenticated
using (true);

create policy "board posts update for authenticated users"
on public.board_posts
for update
to authenticated
using (true)
with check (true);

create policy "board posts delete for authenticated users"
on public.board_posts
for delete
to authenticated
using (true);

create policy "inquiry submissions insert for everyone"
on public.inquiry_submissions
for insert
to anon, authenticated
with check (true);

create policy "inquiry submissions read for authenticated users"
on public.inquiry_submissions
for select
to authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select, insert on public.board_posts to anon, authenticated;
grant update, delete on public.board_posts to authenticated;
grant all on public.board_posts to service_role;
grant select, insert on public.inquiry_submissions to anon, authenticated;
grant all on public.inquiry_submissions to service_role;

insert into storage.buckets (id, name, public)
values ('board-attachments', 'board-attachments', false)
on conflict (id) do nothing;

drop policy if exists "board attachments read" on storage.objects;
drop policy if exists "board attachments upload" on storage.objects;
drop policy if exists "board attachments update" on storage.objects;
drop policy if exists "board attachments delete" on storage.objects;

create policy "board attachments read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'board-attachments');

create policy "board attachments upload"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'board-attachments');

create policy "board attachments update"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'board-attachments')
with check (bucket_id = 'board-attachments');

create policy "board attachments delete"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'board-attachments');

drop view if exists public.board_post_summaries;

create view public.board_post_summaries as
select
  id,
  board_type,
  title,
  author,
  is_secret,
  is_pinned,
  created_at,
  (admin_reply is not null and length(trim(admin_reply)) > 0) as has_reply
from public.board_posts
order by is_pinned desc, created_at desc;

grant select on public.board_post_summaries to anon, authenticated;
