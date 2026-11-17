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
