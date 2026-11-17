/**
 * 黏土马卡龙设计 token —— 纯前端常量，不入库、不参与任何业务逻辑。
 * MUI(theme.ts) / Tailwind(tailwind.config.ts) / CSS(index.css) 共用同一份色值源，
 * 避免各处硬编码魔法值导致色板漂移。
 */

/** 黏土马卡龙色板（PRD §3.2）。 */
export const clay = {
  pink: '#F4A6C1',
  pinkSoft: '#F7B4CC',
  pinkDeep: '#E983A8',
  lavender: '#C4AEE8',
  lavenderDeep: '#A98AD8',
  apricot: '#FFD9AE',
  mint: '#BFE6D6',
  cream: '#FFF8F1',
  base: '#FBE9EF',
  ink: '#5A4653',
  inkSoft: '#947F8F',
  hi: 'rgba(255,255,255,.72)',
  baseEdge: '#EFB9CD',
  btnEdge: '#D9668F',
  /** 暖紫灰落地影，禁纯黑。 */
  shadow: 'rgba(120,80,100,.22)',
} as const;

/** 圆角级别：微/小/中/大/胶囊（PRD §3.4）。 */
export const clayRadius = {
  xs: 10,
  sm: 14,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

/** 三层黏土投影：顶部内高光 + 实色厚度边 + 柔和落地影（PRD §3.5）。 */
export const clayShadow = {
  card: [
    'inset 0 2px 0 rgba(255,255,255,.75)',
    'inset 0 -1px 0 rgba(120,80,100,.05)',
    `0 8px 0 ${clay.baseEdge}`,
    '0 16px 24px -8px rgba(120,80,100,.22)',
  ].join(', '),
  cardHover: [
    'inset 0 2px 0 rgba(255,255,255,.8)',
    'inset 0 -1px 0 rgba(120,80,100,.05)',
    `0 10px 0 ${clay.baseEdge}`,
    '0 20px 28px -8px rgba(120,80,100,.28)',
  ].join(', '),
  cardPress: [
    'inset 0 2px 0 rgba(255,255,255,.7)',
    'inset 0 -1px 0 rgba(120,80,100,.05)',
    `0 2px 0 ${clay.baseEdge}`,
    '0 6px 10px -6px rgba(120,80,100,.22)',
  ].join(', '),
  button: [
    'inset 0 2px 1px rgba(255,255,255,.55)',
    `0 6px 0 ${clay.btnEdge}`,
    '0 12px 18px -6px rgba(233,131,168,.5)',
  ].join(', '),
  buttonHover: [
    'inset 0 2px 1px rgba(255,255,255,.6)',
    `0 8px 0 ${clay.btnEdge}`,
    '0 16px 22px -6px rgba(233,131,168,.55)',
  ].join(', '),
  buttonPress: [
    'inset 0 2px 1px rgba(255,255,255,.5)',
    `0 2px 0 ${clay.btnEdge}`,
    '0 6px 10px -6px rgba(233,131,168,.5)',
  ].join(', '),
  chip: `inset 0 1.5px 0 ${clay.hi}, 0 3px 0 ${clay.baseEdge}`,
  /** 凹槽输入：内阴影模拟软陶凹陷。 */
  input: 'inset 0 2px 5px rgba(120,80,100,.12), inset 0 -1px 0 rgba(255,255,255,.6)',
  inputFocus: 'inset 0 2px 5px rgba(120,80,100,.10), 0 0 0 3px rgba(244,166,193,.28)',
} as const;

/** 哑光马卡龙渐变。 */
export const clayGradient = {
  primary: `linear-gradient(145deg, ${clay.pinkSoft} 0%, #EC7FA6 60%, ${clay.lavender} 130%)`,
  card: 'linear-gradient(145deg, #FFFDFB 0%, #FFF8F1 100%)',
  tray: 'linear-gradient(180deg, #FFFDFB 0%, #FFF8F1 100%)',
  iconPink: 'linear-gradient(145deg, #FFE3EC, #F7B4CC)',
  iconLavender: 'linear-gradient(145deg, #EFE7FB, #C4AEE8)',
  iconApricot: 'linear-gradient(145deg, #FFF0DC, #FFD9AE)',
  iconMint: 'linear-gradient(145deg, #E4F5EE, #BFE6D6)',
  iconSelected: 'linear-gradient(145deg, #F7B4CC, #EC7FA6)',
} as const;

/** 动效时长（ms，PRD §3.7）。 */
export const clayDuration = {
  press: 150,
  release: 280,
  jelly: 520,
  hover: 180,
} as const;
