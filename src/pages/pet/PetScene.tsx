import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { Heart, Leaf, Pencil, Sparkles } from 'lucide-react';
import { PetCharacter, PetImage } from '@/pages/pet/PetAsset';
import { brand } from '@/theme';
import type { Pet, PetInventory, PetItem } from '@/types';

const STAGE_LABEL: Record<string, string> = { egg: '蛋蛋期', baby: '幼年期', teen: '少年期', adult: '成年期' };
const STATE_TEXT: Record<string, string> = {
  idle: '呆呆地望着窗外…',
  reading: '它在安静地看书…',
  eating: '吧唧吧唧，吃得真香',
  sleeping: '呼呼…做着甜甜的梦',
  writing: '它好像在给谁写信呢',
  traveling: '它正在外面看世界…',
};

/** 根据成长阶段与在家状态选择对应立绘 key。 */
export function characterKeyFor(pet: Pet): string {
  if (pet.is_traveling) return 'travel';
  if (pet.stage === 'egg') return 'egg';
  if (pet.stage === 'baby') return 'baby';
  if (pet.stage === 'adult') return 'adult';
  return pet.state === 'reading' || pet.state === 'eating' || pet.state === 'sleeping' || pet.state === 'writing'
    ? pet.state
    : 'idle';
}

const FURNITURE_SIZE: Record<string, number> = {
  bed_wood: 96, rug_wool: 120, plant_pot: 62, bookshelf: 84,
  toy_ball: 44, lantern: 50, tea_table: 76, swing: 88,
};

/** 常驻治愈场景：背景 / 家具 / 猫咪立绘 / 服饰叠加 / 三叶草丛。 */
export default function PetScene({
  pet,
  inventory,
  items,
  bouncing = false,
  editMode = false,
  selectedFurniture = null,
  onHarvest,
  onRename,
  onPlace,
}: {
  pet: Pet;
  inventory: PetInventory[];
  items: PetItem[];
  bouncing?: boolean;
  editMode?: boolean;
  selectedFurniture?: string | null;
  onHarvest: () => void;
  onRename: () => void;
  onPlace: (itemKey: string, posX: number, posY: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ key: string; x: number; y: number } | null>(null);

  const outfitKeys = inventory
    .filter((entry) => entry.equipped && items.find((item) => item.key === entry.item_key)?.category === 'outfit')
    .map((entry) => entry.item_key);
  const furniture = inventory.filter((entry) => entry.placed && entry.pos_x !== null && entry.pos_y !== null);

  function positionOf(entry: PetInventory): { x: number; y: number } {
    if (drag && drag.key === entry.item_key) return { x: drag.x, y: drag.y };
    return { x: entry.pos_x ?? 0.5, y: entry.pos_y ?? 0.7 };
  }

  function move(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!drag || !stageRef.current || !editMode) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.max(0.05, Math.min(0.95, Math.round(((event.clientX - rect.left) / rect.width) * 20) / 20));
    const y = Math.max(0.1, Math.min(0.95, Math.round(((event.clientY - rect.top) / rect.height) * 20) / 20));
    setDrag({ ...drag, x, y });
  }

  function endDrag(): void {
    if (!drag) return;
    onPlace(drag.key, drag.x, drag.y);
    setDrag(null);
  }

  return (
    <Box
      ref={stageRef}
      onPointerMove={move}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      sx={{
        position: 'relative',
        height: 330,
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,.7), 0 8px 0 #EFB9CD, 0 18px 28px -10px rgba(120,80,100,.3)',
        border: editMode ? `2px dashed ${brand.purple}` : '1px solid rgba(255,255,255,.7)',
        touchAction: 'none',
      }}
    >
      <PetImage
        group="background"
        assetKey={pet.background}
        alt="小窝背景"
        fit="cover"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,246,233,.05) 40%, rgba(120,80,100,.14) 100%)' }} />

      {/* 状态气泡 */}
      <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 3, maxWidth: '68%' }}>
        <Box
          sx={{
            display: 'inline-block',
            px: 1.5,
            py: 0.7,
            borderRadius: '18px 18px 18px 6px',
            bgcolor: '#FFFDFB',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,.9), 0 3px 0 #EFB9CD, 0 8px 14px -6px rgba(120,80,100,.2)',
          }}
        >
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
            {STATE_TEXT[pet.state] ?? STATE_TEXT.idle}
          </Typography>
        </Box>
      </Box>

      {/* 已摆放家具 */}
      {furniture.map((entry) => {
        const pos = positionOf(entry);
        const size = FURNITURE_SIZE[entry.item_key] ?? 70;
        return (
          <Box
            key={entry.id}
            onPointerDown={(event) => {
              if (!editMode) return;
              event.stopPropagation();
              setDrag({ key: entry.item_key, x: pos.x, y: pos.y });
            }}
            sx={{
              position: 'absolute',
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              width: size,
              height: size,
              transform: `translate(-50%,-50%) ${entry.mirrored ? 'scaleX(-1)' : ''}`,
              zIndex: drag?.key === entry.item_key ? 6 : 2,
              cursor: editMode ? 'grab' : 'default',
              filter: 'drop-shadow(0 5px 6px rgba(120,80,100,.24))',
              outline: editMode ? '1px dashed rgba(196,174,232,.8)' : 'none',
            }}
          >
            <PetImage group="furniture" assetKey={entry.item_key} alt={entry.item_key} style={{ width: '100%', height: '100%' }} />
          </Box>
        );
      })}

      {/* 猫咪立绘 + 穿戴服饰 */}
      <Box sx={{ position: 'absolute', left: '50%', top: 34, transform: 'translateX(-50%)', zIndex: 4 }}>
        <PetCharacter characterKey={characterKeyFor(pet)} outfitKeys={outfitKeys} width={244} bouncing={bouncing} />
      </Box>

      {/* 三叶草丛：常驻收割入口 */}
      <Box
        onClick={onHarvest}
        sx={{ position: 'absolute', left: 10, bottom: 8, zIndex: 5, cursor: 'pointer', width: 82, height: 82 }}
      >
        <PetImage group="item" assetKey="clover_patch" alt="三叶草" style={{ width: '100%', height: '100%' }} />
        {pet.clover_count > 0 && (
          <Chip
            key={`clover-${pet.clover_count}-${pet.last_clover_at ?? ''}`}
            className="clover-grow"
            size="small"
            icon={<Leaf size={18} strokeWidth={1.75} />}
            label={`${pet.clover_count}`}
            sx={{ position: 'absolute', top: -2, right: -6, height: 22, background: 'linear-gradient(145deg,#F7B4CC,#EC7FA6)', color: '#fff', fontSize: 11 }}
          />
        )}
      </Box>

      {/* 名牌 */}
      <Box
        sx={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.6,
          borderRadius: '20px',
          bgcolor: '#FFFDFB',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,.9), 0 3px 0 #EFB9CD, 0 8px 14px -6px rgba(120,80,100,.2)',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13 }}>{pet.name}</Typography>
        <IconButton size="small" aria-label="改名" onClick={onRename} sx={{ p: 0.3, color: brand.inkSoft }}>
          <Pencil size={18} strokeWidth={1.75} />
        </IconButton>
        <Chip size="small" label={`Lv.${pet.level}`} sx={{ height: 20, fontSize: 10, bgcolor: `${brand.purple}26`, color: brand.purple }} />
      </Box>

      <Box sx={{ position: 'absolute', left: '50%', bottom: 46, transform: 'translateX(-50%)', zIndex: 5, display: 'flex', gap: 0.5 }}>
        <Chip size="small" icon={<Sparkles size={18} strokeWidth={1.75} />} label={STAGE_LABEL[pet.stage] ?? pet.stage} sx={{ bgcolor: 'rgba(255,255,255,.88)', height: 22, fontSize: 10 }} />
        <Chip size="small" icon={<Heart size={18} strokeWidth={1.75} />} label={`亲密 ${pet.intimacy}`} sx={{ bgcolor: 'rgba(255,255,255,.88)', height: 22, fontSize: 10 }} />
      </Box>
    </Box>
  );
}
