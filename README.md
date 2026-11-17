# Couple Space · 我们的小宇宙

情侣私人 App：邀请码配对后，两人可以在专属空间里聊天、养宠物、共享相册、记录纪念日、共同心愿打卡、互留悄悄话、查看大致位置。

- 技术栈：Vite 5 + React 18 + TypeScript + MUI 5 + Tailwind CSS 3 + Zustand 4 + react-router-dom 6（HashRouter）+ Supabase 2 + lucide-react + react-qr-code + date-fns
- 交付形态：Web / PWA（GitHub Pages）+ Android APK + iOS（Capacitor 双端）
- 视觉风格：**3D 黏土盲盒手办风**（马卡龙色板：黏土柔粉 `#F4A6C1` / 薰衣草 `#C4AEE8` / 暖杏 `#FFD9AE` / 薄荷 `#BFE6D6`，奶油白底），UI 控件黏土立体质感（厚度边+柔影+内高光+果冻动效），44 项 AI 3D 黏土素材（角色/场景/服饰/家具/明信片/道具），图标统一 lucide-react + 黏土底座、`strokeWidth={1.75}`、尺寸 18/20/24。

## 1. 本地运行（零配置演示模式）

```bash
cd couple-space
npm install
npm run dev
```

打开终端显示的地址（默认 `http://localhost:5173/`）。**不需要创建 `.env`**：没有 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 时自动进入演示模式，顶部有醒目提示条，内置聊天、相册、宠物、纪念日、心愿、悄悄话、定位等完整假数据。

演示模式下所有写操作只改内存，刷新页面恢复初始数据。推荐体验路径：

1. 登录页点「一键进入演示空间」→ 直接看到完整的首页与 5 个 Tab。
2. 或点「体验配对流程」→ 创建空间获得邀请码 `DEMO123` 与二维码；退出后可用「加入空间」输入 6 位邀请码完成配对。
3. 聊天可发文字 / 表情 / 图片；相册可上传并大图预览；宠物可喂食、陪玩、摸摸并看到成长值变化；心愿可打卡并累积连续天数；悄悄话发布有撒糖动效。

## 2. 真实模式（Supabase）

1. 在 [supabase.com](https://supabase.com) 创建项目。
2. 进入 SQL Editor，整体执行一次 `supabase/migrations/001_init.sql`（它包含 10 张表、索引、RLS、`create_couple` / `join_couple` 两个 RPC、Realtime 发布、Storage 桶，以及新用户自动建档案的 trigger）。
3. 在 Supabase 控制台确认：`Authentication → Providers → Email` 已启用；`photos` bucket 为 public（读公开，写由 RLS 限制）；相关表已加入 `supabase_realtime` publication（SQL 已包含）。
4. 复制 `.env.example` 为 `.env.local`，填写：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的-anon-key
VITE_BASE_PATH=
```

5. 重新执行 `npm run dev`。两个变量都填写后自动切换为真实模式，页面不再显示演示提示。AnonKey 可公开，但数据安全由 RLS 保证；不要把 Service Role Key 写入前端。

> 配置密钥后演示内存数据不会迁移，也不会再出现。

## 3. 构建与部署

```bash
npm run build     # tsc --noEmit && vite build，产物在 dist/
npm run preview   # 本地预览构建产物
```

### GitHub Pages 子路径部署（两种方式任选）

**方式 A：自动部署（推荐，已内置）**

仓库已包含 `.github/workflows/deploy.yml`——把代码推送到 GitHub 后，只要在仓库 `Settings → Pages → Build and deployment` 把 Source 选为 **GitHub Actions**，之后每次 push 到 `main` 都会自动构建并发布。

可选：在仓库 `Settings → Secrets and variables → Actions` 添加 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY` 两个 Secret，工作流会注入构建（不加则为演示模式）。

访问地址为 `https://你的用户名.github.io/仓库名/`（工作流自动按仓库名计算子路径）。

**方式 B：本地构建手动发布**

```bash
VITE_BASE_PATH=/你的仓库名/ npm run build   # 仓库名不是 couple-space 时替换
npx gh-pages -d dist                        # 或直接把 dist/ 推到 gh-pages 分支
```

## 4. PWA 与双端 App（Android + iOS 通用）

- PWA：生产构建后 `sw.js` 会自动注册（仅 `import.meta.env.PROD`）。核心 shell 预缓存 + 同源 GET 缓存优先，离线也能打开演示模式。手机浏览器菜单选择「添加到主屏幕」即可像 App 一样安装使用（Android Chrome / iOS Safari 均支持）。

- **Android APK**：

```bash
npm run cap:sync:android    # 构建网页产物并同步到 android 工程
npm run cap:open:android    # 打开 Android Studio
```

在 Android Studio 中：`Build → Build Bundle(s)/APK(s) → Build APK(s)` 生成 APK（调试版），发布版用 `Generate Signed Bundle / APK` 自签名。

- **iOS（通用方案说明）**：

```bash
npm run cap:sync:ios        # 构建网页产物并同步到 ios 工程
npm run cap:open:ios        # 打开 Xcode（需 Mac）
```

在 Xcode 中选择真机或模拟器，`Product → Run` 调试；发布用 `Product → Archive`，然后通过 TestFlight 分发或直接安装。

> iOS 硬性条件：需要一台 **Mac（含 Xcode）** + Apple ID。个人免费账号可直接真机安装（证书 7 天过期需重签）；花 99 美元/年的开发者账号可上 TestFlight 长期使用。App Store 上架需另行审核。**iOS 无法在 Windows/Linux 上打包**——如果没有 Mac，最简单的方式是：两人都用 PWA（添加到主屏幕），Android 侧额外装 APK；体验与功能完全一致。

- `capacitor.config.ts` 配置 `appId: com.couplespace.app`、`appName: Couple Space`、`webDir: dist`、`androidScheme: https`。定位在 App 内走原生权限（iOS 的定位授权弹窗由系统自动处理），运行时授权即可。

## 5. 目录结构

```
src/
  types.ts              # 全部业务类型与 Result<T>
  theme.ts              # MUI 主题（配色/圆角/阴影）
  router.tsx            # 12 条路由 + 两级守卫
  services/             # contracts 抽象 + real(supabase) / mock(内存) 双实现
  store/                # auth / app 两个 Zustand store
  components/           # Layout / Common / 守卫 / DemoBanner
  pages/                # 12 个页面
supabase/migrations/    # 001_init.sql + 002_pet_v2.sql
android/ ios/           # Capacitor 双端原生工程（APK / Xcode）
public/                 # manifest / sw / icon / assets（44 项 3D 黏土素材）
.github/workflows/      # GitHub Pages 自动部署
```

## 6. 已知限制

- 图片上传前在浏览器压缩到最长边 1600px、JPEG 0.8；Supabase 免费版存储配额有限，请留意用量。
- 定位只上报城市级坐标（约 0.01°），且仅手动刷新时更新；关闭共享后对方不可见。
- 提醒本期仅 App 内呈现，不含系统推送。
- 二期可考虑：扫码插件、导出备份、纪念日系统通知、宠物自定义品种。
