import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { brand } from '@/theme';

/** manifest 中我们关心的字段；路径相对 public/ 根。 */
interface ManifestEntry {
  path: string;
  slot?: string;
  anchor?: string;
  desc?: string;
}
type PetManifest = Record<string, Record<string, ManifestEntry>>;

let manifestCache: PetManifest | null = null;
void fetch(`${import.meta.env.BASE_URL}assets/pet/manifest.json`)
  .then((response) => (response.ok ? response.json() : null))
  .then((data: PetManifest | null) => {
    if (data) manifestCache = data;
  })
  .catch(() => undefined);

export type AssetGroup = 'character' | 'background' | 'outfit' | 'furniture' | 'postcard' | 'item';

/** 无 manifest 时的 key→路径兜底规则，保证首屏和离线也能显示素材。 */
function fallbackPath(group: AssetGroup, key: string): string {
  switch (group) {
    case 'character':
      return `assets/pet/character/cat_${key}.png`;
    case 'background':
      return `assets/pet/background/bg_${key}.jpg`;
    case 'outfit':
      return `assets/pet/outfit/${key}.png`;
    case 'furniture':
      return `assets/pet/furniture/${key}.png`;
    case 'postcard':
      return `assets/pet/postcard/pc_${key}.jpg`;
    case 'item':
      return `assets/pet/item/${key}.png`;
  }
}

/** 唯一的素材 URL 出口：自动拼接 VITE_BASE_PATH，兼容 GitHub Pages 子路径。 */
export function assetUrl(group: AssetGroup, key: string): string {
  const fromManifest = manifestCache?.[group]?.[key]?.path;
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${fromManifest ?? fallbackPath(group, key)}`;
}

/** 通用图片：加载失败降级为治愈色占位块，绝不出现破图。 */
export function PetImage({
  group,
  assetKey,
  alt,
  style,
  fit = 'contain',
}: {
  group: AssetGroup;
  assetKey: string;
  alt: string;
  style?: CSSProperties;
  fit?: 'contain' | 'cover' | 'fill';
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [group, assetKey]);
  if (failed) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          minHeight: 40,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '20px',
          background: 'linear-gradient(145deg,#FFF9F0,#F4D9E5)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,.7), inset 0 -6px 12px -6px rgba(120,80,100,.14)',
          color: brand.inkSoft,
          ...style,
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 10 }}>{alt}</Typography>
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={assetUrl(group, assetKey)}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      style={{ display: 'block', maxWidth: 'none', objectFit: fit, ...style }}
    />
  );
}

/**
 * 服饰相对角色的精确锚点（由 PIL 依据实际像素尺寸 + 叠加预览校准）。
 * width 为占角色方形画布的比例；top/left 为百分比；head 槽整体位于画布上方，
 * 因此 top 可为负值（场景容器预留了顶部空间），避免帽檐压住眼睛。
 */
export const OUTFIT_LAYOUT: Record<
  string,
  { slot: 'head' | 'neck' | 'eyes'; width: number; top: number; left: number }
> = {
  hat_straw: { slot: 'head', width: 0.62, top: -0.14, left: 0.5 },
  hat_beanie: { slot: 'head', width: 0.44, top: -0.15, left: 0.5 },
  flower_crown: { slot: 'head', width: 0.52, top: -0.06, left: 0.5 },
  bow_knot: { slot: 'neck', width: 0.27, top: 0.44, left: 0.5 },
  bow_tie: { slot: 'neck', width: 0.24, top: 0.46, left: 0.5 },
  scarf_knit: { slot: 'neck', width: 0.36, top: 0.48, left: 0.5 },
  glasses_round: { slot: 'eyes', width: 0.46, top: 0.215, left: 0.42 },
  sunglasses: { slot: 'eyes', width: 0.48, top: 0.215, left: 0.42 },
};

/** cat_teen 原图四周有透明留白，需放大 1.3 倍与其他立绘主体尺寸一致。 */
const CHARACTER_ZOOM: Record<string, number> = { teen: 1.3 };

/** 角色 + 已穿戴服饰的同锚点叠加层。 */
export function PetCharacter({
  characterKey,
  outfitKeys = [],
  width = 260,
  bouncing = false,
}: {
  characterKey: string;
  outfitKeys?: string[];
  width?: number;
  bouncing?: boolean;
}) {
  const zoom = CHARACTER_ZOOM[characterKey] ?? 1;
  return (
    <Box
      className={bouncing ? 'pet-bounce' : ''}
      sx={{ position: 'relative', width, height: width, flexShrink: 0, pointerEvents: 'none' }}
    >
      <PetImage
        group="character"
        assetKey={characterKey}
        alt="布丁"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          filter: 'drop-shadow(0 8px 12px rgba(120,80,100,.18))',
        }}
      />
      {outfitKeys.map((key) => {
        const layout = OUTFIT_LAYOUT[key];
        if (!layout) return null;
        return (
          <PetImage
            key={key}
            group="outfit"
            assetKey={key}
            alt={key}
            style={{
              position: 'absolute',
              left: `${layout.left * 100}%`,
              top: `${layout.top * 100}%`,
              width: `${layout.width * 100}%`,
              height: 'auto',
              transform: 'translateX(-50%)',
              transformOrigin: 'top center',
              animation: 'outfit-in .35s ease-out',
              filter: 'drop-shadow(0 3px 5px rgba(120,80,100,.18))',
            }}
          />
        );
      })}
    </Box>
  );
}

/** 旅行道具三合一精灵图：0=普通便当 1=豪华便当 2=护身符。 */
export function TravelPropSprite({ index, size = 26 }: { index: 0 | 1 | 2; size?: number }) {
  return (
    <Box
      sx={{
        display: 'inline-block',
        width: size * 1.23,
        height: size,
        flexShrink: 0,
        backgroundImage: `url(${assetUrl('item', 'props_travel_sheet')})`,
        backgroundSize: '300% 100%',
        backgroundPosition: `${index * 50}% center`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

/** 装饰缩略图容器：统一圆角与柔和底色。 */
export function AssetThumb({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: '20px',
        background: 'linear-gradient(145deg,#FFFBF6,#F3E7F0)',
        boxShadow: 'inset 0 2px 4px rgba(120,80,100,.1), inset 0 -1px 0 rgba(255,255,255,.7)',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}
