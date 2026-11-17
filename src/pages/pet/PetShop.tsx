import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { Leaf, Lock, Store } from 'lucide-react';
import { AssetThumb, PetImage, TravelPropSprite } from '@/pages/pet/PetAsset';
import { isUnlocked } from '@/services/contracts';
import { brand } from '@/theme';
import type { Pet, PetItem } from '@/types';

const CATEGORIES = [
  { key: 'consumable', label: '消耗品' },
  { key: 'furniture', label: '家具' },
  { key: 'outfit', label: '服饰' },
  { key: 'background', label: '背景' },
] as const;

/** 商店弹窗：四类商品、解锁条件、余额校验与购买。 */
export default function PetShop({
  open,
  onClose,
  pet,
  items,
  onBuy,
}: {
  open: boolean;
  onClose: () => void;
  pet: Pet;
  items: PetItem[];
  onBuy: (key: string) => void;
}) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['key']>('consumable');
  const list = items.filter((item) => item.category === category);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Store size={20} strokeWidth={1.75} color={brand.pinkDeep} />
        三叶草商店
        <Box sx={{ flex: 1 }} />
        <Chip size="small" icon={<Leaf size={18} strokeWidth={1.75} />} label={pet.clovers} sx={{ bgcolor: 'rgba(127,191,154,.18)' }} />
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
          {CATEGORIES.map((entry) => (
            <Button
              key={entry.key}
              size="small"
              variant={category === entry.key ? 'contained' : 'text'}
              onClick={() => setCategory(entry.key)}
              sx={{ minHeight: 30, px: 1.25, fontSize: 12 }}
            >
              {entry.label}
            </Button>
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25 }}>
          {list.map((item) => {
            const unlocked = isUnlocked(item, pet);
            const affordable = pet.clovers >= item.price;
            const group = item.category === 'background' ? 'background' : item.category === 'outfit' ? 'outfit' : item.category === 'furniture' ? 'furniture' : 'item';
            const spriteIndex = item.key === 'bento_normal' ? 0 : item.key === 'bento_deluxe' ? 1 : item.key === 'charm' ? 2 : null;
            return (
              <Box
                key={item.key}
                sx={{
                  p: 1.25,
                  borderRadius: '16px',
                  border: '1px solid rgba(239,185,205,.7)',
                  bgcolor: unlocked ? '#fff' : 'rgba(90,70,83,.04)',
                  position: 'relative',
                }}
              >
                <AssetThumb>
                  {spriteIndex !== null ? (
                    <TravelPropSprite index={spriteIndex as 0 | 1 | 2} size={38} />
                  ) : item.asset_path ? (
                    <PetImage group={group} assetKey={group === 'background' ? item.key.replace(/^bg_/, '') : item.key} alt={item.name} fit="cover" style={{ width: '100%', height: '100%' }} />
                  ) : null}
                </AssetThumb>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontWeight: 700 }}>{item.name}</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontSize: 10, color: brand.inkSoft, minHeight: 14 }}>
                  {unlocked ? (item.price === 0 ? '免费' : `${item.price} 三叶草${affordable ? '' : ' · 不足'}`) : `Lv.${item.unlock_level} / 亲密 ${item.unlock_intimacy}`}
                </Typography>
                {!unlocked && (
                  <Box sx={{ position: 'absolute', top: 8, right: 8, color: brand.inkSoft }}>
                    <Lock size={18} strokeWidth={1.75} />
                  </Box>
                )}
                <Button
                  fullWidth
                  size="small"
                  disabled={!unlocked || !affordable}
                  onClick={() => onBuy(item.key)}
                  sx={{ mt: 0.75, minHeight: 28, fontSize: 11 }}
                >
                  {unlocked ? '购买' : '未解锁'}
                </Button>
              </Box>
            );
          })}
        </Box>
        {list.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>这一类暂时没有商品</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
