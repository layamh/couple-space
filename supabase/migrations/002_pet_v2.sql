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
