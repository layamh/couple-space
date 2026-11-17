import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { ArrowRight, CalendarHeart, Flame, Heart, Leaf, MapPin, MessageCircleHeart, PawPrint, Sparkles, Utensils } from 'lucide-react';
import { CandyRain, GradientCard, SectionCard } from '@/components/Common';
import ClayIcon, { type ClayTone } from '@/components/ClayIcon';
import { PetImage } from '@/pages/pet/PetAsset';
import { characterKeyFor } from '@/pages/pet/PetScene';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { brand } from '@/theme';
import type { Anniversary, Whisper } from '@/types';

const QUICK_LINKS: ReadonlyArray<{ path: string; label: string; icon: typeof Sparkles; tone: ClayTone; color: string }> = [
  { path: '/wishlist', label: '心愿打卡', icon: Sparkles, tone: 'pink', color: 'linear-gradient(145deg,#F7B4CC,#EC7FA6)' },
  { path: '/whispers', label: '悄悄话', icon: MessageCircleHeart, tone: 'lavender', color: 'linear-gradient(145deg,#DCCBF0,#B9A0E0)' },
  { path: '/anniversary', label: '纪念日', icon: CalendarHeart, tone: 'apricot', color: 'linear-gradient(145deg,#FFE6C4,#F7C98E)' },
  { path: '/location', label: '位置共享', icon: MapPin, tone: 'mint', color: 'linear-gradient(145deg,#CFEDE2,#A8DCC8)' },
];

const STAGE_LABEL: Record<string, string> = { egg: '蛋蛋期', baby: '幼年期', teen: '成长期', adult: '成年期' };

/** 首页：在一起天数、宠物概览、纪念日倒计时与快捷入口。 */
export default function Home() {
  const navigate = useNavigate();
  const couple = useAppStore((state) => state.couple);
  const partner = useAppStore((state) => state.partner);
  const pet = useAppStore((state) => state.pet);
  const notify = useAppStore((state) => state.notify);
  const profile = useAuthStore((state) => state.profile);

  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [latestWhisper, setLatestWhisper] = useState<Whisper | null>(null);
  const [candy, setCandy] = useState(0);

  useEffect(() => {
    if (!couple) return;
    let cancelled = false;
    void (async () => {
      const anniversaryResult = await services.anniversary.list(couple.id);
      const whisperResult = await services.whisper.list(couple.id);
      if (cancelled) return;
      if (!anniversaryResult.error && anniversaryResult.data) setAnniversaries(anniversaryResult.data);
      if (!whisperResult.error && whisperResult.data) setLatestWhisper(whisperResult.data[0] ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [couple?.id]);

  useEffect(() => {
    if (anniversaries.length === 0) return;
    const upcoming = services.anniversary.getNext(anniversaries);
    if (upcoming?.daysLeft === 0) {
      notify(`${upcoming.item.title}就是今天，记得庆祝呀！`, 'warning');
      setCandy((value) => value + 1);
    }
  }, [anniversaries, notify]);

  if (!couple) return null;

  const days = services.anniversary.getDaysTogether(couple.start_date);
  const next = services.anniversary.getNext(anniversaries);
  const hour = new Date().getHours();
  const greeting = hour < 6 ? '夜深啦' : hour < 11 ? '早安呀' : hour < 14 ? '午安呀' : hour < 18 ? '下午好呀' : '晚上好呀';
  const myName = profile?.nickname ?? '亲爱的';
  const partnerName = partner?.nickname ?? 'TA';

  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <CandyRain trigger={candy} count={10} />

      <GradientCard sx={{ p: 2.5, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', right: 6, top: 4, opacity: 0.2 }}>
          <Heart size={24} strokeWidth={1.75} color="#fff" />
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {greeting}，{myName} ❤️
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mt: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1, fontSize: 52 }}>
            {days}
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 0.75 }}>天</Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.95 }}>
          和 {partnerName} 一起走过的第 {days} 天
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5 }}>
          <Chip
            size="small"
            label={`始于 ${format(new Date(`${couple.start_date}T00:00:00`), 'yyyy年M月d日')}`}
            sx={{ bgcolor: 'rgba(255,255,255,.24)', color: '#fff', fontSize: 11 }}
          />
          <Chip size="small" label={`邀请码 ${couple.code}`} sx={{ bgcolor: 'rgba(255,255,255,.24)', color: '#fff', fontSize: 11 }} />
        </Box>
      </GradientCard>

      {next && (
        <SectionCard
          title="下一个重要日子"
          subtitle={next.item.title}
          icon={<CalendarHeart size={20} strokeWidth={1.75} />}
          action={<Button size="small" endIcon={<ArrowRight size={18} strokeWidth={1.75} />} onClick={() => navigate('/anniversary')}>全部</Button>}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" sx={{ color: brand.pinkDeep, fontWeight: 800 }}>
                {next.daysLeft === 0 ? '今天' : next.daysLeft}
                {next.daysLeft > 0 && <Typography component="span" variant="subtitle1"> 天</Typography>}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(`${next.item.date}T00:00:00`), 'yyyy年M月d日')}
              </Typography>
            </Box>
            <ClayIcon icon={Heart} box={44} size={24} tone="pink" />
          </Box>
        </SectionCard>
      )}

      <SectionCard
        title="我们的宠物"
        subtitle={pet ? `${pet.name} · Lv.${pet.level} ${STAGE_LABEL[pet.stage] ?? pet.stage}` : '正在赶来…'}
        icon={<PawPrint size={20} strokeWidth={1.75} />}
        action={<Button size="small" endIcon={<ArrowRight size={18} strokeWidth={1.75} />} onClick={() => navigate('/pet')}>看看它</Button>}
      >
        {pet ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box className="clay-pressable" sx={{ flexShrink: 0, width: 96, height: 96, borderRadius: '20px', background: 'linear-gradient(145deg,#FFF9F0,#E4F5EE)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 4px 0 #EFB9CD, 0 10px 16px -6px rgba(120,80,100,.2)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              <PetImage group="character" assetKey={characterKeyFor(pet)} alt={pet.name} style={{ width: 92, height: 92 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <Sparkles size={18} strokeWidth={1.75} color={brand.purple} />
                <Typography variant="caption" color="text.secondary">
                  Lv.{pet.level} · {STAGE_LABEL[pet.stage] ?? pet.stage}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                <Utensils size={18} strokeWidth={1.75} color={brand.pink} />
                <Typography variant="caption" color="text.secondary">饱食度 {pet.fullness}/100</Typography>
              </Box>
              <LinearProgress variant="determinate" value={pet.fullness} sx={{ mb: 0.75 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Leaf size={18} strokeWidth={1.75} color={brand.purple} />
                <Typography variant="caption" color="text.secondary">三叶草 {pet.clovers} 株</Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">还没有宠物，去 Pet 页领养一只吧</Typography>
        )}
      </SectionCard>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              className="clay-pressable"
              sx={{
                p: 2,
                borderRadius: '20px',
                color: '#fff',
                cursor: 'pointer',
                background: item.color,
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,.45), 0 6px 0 #E7A7C0, 0 12px 18px -6px rgba(120,80,100,.24)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
              }}
            >
              <ClayIcon icon={Icon} box={36} size={20} tone={item.tone} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.label}</Typography>
            </Box>
          );
        })}
      </Box>

      {latestWhisper && (
        <SectionCard title="最近的一句悄悄话" icon={<MessageCircleHeart size={20} strokeWidth={1.75} />} action={<Button size="small" onClick={() => navigate('/whispers')}>更多</Button>}>
          <Typography variant="body2" sx={{ lineHeight: 1.8, color: brand.ink }}>
            “{latestWhisper.content}”
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
            <Flame size={18} strokeWidth={1.75} color={brand.pink} />
            <Typography variant="caption" color="text.secondary">
              {latestWhisper.author_id === couple.partner1 ? myName : partnerName} · {format(new Date(latestWhisper.created_at), 'M月d日 HH:mm')}
            </Typography>
          </Box>
        </SectionCard>
      )}
    </Box>
  );
}
