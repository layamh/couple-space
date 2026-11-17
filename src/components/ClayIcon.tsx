import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Box from '@mui/material/Box';
import { clayGradient } from '@/theme-clay';

/**
 * 黏土图标底座：lucide 图标 + 渐变圆角底座 + 内高光 + 厚度边 + 柔影（PRD §3.9 / DESIGN §3.4）。
 * 普通态 = 渐变底座 + 主色深版图标；选中态 = 实心主色 + 白图标 + 下压 translateY(2px)。
 * 不引入新图标库，strokeWidth 固定 1.75，图标尺寸 18/20/24。
 */
export type ClayTone = 'pink' | 'lavender' | 'apricot' | 'mint';

const TONE_BG: Record<ClayTone, string> = {
  pink: clayGradient.iconPink,
  lavender: clayGradient.iconLavender,
  apricot: clayGradient.iconApricot,
  mint: clayGradient.iconMint,
};

const TONE_EDGE: Record<ClayTone, string> = {
  pink: '#E7A7C0',
  lavender: '#A98AD8',
  apricot: '#E8B77E',
  mint: '#8FCDB6',
};

/** 各 tone 对应的「主色深版」图标色，保证跨页成套。 */
const TONE_ICON: Record<ClayTone, string> = {
  pink: '#E983A8',
  lavender: '#A98AD8',
  apricot: '#C98A3E',
  mint: '#5FA88C',
};

export type ClayIconProps = {
  /** lucide 图标组件（传 icon 时优先渲染）。 */
  icon?: LucideIcon;
  /** 自定义图标节点（用于包裹页面已传入的 ReactNode 图标）。 */
  children?: ReactNode;
  size?: 18 | 20 | 24;
  box?: 36 | 40 | 44;
  tone?: ClayTone;
  selected?: boolean;
  className?: string;
};

export function ClayIcon({
  icon: Icon,
  children,
  size = 20,
  box = 40,
  tone = 'pink',
  selected = false,
  className,
}: ClayIconProps) {
  return (
    <Box
      className={`clay-icon${selected ? ' clay-icon--on' : ''}${className ? ` ${className}` : ''}`}
      sx={{
        width: box,
        height: box,
        flexShrink: 0,
        background: selected ? clayGradient.iconSelected : TONE_BG[tone],
        color: selected ? '#FFFFFF' : TONE_ICON[tone],
        boxShadow: selected
          ? 'inset 0 2px 1px rgba(255,255,255,.55), 0 3px 0 #D9668F, 0 6px 10px -4px rgba(120,80,100,.3)'
          : `inset 0 2px 1px rgba(255,255,255,.7), 0 5px 0 ${TONE_EDGE[tone]}, 0 8px 12px -4px rgba(120,80,100,.25)`,
        '& svg': { display: 'block' },
      }}
    >
      {Icon ? <Icon size={size} strokeWidth={1.75} /> : children}
    </Box>
  );
}

export default ClayIcon;
