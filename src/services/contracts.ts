import { differenceInCalendarDays, format, subDays } from 'date-fns';
import type {
  Result,
  Unsubscribe,
  ID,
  ISODate,
  AppSession,
  Profile,
  Couple,
  Message,
  Pet,
  PetItem,
  PetInventory,
  PetTrip,
  Postcard,
  PetInteraction,
  PetBundle,
  TravelSettleResult,
  PetBackgroundKey,
  Photo,
  Anniversary,
  Wish,
  WishCheckin,
  Whisper,
  LocationShare,
  MessageType,
  MoodTag,
  AnniversaryType,
} from '@/types';

/** 成功结果构造器，供 real / mock 两种实现共用。 */
export function ok<T>(data: T): Result<T> {
  return { data, error: null };
}

/** 失败结果构造器，供 real / mock 两种实现共用。 */
export function err<T>(message: string, code?: string): Result<T> {
  return { data: null, error: { message, code } };
}

/**
 * 上传前压缩图片：最长边 1600px、JPEG 0.8，避免超出 Supabase 免费存储配额。
 * GIF / SVG 等无法安全压缩的格式原样返回。
 */
export function compressImage(file: File, maxSize = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return Promise.resolve(file);
  }

  return new Promise<File>((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(file);
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height, 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(file);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            resolve(new File([blob], name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality,
        );
      };
      image.src = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  });
}

export interface AuthService {
  signUp(email: string, password: string, nickname: string): Promise<Result<AppSession>>;
  signIn(email: string, password: string): Promise<Result<AppSession>>;
  signOut(): Promise<Result<void>>;
  getSession(): Promise<AppSession | null>;
  getProfile(): Promise<Profile | null>;
  /** 相册授权开关：开启后伴侣才能看到我上传的照片。 */
  setAlbumShared(value: boolean): Promise<Result<Profile>>;
  onAuthChange(cb: (s: AppSession | null) => void): Unsubscribe;
}

export interface PairingService {
  createSpace(nickname: string, startDate: string): Promise<Result<Couple>>;
  joinByCode(code: string): Promise<Result<Couple>>;
  getMyCouple(): Promise<Couple | null>;
  /** PRD FR-07：更新“在一起”起始日（对设计接口的增量扩展）。 */
  updateStartDate(startDate: string): Promise<Result<Couple>>;
  getPartner(couple: Couple): Promise<Profile | null>;
  buildInviteLink(code: string): string;
  subscribeCouple(coupleId: ID, cb: (c: Couple) => void): Unsubscribe;
}

export interface ChatService {
  listMessages(coupleId: ID, limit?: number): Promise<Result<Message[]>>;
  sendMessage(input: {
    coupleId: ID;
    type: MessageType;
    content: string;
    imageUrl?: string;
  }): Promise<Result<Message>>;
  uploadImage(coupleId: ID, file: File): Promise<Result<string>>;
  subscribeMessages(coupleId: ID, cb: (m: Message) => void): Unsubscribe;
}

export interface PetService {
  // 原有 5 方法：签名不变，语义增强
  getPet(coupleId: ID): Promise<Result<Pet>>;
  /** 喂食消耗 1 份便当；饱食已满时拒绝。 */
  feed(coupleId: ID): Promise<Result<Pet>>;
  /** 同人同类 30 分钟内仅计一次数值收益。 */
  interact(coupleId: ID, kind: 'play' | 'pat'): Promise<Result<Pet>>;
  rename(coupleId: ID, name: string): Promise<Result<Pet>>;
  subscribePet(coupleId: ID, cb: (p: Pet) => void): Unsubscribe;

  // 新增 12 方法
  getPetBundle(coupleId: ID): Promise<Result<PetBundle>>;
  harvestClovers(coupleId: ID): Promise<Result<Pet>>;
  buyItem(coupleId: ID, itemKey: string, quantity?: number): Promise<Result<{ pet: Pet; item: PetInventory }>>;
  equipItem(coupleId: ID, itemKey: string, equipped: boolean): Promise<Result<PetInventory>>;
  placeFurniture(
    coupleId: ID,
    itemKey: string,
    patch: Pick<PetInventory, 'pos_x' | 'pos_y' | 'mirrored' | 'placed'>,
  ): Promise<Result<PetInventory>>;
  setBackground(coupleId: ID, background: PetBackgroundKey): Promise<Result<Pet>>;
  startTravel(
    coupleId: ID,
    input: { bentoKey: string; charmKey?: string | null },
  ): Promise<Result<PetTrip>>;
  /** force 仅供演示模式“立即归来”使用，真实模式忽略。 */
  settleTravel(coupleId: ID, force?: boolean): Promise<Result<TravelSettleResult>>;
  listPostcards(coupleId: ID): Promise<Result<Postcard[]>>;
  listInteractions(coupleId: ID, limit?: number): Promise<Result<PetInteraction[]>>;
  listItems(): Promise<Result<PetItem[]>>;
  subscribePetData(coupleId: ID, cb: (patch: Partial<PetBundle>) => void): Unsubscribe;
}

export interface AlbumService {
  listPhotos(coupleId: ID): Promise<Result<Photo[]>>;
  uploadPhoto(coupleId: ID, file: File, caption?: string): Promise<Result<Photo>>;
  deletePhoto(photoId: ID): Promise<Result<void>>;
  subscribePhotos(coupleId: ID, cb: (p: Photo) => void): Unsubscribe;
}

export interface AnniversaryService {
  list(coupleId: ID): Promise<Result<Anniversary[]>>;
  create(input: Omit<Anniversary, 'id' | 'created_at'>): Promise<Result<Anniversary>>;
  update(id: ID, patch: Partial<Anniversary>): Promise<Result<Anniversary>>;
  delete(id: ID): Promise<Result<void>>;
  getDaysTogether(startDate: string): number;
  getNext(anniversaries: Anniversary[]): { item: Anniversary; daysLeft: number } | null;
}

export interface WishService {
  list(coupleId: ID): Promise<Result<{ wishes: Wish[]; checkins: WishCheckin[] }>>;
  create(coupleId: ID, title: string): Promise<Result<Wish>>;
  update(id: ID, patch: Partial<Pick<Wish, 'title' | 'done'>>): Promise<Result<Wish>>;
  delete(id: ID): Promise<Result<void>>;
  checkIn(wishId: ID, userId: ID): Promise<Result<WishCheckin>>;
  getStreak(checkins: WishCheckin[], wishId: ID): number;
  subscribe(coupleId: ID, cb: () => void): Unsubscribe;
}

export interface WhisperService {
  list(coupleId: ID): Promise<Result<Whisper[]>>;
  create(coupleId: ID, authorId: ID, content: string, mood: MoodTag): Promise<Result<Whisper>>;
  delete(id: ID): Promise<Result<void>>;
  subscribe(coupleId: ID, cb: (w: Whisper) => void): Unsubscribe;
}

export interface LocationService {
  get(coupleId: ID): Promise<Result<LocationShare | null>>;
  /** 取一次浏览器定位并上报；精度降级到城市级（约 0.01°）保护隐私 */
  update(coupleId: ID, userId: ID): Promise<Result<LocationShare>>;
  setSharing(coupleId: ID, sharing: boolean): Promise<Result<LocationShare>>;
  subscribe(coupleId: ID, cb: (l: LocationShare) => void): Unsubscribe;
}

export interface CoupleServices {
  auth: AuthService;
  pairing: PairingService;
  chat: ChatService;
  pet: PetService;
  album: AlbumService;
  anniversary: AnniversaryService;
  wish: WishService;
  whisper: WhisperService;
  location: LocationService;
}

/** 供页面复用的日期/阶段工具，避免各文件各自实现。 */

/** 经验 → 等级（1~10），每级 100 经验。 */
export const levelForExp = (exp: number): number =>
  Math.min(10, Math.floor(Math.max(0, exp) / 100) + 1);

/** 当前等级对应的累计经验阈值。 */
export const expToNext = (level: number): number => (Math.max(1, level) - 1) * 100;

/** 等级 → 成长阶段（奶油橘猫立绘口径）。 */
export const stageForLevel = (level: number): 'egg' | 'baby' | 'teen' | 'adult' =>
  level <= 1 ? 'egg' : level <= 3 ? 'baby' : level <= 6 ? 'teen' : 'adult';

/** 装饰解锁判定：等级与亲密度同时满足。 */
export const isUnlocked = (item: PetItem, pet: Pet): boolean =>
  pet.level >= item.unlock_level && pet.intimacy >= item.unlock_intimacy;

/** 按经过小时补算心情/饱食；旅行中暂停衰减。 */
export const applyDecay = (
  mood: number,
  fullness: number,
  hours: number,
  traveling: boolean,
): { mood: number; fullness: number } =>
  traveling
    ? { mood, fullness }
    : {
        mood: Math.max(0, mood - Math.floor(hours) * 2),
        fullness: Math.max(0, fullness - Math.floor(hours) * 4),
      };

/** 三叶草生长株数：默认 30 分钟/株上限 8；演示传 intervalMs=60000。 */
export const grownClovers = (
  current: number,
  lastAt: ISODate | null,
  now = Date.now(),
  intervalMs = 1_800_000,
): number =>
  lastAt
    ? Math.min(8, current + Math.floor((now - new Date(lastAt).getTime()) / intervalMs))
    : current;

/** 基于 last_decay_at 补算并返回新宠物对象；scale 默认 1 小时，演示传 60000。 */
export function withDecay(pet: Pet, now = Date.now(), scale = 3_600_000): Pet {
  const elapsed = now - new Date(pet.last_decay_at).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return pet;
  const decay = applyDecay(pet.mood, pet.fullness, elapsed / scale, pet.is_traveling);
  if (decay.mood === pet.mood && decay.fullness === pet.fullness) {
    return { ...pet, last_decay_at: new Date(now).toISOString() };
  }
  return { ...pet, ...decay, last_decay_at: new Date(now).toISOString() };
}

/** 明信片池：普通 / 稀有，双实现共用。 */
export const POSTCARD_KEYS = ['sakura', 'onsen', 'bamboo', 'town'] as const;
export const RARE_POSTCARD_KEYS = ['lighthouse', 'shrine', 'snow', 'starry'] as const;
export const SOUVENIR_KEYS = ['dango', 'tea'] as const;

/** 按权重抽一张明信片 key。 */
export function pickPostcard(rareChance: number, random = Math.random): string {
  const pool = random() < rareChance ? RARE_POSTCARD_KEYS : POSTCARD_KEYS;
  return pool[Math.floor(random() * pool.length)];
}
export function petStageForGrowth(growth: number): 'egg' | 'baby' | 'teen' | 'adult' {
  if (growth < 100) return 'egg';
  if (growth < 300) return 'baby';
  if (growth < 650) return 'teen';
  return 'adult';
}

/** 计算在一起天数（今天起算，含今天）。 */
export function daysTogether(startDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(new Date(), start));
}

/** 返回距离最近一个纪念日的天数（今天为 0）。 */
export function daysUntilNext(
  anniversaries: Anniversary[],
): { item: Anniversary; daysLeft: number } | null {
  if (anniversaries.length === 0) return null;
  const today = new Date();
  const ranked = anniversaries.map((item) => ({
    item,
    daysLeft: Math.max(0, differenceInCalendarDays(nextOccurrence(item.date, today), today)),
  }));
  ranked.sort((a, b) => a.daysLeft - b.daysLeft);
  return ranked[0];
}

/** 连续打卡天数：今天未打卡时从昨天向前判定，避免误清零。 */
export function calculateStreak(checkins: WishCheckin[], wishId: ID): number {
  const days = new Set(
    checkins.filter((checkin) => checkin.wish_id === wishId).map((checkin) => checkin.checkin_date),
  );
  let cursor = new Date();
  if (!days.has(format(cursor, 'yyyy-MM-dd'))) cursor = subDays(cursor, 1);
  let streak = 0;
  while (days.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/**  annually repeating 纪念日：计算下一次发生日期（含今天）。 */
export function nextOccurrence(dateString: string, today = new Date()): Date {
  const source = new Date(`${dateString}T00:00:00`);
  const currentYear = today.getFullYear();
  const candidate = new Date(currentYear, source.getMonth(), source.getDate());
  if (candidate.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
    return new Date(currentYear + 1, source.getMonth(), source.getDate());
  }
  return candidate;
}
