import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import {
  ArrowLeft,
  Heart,
  Home,
  Images,
  MessageCircle,
  PawPrint,
  User,
} from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import ClayIcon, { type ClayTone } from '@/components/ClayIcon';

const TABS: ReadonlyArray<{ path: string; label: string; icon: typeof Home; tone: ClayTone }> = [
  { path: '/', label: '首页', icon: Home, tone: 'pink' },
  { path: '/chat', label: '聊天', icon: MessageCircle, tone: 'lavender' },
  { path: '/album', label: '相册', icon: Images, tone: 'apricot' },
  { path: '/pet', label: '宠物', icon: PawPrint, tone: 'mint' },
  { path: '/mine', label: '我的', icon: User, tone: 'pink' },
];

const SECONDARY_TITLES: Record<string, string> = {
  '/anniversary': '我们的纪念日',
  '/wishlist': '共同心愿',
  '/whispers': '悄悄话',
  '/location': '位置共享',
  '/settings': '设置',
};

/** 全局布局：渐变顶栏、480px 居中内容区、固定 5 Tab 底部导航。 */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const isPrimary = TABS.some((tab) => tab.path === pathname);
  const title = TABS.find((tab) => tab.path === pathname)?.label ?? SECONDARY_TITLES[pathname] ?? 'Couple Space';
  const activeTab = Math.max(0, TABS.findIndex((tab) => tab.path === pathname));

  return (
    <Box sx={{ minHeight: '100vh', pb: isPrimary ? '84px' : '24px' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(120deg, #F4A6C1 0%, #EC9BBE 48%, #C4AEE8 100%)',
          boxShadow: 'inset 0 -2px 0 rgba(255,255,255,.28), 0 4px 0 #EFB9CD, 0 12px 20px -8px rgba(120,80,100,.32)',
        }}
      >
        <Toolbar sx={{ maxWidth: 480, mx: 'auto', width: '100%', minHeight: '56px !important', px: 1.25 }}>
          {!isPrimary && (
            <IconButton aria-label="返回" onClick={() => navigate(-1)} sx={{ color: '#fff', mr: 0.5 }}>
              <ArrowLeft size={20} strokeWidth={1.75} />
            </IconButton>
          )}
          {isPrimary && (
            <Box sx={{ mr: 1.25, display: 'inline-flex' }}>
              <ClayIcon icon={Heart} box={36} size={18} tone="apricot" />
            </Box>
          )}
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: 0.4 }}>
            {title}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.85)', fontSize: 11 }}>
            {isPrimary ? '❤ Couple Space' : ''}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" className="mx-auto w-full max-w-[480px] px-4 pt-4">
        <Outlet />
      </Box>

      {isPrimary && (
        <Box
          className="clay-tray"
          sx={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 480,
            zIndex: 1200,
            pb: 'env(safe-area-inset-bottom)',
            borderRadius: '28px 28px 0 0',
            overflow: 'hidden',
            background: 'linear-gradient(180deg,#FFFDFB 0%,#FFF8F1 100%)',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,.85), 0 -3px 0 #EFB9CD, 0 -12px 28px -10px rgba(120,80,100,.28)',
          }}
        >
          <BottomNavigation
            value={activeTab}
            showLabels
            onChange={(_event, newValue: number) => navigate(TABS[newValue].path)}
            sx={{ height: 66, background: 'transparent' }}
          >
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <BottomNavigationAction
                  key={tab.path}
                  label={tab.label}
                  icon={
                    <ClayIcon
                      icon={Icon}
                      box={36}
                      size={20}
                      tone={tab.tone}
                      selected={activeTab === index}
                    />
                  }
                />
              );
            })}
          </BottomNavigation>
        </Box>
      )}
    </Box>
  );
}
