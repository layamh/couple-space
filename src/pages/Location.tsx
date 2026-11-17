import { useEffect, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { LocateFixed, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { SectionCard } from '@/components/Common';
import ClayIcon from '@/components/ClayIcon';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { brand } from '@/theme';
import type { LocationShare } from '@/types';

/** 把城市级坐标转成友好文案，不暴露精确地址。 */
function locationLabel(lat: number, lng: number): string {
  if (Math.abs(lat - 31.23) < 0.015 && Math.abs(lng - 121.47) < 0.015) {
    return '上海市 · 人民广场附近';
  }
  return `大约位于 ${lat.toFixed(2)}°, ${lng.toFixed(2)}° 附近`;
}

/** 定位共享页：双方大致位置、最后更新时间、共享开关与授权说明。 */
export default function Location() {
  const couple = useAppStore((state) => state.couple);
  const partner = useAppStore((state) => state.partner);
  const notify = useAppStore((state) => state.notify);
  const session = useAuthStore((state) => state.session);

  const [location, setLocation] = useState<LocationShare | null>(null);
  const [busy, setBusy] = useState(false);

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
  const sharing = Boolean(location?.sharing);
  const lastUpdated = location?.updated_at
    ? formatDistanceToNow(parseISO(location.updated_at), { addSuffix: true, locale: zhCN })
    : '暂无记录';

  async function toggleSharing(value: boolean): Promise<void> {
    const result = await services.location.setSharing(couple!.id, value);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '设置失败', 'error');
      return;
    }
    setLocation(result.data);
    notify(value ? '已开启位置共享' : '已关闭位置共享，对方将无法看到你的位置', 'success');
  }

  async function refresh(): Promise<void> {
    if (!session) return;
    setBusy(true);
    const result = await services.location.update(couple!.id, session.user.id);
    setBusy(false);
    if (result.error || !result.data) {
      notify(result.error?.message ?? '定位失败', 'error');
      return;
    }
    setLocation(result.data);
    notify('位置已更新（城市级精度，保护隐私）', 'success');
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionCard title="隐私优先的位置共享" subtitle="默认只展示城市级大致位置" icon={<ShieldCheck size={20} strokeWidth={1.75} />}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          开启后，TA 只能看到你所在的大致区域和最后更新时间，不会暴露精确门牌号。
          只有手动点击“刷新我的位置”才会更新，不做后台持续追踪；你可以随时关闭。
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1.5, borderTop: '1px solid rgba(196,174,232,.18)' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>与我共享位置</Typography>
          <Switch checked={sharing} onChange={(event) => void toggleSharing(event.target.checked)} />
        </Box>
      </SectionCard>

      <SectionCard
        title={`${partner?.nickname ?? 'TA'} 的位置`}
        subtitle={`最后更新：${lastUpdated}`}
        icon={<MapPin size={20} strokeWidth={1.75} />}
      >
        {!sharing || !location ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex' }}><ClayIcon icon={MapPin} box={40} tone="lavender" /></Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {sharing ? '还没有位置信息，提醒 TA 刷新一下吧' : '对方已关闭位置共享'}
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                height: 188,
                borderRadius: '20px',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#E7F1F2',
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                border: '1px solid rgba(191,230,214,.8)',
                boxShadow: 'inset 0 2px 4px rgba(120,80,100,.1), 0 4px 0 #EFB9CD, 0 10px 16px -6px rgba(120,80,100,.2)',
              }}
            >
              <Box sx={{ position: 'absolute', left: '46%', top: '44%', width: 70, height: 70, borderRadius: '50%', bgcolor: brand.pink, className: 'soft-pulse' }} />
              <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: brand.pinkDeep }}>
                <MapPin size={24} strokeWidth={1.75} />
              </Box>
              <Box sx={{ position: 'absolute', left: '50%', top: 'calc(50% + 22px)', transform: 'translateX(-50%)', px: 1.25, py: 0.4, borderRadius: '999px', bgcolor: 'rgba(255,255,255,.92)', whiteSpace: 'nowrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: brand.ink }}>
                  {partner?.nickname ?? 'TA'} 在这里
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
              <Navigation size={18} strokeWidth={1.75} color={brand.purple} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {locationLabel(location.lat, location.lng)}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              精度约 {location.accuracy ? `${Math.max(500, location.accuracy)} 米` : '1 公里'} · {lastUpdated}
            </Typography>
          </>
        )}
      </SectionCard>

      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={busy}
        onClick={() => void refresh()}
        startIcon={<LocateFixed size={20} strokeWidth={1.75} />}
      >
        {busy ? '正在定位…' : '刷新我的位置'}
      </Button>
      <Typography variant="caption" color="text.secondary" align="center">
        浏览器 / APK 会请求定位授权；拒绝也不影响其他功能使用
      </Typography>
    </Box>
  );
}
