export type ID = string;
export type ISODate = string; // ISO 8601 UTC
export type MessageType = 'text' | 'image' | 'emoji';
export type PetStage = 'egg' | 'baby' | 'teen' | 'adult';
export type MoodTag = 'happy' | 'sweet' | 'calm' | 'sad' | 'excited';
export type AnniversaryType = 'anniversary' | 'birthday' | 'other';

/** 统一返回包，贴近 Supabase 风格 */
export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code?: string } };

export interface AppError {
  message: string;
  code?: string;
}

export type Unsubscribe = () => void;

export interface Profile {
  id: ID;
  email: string;
  nickname: string;
  avatar_url: string | null;
  couple_id: ID | null;
  created_at: ISODate;
}

export interface Couple {
  id: ID;
  code: string;
  partner1: ID;
  partner2: ID | null;
  start_date: string;
  created_at: ISODate;
}

export interface Message {
  id: ID;
  couple_id: ID;
  sender_id: ID;
  type: MessageType;
  content: string;
  image_url: string | null;
  created_at: ISODate;
}

/** 宠物 v2 联合类型（物种为奶油橘猫） */
export type PetItemCategory = 'consumable' | 'furniture' | 'outfit' | 'background' | 'postcard' | 'souvenir';
export type PetOutfitSlot = 'head' | 'neck' | 'eyes' | 'hat' | 'scarf' | 'bow' | 'glasses';
export type PetState = 'idle' | 'reading' | 'eating' | 'sleeping' | 'writing' | 'traveling';
export type PetInteractionKind = 'feed' | 'play' | 'pat' | 'travel' | 'harvest';
export type PetRarity = 'normal' | 'rare';
export type PetBackgroundKey = 'courtyard' | 'bedroom' | 'garden' | 'starry' | 'seaside';

export interface Pet {
  id: ID;
  couple_id: ID;
  name: string;
  species: string; // 默认 'cat'（奶油橘猫「布丁」）
  level: number;
  exp: number;
  mood: number;
  fullness: number;
  intimacy: number;
  clovers: number;
  stage: PetStage;
  state: PetState;
  is_traveling: boolean;
  travel_back_at: ISODate | null;
  clover_count: number;
  last_clover_at: ISODate | null;
  last_decay_at: ISODate;
  background: PetBackgroundKey;
  growth: number; // v1 兼容字段，不再驱动升级
  last_fed_at: ISODate | null;
  updated_at: ISODate;
}

export interface PetItem {
  key: string;
  category: PetItemCategory;
  name: string;
  asset_path: string | null;
  slot: PetOutfitSlot | null;
  unlock_level: number;
  unlock_intimacy: number;
  price: number;
  rarity: PetRarity;
  sort_order: number;
}

export interface PetInventory {
  id: ID;
  couple_id: ID;
  item_key: string;
  quantity: number;
  equipped: boolean;
  placed: boolean;
  pos_x: number | null;
  pos_y: number | null;
  mirrored: boolean;
  acquired_at: ISODate;
}

export interface PetTrip {
  id: ID;
  couple_id: ID;
  started_at: ISODate;
  back_at: ISODate;
  bento_key: string;
  charm_key: string | null;
  status: 'traveling' | 'settled';
  postcard_key: string | null;
  souvenir_key: string | null;
  clovers_gained: number;
  exp_gained: number;
  settled_at: ISODate | null;
}

export interface Postcard {
  id: ID;
  couple_id: ID;
  postcard_key: string;
  rarity: PetRarity;
  count: number;
  trip_id: ID | null;
  obtained_at: ISODate;
}

export interface PetInteraction {
  id: ID;
  couple_id: ID;
  actor_id: ID;
  kind: PetInteractionKind;
  created_at: ISODate;
}

/** 挂载时一次性取全的聚合包。 */
export interface PetBundle {
  pet: Pet;
  items: PetItem[];
  inventory: PetInventory[];
  postcards: Postcard[];
  interactions: PetInteraction[];
  trip: PetTrip | null;
}

/** 归来结算结果：广播与 UI 共用。 */
export interface TravelSettleResult {
  pet: Pet;
  trip: PetTrip;
  postcard: Postcard | null;
  souvenirKey: string | null;
}

export interface Photo {
  id: ID;
  couple_id: ID;
  uploader_id: ID;
  url: string;
  caption: string | null;
  created_at: ISODate;
}

export interface Anniversary {
  id: ID;
  couple_id: ID;
  title: string;
  date: string;
  type: AnniversaryType;
  created_at: ISODate;
}

export interface Wish {
  id: ID;
  couple_id: ID;
  title: string;
  done: boolean;
  created_by: ID;
  created_at: ISODate;
}

export interface WishCheckin {
  id: ID;
  wish_id: ID;
  user_id: ID;
  checkin_date: string;
}

export interface Whisper {
  id: ID;
  couple_id: ID;
  author_id: ID;
  content: string;
  mood: MoodTag;
  created_at: ISODate;
}

export interface LocationShare {
  couple_id: ID;
  user_id: ID;
  lat: number;
  lng: number;
  accuracy: number | null;
  sharing: boolean;
  updated_at: ISODate;
}

/** 应用会话（兼容真实 Supabase Session 与演示假会话） */
export interface AppSession {
  user: { id: ID; email: string; nickname?: string };
  access_token: string;
}
