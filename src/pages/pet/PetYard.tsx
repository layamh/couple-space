import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { Gamepad2, Hand, Heart, Leaf, ShoppingBag, Sparkles, Utensils } from 'lucide-react';
import { SectionCard } from '@/components/Common';
import { expToNext } from '@/services/contracts';
import { brand } from '@/theme';
import type { Pet, PetInteraction } from '@/types';

const KIND_LABEL: Record<string, string> = { feed: '喂了饭', play: '陪它玩', pat: '摸了摸', travel: '出门旅行', harvest: '收了三叶草' };

/** 庭院 Tab：五维数值、日常互动与共享照顾记录。 */
export default function PetYard({
  pet,
  interactions,
  bentoCount,
  onFeed,
  onInteract,
  onOpenShop,
}: {
  pet: Pet;
  interactions: PetInteraction[];
  bentoCount: number;
  onFeed: () => void;
  onInteract: (kind: 'play' | 'pat') => void;
  onOpenShop: () => void;
}) {
  const expStart = expToNext(pet.level);
  const expPercent = pet.level >= 10 ? 100 : Math.round(((pet.exp - expStart) / 100) * 100);

  const bars = [
    { label: '心情', value: pet.mood, color: brand.pink, icon: <Heart size={18} strokeWidth={1.75} /> },
    { label: '饱食', value: pet.fullness, color: '#E5A24C', icon: <Utensils size={18} strokeWidth={1.75} /> },
    { label: '亲密', value: pet.intimacy, color: brand.purple, icon: <Sparkles size={18} strokeWidth={1.75} /> },
    { label: '经验', value: Math.max(0, Math.min(100, expPercent)), color: '#7FBF9A', icon: <Sparkles size={18} strokeWidth={1.75} /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionCard
        title="今天的布丁"
        subtitle={pet.fullness < 20 ? '它有点饿了，记得喂饭哦' : '状态不错，陪它玩一会儿吧'}
        icon={<Sparkles size={20} strokeWidth={1.75} />}
        action={<Button size="small" variant="outlined" startIcon={<ShoppingBag size={18} strokeWidth={1.75} />} onClick={onOpenShop}>商店</Button>}
      >
        {bars.map((bar) => (
          <Box key={bar.label} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              <Box sx={{ color: bar.color, display: 'inline-flex' }}>{bar.icon}</Box>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{bar.label}</Typography>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">{bar.value}{bar.label === '经验' ? '%' : '/100'}</Typography>
            </Box>
            <LinearProgress variant="determinate" value={bar.value} sx={{ '& .MuiLinearProgress-bar': { bgcolor: bar.color } }} />
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 0.75, mt: 2, flexWrap: 'wrap' }}>
          <Chip size="small" icon={<Leaf size={18} strokeWidth={1.75} />} label={`三叶草 ${pet.clovers}`} sx={{ bgcolor: 'rgba(127,191,154,.16)', color: '#5D9B74' }} />
          <Chip size="small" label={`Lv.${pet.level} · ${pet.stage === 'teen' ? '少年' : pet.stage === 'adult' ? '成年' : pet.stage === 'baby' ? '幼年' : '蛋蛋'}`} sx={{ bgcolor: `${brand.purple}1A`, color: brand.purple }} />
        </Box>
      </SectionCard>

      <SectionCard title="陪它玩一会儿" subtitle="双方的照顾都会实时同步" icon={<Gamepad2 size={20} strokeWidth={1.75} />}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
          <Button variant="contained" disabled={bentoCount <= 0 || pet.fullness >= 100} onClick={onFeed} sx={{ py: 1.2, flexDirection: 'column', gap: 0.4 }}>
            <Utensils size={20} strokeWidth={1.75} />
            <Typography variant="caption">喂食 · {bentoCount}</Typography>
          </Button>
          <Button variant="outlined" onClick={() => onInteract('play')} sx={{ py: 1.2, flexDirection: 'column', gap: 0.4, borderColor: `${brand.purple}80`, color: brand.purple }}>
            <Gamepad2 size={20} strokeWidth={1.75} />
            <Typography variant="caption">陪玩</Typography>
          </Button>
          <Button variant="outlined" onClick={() => onInteract('pat')} sx={{ py: 1.2, flexDirection: 'column', gap: 0.4, borderColor: `${brand.pink}80`, color: brand.pinkDeep }}>
            <Hand size={20} strokeWidth={1.75} />
            <Typography variant="caption">摸摸</Typography>
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          喂食消耗 1 份便当；每种互动 30 分钟内只计一次收益
        </Typography>
      </SectionCard>

      {interactions.length > 0 && (
        <SectionCard title="一起养的日常" subtitle="我们共同照顾它的记录" icon={<Heart size={20} strokeWidth={1.75} />}>
          {interactions.slice(0, 4).map((item) => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: item.actor_id === 'demo-partner' ? brand.purple : brand.pink }} />
              <Typography variant="caption" color="text.secondary">
                {item.actor_id === 'demo-partner' ? '小北' : '我'} {KIND_LABEL[item.kind] ?? item.kind}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" sx={{ fontSize: 10, color: brand.inkSoft }}>
                {new Date(item.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
          ))}
        </SectionCard>
      )}
    </Box>
  );
}
