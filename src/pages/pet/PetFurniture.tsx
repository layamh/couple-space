import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { FlipHorizontal, Move, Store, Trash2 } from 'lucide-react';
import { SectionCard } from '@/components/Common';
import { AssetThumb, PetImage } from '@/pages/pet/PetAsset';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import { brand } from '@/theme';
import type { PetInventory, PetItem } from '@/types';

/** 布置子页：选择家具、进入场景拖拽、镜像与收起。 */
export default function PetFurniture({
  inventory,
  items,
  editMode,
  selectedFurniture,
  onToggleEdit,
  onSelect,
  onPlace,
  onOpenShop,
}: {
  inventory: PetInventory[];
  items: PetItem[];
  editMode: boolean;
  selectedFurniture: string | null;
  onToggleEdit: () => void;
  onSelect: (key: string | null) => void;
  onPlace: (key: string, posX: number, posY: number) => void;
  onOpenShop: () => void;
}) {
  const couple = useAppStore((state) => state.couple);
  const notify = useAppStore((state) => state.notify);
  const owned = inventory.filter((entry) => items.find((item) => item.key === entry.item_key)?.category === 'furniture');

  async function togglePlaced(entry: PetInventory): Promise<void> {
    if (!couple) return;
    const result = await services.pet.placeFurniture(couple.id, entry.item_key, {
      pos_x: entry.pos_x ?? 0.5,
      pos_y: entry.pos_y ?? 0.72,
      mirrored: entry.mirrored,
      placed: !entry.placed,
    });
    if (result.error) notify(result.error.message, 'error');
    else notify(entry.placed ? '家具已收起' : '家具已摆进小窝', 'success');
  }

  async function mirror(entry: PetInventory): Promise<void> {
    if (!couple) return;
    const result = await services.pet.placeFurniture(couple.id, entry.item_key, {
      pos_x: entry.pos_x ?? 0.5,
      pos_y: entry.pos_y ?? 0.72,
      mirrored: !entry.mirrored,
      placed: true,
    });
    if (result.error) notify(result.error.message, 'error');
  }

  return (
    <SectionCard
      title="我的家具"
      subtitle={`已拥有 ${owned.length} 件 · 最多可摆放 12 件`}
      icon={<Move size={20} strokeWidth={1.75} />}
      action={
        <Button size="small" variant={editMode ? 'contained' : 'outlined'} onClick={onToggleEdit}>
          {editMode ? '完成' : '编辑场景'}
        </Button>
      }
    >
      {owned.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body2" color="text.secondary">还没有家具，去商店挑一件吧</Typography>
          <Button size="small" variant="outlined" startIcon={<Store size={18} strokeWidth={1.75} />} onClick={onOpenShop} sx={{ mt: 1.5 }}>逛商店</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25 }}>
          {owned.map((entry) => {
            const item = items.find((candidate) => candidate.key === entry.item_key);
            const active = selectedFurniture === entry.item_key;
            return (
              <Box
                key={entry.id}
                onClick={() => {
                  onSelect(active ? null : entry.item_key);
                  if (!entry.placed) void onPlace(entry.item_key, entry.pos_x ?? 0.5, entry.pos_y ?? 0.72);
                }}
                sx={{
                  p: 1.25,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  border: active ? `2px solid ${brand.purple}` : '1px solid rgba(196,174,232,.22)',
                  bgcolor: active ? 'rgba(196,174,232,.08)' : '#fff',
                }}
              >
                <AssetThumb><PetImage group="furniture" assetKey={entry.item_key} alt={item?.name ?? entry.item_key} style={{ width: '88%', height: '88%' }} /></AssetThumb>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontWeight: 700 }}>{item?.name ?? entry.item_key}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                  <Chip size="small" label={entry.placed ? '已摆放' : '收起中'} sx={{ height: 20, fontSize: 10, bgcolor: entry.placed ? 'rgba(127,191,154,.18)' : 'rgba(196,174,232,.14)' }} />
                  <Box
                    onClick={(event) => {
                      event.stopPropagation();
                      void mirror(entry);
                    }}
                    sx={{ display: 'inline-flex', p: 0.25, cursor: 'pointer', color: brand.purple }}
                  >
                    <FlipHorizontal size={18} strokeWidth={1.75} />
                  </Box>
                  <Box
                    onClick={(event) => {
                      event.stopPropagation();
                      void togglePlaced(entry);
                    }}
                    sx={{ display: 'inline-flex', p: 0.25, cursor: 'pointer', color: brand.inkSoft }}
                  >
                    <Trash2 size={18} strokeWidth={1.75} />
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
      {editMode && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: brand.purple, fontWeight: 700 }}>
          编辑中：在上方场景按住家具拖动即可摆放，松手自动保存
        </Typography>
      )}
    </SectionCard>
  );
}
