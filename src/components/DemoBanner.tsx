import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { Sparkles, X } from 'lucide-react';
import ClayIcon from '@/components/ClayIcon';
import { useAppStore } from '@/store/useAppStore';

/** 演示模式提示条：任何组件都不自行判断模式，只读 store。 */
export default function DemoBanner() {
  const demoMode = useAppStore((state) => state.demoMode);
  const [visible, setVisible] = useState(true);

  if (!demoMode || !visible) return null;

  return (
    <Box
      className="clay-pressable"
      sx={{
        minHeight: 48,
        mx: 1.5,
        mt: 1.5,
        px: 2.5,
        py: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        color: '#7A5638',
        background: 'linear-gradient(90deg,#FFE7C4,#FFD9AE)',
        borderRadius: '18px',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,.7), 0 4px 0 #E8B77E, 0 10px 18px -8px rgba(120,80,100,.22)',
        position: 'relative',
        zIndex: 1300,
      }}
    >
      <ClayIcon icon={Sparkles} box={36} size={18} tone="apricot" />
      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
        演示模式 · 数据仅存于本机内存，刷新后还原
      </Typography>
      <IconButton
        size="small"
        aria-label="关闭提示"
        onClick={() => setVisible(false)}
        sx={{ position: 'absolute', right: 6, color: '#8A6240', p: 0.25 }}
      >
        <X size={18} strokeWidth={1.75} />
      </IconButton>
    </Box>
  );
}
