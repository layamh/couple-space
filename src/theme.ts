import { createTheme } from '@mui/material/styles';
import { zhCN } from '@mui/material/locale';
import { clay, clayRadius, clayShadow, clayGradient } from './theme-clay';

/** 品牌配色 —— 与 tailwind.config.ts 的 brand.* / clay token 保持一致。 */
export const brand = {
  pink: clay.pink,
  pinkDeep: clay.pinkDeep,
  purple: clay.lavender,
  lavenderDeep: clay.lavenderDeep,
  apricot: clay.apricot,
  mint: clay.mint,
  blush: clay.base,
  ink: clay.ink,
  inkSoft: clay.inkSoft,
  cream: clay.cream,
  white: '#FFFFFF',
} as const;

const clayShadows: string[] = [
  'none',
  '0 2px 8px rgba(120,80,100,.08)',
  '0 4px 14px rgba(120,80,100,.12)',
  '0 8px 20px rgba(120,80,100,.14)',
  '0 10px 24px rgba(120,80,100,.16)',
  clayShadow.card,
  ...Array(19).fill(clayShadow.card),
];

/** 全站唯一的 MUI 主题：黏土马卡龙配色、圆角、三层投影与组件默认 props。 */
export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: { main: clay.pink, light: clay.pinkSoft, dark: clay.pinkDeep, contrastText: '#FFFFFF' },
      secondary: { main: clay.lavender, light: '#DCCBF0', dark: clay.lavenderDeep, contrastText: '#FFFFFF' },
      background: { default: clay.base, paper: clay.cream },
      text: { primary: clay.ink, secondary: clay.inkSoft },
      warning: { main: '#E5A24C', contrastText: '#FFFFFF' },
      success: { main: '#7FBF9A', contrastText: '#FFFFFF' },
      error: { main: '#DE7C96', contrastText: '#FFFFFF' },
    },
    shape: { borderRadius: clayRadius.md },
    shadows: clayShadows as ReturnType<typeof createTheme>['shadows'],
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      h2: { fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontWeight: 800, letterSpacing: '-0.02em' },
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 800, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { background: clay.base, color: clay.ink },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', borderRadius: clayRadius.md },
          rounded: { borderRadius: clayRadius.md },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: clayRadius.md,
            background: clayGradient.card,
            boxShadow: clayShadow.card,
            transition: 'transform .18s ease, box-shadow .18s ease',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: clayRadius.pill,
            paddingInline: 20,
            minHeight: 40,
            '&:active': { boxShadow: clayShadow.buttonPress },
          },
          containedPrimary: {
            background: clayGradient.primary,
            color: '#fff',
            boxShadow: clayShadow.button,
            '&:hover': { background: 'linear-gradient(145deg,#F9C2D5 0%,#E983A8 60%,#A98AD8 130%)', boxShadow: clayShadow.buttonHover },
            '&:active': { boxShadow: clayShadow.buttonPress },
            '&.Mui-disabled': { background: '#EBDCE4', color: '#B9A6B1', boxShadow: 'none' },
          },
          containedSecondary: {
            background: 'linear-gradient(145deg,#DCCBF0,#A98AD8)',
            color: '#fff',
            boxShadow: `inset 0 2px 1px rgba(255,255,255,.55), 0 6px 0 #8F70BE, 0 12px 18px -6px rgba(169,138,216,.5)`,
            '&:active': { boxShadow: 'inset 0 2px 1px rgba(255,255,255,.5), 0 2px 0 #8F70BE, 0 6px 10px -6px rgba(169,138,216,.5)' },
            '&.Mui-disabled': { boxShadow: 'none' },
          },
          outlinedPrimary: { borderColor: 'rgba(233,131,168,.55)', '&.Mui-disabled': { borderColor: 'rgba(120,80,100,.18)' } },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: clayRadius.sm } },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: clayRadius.pill,
            fontWeight: 700,
            boxShadow: clayShadow.chip,
          },
          sizeSmall: { boxShadow: `inset 0 1px 0 ${clay.hi}, 0 2px 0 ${clay.baseEdge}` },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 10,
            borderRadius: clayRadius.pill,
            backgroundColor: 'rgba(120,80,100,.10)',
            boxShadow: 'inset 0 2px 3px rgba(120,80,100,.12)',
          },
          bar: { borderRadius: clayRadius.pill, background: clayGradient.primary },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: '#FFF9F4',
            boxShadow: clayShadow.input,
            transition: 'box-shadow .18s ease',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(196,174,232,.45)', borderWidth: 1 },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: clay.lavender },
            '&.Mui-focused': { boxShadow: clayShadow.inputFocus },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: clay.pink, borderWidth: 1 },
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: { backgroundColor: 'transparent', borderTop: 'none' },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: { paddingTop: 6, minWidth: 0, '&.Mui-selected': { color: `${clay.pinkDeep} !important` } },
          label: { fontSize: 11, fontWeight: 700 },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { padding: 9 },
          switchBase: {
            color: '#fff',
            '&.Mui-checked': {
              color: '#fff',
              '& + .MuiSwitch-track': { backgroundColor: clay.pink, opacity: 1 },
            },
          },
          thumb: { boxShadow: '0 2px 5px rgba(120,80,100,.3)', backgroundColor: '#fff' },
          track: { backgroundColor: '#E7D8E0', borderRadius: clayRadius.pill, opacity: 1, boxShadow: 'inset 0 2px 3px rgba(120,80,100,.12)' },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: 'rgba(196,174,232,.28)' } },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44 },
          indicator: { height: 3, borderRadius: 3, background: clay.pinkDeep },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 700, minHeight: 44, '&.Mui-selected': { color: clay.pinkDeep } },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: clayRadius.lg,
            background: '#FFFDFB',
            boxShadow: `inset 0 2px 0 rgba(255,255,255,.8), 0 8px 0 ${clay.baseEdge}, 0 24px 48px -12px rgba(120,80,100,.34)`,
          },
        },
      },
      MuiModal: {
        styleOverrides: {
          backdrop: { backdropFilter: 'blur(2px)', background: 'rgba(90,70,83,.32)' },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 16, boxShadow: clayShadow.card, fontWeight: 600 },
        },
      },
      MuiCheckbox: {
        styleOverrides: { root: { color: 'rgba(169,138,216,.7)' } },
      },
    },
  },
  zhCN,
);
