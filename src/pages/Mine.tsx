import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import {
  ArrowRight,
  CalendarHeart,
  ChevronRight,
  Copy,
  Heart,
  MapPin,
  MessageCircleHeart,
  QrCode,
  Settings,
  Sparkles,
} from 'lucide-react';
import { GradientCard, SectionCard } from '@/components/Common';
import ClayIcon from '@/components/ClayIcon';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { brand } from '@/theme';
import type { LocationShare } from '@/types';

const ENTRIES = [
  { path: '/anniversary', label: '恋爱纪念日', description: '在一起天数与倒计时', icon: CalendarHeart },
  { path: '/wishlist', label: '共同心愿', description: '一起打卡，一起完成', icon: Sparkles },
  { path: '/whispers', label: '悄悄话留言', description: '只属于两人的心情日记', icon: MessageCircleHeart },
  { path: '/location', label: '位置共享', description: '查看对方大致位置', icon: MapPin },
  { path: '/settings', label: '设置', description: '账号、安装与通知', icon: Settings },
] as const;

/** 我的：配对信息、邀请码/二维码、定位开关与二级入口。 */
export default function Mine() {
  const navigate = useNavigate();
  const couple = useAppStore((state) => state.couple);
  const partner = useAppStore((state) => state.partner);
  const notify = useAppStore((state) => state.notify);
  const profile = useAuthStore((state) => state.profile);

  const [location, setLocation] = useState<LocationShare | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (!couple) return;
    let cancelled = false;
    const unsubscribe = services.location.subscribe(couple.id, (updated) => {
      if (!cancelled) setLocation(updated);
    });
    void services.location.get(couple.id).then((result) => {
      if (!cancelled && !result.error) setLocation(result.data);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [couple?.id]);

  if (!couple) return null;
  const days = services.anniversary.getDaysTogether(couple.start_date);
  const inviteLink = services.pairing.buildInviteLink(couple.code);

  async function copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(couple!.code);
      notify('邀请码已复制', 'success');
    } catch {
      notify(`邀请码：${couple!.code}`, 'info');
    }
  }

  async function toggleSharing(value: boolean): Promise<void> {
    const result = await services.location.setSharing(couple!.id, value);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '设置失败', 'error');
      return;
    }
    setLocation(result.data);
    notify(value ? '位置共享已开启' : '已关闭位置共享', 'success');
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <GradientCard sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 60, height: 60, borderRadius: '20px', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.28)', flexShrink: 0 }}>
          <Heart size={24} strokeWidth={1.75} color="#fff" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6">{profile?.nickname ?? '亲爱的'}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile?.email ?? ''}
          </Typography>
          <Chip size="small" label={`相爱 ${days} 天`} sx={{ mt: 0.75, bgcolor: 'rgba(255,255,255,.26)', color: '#fff', height: 22, fontSize: 11 }} />
        </Box>
      </GradientCard>

      <SectionCard title="我们的配对" subtitle="一个空间只属于两个人" icon={<Heart size={20} strokeWidth={1.75} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '20px', display: 'grid', placeItems: 'center', background: `linear-gradient(145deg, ${brand.pink}, ${brand.pinkDeep})`, color: '#fff', fontWeight: 700, mx: 'auto', mb: 0.5 }}>
              {(profile?.nickname ?? '我').slice(0, 1)}
            </Box>
            <Typography variant="caption">{profile?.nickname ?? '我'}</Typography>
          </Box>
          <Heart size={20} strokeWidth={1.75} color={brand.pink} />
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '20px', display: 'grid', placeItems: 'center', background: `linear-gradient(145deg, ${brand.purple}, #DCCBF0)`, color: '#fff', fontWeight: 700, mx: 'auto', mb: 0.5 }}>
              {(partner?.nickname ?? 'TA').slice(0, 1)}
            </Box>
            <Typography variant="caption">{partner?.nickname ?? '等待 TA'}</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">专属邀请码</Typography>
            <Typography variant="h6" sx={{ letterSpacing: 3, color: brand.pinkDeep }}>{couple.code}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button size="small" variant="outlined" startIcon={<Copy size={18} strokeWidth={1.75} />} onClick={() => void copyCode()}>复制</Button>
            <Button size="small" variant="outlined" startIcon={<QrCode size={18} strokeWidth={1.75} />} onClick={() => setQrOpen(true)}>二维码</Button>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          在一起起始日：{couple.start_date}
        </Typography>
      </SectionCard>

      <SectionCard title="位置共享" subtitle="仅展示城市级大致位置" icon={<MapPin size={20} strokeWidth={1.75} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {location?.sharing ? '正在与 TA 共享位置' : '当前未共享位置'}
            </Typography>
            <Typography variant="caption" color="text.secondary">随时可以关闭，关闭后对方将无法看到</Typography>
          </Box>
          <Switch checked={Boolean(location?.sharing)} onChange={(event) => void toggleSharing(event.target.checked)} />
        </Box>
      </SectionCard>

      <SectionCard title="更多功能" icon={<Sparkles size={20} strokeWidth={1.75} />} sx={{ pb: 1 }}>
        {ENTRIES.map((entry, index) => {
          const Icon = entry.icon;
          return (
            <Box key={entry.path}>
              <Box
                onClick={() => navigate(entry.path)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, cursor: 'pointer' }}
              >
                <ClayIcon icon={Icon} box={36} size={20} tone="pink" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{entry.description}</Typography>
                </Box>
                <ChevronRight size={18} strokeWidth={1.75} color={brand.inkSoft} />
              </Box>
              {index < ENTRIES.length - 1 && <Divider />}
            </Box>
          );
        })}
      </SectionCard>

      <Button variant="text" endIcon={<ArrowRight size={18} strokeWidth={1.75} />} onClick={() => navigate('/chat')}>
        去和 TA 说句话吧
      </Button>

      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} fullWidth maxWidth="xs">
        <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>扫描二维码加入我们的空间</Typography>
          <Box sx={{ bgcolor: '#FFFDFB', p: 2, display: 'inline-block', borderRadius: '20px', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.9), 0 6px 0 #EFB9CD, 0 14px 22px -8px rgba(120,80,100,.26)' }}>
            <QRCode value={inviteLink} size={210} level="M" fgColor="#5A4653" bgColor="#FFFFFF" />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, wordBreak: 'break-all' }}>
            {inviteLink}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
