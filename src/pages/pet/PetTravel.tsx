import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { Clock, Gift, Leaf, Luggage, Sparkles } from 'lucide-react';
import { SectionCard, ImageViewer } from '@/components/Common';
import { AssetThumb, PetImage, TravelPropSprite } from '@/pages/pet/PetAsset';
import { useAppStore } from '@/store/useAppStore';
import { brand } from '@/theme';
import type { Pet, PetInventory, PetItem, PetTrip, TravelSettleResult } from '@/types';

/** 旅行 Tab：备行囊 → 等待 → 归来结算卡片。 */
export default function PetTravel({
  pet,
  trip,
  inventory,
  items,
  result,
  onStart,
  onSettle,
  onSkip,
}: {
  pet: Pet;
  trip: PetTrip | null;
  inventory: PetInventory[];
  items: PetItem[];
  result: TravelSettleResult | null;
  onStart: (bentoKey: string, charmKey?: string | null) => void;
  onSettle: () => void;
  onSkip: () => void;
}) {
  const demoMode = useAppStore((state) => state.demoMode);
  const [bentoKey, setBentoKey] = useState('bento_normal');
  const [withCharm, setWithCharm] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [viewer, setViewer] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const qty = (key: string): number => inventory.find((entry) => entry.item_key === key)?.quantity ?? 0;
  const remaining = trip ? Math.max(0, Math.ceil((new Date(trip.back_at).getTime() - now) / 60_000)) : 0;
  const postcardItem = result?.postcard ? items.find((item) => item.key === result.postcard?.postcard_key) : null;

  if (result) {
    return (
      <Box className="card-pop-in" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SectionCard title="布丁回来啦！" subtitle="它带回了这些小礼物" icon={<Gift size={20} strokeWidth={1.75} />}>
          {postcardItem?.asset_path && (
            <Box
              onClick={() => postcardItem?.asset_path && setViewer(`${import.meta.env.BASE_URL}${postcardItem.asset_path}`)}
              sx={{ borderRadius: '16px', overflow: 'hidden', cursor: 'zoom-in', border: result.postcard?.rarity === 'rare' ? `2px solid #E8B45F` : '1px solid rgba(196,174,232,.3)' }}
            >
              <PetImage group="postcard" assetKey={result.postcard!.postcard_key} alt={postcardItem.name} fit="cover" style={{ width: '100%', aspectRatio: '4 / 3' }} />
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 0.75, mt: 2, flexWrap: 'wrap' }}>
            <Chip icon={<Leaf size={18} strokeWidth={1.75} />} label={`三叶草 +${result.trip.clovers_gained}`} sx={{ bgcolor: 'rgba(127,191,154,.18)' }} />
            <Chip icon={<Sparkles size={18} strokeWidth={1.75} />} label={`经验 +${result.trip.exp_gained}`} sx={{ bgcolor: `${brand.purple}1A` }} />
            <Chip icon={<Gift size={18} strokeWidth={1.75} />} label="亲密度 +10" sx={{ bgcolor: `${brand.pink}1A` }} />
            {result.souvenirKey && <Chip label={`土特产：${items.find((item) => item.key === result.souvenirKey)?.name ?? '小礼物'}`} />}
            {result.postcard?.rarity === 'rare' && <Chip label="稀有明信片" sx={{ bgcolor: '#FFF0C9', color: '#B8862E' }} />}
          </Box>
        </SectionCard>
        <ImageViewer url={viewer} caption={postcardItem?.name} onClose={() => setViewer(null)} />
      </Box>
    );
  }

  if (trip || pet.is_traveling) {
    return (
      <SectionCard title="旅行中…" subtitle="它在外面慢慢看世界，不打扰它哦" icon={<Luggage size={20} strokeWidth={1.75} />}>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '50%', background: 'linear-gradient(145deg,#FFF6E9,#F7C8D8)', animation: 'travel-glow 3s ease-in-out infinite' }}>
            <Luggage size={24} strokeWidth={1.75} color={brand.pinkDeep} />
          </Box>
          <Typography variant="h6" sx={{ mt: 2 }}>
            {remaining > 0 ? `还有 ${Math.floor(remaining / 60)} 小时 ${remaining % 60} 分` : '它已经到门口啦！'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            预计归来：{trip ? new Date(trip.back_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '稍后'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2.5 }}>
            {remaining <= 0 && <Button variant="contained" onClick={onSettle}>迎接布丁归来</Button>}
            {demoMode && remaining > 0 && <Button variant="outlined" onClick={onSkip}>⏩ 立即归来（演示）</Button>}
          </Box>
        </Box>
      </SectionCard>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionCard title="准备行囊" subtitle="选好便当就可以出发啦" icon={<Luggage size={20} strokeWidth={1.75} />}>
        <Typography variant="caption" color="text.secondary">便当（必选）</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25, mt: 1, mb: 2 }}>
          {(['bento_normal', 'bento_deluxe'] as const).map((key, index) => (
            <Box
              key={key}
              onClick={() => qty(key) > 0 && setBentoKey(key)}
              sx={{
                p: 1.25,
                borderRadius: '16px',
                cursor: qty(key) > 0 ? 'pointer' : 'not-allowed',
                border: bentoKey === key ? `2px solid ${brand.pink}` : '1px solid rgba(196,174,232,.25)',
                bgcolor: bentoKey === key ? 'rgba(233,131,168,.08)' : '#fff',
                opacity: qty(key) > 0 ? 1 : 0.5,
              }}
            >
              <AssetThumb><TravelPropSprite index={index as 0 | 1} size={34} /></AssetThumb>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontWeight: 700 }}>
                {key === 'bento_normal' ? '普通便当' : '豪华便当'} ×{qty(key)}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: brand.inkSoft }}>
                {key === 'bento_normal' ? '稀有机会 15%' : '稀有机会 40%'}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box
          onClick={() => qty('charm') > 0 && setWithCharm(!withCharm)}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderRadius: '14px', bgcolor: 'rgba(196,174,232,.08)', cursor: 'pointer' }}
        >
          <Checkbox size="small" checked={withCharm} disabled={qty('charm') <= 0} />
          <TravelPropSprite index={2} size={26} />
          <Typography variant="body2" sx={{ flex: 1 }}>带上护身符 ×{qty('charm')}</Typography>
          <Typography variant="caption" color="text.secondary">稀有 +25%</Typography>
        </Box>
        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={qty(bentoKey) <= 0}
          onClick={() => onStart(bentoKey, withCharm ? 'charm' : null)}
          sx={{ mt: 2.5 }}
        >
          出发旅行
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 1.5 }}>
          <Clock size={18} strokeWidth={1.75} color={brand.inkSoft} />
          <Typography variant="caption" color="text.secondary">
            {demoMode ? '演示模式：2–5 分钟即可归来' : '预计 2–8 小时后回来，到点打开 App 即可结算'}
          </Typography>
        </Box>
      </SectionCard>
    </Box>
  );
}
