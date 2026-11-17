# 后端说明（Supabase）

这个项目的后端**不是自建服务器**，而是 Supabase 提供的托管 Postgres + Auth + Storage + Realtime。
所有后端代码（建表、行级安全、触发器、RPC、存储桶、种子数据）都在本目录，随仓库一起版本管理。

> 为什么不用 Node 服务器？GitHub Pages 只能托管静态文件，跑不了常驻进程；
> 而聊天实时推送、相册图片存储、账号登录这些能力，Supabase 免费额度已经全部覆盖，
> 自己写服务器反而要为「实时 + 存储 + 鉴权」各配一套，成本更高。

## 目录

| 文件 | 作用 |
| --- | --- |
| `setup-all.sql` | **一键初始化**：合并 001 + 002 + 003，幂等（可重复执行） |
| `migrations/001_init.sql` | 基础 10 张表 / RLS / 配对 RPC / Realtime / 相册桶 |
| `migrations/002_pet_v2.sql` | 宠物 v2：5 张表 / 34 条商品种子 / pet-assets 桶 |
| `migrations/003_privacy_precise.sql` | 隐私：`profiles.album_shared` 相册授权开关（精准定位无需改表） |
| `../.github/workflows/deploy-backend.yml` | 推送即自动执行迁移 |

## 一次性开通（约 5 分钟）

1. 打开 [supabase.com](https://supabase.com) → New project，区域选 `Southeast Asia (Singapore)`，设置数据库密码并记下来。
2. 进入项目 → 左侧 **SQL Editor** → New query → 把 `setup-all.sql` 全文粘贴进去 → **Run**。
3. 左下角应看到：`public_tables=16, pet_items=34, storage_buckets=2, rls_policies=21`。
4. 左侧 **Project Settings → API**，复制两个值：
   - `Project URL` → 环境变量 `VITE_SUPABASE_URL`
   - `anon public` key → 环境变量 `VITE_SUPABASE_ANON_KEY`
5. 回到 GitHub 仓库 → Settings → Secrets and variables → Actions，新建这两个 Secret（名字必须完全一致）。
6. 重新跑一次前端部署：Actions → `Deploy to GitHub Pages` → Run workflow。

此时 App 自动从「演示模式」切到「真实模式」：注册两个账号 → 一方生成 6 位邀请码 → 另一方输入即可配对，聊天/相册/宠物数据两人共享。

## 让后端也自动部署（可选）

在 Secrets 里再加一个 `SUPABASE_DB_URL`（Project Settings → Database → Connection string → URI，密码需 URL 编码），
之后每次修改 `supabase/` 下的 SQL 并 push，`Deploy Backend (Supabase)` 工作流会自动执行迁移并回显校验结果。

## Auth 建议设置

- **Authentication → Providers → Email**：个人使用建议关掉 `Confirm email`，注册后免邮箱验证直接登录。
- **Authentication → URL Configuration**：`Site URL` 填 `https://你的用户名.github.io/仓库名/`，否则邮件里的回跳链接会指向 localhost。

## 安全模型

- 每张业务表都开启了 **RLS**，策略统一为 `is_couple_member(couple_id)`：只能读写自己情侣空间的数据。
- 配对走 `security definer` 的 RPC（`create_couple` / `join_couple`），客户端无法伪造 `couple_id`。
- 相册桶 `photos` 公开读（图片链接可分享给伴侣），写入/删除限定在 `couple_id/` 前缀下。
- `anon` key 可以安全地放在前端：它只代表「未登录身份」，真正的权限由 RLS 决定。

## 隐私授权与精准定位

- **精准定位**：前端直接上报 GPS 坐标（6 位小数，约 0.1 米精度），用户在系统弹窗中允许定位权限后生效；`locations.accuracy` 存米数，前端如实显示。
- **相册授权**：`profiles.album_shared` 默认 `false`。只有双方各自在相册页打开开关后，伴侣才能看到 TA 上传的照片；`album.listPhotos` 在服务端按此过滤，自己的照片始终可见。
- 两个开关都在 App 内自助操作，不需要动数据库。
