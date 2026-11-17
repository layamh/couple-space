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

## 2. 后端（Supabase）· 一键初始化

后端代码全部在本仓库 `supabase/` 目录，随代码版本管理，无需自建服务器（GitHub Pages 只托管静态文件，跑不了常驻进程）。

**最快路径：只执行一个文件**

1. 在 [supabase.com](https://supabase.com) 创建项目（区域建议 Singapore）。
2. SQL Editor → New query → 粘贴 `supabase/setup-all.sql` 全文 → Run。
3. 左下角校验结果应显示：`public_tables=16、pet_items=34、storage_buckets=2、rls_policies=21`。
4. Project Settings → API，复制 `Project URL` 与 `anon public` 两个值。
5. 本地：复制 `.env.example` 为 `.env.local`，填这两个值后 `npm run dev`。

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的-anon-key
VITE_BASE_PATH=
```

6. 线上：仓库 Settings → Secrets and variables → Actions，同名新建两个 Secret，然后重跑 `Deploy to GitHub Pages` 工作流。密钥由 Actions 在构建时注入，**不需要本地打包**。

配置后 App 自动从演示模式切到真实模式：注册两个账号 → 一方生成 6 位邀请码 → 另一方输入配对，聊天 / 相册 / 宠物数据两人共享。

**想连后端的 SQL 也自动部署**：再加一个 Secret `SUPABASE_DB_URL`（Database → Connection string → URI），之后 push `supabase/` 下的改动会自动执行迁移，见 `.github/workflows/deploy-backend.yml`。

后端细节（表结构、RLS 策略、Auth 建议）见 [`supabase/README.md`](supabase/README.md)。

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
supabase/               # setup-all.sql（一键）+ migrations/ 迁移 + 后端说明
android/ ios/           # Capacitor 双端原生工程（APK / Xcode）
public/                 # manifest / sw / icon / assets（44 项 3D 黏土素材）
.github/workflows/      # 前端 Pages 部署 + 后端 SQL 自动迁移
```

## 6. 已知限制

- 图片上传前在浏览器压缩到最长边 1600px、JPEG 0.8；Supabase 免费版存储配额有限，请留意用量。
- 相册照片默认仅自己可见，需在相册页打开「允许对方查看我的相册」后伴侣才可见。
- 定位为 GPS 精准坐标（约 0.1 米精度），需用户在系统弹窗中允许定位权限；仅手动刷新时更新，关闭共享后对方不可见。
- 提醒本期仅 App 内呈现，不含系统推送。
- 二期可考虑：扫码插件、导出备份、纪念日系统通知、宠物自定义品种。
