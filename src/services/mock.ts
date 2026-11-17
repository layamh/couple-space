import { addDays, format, subDays } from 'date-fns';
import type {
  Result,
  Unsubscribe,
  ID,
  AppSession,
  Profile,
  Couple,
  Message,
  Pet,
  Photo,
  Anniversary,
  Wish,
  WishCheckin,
  Whisper,
  LocationShare,
  MessageType,
  MoodTag,
  PetItem,
  PetInventory,
  PetTrip,
  Postcard,
  PetInteraction,
  PetBundle,
  TravelSettleResult,
  PetBackgroundKey,
} from '@/types';
import {
  ok,
  err,
  levelForExp,
  stageForLevel,
  isUnlocked,
  withDecay,
  grownClovers,
  pickPostcard,
  SOUVENIR_KEYS,
  daysTogether,
  daysUntilNext,
  calculateStreak,
} from '@/services/contracts';
import type { CoupleServices } from '@/services/contracts';

const DEMO_USER_ID = 'demo-user';
const DEMO_PARTNER_ID = 'demo-partner';
const DEMO_COUPLE_ID = 'demo-couple';
const DEMO_CODE = 'DEMO123';
const DEMO_EMAIL = 'hello@couple.space';

/** 监听表：用 topic 分频道，模拟 Supabase Realtime 的广播行为。 */
type TopicListener = (payload: never) => void;
const listeners = new Map<string, Set<TopicListener>>();

function subscribeTopic<T>(topic: string, cb: (payload: T) => void): Unsubscribe {
  const listener = cb as (payload: never) => void;
  const bucket = listeners.get(topic) ?? new Set<TopicListener>();
  bucket.add(listener);
  listeners.set(topic, bucket);
  return () => {
    bucket.delete(listener);
    if (bucket.size === 0) listeners.delete(topic);
  };
}

function emitTopic<T>(topic: string, payload?: T): void {
  listeners.get(topic)?.forEach((listener) => (listener as (value: T | undefined) => void)(payload));
}

/** 模拟网络延迟 150~260ms，让交互有真实感。 */
function delay<T>(value: T): Promise<T> {
  const ms = 150 + Math.round(Math.random() * 110);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysAgoIso(days: number, hours = 0): string {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();
}

function dateAfter(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd');
}

const photoUrl = (id: string): string =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

/** 静态 catalog：与 002_pet_v2.sql 种子及 manifest.json 的 key 完全一致。 */
const MOCK_ITEMS: PetItem[] = [
  { key: 'bento_normal', category: 'consumable', name: '普通便当', asset_path: 'assets/pet/item/props_travel_sheet.png', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 3, rarity: 'normal', sort_order: 10 },
  { key: 'bento_deluxe', category: 'consumable', name: '豪华便当', asset_path: 'assets/pet/item/props_travel_sheet.png', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 8, rarity: 'normal', sort_order: 11 },
  { key: 'charm', category: 'consumable', name: '护身符', asset_path: 'assets/pet/item/props_travel_sheet.png', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 15, rarity: 'normal', sort_order: 12 },
  { key: 'hat_straw', category: 'outfit', name: '草帽', asset_path: 'assets/pet/outfit/hat_straw.png', slot: 'head', unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'normal', sort_order: 20 },
  { key: 'hat_beanie', category: 'outfit', name: '针织帽', asset_path: 'assets/pet/outfit/hat_beanie.png', slot: 'head', unlock_level: 2, unlock_intimacy: 0, price: 25, rarity: 'normal', sort_order: 21 },
  { key: 'flower_crown', category: 'outfit', name: '花环', asset_path: 'assets/pet/outfit/flower_crown.png', slot: 'head', unlock_level: 1, unlock_intimacy: 40, price: 30, rarity: 'normal', sort_order: 22 },
  { key: 'bow_knot', category: 'outfit', name: '粉蝴蝶结', asset_path: 'assets/pet/outfit/bow_knot.png', slot: 'neck', unlock_level: 1, unlock_intimacy: 20, price: 20, rarity: 'normal', sort_order: 23 },
  { key: 'bow_tie', category: 'outfit', name: '薄荷领结', asset_path: 'assets/pet/outfit/bow_tie.png', slot: 'neck', unlock_level: 1, unlock_intimacy: 35, price: 20, rarity: 'normal', sort_order: 24 },
  { key: 'scarf_knit', category: 'outfit', name: '针织围巾', asset_path: 'assets/pet/outfit/scarf_knit.png', slot: 'neck', unlock_level: 3, unlock_intimacy: 0, price: 30, rarity: 'normal', sort_order: 25 },
  { key: 'glasses_round', category: 'outfit', name: '圆框眼镜', asset_path: 'assets/pet/outfit/glasses_round.png', slot: 'eyes', unlock_level: 4, unlock_intimacy: 0, price: 35, rarity: 'normal', sort_order: 26 },
  { key: 'sunglasses', category: 'outfit', name: '墨镜', asset_path: 'assets/pet/outfit/sunglasses.png', slot: 'eyes', unlock_level: 5, unlock_intimacy: 0, price: 40, rarity: 'normal', sort_order: 27 },
  { key: 'bed_wood', category: 'furniture', name: '小木床', asset_path: 'assets/pet/furniture/bed_wood.png', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'normal', sort_order: 30 },
  { key: 'rug_wool', category: 'furniture', name: '毛线地毯', asset_path: 'assets/pet/furniture/rug_wool.png', slot: null, unlock_level: 2, unlock_intimacy: 0, price: 25, rarity: 'normal', sort_order: 31 },
  { key: 'plant_pot', category: 'furniture', name: '绿植盆栽', asset_path: 'assets/pet/furniture/plant_pot.png', slot: null, unlock_level: 1, unlock_intimacy: 30, price: 30, rarity: 'normal', sort_order: 32 },
  { key: 'bookshelf', category: 'furniture', name: '小书架', asset_path: 'assets/pet/furniture/bookshelf.png', slot: null, unlock_level: 5, unlock_intimacy: 0, price: 50, rarity: 'normal', sort_order: 33 },
  { key: 'toy_ball', category: 'furniture', name: '毛线球', asset_path: 'assets/pet/furniture/toy_ball.png', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 18, rarity: 'normal', sort_order: 34 },
  { key: 'lantern', category: 'furniture', name: '纸灯笼', asset_path: 'assets/pet/furniture/lantern.png', slot: null, unlock_level: 1, unlock_intimacy: 50, price: 55, rarity: 'normal', sort_order: 35 },
  { key: 'tea_table', category: 'furniture', name: '小茶几', asset_path: 'assets/pet/furniture/tea_table.png', slot: null, unlock_level: 4, unlock_intimacy: 0, price: 40, rarity: 'normal', sort_order: 36 },
  { key: 'swing', category: 'furniture', name: '小秋千', asset_path: 'assets/pet/furniture/swing.png', slot: null, unlock_level: 7, unlock_intimacy: 0, price: 60, rarity: 'normal', sort_order: 37 },
  { key: 'bg_courtyard', category: 'background', name: '庭院小窝', asset_path: 'assets/pet/background/bg_courtyard.jpg', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'normal', sort_order: 40 },
  { key: 'bg_starry', category: 'background', name: '星空夜晚', asset_path: 'assets/pet/background/bg_starry.jpg', slot: null, unlock_level: 6, unlock_intimacy: 0, price: 60, rarity: 'normal', sort_order: 41 },
  { key: 'bg_seaside', category: 'background', name: '海边木廊', asset_path: 'assets/pet/background/bg_seaside.jpg', slot: null, unlock_level: 1, unlock_intimacy: 60, price: 60, rarity: 'normal', sort_order: 42 },
  { key: 'bg_bedroom', category: 'background', name: '卧室角落', asset_path: 'assets/pet/background/bg_bedroom.jpg', slot: null, unlock_level: 4, unlock_intimacy: 0, price: 45, rarity: 'normal', sort_order: 43 },
  { key: 'bg_garden', category: 'background', name: '花园小径', asset_path: 'assets/pet/background/bg_garden.jpg', slot: null, unlock_level: 8, unlock_intimacy: 0, price: 70, rarity: 'normal', sort_order: 44 },
  { key: 'sakura', category: 'postcard', name: '樱花树下', asset_path: 'assets/pet/postcard/pc_sakura.jpg', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'normal', sort_order: 50 },
  { key: 'lighthouse', category: 'postcard', name: '海边灯塔', asset_path: 'assets/pet/postcard/pc_lighthouse.jpg', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'rare', sort_order: 51 },
  { key: 'onsen', category: 'postcard', name: '山间温泉', asset_path: 'assets/pet/postcard/pc_onsen.jpg', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'normal', sort_order: 52 },
  { key: 'shrine', category: 'postcard', name: '神社鸟居', asset_path: 'assets/pet/postcard/pc_shrine.jpg', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'rare', sort_order: 53 },
  { key: 'bamboo', category: 'postcard', name: '竹林小径', asset_path: 'assets/pet/postcard/pc_bamboo.jpg', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'normal', sort_order: 54 },
  { key: 'snow', category: 'postcard', name: '雪山', asset_path: 'assets/pet/postcard/pc_snow.jpg', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'rare', sort_order: 55 },
  { key: 'town', category: 'postcard', name: '古城街道', asset_path: 'assets/pet/postcard/pc_town.jpg', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'normal', sort_order: 56 },
  { key: 'starry', category: 'postcard', name: '星空草原', asset_path: 'assets/pet/postcard/pc_starry_grassland.jpg', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 0, rarity: 'rare', sort_order: 57 },
  { key: 'dango', category: 'souvenir', name: '樱花团子', asset_path: 'assets/pet/item/souvenir_parcel.png', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 5, rarity: 'normal', sort_order: 60 },
  { key: 'tea', category: 'souvenir', name: '焙茶包', asset_path: 'assets/pet/item/souvenir_parcel.png', slot: null, unlock_level: 1, unlock_intimacy: 0, price: 5, rarity: 'normal', sort_order: 61 },
];

/** 内置演示数据：内容丰富、时间跨度合理，所有写操作只改这个内存对象。 */
interface MockDatabase {
  session: AppSession | null;
  profile: Profile;
  partner: Profile;
  couple: Couple;
  messages: Message[];
  pet: Pet;
  photos: Photo[];
  anniversaries: Anniversary[];
  wishes: Wish[];
  checkins: WishCheckin[];
  whispers: Whisper[];
  location: LocationShare;
  inventory: PetInventory[];
  postcards: Postcard[];
  interactions: PetInteraction[];
  trips: PetTrip[];
}

function createInitialDatabase(): MockDatabase {
  const coupleId = DEMO_COUPLE_ID;
  const session: AppSession = {
    user: { id: DEMO_USER_ID, email: DEMO_EMAIL, nickname: '小甜' },
    access_token: 'demo-access-token',
  };
  const profile: Profile = {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    nickname: '小甜',
    avatar_url: null,
    couple_id: null,
    created_at: daysAgoIso(600),
  };
  const partner: Profile = {
    id: DEMO_PARTNER_ID,
    email: 'partner@couple.space',
    nickname: '小北',
    avatar_url: null,
    couple_id: null,
    created_at: daysAgoIso(598),
  };
  const couple: Couple = {
    id: coupleId,
    code: DEMO_CODE,
    partner1: DEMO_USER_ID,
    partner2: DEMO_PARTNER_ID,
    start_date: format(subDays(new Date(), 528), 'yyyy-MM-dd'),
    created_at: daysAgoIso(528),
  };

  const messageSeeds: Array<{
    days: number;
    hours: number;
    sender: string;
    type: MessageType;
    content: string;
    image?: string;
  }> = [
    { days: 6, hours: 3, sender: DEMO_PARTNER_ID, type: 'text', content: '早安呀～今天也要元气满满！' },
    { days: 6, hours: 2, sender: DEMO_USER_ID, type: 'emoji', content: '🌸' },
    { days: 4, hours: 5, sender: DEMO_USER_ID, type: 'text', content: '周末去看那家新开的甜品店好不好？' },
    { days: 4, hours: 4, sender: DEMO_PARTNER_ID, type: 'text', content: '好呀！我预约了靠窗的位置 🍰' },
    { days: 3, hours: 1, sender: DEMO_PARTNER_ID, type: 'image', content: '', image: photoUrl('photo-1518199266791-5375a83190b7') },
    { days: 3, hours: 0, sender: DEMO_USER_ID, type: 'text', content: '这张照片也太好看了吧！我要存下来 💕' },
    { days: 1, hours: 6, sender: DEMO_USER_ID, type: 'text', content: '今天下班有点晚，你先吃晚饭别等我～' },
    { days: 1, hours: 5, sender: DEMO_PARTNER_ID, type: 'text', content: '给你留了你最爱的草莓蛋糕，回家见！' },
    { days: 0, hours: 3, sender: DEMO_PARTNER_ID, type: 'emoji', content: '💗' },
    { days: 0, hours: 2, sender: DEMO_USER_ID, type: 'text', content: '宠物布丁今天又长大一点点啦 🐱' },
    { days: 0, hours: 1, sender: DEMO_PARTNER_ID, type: 'text', content: '晚上一起喂它！我买了新的小鱼干～' },
    { days: 0, hours: 0, sender: DEMO_USER_ID, type: 'text', content: '好呀，爱你哟 ❤️' },
  ];
  const messages: Message[] = messageSeeds.map((seed, index) => ({
    id: `demo-msg-${index + 1}`,
    couple_id: coupleId,
    sender_id: seed.sender,
    type: seed.type,
    content: seed.content,
    image_url: seed.image ?? null,
    created_at: daysAgoIso(seed.days, seed.hours),
  }));

  const pet: Pet = {
    id: 'demo-pet',
    couple_id: coupleId,
    name: '布丁',
    species: 'cat',
    level: 6,
    exp: 520,
    mood: 78,
    fullness: 65,
    intimacy: 24,
    clovers: 30,
    stage: 'teen',
    state: 'reading',
    is_traveling: false,
    travel_back_at: null,
    clover_count: 5,
    last_clover_at: new Date(Date.now() - 20_000).toISOString(),
    last_decay_at: new Date(Date.now() - 10_000).toISOString(),
    background: 'courtyard',
    growth: 520,
    last_fed_at: daysAgoIso(0, 2),
    updated_at: daysAgoIso(0, 1),
  };

  const inventory: PetInventory[] = [
    { id: 'inv-hat', couple_id: coupleId, item_key: 'hat_straw', quantity: 1, equipped: true, placed: false, pos_x: null, pos_y: null, mirrored: false, acquired_at: daysAgoIso(30) },
    { id: 'inv-bed', couple_id: coupleId, item_key: 'bed_wood', quantity: 1, equipped: false, placed: true, pos_x: 0.5, pos_y: 0.72, mirrored: false, acquired_at: daysAgoIso(30) },
    { id: 'inv-bow', couple_id: coupleId, item_key: 'bow_knot', quantity: 1, equipped: false, placed: false, pos_x: null, pos_y: null, mirrored: false, acquired_at: daysAgoIso(12) },
    { id: 'inv-rug', couple_id: coupleId, item_key: 'rug_wool', quantity: 1, equipped: false, placed: false, pos_x: null, pos_y: null, mirrored: false, acquired_at: daysAgoIso(10) },
    { id: 'inv-bento', couple_id: coupleId, item_key: 'bento_normal', quantity: 3, equipped: false, placed: false, pos_x: null, pos_y: null, mirrored: false, acquired_at: daysAgoIso(2) },
    { id: 'inv-deluxe', couple_id: coupleId, item_key: 'bento_deluxe', quantity: 1, equipped: false, placed: false, pos_x: null, pos_y: null, mirrored: false, acquired_at: daysAgoIso(2) },
    { id: 'inv-charm', couple_id: coupleId, item_key: 'charm', quantity: 1, equipped: false, placed: false, pos_x: null, pos_y: null, mirrored: false, acquired_at: daysAgoIso(2) },
  ];

  const postcards: Postcard[] = [
    { id: 'pc-1', couple_id: coupleId, postcard_key: 'sakura', rarity: 'normal', count: 2, trip_id: null, obtained_at: daysAgoIso(12) },
    { id: 'pc-2', couple_id: coupleId, postcard_key: 'lighthouse', rarity: 'rare', count: 1, trip_id: null, obtained_at: daysAgoIso(5) },
  ];

  const interactionSeeds: Array<{ actor: string; kind: PetInteraction['kind']; days: number }> = [
    { actor: DEMO_USER_ID, kind: 'feed', days: 3 },
    { actor: DEMO_PARTNER_ID, kind: 'play', days: 2 },
    { actor: DEMO_USER_ID, kind: 'pat', days: 1 },
    { actor: DEMO_PARTNER_ID, kind: 'feed', days: 1 },
    { actor: DEMO_USER_ID, kind: 'harvest', days: 0 },
    { actor: DEMO_PARTNER_ID, kind: 'play', days: 0 },
  ];
  const interactions: PetInteraction[] = interactionSeeds.map((seed, index) => ({
    id: `demo-int-${index + 1}`,
    couple_id: coupleId,
    actor_id: seed.actor,
    kind: seed.kind,
    created_at: daysAgoIso(seed.days, 1),
  }));

  const photoSeeds: Array<{ id: string; caption: string; days: number; uploader: string }> = [
    { id: 'photo-1518199266791-5375a83190b7', caption: '牵着你的手，就是最好的天气', days: 2, uploader: DEMO_PARTNER_ID },
    { id: 'photo-1490750967868-88aa4486c946', caption: '春天寄来的一束花 🌷', days: 9, uploader: DEMO_USER_ID },
    { id: 'photo-1522673607200-164d1b6ce486', caption: '我们的第一张合照', days: 18, uploader: DEMO_PARTNER_ID },
    { id: 'photo-1509023464722-18d996393ca8', caption: '那天傍晚的晚霞特别温柔', days: 26, uploader: DEMO_USER_ID },
    { id: 'photo-1523438885200-e635ba2c371e', caption: '一起走过的街道', days: 38, uploader: DEMO_PARTNER_ID },
    { id: 'photo-1465495976277-4387d4b0e4a6', caption: '要一直一直在一起呀', days: 55, uploader: DEMO_USER_ID },
    { id: 'photo-1470252649378-9c29740c9fa8', caption: '早起看日出，值了！', days: 74, uploader: DEMO_PARTNER_ID },
    { id: 'photo-1511895426328-dc8714191300', caption: '有家人的地方就是家', days: 96, uploader: DEMO_USER_ID },
  ];
  const photos: Photo[] = photoSeeds.map((seed, index) => ({
    id: `demo-photo-${index + 1}`,
    couple_id: coupleId,
    uploader_id: seed.uploader,
    url: photoUrl(seed.id),
    caption: seed.caption,
    created_at: daysAgoIso(seed.days),
  }));

  const anniversaries: Anniversary[] = [
    { id: 'demo-anniv-1', couple_id: coupleId, title: '恋爱纪念日', date: format(subDays(new Date(), 528), 'yyyy-MM-dd'), type: 'anniversary', created_at: daysAgoIso(528) },
    { id: 'demo-anniv-2', couple_id: coupleId, title: '小北的生日', date: dateAfter(9), type: 'birthday', created_at: daysAgoIso(400) },
    { id: 'demo-anniv-3', couple_id: coupleId, title: '第一次旅行', date: dateAfter(34), type: 'other', created_at: daysAgoIso(300) },
    { id: 'demo-anniv-4', couple_id: coupleId, title: '小甜的生日', date: dateAfter(78), type: 'birthday', created_at: daysAgoIso(400) },
    { id: 'demo-anniv-5', couple_id: coupleId, title: '在一起 1000 天', date: dateAfter(472), type: 'anniversary', created_at: daysAgoIso(100) },
  ];

  const wishSeeds: Array<{ title: string; done: boolean; creator: string }> = [
    { title: '一起去看一次海边日出', done: false, creator: DEMO_USER_ID },
    { title: '每天说一句“我爱你”', done: false, creator: DEMO_PARTNER_ID },
    { title: '读完同一本书并交换心得', done: false, creator: DEMO_USER_ID },
    { title: '学会做一道对方爱吃的菜', done: true, creator: DEMO_PARTNER_ID },
    { title: '存钱去旅行', done: false, creator: DEMO_USER_ID },
    { title: '一起养大宠物布丁', done: true, creator: DEMO_PARTNER_ID },
  ];
  const wishes: Wish[] = wishSeeds.map((seed, index) => ({
    id: `demo-wish-${index + 1}`,
    couple_id: coupleId,
    title: seed.title,
    done: seed.done,
    created_by: seed.creator,
    created_at: daysAgoIso(120 - index * 12),
  }));

  const checkins: WishCheckin[] = [];
  // 心愿 1 连续 6 天、心愿 2 连续 3 天，双方交替打卡。
  for (let i = 0; i < 6; i += 1) {
    checkins.push({
      id: `demo-checkin-a-${i}`,
      wish_id: 'demo-wish-1',
      user_id: i % 2 === 0 ? DEMO_USER_ID : DEMO_PARTNER_ID,
      checkin_date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
    });
  }
  for (let i = 0; i < 3; i += 1) {
    checkins.push({
      id: `demo-checkin-b-${i}`,
      wish_id: 'demo-wish-2',
      user_id: i % 2 === 0 ? DEMO_PARTNER_ID : DEMO_USER_ID,
      checkin_date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
    });
  }

  const whisperSeeds: Array<{ author: string; content: string; mood: MoodTag; days: number; hours: number }> = [
    { author: DEMO_PARTNER_ID, content: '今天路过花店，看到一束粉色郁金香，第一反应是“她一定会喜欢”。', mood: 'sweet', days: 5, hours: 4 },
    { author: DEMO_USER_ID, content: '谢谢你昨天耐心听我碎碎念，好像所有烦恼都被你抱住了。', mood: 'happy', days: 3, hours: 2 },
    { author: DEMO_PARTNER_ID, content: '周末的阳光很好，想和你窝在沙发上看一整天的老电影。', mood: 'calm', days: 2, hours: 6 },
    { author: DEMO_USER_ID, content: '布丁今天偷偷趴在我的键盘上睡着了，小脑袋毛茸茸的 🐾', mood: 'excited', days: 1, hours: 3 },
    { author: DEMO_PARTNER_ID, content: '有点累，但是想到家里有你在等我，脚步就变轻了。', mood: 'sad', days: 1, hours: 1 },
    { author: DEMO_USER_ID, content: '我们的小宇宙又长大了一天，晚安呀，梦里见。', mood: 'sweet', days: 0, hours: 2 },
  ];
  const whispers: Whisper[] = whisperSeeds.map((seed, index) => ({
    id: `demo-whisper-${index + 1}`,
    couple_id: coupleId,
    author_id: seed.author,
    content: seed.content,
    mood: seed.mood,
    created_at: daysAgoIso(seed.days, seed.hours),
  }));

  const location: LocationShare = {
    couple_id: coupleId,
    user_id: DEMO_PARTNER_ID,
    lat: 31.23,
    lng: 121.47,
    accuracy: 1200,
    sharing: true,
    updated_at: daysAgoIso(0, 0.15),
  };

  return {
    session: null,
    profile,
    partner,
    couple,
    messages,
    pet,
    photos,
    anniversaries,
    wishes,
    checkins,
    whispers,
    location,
    inventory,
    postcards,
    interactions,
    trips: [],
  };
}

/** 模块级内存数据库：刷新页面即恢复初始假数据。 */
const db: MockDatabase = createInitialDatabase();

/**
 * 深拷贝演示数据。数组必须用 Array.isArray 分支——
 * 若用 { ...value } 展开数组会得到键为 "0"/"1" 的伪数组对象，
 * 导致消费端 .filter/.map/.sort/.slice 全部失效（曾引发宠物页白屏）。
 */
function clone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => clone(item)) as T;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = item !== null && typeof item === 'object' ? clone(item) : item;
  }
  return result as T;
}

/** 演示时间压缩：1 分钟 ≈ 1 小时；三叶草 60 秒/株。 */
const DEMO_SCALE = 60_000;

/** 统一补算衰减与三叶草生长，双实现共用 contracts 纯函数。 */
function refreshDemoPet(): Pet {
  const now = Date.now();
  const decayed = withDecay(db.pet, now, DEMO_SCALE);
  const cloverCount = grownClovers(decayed.clover_count, decayed.last_clover_at, now, 60_000);
  const next = { ...decayed, clover_count: cloverCount };
  if (
    next.mood !== db.pet.mood ||
    next.fullness !== db.pet.fullness ||
    next.last_decay_at !== db.pet.last_decay_at ||
    cloverCount !== db.pet.clover_count
  ) {
    db.pet = next;
  }
  return clone(db.pet);
}

function recordInteraction(coupleId: string, actorId: string, kind: PetInteraction['kind']): void {
  db.interactions.unshift({
    id: uid('int'),
    couple_id: coupleId,
    actor_id: actorId,
    kind,
    created_at: new Date().toISOString(),
  });
}

function recentlyDid(kind: PetInteraction['kind']): boolean {
  return db.interactions.some(
    (item) =>
      item.actor_id === DEMO_USER_ID &&
      item.kind === kind &&
      Date.now() - new Date(item.created_at).getTime() < 30 * 60_000,
  );
}

function isDailyFirst(kind: PetInteraction['kind']): boolean {
  const today = format(new Date(), 'yyyy-MM-dd');
  return !db.interactions.some(
    (item) =>
      item.actor_id === DEMO_USER_ID &&
      item.kind === kind &&
      format(new Date(item.created_at), 'yyyy-MM-dd') === today,
  );
}

function itemQuantity(key: string): number {
  return db.inventory.find((entry) => entry.item_key === key)?.quantity ?? 0;
}

function consumeItem(key: string, count = 1): void {
  const entry = db.inventory.find((row) => row.item_key === key);
  if (entry) entry.quantity = Math.max(0, entry.quantity - count);
}

function gainExp(pet: Pet, amount: number): Pet {
  const exp = Math.min(900, pet.exp + amount);
  const level = levelForExp(exp);
  return { ...pet, exp, level, stage: stageForLevel(level) };
}

function emitPet(coupleId: string, patch: Partial<PetBundle> = {}): void {
  emitTopic(`pet:${coupleId}`, clone(db.pet));
  emitTopic(`petdata:${coupleId}`, patch);
}

export function createMockServices(): CoupleServices {
  return {
    // ============================ Auth ============================
    auth: {
      async signUp(email, _password, nickname) {
        db.profile.email = email.trim() || DEMO_EMAIL;
        db.profile.nickname = nickname.trim() || '恋人';
        db.session = {
          user: { id: DEMO_USER_ID, email: db.profile.email, nickname: db.profile.nickname },
          access_token: 'demo-access-token',
        };
        emitTopic('auth', db.session);
        return delay(ok(clone(db.session)));
      },

      async signIn(email, _password) {
        db.profile.email = email.trim() || DEMO_EMAIL;
        db.session = {
          user: { id: DEMO_USER_ID, email: db.profile.email, nickname: db.profile.nickname },
          access_token: 'demo-access-token',
        };
        emitTopic('auth', db.session);
        return delay(ok(clone(db.session)));
      },

      async signOut() {
        db.session = null;
        emitTopic('auth', null);
        return delay(ok(undefined));
      },

      async getSession() {
        return db.session ? clone(db.session) : null;
      },

      async getProfile() {
        return clone(db.profile);
      },

      onAuthChange(cb) {
        return subscribeTopic<AppSession | null>('auth', cb);
      },
    },

    // ============================ Pairing ============================
    pairing: {
      async createSpace(nickname, startDate) {
        db.profile.nickname = nickname.trim() || '恋人';
        db.couple.start_date = startDate || db.couple.start_date;
        db.profile.couple_id = db.couple.id;
        db.partner.couple_id = db.couple.id;
        emitTopic(`couple:${db.couple.id}`, clone(db.couple));
        return delay(ok(clone(db.couple)));
      },

      async joinByCode(code) {
        const normalized = code.trim().toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(normalized)) {
          return delay(err<Couple>('请输入 6 位邀请码', 'INVALID_CODE'));
        }
        db.couple.code = normalized;
        db.profile.couple_id = db.couple.id;
        db.partner.couple_id = db.couple.id;
        emitTopic(`couple:${db.couple.id}`, clone(db.couple));
        return delay(ok(clone(db.couple)));
      },

      async getMyCouple() {
        return db.session && db.profile.couple_id ? clone(db.couple) : null;
      },

      async updateStartDate(startDate) {
        db.couple.start_date = startDate;
        emitTopic(`couple:${db.couple.id}`, clone(db.couple));
        return delay(ok(clone(db.couple)));
      },

      async getPartner() {
        return clone(db.partner);
      },

      buildInviteLink(code) {
        return `${window.location.origin}${import.meta.env.BASE_URL}#/pairing?code=${encodeURIComponent(code)}`;
      },

      subscribeCouple(coupleId, cb) {
        return subscribeTopic<Couple>(`couple:${coupleId}`, cb);
      },
    },

    // ============================ Chat ============================
    chat: {
      async listMessages(coupleId, limit = 100) {
        const list = db.messages
          .filter((message) => message.couple_id === coupleId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .slice(-limit)
          .map(clone);
        return delay(ok(list));
      },

      async sendMessage(input) {
        const message: Message = {
          id: uid('msg'),
          couple_id: input.coupleId,
          sender_id: DEMO_USER_ID,
          type: input.type,
          content: input.content,
          image_url: input.imageUrl ?? null,
          created_at: new Date().toISOString(),
        };
        db.messages.push(message);
        emitTopic(`messages:${input.coupleId}`, clone(message));
        return delay(ok(clone(message)));
      },

      async uploadImage(_coupleId, file) {
        // 演示模式用 Object URL 直接预览，刷新后自动失效，符合“不持久化”约定。
        return delay(ok(URL.createObjectURL(file)));
      },

      subscribeMessages(coupleId, cb) {
        return subscribeTopic<Message>(`messages:${coupleId}`, cb);
      },
    },

    // ============================ Pet v2 ============================
    pet: {
      async getPet(coupleId) {
        if (db.pet.couple_id !== coupleId) return err<Pet>('宠物数据不存在', 'PET_NOT_FOUND');
        return delay(ok(refreshDemoPet()));
      },

      async feed(coupleId) {
        const pet = refreshDemoPet();
        if (pet.fullness >= 100) return delay(err<Pet>('布丁已经吃饱啦，过会儿再喂吧', 'FULL'));
        if (itemQuantity('bento_normal') + itemQuantity('bento_deluxe') <= 0) {
          return delay(err<Pet>('便当不够了，去商店买一份吧', 'NO_BENTO'));
        }
        if (recentlyDid('feed')) return delay(err<Pet>('刚喂过，先歇会儿～', 'ANTI_SPAM'));
        consumeItem(itemQuantity('bento_normal') > 0 ? 'bento_normal' : 'bento_deluxe');
        recordInteraction(coupleId, DEMO_USER_ID, 'feed');
        let next: Pet = {
          ...pet,
          fullness: Math.min(100, pet.fullness + 25),
          mood: Math.min(100, pet.mood + 5),
          state: 'eating',
          last_fed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        next = gainExp(next, 10);
        if (isDailyFirst('feed')) next = { ...next, intimacy: Math.min(100, next.intimacy + 2) };
        db.pet = next;
        emitPet(coupleId, { pet: clone(db.pet), inventory: clone(db.inventory), interactions: clone(db.interactions) });
        return delay(ok(clone(db.pet)));
      },

      async interact(coupleId, kind) {
        const pet = refreshDemoPet();
        if (recentlyDid(kind)) return delay(err<Pet>('刚互动过，先歇会儿～', 'ANTI_SPAM'));
        recordInteraction(coupleId, DEMO_USER_ID, kind);
        let next: Pet = {
          ...pet,
          mood: Math.min(100, pet.mood + (kind === 'play' ? 12 : 6)),
          updated_at: new Date().toISOString(),
        };
        next = gainExp(next, kind === 'play' ? 8 : 5);
        if (isDailyFirst(kind)) next = { ...next, intimacy: Math.min(100, next.intimacy + 2) };
        db.pet = next;
        emitPet(coupleId, { pet: clone(db.pet), interactions: clone(db.interactions) });
        return delay(ok(clone(db.pet)));
      },

      async rename(coupleId, name) {
        db.pet = { ...refreshDemoPet(), name: name.trim().slice(0, 12) || '布丁', updated_at: new Date().toISOString() };
        emitPet(coupleId, { pet: clone(db.pet) });
        return delay(ok(clone(db.pet)));
      },

      subscribePet(coupleId, cb) {
        return subscribeTopic<Pet>(`pet:${coupleId}`, cb);
      },

      async getPetBundle(coupleId) {
        const pet = refreshDemoPet();
        if (db.inventory.length === 0) {
          db.inventory = [
            { id: uid('inv'), couple_id: coupleId, item_key: 'hat_straw', quantity: 1, equipped: true, placed: false, pos_x: null, pos_y: null, mirrored: false, acquired_at: new Date().toISOString() },
            { id: uid('inv'), couple_id: coupleId, item_key: 'bed_wood', quantity: 1, equipped: false, placed: true, pos_x: 0.5, pos_y: 0.72, mirrored: false, acquired_at: new Date().toISOString() },
            { id: uid('inv'), couple_id: coupleId, item_key: 'bento_normal', quantity: 1, equipped: false, placed: false, pos_x: null, pos_y: null, mirrored: false, acquired_at: new Date().toISOString() },
          ];
        }
        return delay(
          ok({
            pet: clone(db.pet),
            items: MOCK_ITEMS.map(clone),
            inventory: clone(db.inventory),
            postcards: clone(db.postcards),
            interactions: clone(db.interactions),
            trip: db.trips.find((trip) => trip.status === 'traveling') ?? null,
          }),
        );
      },

      async harvestClovers(coupleId) {
        const pet = refreshDemoPet();
        const count = pet.clover_count;
        if (count <= 0) return delay(err<Pet>('三叶草还在长，等一会儿再来吧', 'NO_CLOVER'));
        db.pet = {
          ...pet,
          clovers: Math.min(999, pet.clovers + count * 2),
          clover_count: 0,
          last_clover_at: new Date().toISOString(),
        };
        recordInteraction(coupleId, DEMO_USER_ID, 'harvest');
        emitPet(coupleId, { pet: clone(db.pet), interactions: clone(db.interactions) });
        return delay(ok(clone(db.pet)));
      },

      async buyItem(coupleId, itemKey, quantity = 1) {
        const item = MOCK_ITEMS.find((entry) => entry.key === itemKey);
        const pet = refreshDemoPet();
        if (!item) return delay(err<{ pet: Pet; item: PetInventory }>('商品不存在', 'ITEM_NOT_FOUND'));
        if (!isUnlocked(item, pet)) return delay(err<{ pet: Pet; item: PetInventory }>('还没解锁，继续升级吧', 'LOCKED'));
        const cost = item.price * quantity;
        if (pet.clovers < cost) return delay(err<{ pet: Pet; item: PetInventory }>(`三叶草不足，还差 ${cost - pet.clovers} 株`, 'NO_CLOVER'));
        db.pet = { ...pet, clovers: pet.clovers - cost };
        let entry = db.inventory.find((row) => row.item_key === itemKey);
        if (entry) {
          entry.quantity += quantity;
        } else {
          entry = {
            id: uid('inv'), couple_id: coupleId, item_key: itemKey, quantity,
            equipped: false, placed: false, pos_x: null, pos_y: null, mirrored: false,
            acquired_at: new Date().toISOString(),
          };
          db.inventory.push(entry);
        }
        emitPet(coupleId, { pet: clone(db.pet), inventory: clone(db.inventory) });
        return delay(ok({ pet: clone(db.pet), item: clone(entry) }));
      },

      async equipItem(coupleId, itemKey, equipped) {
        const target = db.inventory.find((entry) => entry.item_key === itemKey);
        const item = MOCK_ITEMS.find((entry) => entry.key === itemKey);
        if (!target || !item || !item.slot) return delay(err<PetInventory>('服饰不存在', 'ITEM_NOT_FOUND'));
        if (equipped) {
          db.inventory.forEach((entry) => {
            const other = MOCK_ITEMS.find((candidate) => candidate.key === entry.item_key);
            if (other?.slot === item.slot) entry.equipped = false;
          });
        }
        target.equipped = equipped;
        db.pet = { ...refreshDemoPet(), mood: Math.min(100, db.pet.mood + 2), updated_at: new Date().toISOString() };
        emitPet(coupleId, { pet: clone(db.pet), inventory: clone(db.inventory) });
        return delay(ok(clone(target)));
      },

      async placeFurniture(coupleId, itemKey, patch) {
        const entry = db.inventory.find((row) => row.item_key === itemKey);
        if (!entry) return delay(err<PetInventory>('家具未拥有', 'ITEM_NOT_FOUND'));
        Object.assign(entry, patch);
        emitPet(coupleId, { inventory: clone(db.inventory) });
        return delay(ok(clone(entry)));
      },

      async setBackground(coupleId, background) {
        const item = MOCK_ITEMS.find((entry) => entry.key === `bg_${background}`);
        const pet = refreshDemoPet();
        const owned = db.inventory.some((entry) => entry.item_key === `bg_${background}`);
        if (!item || !isUnlocked(item, pet) || !owned) {
          return delay(err<Pet>('该背景尚未解锁或未拥有，去商店看看吧', 'LOCKED'));
        }
        db.pet = { ...pet, background, updated_at: new Date().toISOString() };
        emitPet(coupleId, { pet: clone(db.pet) });
        return delay(ok(clone(db.pet)));
      },

      async startTravel(coupleId, input) {
        const pet = refreshDemoPet();
        if (pet.is_traveling) return delay(err<PetTrip>(`${pet.name} 正在旅行中`, 'ALREADY_TRAVELING'));
        if (itemQuantity(input.bentoKey) <= 0) return delay(err<PetTrip>('请先准备便当', 'NO_BENTO'));
        if (input.charmKey && itemQuantity(input.charmKey) <= 0) return delay(err<PetTrip>('护身符数量不足', 'NO_CHARM'));
        consumeItem(input.bentoKey);
        if (input.charmKey) consumeItem(input.charmKey);
        const now = Date.now();
        const trip: PetTrip = {
          id: uid('trip'), couple_id: coupleId,
          started_at: new Date(now).toISOString(),
          back_at: new Date(now + (2 + Math.random() * 3) * 60_000).toISOString(),
          bento_key: input.bentoKey, charm_key: input.charmKey ?? null,
          status: 'traveling', postcard_key: null, souvenir_key: null,
          clovers_gained: 0, exp_gained: 0, settled_at: null,
        };
        db.trips.unshift(trip);
        db.pet = {
          ...pet, is_traveling: true, state: 'traveling',
          travel_back_at: trip.back_at, updated_at: new Date().toISOString(),
        };
        recordInteraction(coupleId, DEMO_USER_ID, 'travel');
        emitPet(coupleId, { pet: clone(db.pet), trip: clone(trip), inventory: clone(db.inventory), interactions: clone(db.interactions) });
        return delay(ok(clone(trip)));
      },

      async settleTravel(coupleId, force = false) {
        const trip = db.trips.find((entry) => entry.status === 'traveling');
        if (!trip) return delay(err<TravelSettleResult>('没有进行中的旅行', 'NO_TRIP'));
        if (!force && new Date(trip.back_at).getTime() > Date.now()) {
          return delay(err<TravelSettleResult>('它还在路上，再等等吧', 'NOT_YET'));
        }
        const rareChance = (trip.bento_key === 'bento_deluxe' ? 0.4 : 0.15) + (trip.charm_key ? 0.25 : 0);
        const postcardKey = pickPostcard(Math.min(0.85, rareChance));
        const souvenirKey = SOUVENIR_KEYS[Math.floor(Math.random() * SOUVENIR_KEYS.length)];
        const cloversGained = 5 + Math.floor(Math.random() * 11);
        const expGained = 30;
        trip.status = 'settled';
        trip.postcard_key = postcardKey;
        trip.souvenir_key = souvenirKey;
        trip.clovers_gained = cloversGained;
        trip.exp_gained = expGained;
        trip.settled_at = new Date().toISOString();
        let pet: Pet = {
          ...refreshDemoPet(),
          is_traveling: false, travel_back_at: null, state: 'idle',
          clovers: Math.min(999, db.pet.clovers + cloversGained),
          intimacy: Math.min(100, db.pet.intimacy + 10),
          updated_at: new Date().toISOString(),
        };
        pet = gainExp(pet, expGained);
        db.pet = pet;
        let postcard = db.postcards.find((entry) => entry.postcard_key === postcardKey);
        if (postcard) {
          postcard.count += 1;
          postcard.obtained_at = new Date().toISOString();
        } else {
          postcard = {
            id: uid('pc'), couple_id: coupleId, postcard_key: postcardKey,
            rarity: MOCK_ITEMS.find((item) => item.key === postcardKey)?.rarity ?? 'normal',
            count: 1, trip_id: trip.id, obtained_at: new Date().toISOString(),
          };
          db.postcards.unshift(postcard);
        }
        let souvenir = db.inventory.find((entry) => entry.item_key === souvenirKey);
        if (souvenir) souvenir.quantity += 1;
        else db.inventory.push({ id: uid('inv'), couple_id: coupleId, item_key: souvenirKey, quantity: 1, equipped: false, placed: false, pos_x: null, pos_y: null, mirrored: false, acquired_at: new Date().toISOString() });
        emitPet(coupleId, { pet: clone(pet), trip: clone(trip), postcards: clone(db.postcards), inventory: clone(db.inventory) });
        return delay(ok({ pet: clone(pet), trip: clone(trip), postcard: clone(postcard), souvenirKey }));
      },

      async listPostcards(coupleId) {
        return delay(ok(clone(db.postcards).sort((a, b) => b.obtained_at.localeCompare(a.obtained_at))));
      },

      async listInteractions(_coupleId, limit = 50) {
        return delay(ok(clone(db.interactions).slice(0, limit)));
      },

      async listItems() {
        return delay(ok(MOCK_ITEMS.map(clone)));
      },

      subscribePetData(coupleId, cb) {
        return subscribeTopic<Partial<PetBundle>>(`petdata:${coupleId}`, cb);
      },
    },

    // ============================ Album ============================
    album: {
      async listPhotos(coupleId) {
        const list = db.photos
          .filter((photo) => photo.couple_id === coupleId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(clone);
        return delay(ok(list));
      },

      async uploadPhoto(coupleId, file, caption) {
        const photo: Photo = {
          id: uid('photo'),
          couple_id: coupleId,
          uploader_id: DEMO_USER_ID,
          url: URL.createObjectURL(file),
          caption: caption?.trim() || null,
          created_at: new Date().toISOString(),
        };
        db.photos.unshift(photo);
        emitTopic(`photos:${coupleId}`, clone(photo));
        return delay(ok(clone(photo)));
      },

      async deletePhoto(photoId) {
        db.photos = db.photos.filter((photo) => photo.id !== photoId);
        return delay(ok(undefined));
      },

      subscribePhotos(coupleId, cb) {
        return subscribeTopic<Photo>(`photos:${coupleId}`, cb);
      },
    },

    // ============================ Anniversary ============================
    anniversary: {
      async list(coupleId) {
        const list = db.anniversaries
          .filter((item) => item.couple_id === coupleId)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(clone);
        return delay(ok(list));
      },

      async create(input) {
        const item: Anniversary = {
          ...input,
          id: uid('anniv'),
          created_at: new Date().toISOString(),
        };
        db.anniversaries.push(item);
        return delay(ok(clone(item)));
      },

      async update(id, patch) {
        const index = db.anniversaries.findIndex((item) => item.id === id);
        if (index < 0) return delay(err<Anniversary>('纪念日不存在', 'NOT_FOUND'));
        db.anniversaries[index] = { ...db.anniversaries[index], ...patch };
        return delay(ok(clone(db.anniversaries[index])));
      },

      async delete(id) {
        db.anniversaries = db.anniversaries.filter((item) => item.id !== id);
        return delay(ok(undefined));
      },

      getDaysTogether(startDate) {
        return daysTogether(startDate);
      },

      getNext(anniversaries) {
        return daysUntilNext(anniversaries);
      },
    },

    // ============================ Wish ============================
    wish: {
      async list(coupleId) {
        const wishes = db.wishes.filter((wish) => wish.couple_id === coupleId).map(clone);
        const ids = new Set(wishes.map((wish) => wish.id));
        const checkins = db.checkins.filter((checkin) => ids.has(checkin.wish_id)).map(clone);
        return delay(ok({ wishes, checkins }));
      },

      async create(coupleId, title) {
        const wish: Wish = {
          id: uid('wish'),
          couple_id: coupleId,
          title: title.trim(),
          done: false,
          created_by: DEMO_USER_ID,
          created_at: new Date().toISOString(),
        };
        db.wishes.unshift(wish);
        emitTopic(`wish:${coupleId}`);
        return delay(ok(clone(wish)));
      },

      async update(id, patch) {
        const index = db.wishes.findIndex((wish) => wish.id === id);
        if (index < 0) return delay(err<Wish>('心愿不存在', 'NOT_FOUND'));
        db.wishes[index] = { ...db.wishes[index], ...patch };
        emitTopic(`wish:${db.wishes[index].couple_id}`);
        return delay(ok(clone(db.wishes[index])));
      },

      async delete(id) {
        const target = db.wishes.find((wish) => wish.id === id);
        db.wishes = db.wishes.filter((wish) => wish.id !== id);
        db.checkins = db.checkins.filter((checkin) => checkin.wish_id !== id);
        if (target) emitTopic(`wish:${target.couple_id}`);
        return delay(ok(undefined));
      },

      async checkIn(wishId, userId) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const existing = db.checkins.find(
          (checkin) =>
            checkin.wish_id === wishId && checkin.user_id === userId && checkin.checkin_date === today,
        );
        if (existing) return delay(ok(clone(existing)));
        const checkin: WishCheckin = {
          id: uid('checkin'),
          wish_id: wishId,
          user_id: userId,
          checkin_date: today,
        };
        db.checkins.push(checkin);
        const wish = db.wishes.find((item) => item.id === wishId);
        if (wish) emitTopic(`wish:${wish.couple_id}`);
        return delay(ok(clone(checkin)));
      },

      getStreak(checkins, wishId) {
        return calculateStreak(checkins, wishId);
      },

      subscribe(coupleId, cb) {
        return subscribeTopic<void>(`wish:${coupleId}`, cb);
      },
    },

    // ============================ Whisper ============================
    whisper: {
      async list(coupleId) {
        const list = db.whispers
          .filter((item) => item.couple_id === coupleId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(clone);
        return delay(ok(list));
      },

      async create(coupleId, authorId, content, mood) {
        const whisper: Whisper = {
          id: uid('whisper'),
          couple_id: coupleId,
          author_id: authorId,
          content: content.trim(),
          mood,
          created_at: new Date().toISOString(),
        };
        db.whispers.unshift(whisper);
        emitTopic(`whispers:${coupleId}`, clone(whisper));
        return delay(ok(clone(whisper)));
      },

      async delete(id) {
        db.whispers = db.whispers.filter((item) => item.id !== id);
        return delay(ok(undefined));
      },

      subscribe(coupleId, cb) {
        return subscribeTopic<Whisper>(`whispers:${coupleId}`, cb);
      },
    },

    // ============================ Location ============================
    location: {
      async get(coupleId) {
        const current = db.location.couple_id === coupleId ? clone(db.location) : null;
        return delay(ok(current));
      },

      async update(coupleId, userId) {
        // 演示模式使用内置的上海人民广场附近坐标，避免弹系统权限框影响体验。
        db.location = {
          couple_id: coupleId,
          user_id: userId,
          lat: 31.23,
          lng: 121.47,
          accuracy: 1000,
          sharing: true,
          updated_at: new Date().toISOString(),
        };
        emitTopic(`location:${coupleId}`, clone(db.location));
        return delay(ok(clone(db.location)));
      },

      async setSharing(coupleId, sharing) {
        db.location = { ...db.location, sharing, updated_at: new Date().toISOString() };
        emitTopic(`location:${coupleId}`, clone(db.location));
        return delay(ok(clone(db.location)));
      },

      subscribe(coupleId, cb) {
        return subscribeTopic<LocationShare>(`location:${coupleId}`, cb);
      },
    },
  };
}

/** 仅供演示页展示的假用户 id，避免页面内硬编码。 */
export const demoIds: { me: ID; partner: ID; couple: ID } = {
  me: DEMO_USER_ID,
  partner: DEMO_PARTNER_ID,
  couple: DEMO_COUPLE_ID,
};
