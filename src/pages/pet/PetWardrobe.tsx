import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { Check, Lock, Store } from 'lucide-react';
import { SectionCard } from '@/components/Common';
import { AssetThumb, PetImage } from '@/pages/pet/PetAsset';
import { isUnlocked } from '@/services/contracts';
import { brand } from '@/theme';
import type { Pet, PetInventory, PetItem } from '@/types';

/** 换装与背景子页：同类互斥穿脱、主题背景即时预览、未解锁提示。 */
export default function PetWardrobe({
  mode,
  pet,
  inventory,
  items,
  onEquip,
  onSetBackground,
  onOpenShop,
}: {
  mode: 'outfit' | 'background';
  pet: Pet;
  inventory: PetInventory[];
  items: PetItem[];
  onEquip?: (key: string, equipped: boolean) => void;
  onSetBackground?: (key: Pet['background']) => void;
  onOpenShop: () => void;
}) {
  const list = items.filter((item) => item.category === (mode === 'outfit' ? 'outfit' : 'background'));
  const owned = (key: string): boolean => inventory.some((entry) => entry.item_key === key && entry.quantity > 0);

  return (
    <SectionCard
      title={mode === 'outfit' ? '衣柜' : '场景背景'}
      subtitle={mode === 'outfit' ? '帽子 / 颈部 / 眼镜，同类只穿一件' : '已解锁背景可随时切换'}
      icon={mode === 'outfit' ? <Check size={20} strokeWidth={1.75} /> : <Store size={20} strokeWidth={1.75} />}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25 }}>
        {list.map((item) => {
          const has = owned(item.key);
          const unlocked = isUnlocked(item, pet);
          const equipped = inventory.find((entry) => entry.item_key === item.key)?.equipped ?? false;
          const active = mode === 'outfit' ? equipped : pet.background === item.key.replace(/^bg_/, '');
          const group = mode === 'outfit' ? 'outfit' : 'background';
          return (
            <Box
              key={item.key}
              onClick={() => {
                if (!has || !unlocked) return;
                if (mode === 'outfit') onEquip?.(item.key, !equipped);
                else onSetBackground?.(item.key.replace(/^bg_/, '') as Pet['background']);
              }}
              sx={{
                p: 1.25,
                borderRadius: '16px',
                cursor: has && unlocked ? 'pointer' : 'default',
                border: active ? `2px solid ${brand.pink}` : '1px solid rgba(196,174,232,.22)',
                bgcolor: active ? 'rgba(233,131,168,.08)' : '#fff',
                opacity: unlocked ? 1 : 0.62,
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <AssetThumb>
                  <PetImage group={group} assetKey={item.key.replace(/^bg_/, '')} alt={item.name} fit="cover" style={{ width: '100%', height: '100%' }} />
                </AssetThumb>
                {!unlocked && (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(90,70,83,.42)', borderRadius: '14px', color: '#fff' }}>
                    <Lock size={20} strokeWidth={1.75} />
                  </Box>
                )}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontWeight: 700 }}>{item.name}</Typography>
              <Typography variant="caption" sx={{ display: 'block', fontSize: 10, color: brand.inkSoft }}>
                {!unlocked
                  ? `Lv.${item.unlock_level} / 亲密 ${item.unlock_intimacy} 解锁`
                  : has
                    ? active ? (mode === 'outfit' ? '穿着中' : '使用中') : mode === 'outfit' ? '点击穿上' : '点击使用'
                    : `商店 ${item.price} 三叶草`}
              </Typography>
              {active && <Chip size="small" label="使用中" sx={{ mt: 0.5, height: 18, fontSize: 9, bgcolor: brand.pink, color: '#fff' }} />}
            </Box>
          );
        })}
      </Box>
      <Button fullWidth size="small" variant="outlined" startIcon={<Store size={18} strokeWidth={1.75} />} onClick={onOpenShop} sx={{ mt: 2 }}>
        去商店解锁更多
      </Button>
    </SectionCard>
  );
}
