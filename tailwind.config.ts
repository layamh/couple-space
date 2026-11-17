import type { Config } from 'tailwindcss';
import { clay, clayShadow, clayGradient } from './src/theme-clay';

/** Tailwind 只负责布局工具类；preflight 关闭以免覆盖 MUI CssBaseline。 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          pink: clay.pink,
          pinkDeep: clay.pinkDeep,
          purple: clay.lavender,
          apricot: clay.apricot,
          mint: clay.mint,
          blush: clay.base,
          ink: clay.ink,
        },
        clay: {
          pink: clay.pink,
          'pink-deep': clay.pinkDeep,
          lavender: clay.lavender,
          apricot: clay.apricot,
          mint: clay.mint,
          cream: clay.cream,
          base: clay.base,
          ink: clay.ink,
          'ink-soft': clay.inkSoft,
        },
      },
      borderRadius: {
        xs: '10px',
        sm: '14px',
        card: '20px',
        'card-lg': '28px',
        pill: '999px',
      },
      boxShadow: {
        soft: clayShadow.card,
        float: clayShadow.button,
        clay: clayShadow.card,
        'clay-btn': clayShadow.button,
      },
      backgroundImage: {
        'clay-card': clayGradient.card,
        'clay-primary': clayGradient.primary,
      },
      keyframes: {
        // 黏土动效（PRD §3.7）
        'clay-press': {
          to: { transform: 'translateY(6px) scale(.97)' },
        },
        'clay-release': {
          '0%': { transform: 'translateY(6px) scale(.97)' },
          '60%': { transform: 'translateY(-2px) scale(1.02)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        'clay-jelly': {
          '0%': { transform: 'scale(1, 1)' },
          '30%': { transform: 'scale(1.08, .92)' },
          '55%': { transform: 'scale(.96, 1.04)' },
          '75%': { transform: 'scale(1.03, .98)' },
          '100%': { transform: 'scale(1, 1)' },
        },
        'clay-hover': {
          to: { transform: 'translateY(-2px)' },
        },
        // v2.0 保留动效（换黏土色由 CSS/组件负责）
        'heart-float': {
          '0%': { transform: 'translateY(0) scale(0.7)', opacity: '0' },
          '20%': { opacity: '1' },
          '100%': { transform: 'translateY(-90px) scale(1.25)', opacity: '0' },
        },
        'candy-fall': {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '0' },
          '15%': { opacity: '1' },
          '100%': { transform: 'translateY(260px) rotate(280deg)', opacity: '0' },
        },
        'pet-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '30%': { transform: 'translateY(-14px) scale(1.06)' },
          '60%': { transform: 'translateY(0) scale(0.96)' },
        },
        'soft-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.18)', opacity: '0.15' },
        },
      },
      animation: {
        'clay-press': 'clay-press .15s ease-out forwards',
        'clay-release': 'clay-release .28s cubic-bezier(.34,1.56,.64,1)',
        'clay-jelly': 'clay-jelly .52s cubic-bezier(.34,1.56,.64,1)',
        'clay-hover': 'clay-hover .18s ease forwards',
        'heart-float': 'heart-float 1.8s ease-out forwards',
        'candy-fall': 'candy-fall 1.7s ease-in forwards',
        'pet-bounce': 'pet-bounce 0.7s ease-in-out',
        'soft-pulse': 'soft-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
