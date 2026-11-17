-- ============================================================
-- Couple Space 初始化迁移
-- 10 张表 / 索引 / RLS / 2 个配对 RPC / Realtime / Storage
-- 在 Supabase SQL Editor 中整体执行一次即可。
-- ============================================================

-- ============ 扩展 ============
create extension if not exists "pgcrypto";

-- ============ 1. profiles（用户档案，与 auth.users 1:1）============
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nickname   text not null default '恋人',
  avatar_url text,
  couple_id  uuid,                      -- 所属 couple，外键稍后补（避免循环依赖）
  created_at timestamptz not null default now()
);

-- ============ 2. couples（情侣空间，最多 2 人）============
create table if not exists public.couples (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,                 -- 6 位邀请码
  partner1   uuid not null references public.profiles(id) on delete cascade,
  partner2   uuid references public.profiles(id) on delete set null,
  start_date date not null default current_date,   -- 在一起起始日
  created_at timestamptz not null default now(),
  constraint partners_distinct check (partner1 is distinct from partner2)
);

alter table public.profiles
  add constraint fk_profiles_couple
  foreign key (couple_id) references public.couples(id) on delete set null;

-- ============ 新用户自动建档案（real 模式注册后可立即写 profile）============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nickname)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nickname', '恋人')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ 成员判定 helper（RLS 复用）============
create or replace function public.is_couple_member(couple_uuid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and couple_id = couple_uuid
  );
$$;

-- ============ 3. messages（聊天消息）============
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('text','image','emoji')),
  content    text not null default '',
  image_url  text,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_couple_time on public.messages(couple_id, created_at desc);

-- ============ 4. pets（共同宠物，一 couple 一只）============
create table if not exists public.pets (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null unique references public.couples(id) on delete cascade,
  name        text not null default '布丁',
  species     text not null default 'cat',
  growth      int not null default 0 check (growth between 0 and 1000),
  mood        int not null default 70 check (mood between 0 and 100),
  stage       text not null default 'baby' check (stage in ('egg','baby','teen','adult')),
  last_fed_at timestamptz,
  updated_at  timestamptz not null default now()
);

-- ============ 5. photos（共享相册）============
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  url         text not null,
  caption     text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_photos_couple_time on public.photos(couple_id, created_at desc);

-- ============ 6. anniversaries（纪念日）============
create table if not exists public.anniversaries (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  title      text not null,
  date       date not null,
  type       text not null default 'anniversary' check (type in ('anniversary','birthday','other')),
  created_at timestamptz not null default now()
);

-- ============ 7. wishes + wish_checkins（心愿与打卡）============
create table if not exists public.wishes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.wish_checkins (
  id           uuid primary key default gen_random_uuid(),
  wish_id      uuid not null references public.wishes(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  unique (wish_id, user_id, checkin_date)
);

-- ============ 8. whispers（悄悄话/心情日记）============
create table if not exists public.whispers (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  mood       text not null default 'sweet' check (mood in ('happy','sweet','calm','sad','excited')),
  created_at timestamptz not null default now()
);

-- ============ 9. locations（位置共享，一 couple 一行）============
create table if not exists public.locations (
  couple_id  uuid primary key references public.couples(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  accuracy   int,
  sharing    boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============ 配对 RPC（原子性，避免并发超额）============
create or replace function public.create_couple(p_nickname text, p_start date default current_date)
returns public.couples language plpgsql security definer set search_path = public as $$
declare v_code text; v_couple public.couples;
begin
  if exists (select 1 from profiles where id = auth.uid() and couple_id is not null) then
    raise exception 'ALREADY_PAIRED';
  end if;
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from couples where code = v_code);
  end loop;
  update profiles set nickname = coalesce(p_nickname, nickname) where id = auth.uid();
  insert into couples(code, partner1, start_date) values (v_code, auth.uid(), p_start) returning * into v_couple;
  update profiles set couple_id = v_couple.id where id = auth.uid();
  return v_couple;
end $$;

create or replace function public.join_couple(p_code text)
returns public.couples language plpgsql security definer set search_path = public as $$
declare v_couple public.couples;
begin
  if exists (select 1 from profiles where id = auth.uid() and couple_id is not null) then
    raise exception 'ALREADY_PAIRED';
  end if;
  select * into v_couple from couples where code = upper(p_code) for update;
  if not found then raise exception 'CODE_NOT_FOUND'; end if;
  if v_couple.partner2 is not null then raise exception 'COUPLE_FULL'; end if;
  if v_couple.partner1 = auth.uid() then raise exception 'SELF_JOIN'; end if;
  update couples set partner2 = auth.uid() where id = v_couple.id;
  update profiles set couple_id = v_couple.id where id = auth.uid();
  v_couple.partner2 := auth.uid();
  return v_couple;
end $$;

-- ============ RLS ============
alter table public.profiles      enable row level security;
alter table public.couples       enable row level security;
alter table public.messages      enable row level security;
alter table public.pets          enable row level security;
alter table public.photos        enable row level security;
alter table public.anniversaries enable row level security;
alter table public.wishes        enable row level security;
alter table public.wish_checkins enable row level security;
alter table public.whispers      enable row level security;
alter table public.locations     enable row level security;

-- profiles：本人可见/可改；同一 couple 的伴侣可读昵称头像
drop policy if exists p_profile_self on public.profiles;
create policy p_profile_self on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists p_profile_partner on public.profiles;
create policy p_profile_partner on public.profiles for select
  using (couple_id is not null and couple_id = (select couple_id from profiles where id = auth.uid()));

-- couples：仅本 couple 成员可读；创建/更新走 RPC（security definer 绕过 RLS）
drop policy if exists p_couple_read on public.couples;
create policy p_couple_read on public.couples for select
  using (is_couple_member(id));
-- 真实模式更新“在一起”起始日需要 UPDATE 权限；security definer 的配对 RPC 不受影响
drop policy if exists p_couple_update on public.couples;
create policy p_couple_update on public.couples for update
  using (is_couple_member(id)) with check (is_couple_member(id));

-- 业务表统一模板：仅本 couple 成员可读写
drop policy if exists p_msg_all on public.messages;
create policy p_msg_all on public.messages for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
drop policy if exists p_pet_all on public.pets;
create policy p_pet_all on public.pets for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
drop policy if exists p_photo_all on public.photos;
create policy p_photo_all on public.photos for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
drop policy if exists p_anniv_all on public.anniversaries;
create policy p_anniv_all on public.anniversaries for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
drop policy if exists p_wish_all on public.wishes;
create policy p_wish_all on public.wishes for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
drop policy if exists p_whisper_all on public.whispers;
create policy p_whisper_all on public.whispers for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
drop policy if exists p_location_all on public.locations;
create policy p_location_all on public.locations for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));

-- wish_checkins：通过 wish 表反查 couple_id
drop policy if exists p_checkin_all on public.wish_checkins;
create policy p_checkin_all on public.wish_checkins for all
  using (exists (select 1 from wishes w where w.id = wish_id and is_couple_member(w.couple_id)))
  with check (exists (select 1 from wishes w where w.id = wish_id and is_couple_member(w.couple_id)));

-- ============ Realtime 发布 ============
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.pets;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.wishes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.whispers;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.locations;
exception when duplicate_object then null;
end $$;

-- ============ Storage：公开读、按 couple 前缀限制写 ============
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict do nothing;
drop policy if exists p_photo_read on storage.objects;
create policy p_photo_read on storage.objects for select using (bucket_id = 'photos');
drop policy if exists p_photo_write on storage.objects;
create policy p_photo_write on storage.objects for insert with check (
  bucket_id = 'photos' and
  is_couple_member(((storage.foldername(name))[1])::uuid)
);
drop policy if exists p_photo_delete on storage.objects;
create policy p_photo_delete on storage.objects for delete using (
  bucket_id = 'photos' and
  is_couple_member(((storage.foldername(name))[1])::uuid)
);
