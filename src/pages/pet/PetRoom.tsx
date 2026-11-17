import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Check, Images, Shirt, Sofa } from 'lucide-react';
import PetFurniture from '@/pages/pet/PetFurniture';
import PetWardrobe from '@/pages/pet/PetWardrobe';
import { brand } from '@/theme';
import type { Pet, PetInventory, PetItem } from '@/types';

type SubTab = 'furniture' | 'outfit' | 'background';

/** 小窝 Tab：布置 / 换装 / 背景三个子分段。 */
export default function PetRoom({
  pet,
  inventory,
  items,
  editMode,
  selectedFurniture,
  onToggleEdit,
  onSelectFurniture,
  onEquip,
  onPlace,
  onSetBackground,
  onOpenShop,
}: {
  pet: Pet;
  inventory: PetInventory[];
  items: PetItem[];
  editMode: boolean;
  selectedFurniture: string | null;
  onToggleEdit: () => void;
  onSelectFurniture: (key: string | null) => void;
  onEquip: (key: string, equipped: boolean) => void;
  onPlace: (key: string, posX: number, posY: number) => void;
  onSetBackground: (key: Pet['background']) => void;
  onOpenShop: () => void;
}) {
  const [sub, setSub] = useState<SubTab>('furniture');

  const tabs: Array<{ key: SubTab; label: string; icon: typeof Sofa }> = [
    { key: 'furniture', label: '布置', icon: Sofa },
    { key: 'outfit', label: '换装', icon: Shirt },
    { key: 'background', label: '背景', icon: Images },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = sub === tab.key;
          return (
            <Button
              key={tab.key}
              fullWidth
              variant={active ? 'contained' : 'outlined'}
              startIcon={active ? <Check size={18} strokeWidth={1.75} /> : <Icon size={18} strokeWidth={1.75} />}
              onClick={() => setSub(tab.key)}
              sx={{ minHeight: 36, px: 1, fontSize: 12, borderColor: `${brand.purple}55` }}
            >
              {tab.label}
            </Button>
          );
        })}
      </Box>

      {sub === 'furniture' && (
        <PetFurniture
          inventory={inventory}
          items={items}
          editMode={editMode}
          selectedFurniture={selectedFurniture}
          onToggleEdit={onToggleEdit}
          onSelect={onSelectFurniture}
          onPlace={onPlace}
          onOpenShop={onOpenShop}
        />
      )}
      {sub === 'outfit' && (
        <PetWardrobe
          mode="outfit"
          pet={pet}
          inventory={inventory}
          items={items}
          onEquip={onEquip}
          onOpenShop={onOpenShop}
        />
      )}
      {sub === 'background' && (
        <PetWardrobe
          mode="background"
          pet={pet}
          inventory={inventory}
          items={items}
          onSetBackground={onSetBackground}
          onOpenShop={onOpenShop}
        />
      )}

      <Typography variant="caption" color="text.secondary" align="center">
        {sub === 'furniture' ? '拖动家具到喜欢的位置，位置会同步给 TA' : sub === 'outfit' ? '同类服饰互斥，点一下即可穿脱' : '切换背景不会影响已摆放的家具'}
      </Typography>
    </Box>
  );
}
