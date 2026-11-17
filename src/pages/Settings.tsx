import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Bell, Download, Heart, Info, LogOut, Mail, MoreHorizontal, ShieldCheck, Smartphone } from 'lucide-react';
import { GradientCard, SectionCard } from '@/components/Common';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { brand } from '@/theme';

/** 设置页：账号信息、PWA 安装引导、通知设置与退出登录。 */
export default function Settings() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const couple = useAppStore((state) => state.couple);
  const demoMode = useAppStore((state) => state.demoMode);
  const notify = useAppStore((state) => state.notify);
  const setCouple = useAppStore((state) => state.setCouple);
  const setPartner = useAppStore((state) => state.setPartner);
  const setPet = useAppStore((state) => state.setPet);

  const [inAppNotice, setInAppNotice] = useState(true);
  const [busy, setBusy] = useState(false);

  async function handleLogout(): Promise<void> {
    setBusy(true);
    const result = await signOut();
    setBusy(false);
    if (result.error) {
      notify(result.error.message, 'error');
      return;
    }
    setCouple(null);
    setPartner(null);
    setPet(null);
    navigate('/login', { replace: true });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <GradientCard sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '20px', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.28)', flexShrink: 0 }}>
          <Heart size={24} strokeWidth={1.75} color="#fff" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6">{profile?.nickname ?? '亲爱的'}</Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, opacity: 0.9, fontSize: 12 }}>
            <Mail size={18} strokeWidth={1.75} /> {profile?.email ?? '未登录'}
          </Typography>
        </Box>
      </GradientCard>

      <SectionCard title="安装到手机" subtitle="像 App 一样全屏使用" icon={<Smartphone size={20} strokeWidth={1.75} />}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.85 }}>
          在浏览器中点击菜单（<MoreHorizontal size={18} strokeWidth={1.75} />），选择“添加到主屏幕”或“安装应用”，
          即可离线打开 Couple Space。Android 也可以使用 Capacitor 打包的 APK。
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, color: brand.purple }}>
          <Download size={18} strokeWidth={1.75} />
          <Typography variant="caption">PWA 已配置，支持离线展示演示模式</Typography>
        </Box>
      </SectionCard>

      <SectionCard title="通知提醒" subtitle="本期提供 App 内提醒" icon={<Bell size={20} strokeWidth={1.75} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>纪念日 / 打卡提醒</Typography>
            <Typography variant="caption" color="text.secondary">在首页与纪念日页高亮提示</Typography>
          </Box>
          <Switch
            checked={inAppNotice}
            onChange={(event) => {
              setInAppNotice(event.target.checked);
              notify(event.target.checked ? '已开启 App 内提醒' : '已关闭 App 内提醒', 'success');
            }}
          />
        </Box>
      </SectionCard>

      <SectionCard title="关于" icon={<Info size={20} strokeWidth={1.75} />}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">版本</Typography>
          <Typography variant="body2">v1.0.0</Typography>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">运行模式</Typography>
          <Typography variant="body2" sx={{ color: demoMode ? brand.pinkDeep : '#6CA985', fontWeight: 700 }}>
            {demoMode ? '演示模式（数据不保存）' : '云端同步模式'}
          </Typography>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">配对空间</Typography>
          <Typography variant="body2">{couple?.code ?? '未配对'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5 }}>
          <ShieldCheck size={18} strokeWidth={1.75} color={brand.inkSoft} />
          <Typography variant="caption" color="text.secondary">数据保存在你自己的 Supabase 项目中</Typography>
        </Box>
      </SectionCard>

      <Button
        fullWidth
        variant="outlined"
        disabled={busy}
        startIcon={<LogOut size={20} strokeWidth={1.75} />}
        onClick={() => void handleLogout()}
        sx={{
          borderColor: 'rgba(222,124,150,.6)',
          color: '#CF6A82',
          mt: 1,
          boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,.7), 0 3px 0 #E8B0BE',
          '&:active': { boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6), 0 1px 0 #E8B0BE' },
        }}
      >
        {busy ? '正在退出…' : '退出登录'}
      </Button>
      <Typography variant="caption" align="center" color="text.secondary" sx={{ mb: 2 }}>
        Made with ❤️ for two
      </Typography>
    </Box>
  );
}
