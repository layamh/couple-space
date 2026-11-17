import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { ImageOff, Heart } from 'lucide-react';
import { brand } from '@/theme';
import { clay, clayGradient, clayShadow } from '@/theme-clay';
import ClayIcon from '@/components/ClayIcon';
import type { PetStage } from '@/types';

/** 全屏加载态，用于路由守卫等待会话/配对信息。 */
export function FullScreenLoader({ label = '正在打开我们的小宇宙…' }: { label?: string }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        background: `linear-gradient(160deg, ${clay.base} 0%, ${clay.cream} 100%)`,
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress size={48} thickness={3} sx={{ color: clay.pink }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <ClayIcon icon={Heart} box={36} size={20} tone="pink" className="clay-jelly" />
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

/** 通用内容卡：圆角、柔和阴影、可选渐变背景与点击行为。 */
export function GradientCard({
  children,
  gradient = clayGradient.primary,
  onClick,
  sx = {},
}: {
  children: ReactNode;
  gradient?: string;
  onClick?: () => void;
  sx?: Record<string, unknown>;
}) {
  const content = (
    <Card
      elevation={0}
      className="clay-pressable"
      sx={{
        borderRadius: '28px',
        background: gradient,
        color: '#fff',
        boxShadow: 'inset 0 2px 1px rgba(255,255,255,.5), 0 8px 0 #D9668F, 0 18px 26px -8px rgba(120,80,100,.3)',
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '8%',
          right: '8%',
          top: '5%',
          height: '26%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,.24), transparent 70%)',
          pointerEvents: 'none',
        },
        ...sx,
      }}
    >
      {children}
    </Card>
  );
  return onClick ? <CardActionArea onClick={onClick}>{content}</CardActionArea> : content;
}

/** 带标题区的白色卡片，全站内容区块统一从这里出。 */
export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  sx = {},
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  sx?: Record<string, unknown>;
}) {
  return (
    <Card className="clay-card" sx={{ p: 2.25, ...sx }}>
      {(title || action) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: subtitle ? 0.5 : 1.5 }}>
          {icon && <ClayIcon box={36} tone="pink" size={20}>{icon}</ClayIcon>}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {title && (
              <Typography variant="subtitle1" sx={{ fontSize: 15, lineHeight: 1.4 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      )}
      {children}
    </Card>
  );
}

/** 空状态：统一图标尺寸与文案排版。 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Box sx={{ display: 'inline-flex', mb: 2 }} className="clay-jelly">
        <ClayIcon box={44} tone="lavender" size={24}>{icon}</ClayIcon>
      </Box>
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
    </Box>
  );
}

/** 图片加载失败时降级为柔色占位，离线也不会出现破图。 */
export function SmartImage({
  src,
  alt,
  sx = {},
}: {
  src: string;
  alt: string;
  sx?: Record<string, unknown>;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          minHeight: 120,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '20px',
          background: 'linear-gradient(145deg,#FFF9F0,#F0E6F5)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,.7), inset 0 -8px 16px -8px rgba(120,80,100,.12)',
          ...sx,
        }}
      >
        <ClayIcon icon={ImageOff} box={40} tone="lavender" size={24} />
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...sx }}
    />
  );
}

/** 大图预览弹窗。 */
export function ImageViewer({
  url,
  caption,
  onClose,
}: {
  url: string | null;
  caption?: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(url)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          p: 1.5,
          background: 'linear-gradient(145deg,#FFFDFB,#FFF8F1)',
          borderRadius: '28px',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,.85), 0 8px 0 #EFB9CD, 0 24px 48px -12px rgba(120,80,100,.34)',
        },
      }}
    >
      <Box sx={{ position: 'relative' }} onClick={onClose}>
        {url && (
          <Box
            component="img"
            src={url}
            alt={caption ?? '照片预览'}
            sx={{ width: '100%', maxHeight: '76vh', objectFit: 'contain', borderRadius: '20px' }}
          />
        )}
        {caption && (
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              p: 1.5,
              textAlign: 'center',
              color: '#fff',
              background: 'rgba(90,70,83,.72)',
              borderRadius: '14px',
            }}
          >
            {caption}
          </Typography>
        )}
      </Box>
    </Dialog>
  );
}

/** 倒计时胶囊 chip。 */
export function CountdownChip({ days, label }: { days: number; label?: string }) {
  return (
    <Chip
      size="small"
      icon={<Heart size={18} strokeWidth={1.75} />}
      label={label ?? (days === 0 ? '就是今天' : `还有 ${days} 天`)}
      sx={{
        background: days === 0 ? 'linear-gradient(145deg,#F7B4CC,#EC7FA6)' : '#FFF9F4',
        color: days === 0 ? '#fff' : clay.ink,
        fontWeight: 800,
        border: days === 0 ? 'none' : '1px solid rgba(239,185,205,.6)',
        boxShadow: days === 0
          ? 'inset 0 1px 0 rgba(255,255,255,.55), 0 3px 0 #D9668F'
          : clayShadow.chip,
      }}
    />
  );
}

/** 撒糖粒子：发布悄悄话 / 喂食成功时触发，1.7 秒后自动消失。 */
export function CandyRain({ trigger, count = 12 }: { trigger: number; count?: number }) {
  if (trigger === 0) return null;
  const symbols = ['♥', '✦', '♥', '✿', '♥', '✧'];
  return (
    <Box key={trigger} className="candy-layer">
      {Array.from({ length: count }, (_, index) => (
        <Box
          key={index}
          className="candy-particle"
          sx={{
            left: `${6 + ((index * 37) % 88)}%`,
            fontSize: index % 3 === 0 ? 22 : 16,
            color: index % 2 === 0 ? clay.pinkDeep : index % 3 === 0 ? clay.lavenderDeep : '#E8A75C',
            textShadow: '0 2px 3px rgba(120,80,100,.16)',
            animationDelay: `${(index % 6) * 0.09}s`,
          }}
        >
          {symbols[index % symbols.length]}
        </Box>
      ))}
    </Box>
  );
}

/** 宠物形象插画（非图标）：随成长阶段变化，情绪低落时眼睛变成委屈形。 */
export function PetIllustration({
  stage,
  mood,
  size = 200,
  bouncing = false,
}: {
  stage: PetStage;
  mood: number;
  size?: number;
  bouncing?: boolean;
}) {
  const sad = mood < 45;
  const bodyScale = stage === 'egg' ? 0.82 : stage === 'baby' ? 0.9 : stage === 'teen' ? 1 : 1.08;
  return (
    <Box
      className={bouncing ? 'pet-bounce' : ''}
      sx={{ width: size, height: size, display: 'grid', placeItems: 'center', mx: 'auto' }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="我们的宠物">
        <defs>
          <linearGradient id="petBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF8F1" />
            <stop offset="100%" stopColor="#F4A6C1" />
          </linearGradient>
          <linearGradient id="petEar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7B4CC" />
            <stop offset="100%" stopColor="#E983A8" />
          </linearGradient>
        </defs>
        {stage === 'egg' ? (
          <>
            <ellipse cx="100" cy="112" rx="54" ry="64" fill="url(#petBody)" stroke="#EFB9CD" strokeWidth="3" />
            <path d="M72 96 Q100 76 128 96" stroke="#F4C1D4" strokeWidth="6" fill="none" strokeLinecap="round" />
            <circle cx="82" cy="118" r="4" fill="#5A4653" />
            <circle cx="118" cy="118" r="4" fill="#5A4653" />
            <path d="M94 134 Q100 140 106 134" stroke="#C77FA0" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <g transform={`translate(${100 - 100 * bodyScale} ${112 - 112 * bodyScale}) scale(${bodyScale})`}>
            {/* 尾巴 */}
            <path
              d="M148 148 Q184 142 168 104 Q160 86 150 96"
              stroke="#EBA8C5"
              strokeWidth="13"
              fill="none"
              strokeLinecap="round"
            />
            {/* 身体 */}
            <ellipse cx="100" cy="148" rx="52" ry="42" fill="url(#petBody)" stroke="#EFB9CD" strokeWidth="3" />
            {/* 耳朵 */}
            <path d="M50 78 L52 30 L88 62 Z" fill="url(#petEar)" stroke="#E983A8" strokeWidth="2" />
            <path d="M150 78 L148 30 L112 62 Z" fill="url(#petEar)" stroke="#E983A8" strokeWidth="2" />
            <path d="M60 66 L61 45 L76 60 Z" fill="#FBD9E5" />
            <path d="M140 66 L139 45 L124 60 Z" fill="#FBD9E5" />
            {/* 头 */}
            <ellipse cx="100" cy="92" rx="62" ry="52" fill="url(#petBody)" stroke="#EFB9CD" strokeWidth="3" />
            {/* 眼睛 */}
            {sad ? (
              <>
                <path d="M68 90 Q78 82 88 90" stroke="#5A4653" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M112 90 Q122 82 132 90" stroke="#5A4653" strokeWidth="4" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="78" cy="92" rx="6" ry="8" fill="#5A4653" />
                <ellipse cx="122" cy="92" rx="6" ry="8" fill="#5A4653" />
                <circle cx="80" cy="89" r="2" fill="#fff" />
                <circle cx="124" cy="89" r="2" fill="#fff" />
              </>
            )}
            {/* 腮红 */}
            <ellipse cx="60" cy="106" rx="10" ry="6" fill="#F7AEC8" opacity="0.75" />
            <ellipse cx="140" cy="106" rx="10" ry="6" fill="#F7AEC8" opacity="0.75" />
            {/* 鼻子嘴巴 */}
            <path d="M94 108 L106 108 L100 115 Z" fill="#D98AAC" />
            <path d="M100 115 Q92 124 86 116 M100 115 Q108 124 114 116" stroke="#C77FA0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* 小铃铛 */}
            {stage === 'adult' && (
              <>
                <path d="M78 148 Q100 162 122 148" stroke="#E983A8" strokeWidth="4" fill="none" />
                <circle cx="100" cy="160" r="8" fill="#FFD9AE" stroke="#E8B45F" strokeWidth="2" />
              </>
            )}
          </g>
        )}
      </svg>
    </Box>
  );
}

/** 细分隔线，封装常用颜色。 */
export function SoftDivider() {
  return <Divider sx={{ my: 1.5, borderColor: 'rgba(239,185,205,.8)' }} />;
}

/** 统一的小号操作按钮。 */
export function SoftButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      size="small"
      variant="outlined"
      onClick={onClick}
      disabled={disabled}
      className="clay-pressable"
      sx={{
        borderRadius: '999px',
        px: 2,
        fontWeight: 700,
        borderColor: 'rgba(233,131,168,.55)',
        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,.72), 0 3px 0 #EFB9CD',
        '&:active': { boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6), 0 1px 0 #EFB9CD' },
        '&.Mui-disabled': { boxShadow: 'none' },
      }}
    >
      {children}
    </Button>
  );
}
