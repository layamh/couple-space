-- ============================================================
-- Couple Space · 后端一键初始化（完整后端源码，单文件版）
-- 内容 = 001 + 002 + 003（隐私与精准定位），已做幂等处理，可重复执行。
--
-- 用法（二选一）：
--   A. 手动：Supabase 控制台 → SQL Editor → 粘贴本文件 → Run
--   B. 自动：推到 GitHub 后由 .github/workflows/deploy-backend.yml 执行
--          （需在仓库 Secrets 配置 SUPABASE_DB_URL）
--
-- 包含：15 张业务表 + 索引 + RLS 行级安全 + 2 个配对 RPC
--      + Realtime 发布 + 2 个 Storage 桶 + 34 条宠物商品种子数据
--      + 相册授权开关 profiles.album_shared（精准定位无需改表）
-- ============================================================

-- 迁移记录表：便于确认后端版本
create table if not exists public.schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);

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

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_profiles_couple') then
    alter table public.profiles
      add constraint fk_profiles_couple
      foreign key (couple_id) references public.couples(id) on delete set null;
  end if;
end $$;

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


-- ============================================================
-- Pet v2 增量迁移：奶油橘猫养成 + 旅行 + 装饰 + 图鉴
-- 依赖 001_init.sql；物种统一为 cat「布丁」；可重复执行。
-- ============================================================
create extension if not exists "pgcrypto";

-- ---------- (A) pets 加列（保留 growth 兼容字段） ----------
alter table public.pets
  alter column species set default 'cat',
  alter column name    set default '布丁';

alter table public.pets
  add column if not exists level          int not null default 1  check (level between 1 and 10),
  add column if not exists exp            int not null default 0  check (exp >= 0),
  add column if not exists fullness       int not null default 60 check (fullness between 0 and 100),
  add column if not exists intimacy       int not null default 0  check (intimacy between 0 and 100),
  add column if not exists clovers        int not null default 10 check (clovers between 0 and 999),
  add column if not exists state          text not null default 'idle'
      check (state in ('idle','reading','eating','sleeping','writing','traveling')),
  add column if not exists is_traveling   boolean not null default false,
  add column if not exists travel_back_at timestamptz,
  add column if not exists clover_count   int not null default 0 check (clover_count between 0 and 8),
  add column if not exists last_clover_at timestamptz,
  add column if not exists last_decay_at  timestamptz not null default now(),
  add column if not exists last_state_at  timestamptz not null default now(),
  add column if not exists background     text not null default 'courtyard';

-- 存量映射：stage → level/exp；自定义名保留；旧青蛙数据统一回猫。
update public.pets p set
  level   = case p.stage when 'egg' then 1 when 'baby' then 2 when 'teen' then 4 when 'adult' then 7 else 1 end,
  exp     = case p.stage when 'egg' then 0 when 'baby' then 100 when 'teen' then 300 when 'adult' then 600 else 0 end,
  species = 'cat',
  name    = case when p.name in ('小甜心','布丁') then '布丁' else p.name end,
  last_decay_at  = coalesce(p.updated_at, now()),
  last_clover_at = now(),
  updated_at     = now()
where p.species <> 'cat' or p.name = '小甜心' or p.level = 1;

-- ---------- (B) 5 张新表 ----------
create table if not exists public.pet_items (
  key             text primary key,
  category        text not null check (category in ('consumable','furniture','outfit','background','postcard','souvenir')),
  name            text not null,
  asset_path      text,
  slot            text check (slot in ('head','neck','eyes')),
  unlock_level    int not null default 1  check (unlock_level between 1 and 10),
  unlock_intimacy int not null default 0  check (unlock_intimacy between 0 and 100),
  price           int not null default 0  check (price >= 0),
  rarity          text not null default 'normal' check (rarity in ('normal','rare')),
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.pet_inventory (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  item_key    text not null references public.pet_items(key) on delete cascade,
  quantity    int not null default 1 check (quantity >= 0),
  equipped    boolean not null default false,
  placed      boolean not null default false,
  pos_x       real,
  pos_y       real,
  mirrored    boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique (couple_id, item_key)
);
create index if not exists idx_pet_inv_couple on public.pet_inventory(couple_id);

create table if not exists public.pet_trips (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples(id) on delete cascade,
  started_at      timestamptz not null default now(),
  back_at         timestamptz not null,
  bento_key       text not null references public.pet_items(key),
  charm_key       text references public.pet_items(key),
  status          text not null default 'traveling' check (status in ('traveling','settled')),
  postcard_key    text references public.pet_items(key),
  souvenir_key    text references public.pet_items(key),
  clovers_gained  int not null default 0,
  exp_gained      int not null default 0,
  settled_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_pet_trips_couple_status on public.pet_trips(couple_id, status, back_at);

create table if not exists public.pet_postcards (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  postcard_key text not null references public.pet_items(key),
  rarity       text not null default 'normal' check (rarity in ('normal','rare')),
  count        int not null default 1,
  trip_id      uuid references public.pet_trips(id) on delete set null,
  obtained_at  timestamptz not null default now(),
  unique (couple_id, postcard_key)
);
create index if not exists idx_pet_postcards_couple on public.pet_postcards(couple_id, obtained_at desc);

create table if not exists public.pet_interactions (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  actor_id   uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('feed','play','pat','travel','harvest')),
  created_at timestamptz not null default now()
);
create index if not exists idx_pet_int_couple_time on public.pet_interactions(couple_id, created_at desc);
create index if not exists idx_pet_int_antispam on public.pet_interactions(couple_id, actor_id, kind, created_at desc);

-- ---------- (C) RLS ----------
alter table public.pet_items       enable row level security;
alter table public.pet_inventory   enable row level security;
alter table public.pet_trips       enable row level security;
alter table public.pet_postcards   enable row level security;
alter table public.pet_interactions enable row level security;

drop policy if exists p_pet_items_read on public.pet_items;
create policy p_pet_items_read on public.pet_items for select using (true);
drop policy if exists p_pet_inv_all on public.pet_inventory;
create policy p_pet_inv_all on public.pet_inventory for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
drop policy if exists p_pet_trip_all on public.pet_trips;
create policy p_pet_trip_all on public.pet_trips for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
drop policy if exists p_pet_pc_all on public.pet_postcards;
create policy p_pet_pc_all on public.pet_postcards for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
drop policy if exists p_pet_int_all on public.pet_interactions;
create policy p_pet_int_all on public.pet_interactions for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));

-- ---------- (D) Realtime ----------
do $$ begin alter publication supabase_realtime add table public.pet_inventory;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.pet_trips;       exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.pet_postcards;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.pet_interactions;exception when duplicate_object then null; end $$;

-- ---------- (E) Storage：pet-assets 公开读 ----------
insert into storage.buckets (id, name, public) values ('pet-assets', 'pet-assets', true) on conflict do nothing;
drop policy if exists p_pet_assets_read on storage.objects;
create policy p_pet_assets_read on storage.objects for select using (bucket_id = 'pet-assets');

-- ---------- (F) catalog 种子（与 public/assets/pet/manifest.json 的 key 一致） ----------
insert into public.pet_items (key, category, name, asset_path, slot, unlock_level, unlock_intimacy, price, rarity, sort_order) values
 ('bento_normal','consumable','普通便当','assets/pet/item/props_travel_sheet.png',null,1,0,3,'normal',10),
 ('bento_deluxe','consumable','豪华便当','assets/pet/item/props_travel_sheet.png',null,1,0,8,'normal',11),
 ('charm','consumable','护身符','assets/pet/item/props_travel_sheet.png',null,1,0,15,'normal',12),
 ('hat_straw','outfit','草帽','assets/pet/outfit/hat_straw.png','head',1,0,0,'normal',20),
 ('hat_beanie','outfit','针织帽','assets/pet/outfit/hat_beanie.png','head',2,0,25,'normal',21),
 ('flower_crown','outfit','花环','assets/pet/outfit/flower_crown.png','head',1,40,30,'normal',22),
 ('bow_knot','outfit','粉蝴蝶结','assets/pet/outfit/bow_knot.png','neck',1,20,20,'normal',23),
 ('bow_tie','outfit','薄荷领结','assets/pet/outfit/bow_tie.png','neck',1,35,20,'normal',24),
 ('scarf_knit','outfit','针织围巾','assets/pet/outfit/scarf_knit.png','neck',3,0,30,'normal',25),
 ('glasses_round','outfit','圆框眼镜','assets/pet/outfit/glasses_round.png','eyes',4,0,35,'normal',26),
 ('sunglasses','outfit','墨镜','assets/pet/outfit/sunglasses.png','eyes',5,0,40,'normal',27),
 ('bed_wood','furniture','小木床','assets/pet/furniture/bed_wood.png',null,1,0,0,'normal',30),
 ('rug_wool','furniture','毛线地毯','assets/pet/furniture/rug_wool.png',null,2,0,25,'normal',31),
 ('plant_pot','furniture','绿植盆栽','assets/pet/furniture/plant_pot.png',null,1,30,30,'normal',32),
 ('bookshelf','furniture','小书架','assets/pet/furniture/bookshelf.png',null,5,0,50,'normal',33),
 ('toy_ball','furniture','毛线球','assets/pet/furniture/toy_ball.png',null,1,0,18,'normal',34),
 ('lantern','furniture','纸灯笼','assets/pet/furniture/lantern.png',null,1,50,55,'normal',35),
 ('tea_table','furniture','小茶几','assets/pet/furniture/tea_table.png',null,4,0,40,'normal',36),
 ('swing','furniture','小秋千','assets/pet/furniture/swing.png',null,7,0,60,'normal',37),
 ('bg_courtyard','background','庭院小窝','assets/pet/background/bg_courtyard.jpg',null,1,0,0,'normal',40),
 ('bg_starry','background','星空夜晚','assets/pet/background/bg_starry.jpg',null,6,0,60,'normal',41),
 ('bg_seaside','background','海边木廊','assets/pet/background/bg_seaside.jpg',null,1,60,60,'normal',42),
 ('bg_bedroom','background','卧室角落','assets/pet/background/bg_bedroom.jpg',null,4,0,45,'normal',43),
 ('bg_garden','background','花园小径','assets/pet/background/bg_garden.jpg',null,8,0,70,'normal',44),
 ('sakura','postcard','樱花树下','assets/pet/postcard/pc_sakura.jpg',null,1,0,0,'normal',50),
 ('lighthouse','postcard','海边灯塔','assets/pet/postcard/pc_lighthouse.jpg',null,1,0,0,'rare',51),
 ('onsen','postcard','山间温泉','assets/pet/postcard/pc_onsen.jpg',null,1,0,0,'normal',52),
 ('shrine','postcard','神社鸟居','assets/pet/postcard/pc_shrine.jpg',null,1,0,0,'rare',53),
 ('bamboo','postcard','竹林小径','assets/pet/postcard/pc_bamboo.jpg',null,1,0,0,'normal',54),
 ('snow','postcard','雪山','assets/pet/postcard/pc_snow.jpg',null,1,0,0,'rare',55),
 ('town','postcard','古城街道','assets/pet/postcard/pc_town.jpg',null,1,0,0,'normal',56),
 ('starry','postcard','星空草原','assets/pet/postcard/pc_starry_grassland.jpg',null,1,0,0,'rare',57),
 ('dango','souvenir','樱花团子','assets/pet/item/souvenir_parcel.png',null,1,0,5,'normal',60),
 ('tea','souvenir','焙茶包','assets/pet/item/souvenir_parcel.png',null,1,0,5,'normal',61)
on conflict (key) do nothing;


-- ============================================================
-- 003 隐私与精准定位迁移（幂等，可重复执行）
-- 1) profiles.album_shared：相册授权开关（默认关闭）
--    - 我方在相册页打开后，伴侣才能在共享相册看到我上传的照片
--    - p_profile_self 策略允许本人更新；p_profile_partner 允许伴侣读取该开关
-- 2) 精准定位无需改表：locations.lat/lng 本就是 double precision，
--    之前只在前端做了城市级四舍五入，现在直接上报 GPS 精确坐标。
-- ============================================================

alter table public.profiles
  add column if not exists album_shared boolean not null default false;

-- 历史数据：如果双方此前已经在共享相册传过照片，视为已互相授权，避免照片突然消失。
update public.profiles p
set album_shared = true
where p.couple_id is not null
  and exists (select 1 from public.photos ph where ph.uploader_id = p.id);


-- ============================================================
-- 安装校验：应返回 16 张表（15 张业务表 + 1 张迁移记录）/ 34 条商品 / 2 个桶 / 21 条策略
-- ============================================================
insert into public.schema_migrations (version) values ('001_init'), ('002_pet_v2'), ('003_privacy_precise')
  on conflict (version) do nothing;

select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE') as public_tables,
  (select count(*) from public.pet_items)        as pet_items,
  (select count(*) from storage.buckets)         as storage_buckets,
  (select count(*) from pg_policies
     where schemaname in ('public','storage'))   as rls_policies;
