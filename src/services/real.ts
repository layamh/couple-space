import { format } from 'date-fns';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
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
  compressImage,
  petStageForGrowth,
  levelForExp,
  stageForLevel,
  isUnlocked,
  withDecay,
  grownClovers,
  pickPostcard,
  SOUVENIR_KEYS,
  calculateStreak,
  daysTogether,
  daysUntilNext,
} from '@/services/contracts';
import type { CoupleServices } from '@/services/contracts';
import { supabase } from '@/services/supabaseClient';

/** 统一执行器：未配置 client 或抛异常时都返回 Result.error。 */
async function run<T>(fn: (client: SupabaseClient) => Promise<Result<T>>): Promise<Result<T>> {
  if (!supabase) return err<T>('Supabase 尚未配置，请使用演示模式');
  try {
    return await fn(supabase);
  } catch (error) {
    return err<T>(error instanceof Error ? error.message : '操作失败，请稍后重试');
  }
}

/** 把 Supabase AuthError 的英文码转成用户可读中文。 */
function friendly(message: string): string {
  const dictionary: Record<string, string> = {
    ALREADY_PAIRED: '你已经绑定过情侣空间啦',
    CODE_NOT_FOUND: '邀请码不存在，请检查后重试',
    COUPLE_FULL: '这个空间已经满 2 人啦',
    SELF_JOIN: '不能加入自己创建的空间',
    'Invalid login credentials': '邮箱或密码不正确',
    'Email not confirmed': '请先到邮箱完成验证',
    'User already registered': '该邮箱已注册，请直接登录',
  };
  return dictionary[message] ?? message;
}

function mapSession(session: Session | null): AppSession | null {
  if (!session) return null;
  const nickname = session.user.user_metadata?.nickname;
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      nickname: typeof nickname === 'string' ? nickname : undefined,
    },
    access_token: session.access_token,
  };
}

/** 读取当前登录用户 id；未登录时返回 null。 */
async function currentUserId(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

/** 从 public URL 中提取 storage object path，用于删除。 */
function storagePathFromUrl(url: string): string | null {
  const marker = '/storage/v1/object/public/photos/';
  const index = url.indexOf(marker);
  return index >= 0 ? url.slice(index + marker.length) : null;
}

/** 浏览器定位统一封装：失败给出友好中文提示；坐标在调用处做城市级降级。 */
function browserPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('当前设备不支持定位，请手动填写位置'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        }),
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? '定位权限被拒绝，请在浏览器设置中允许后再试'
              : '暂时无法获取位置，请稍后重试',
          ),
        ),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

/** ========== Pet v2 内部 helper（仅 Service 层使用） ========== */
async function fetchPet(client: SupabaseClient, coupleId: ID): Promise<Pet | null> {
  const { data } = await client.from('pets').select('*').eq('couple_id', coupleId).maybeSingle();
  return (data as Pet | null) ?? null;
}

async function savePetFields(client: SupabaseClient, pet: Pet, patch: Partial<Pet>): Promise<Pet | null> {
  const { data } = await client
    .from('pets')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', pet.id)
    .select('*')
    .single();
  return (data as Pet | null) ?? null;
}

/** 经验与等级/阶段联动 patch。 */
function expPatch(pet: Pet, amount: number): Partial<Pet> {
  const exp = Math.min(900, pet.exp + amount);
  const level = levelForExp(exp);
  return { exp, level, stage: stageForLevel(level) };
}

async function inventoryRow(client: SupabaseClient, coupleId: ID, itemKey: string): Promise<PetInventory | null> {
  const { data } = await client
    .from('pet_inventory')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('item_key', itemKey)
    .maybeSingle();
  return (data as PetInventory | null) ?? null;
}

async function addInventory(
  client: SupabaseClient,
  coupleId: ID,
  itemKey: string,
  quantity: number,
): Promise<PetInventory> {
  const existing = await inventoryRow(client, coupleId, itemKey);
  if (existing) {
    const { data } = await client
      .from('pet_inventory')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)
      .select('*')
      .single();
    return data as PetInventory;
  }
  const { data } = await client
    .from('pet_inventory')
    .insert({ couple_id: coupleId, item_key: itemKey, quantity, acquired_at: new Date().toISOString() })
    .select('*')
    .single();
  return data as PetInventory;
}

async function logInteraction(
  client: SupabaseClient,
  coupleId: ID,
  actorId: ID,
  kind: PetInteraction['kind'],
): Promise<void> {
  await client.from('pet_interactions').insert({ couple_id: coupleId, actor_id: actorId, kind });
}

async function didRecently(client: SupabaseClient, coupleId: ID, actorId: ID, kind: PetInteraction['kind']): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data } = await client
    .from('pet_interactions')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('actor_id', actorId)
    .eq('kind', kind)
    .gte('created_at', since)
    .limit(1);
  return (data ?? []).length > 0;
}

async function isDailyFirst(client: SupabaseClient, coupleId: ID, actorId: ID, kind: PetInteraction['kind']): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await client
    .from('pet_interactions')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('actor_id', actorId)
    .eq('kind', kind)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .limit(1);
  return (data ?? []).length === 0;
}

export function createRealServices(): CoupleServices {
  return {
    // ============================ Auth ============================
    auth: {
      signUp(email, password, nickname) {
        return run(async (client) => {
          const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: { nickname } },
          });
          if (error) return err<AppSession>(friendly(error.message), 'SIGNUP_FAILED');
          if (!data.user) return err<AppSession>('注册失败，请稍后重试', 'NO_USER');
          const session = mapSession(data.session);
          if (session) return ok(session);
          // 邮箱验证开启时没有 session，返回可展示的最小会话供 UI 提示。
          return ok({ user: { id: data.user.id, email: data.user.email ?? email, nickname }, access_token: '' });
        });
      },

      signIn(email, password) {
        return run(async (client) => {
          const { data, error } = await client.auth.signInWithPassword({ email, password });
          if (error) return err<AppSession>(friendly(error.message), 'SIGNIN_FAILED');
          const session = mapSession(data.session);
          return session ? ok(session) : err<AppSession>('登录状态异常，请重试', 'NO_SESSION');
        });
      },

      signOut() {
        return run(async (client) => {
          const { error } = await client.auth.signOut();
          return error ? err<void>(friendly(error.message), 'SIGNOUT_FAILED') : ok(undefined);
        });
      },

      async getSession() {
        if (!supabase) return null;
        const { data } = await supabase.auth.getSession();
        return mapSession(data.session);
      },

      async getProfile() {
        if (!supabase) return null;
        const userId = await currentUserId(supabase);
        if (!userId) return null;
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        return (data as Profile | null) ?? null;
      },

      onAuthChange(cb) {
        if (!supabase) return () => undefined;
        const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(mapSession(session)));
        return () => data.subscription.unsubscribe();
      },
    },

    // ============================ Pairing ============================
    pairing: {
      createSpace(nickname, startDate) {
        return run(async (client) => {
          const { data, error } = await client.rpc('create_couple', {
            p_nickname: nickname,
            p_start: startDate,
          });
          if (error) return err<Couple>(friendly(error.message), 'CREATE_COUPLE_FAILED');
          return ok(data as Couple);
        });
      },

      joinByCode(code) {
        return run(async (client) => {
          const { data, error } = await client.rpc('join_couple', { p_code: code.trim().toUpperCase() });
          if (error) return err<Couple>(friendly(error.message), 'JOIN_COUPLE_FAILED');
          return ok(data as Couple);
        });
      },

      async getMyCouple() {
        if (!supabase) return null;
        const userId = await currentUserId(supabase);
        if (!userId) return null;
        const { data: profile } = await supabase
          .from('profiles')
          .select('couple_id')
          .eq('id', userId)
          .maybeSingle();
        const coupleId = (profile as { couple_id: string | null } | null)?.couple_id;
        if (!coupleId) return null;
        const { data } = await supabase.from('couples').select('*').eq('id', coupleId).maybeSingle();
        return (data as Couple | null) ?? null;
      },

      /** PRD FR-07：更新“在一起”起始日。 */
      updateStartDate(startDate) {
        return run(async (client) => {
          const current = await createRealServices().pairing.getMyCouple();
          if (!current) return err<Couple>('尚未绑定情侣空间', 'NOT_PAIRED');
          const { data, error } = await client
            .from('couples')
            .update({ start_date: startDate })
            .eq('id', current.id)
            .select('*')
            .single();
          if (error) return err<Couple>(friendly(error.message), 'UPDATE_START_DATE_FAILED');
          return ok(data as Couple);
        });
      },

      async getPartner(couple) {
        if (!supabase) return null;
        const userId = await currentUserId(supabase);
        if (!userId) return null;
        const partnerId = couple.partner1 === userId ? couple.partner2 : couple.partner1;
        if (!partnerId) return null;
        const { data } = await supabase.from('profiles').select('*').eq('id', partnerId).maybeSingle();
        return (data as Profile | null) ?? null;
      },

      buildInviteLink(code) {
        return `${window.location.origin}${import.meta.env.BASE_URL}#/pairing?code=${encodeURIComponent(code)}`;
      },

      subscribeCouple(coupleId, cb) {
        if (!supabase) return () => undefined;
        const channel = supabase
          .channel(`couple:${coupleId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
            (payload) => cb(payload.new as Couple),
          )
          .subscribe();
        return () => void supabase?.removeChannel(channel);
      },
    },

    // ============================ Chat ============================
    chat: {
      listMessages(coupleId, limit = 100) {
        return run(async (client) => {
          const { data, error } = await client
            .from('messages')
            .select('*')
            .eq('couple_id', coupleId)
            .order('created_at', { ascending: false })
            .limit(limit);
          if (error) return err<Message[]>(friendly(error.message), 'LIST_MESSAGES_FAILED');
          return ok(((data ?? []) as Message[]).reverse());
        });
      },

      sendMessage(input) {
        return run(async (client) => {
          const userId = await currentUserId(client);
          if (!userId) return err<Message>('请先登录', 'NOT_AUTHENTICATED');
          const { data, error } = await client
            .from('messages')
            .insert({
              couple_id: input.coupleId,
              sender_id: userId,
              type: input.type,
              content: input.content,
              image_url: input.imageUrl ?? null,
            })
            .select('*')
            .single();
          if (error) return err<Message>(friendly(error.message), 'SEND_MESSAGE_FAILED');
          return ok(data as Message);
        });
      },

      async uploadImage(coupleId, file) {
        const compressed = await compressImage(file);
        return run(async (client) => {
          const path = `${coupleId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
          const { error } = await client.storage.from('photos').upload(path, compressed, {
            contentType: compressed.type,
            upsert: false,
          });
          if (error) return err<string>(friendly(error.message), 'UPLOAD_FAILED');
          const { data } = client.storage.from('photos').getPublicUrl(path);
          return ok(data.publicUrl);
        });
      },

      subscribeMessages(coupleId, cb) {
        if (!supabase) return () => undefined;
        const channel = supabase
          .channel(`chat:${coupleId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `couple_id=eq.${coupleId}`,
            },
            (payload) => cb(payload.new as Message),
          )
          .subscribe();
        return () => void supabase?.removeChannel(channel);
      },
    },

    // ============================ Pet v2 ============================
    pet: {
      getPet(coupleId) {
        return run(async (client) => {
          const current = await fetchPet(client, coupleId);
          if (current) {
            const fresh = withDecay(current);
            if (fresh.mood !== current.mood || fresh.fullness !== current.fullness) {
              const saved = await savePetFields(client, current, { mood: fresh.mood, fullness: fresh.fullness, last_decay_at: fresh.last_decay_at });
              return ok(saved ?? fresh);
            }
            return ok(fresh);
          }
          const { data, error } = await client
            .from('pets')
            .insert({ couple_id: coupleId, name: '布丁', species: 'cat' })
            .select('*')
            .single();
          if (error) return err<Pet>(friendly(error.message), 'CREATE_PET_FAILED');
          return ok(data as Pet);
        });
      },

      feed(coupleId) {
        return run(async (client) => {
          const raw = await fetchPet(client, coupleId);
          if (!raw) return err<Pet>('宠物不存在');
          const pet = withDecay(raw);
          if (pet.fullness >= 100) return err<Pet>('布丁已经吃饱啦，过会儿再喂吧', 'FULL');
          const bento = (await inventoryRow(client, coupleId, 'bento_normal')) ?? (await inventoryRow(client, coupleId, 'bento_deluxe'));
          if (!bento || bento.quantity <= 0) return err<Pet>('便当不够了，去商店买一份吧', 'NO_BENTO');
          const actor = await currentUserId(client);
          if (!actor) return err<Pet>('请先登录');
          if (await didRecently(client, coupleId, actor, 'feed')) return err<Pet>('刚喂过，先歇会儿～', 'ANTI_SPAM');
          await client.from('pet_inventory').update({ quantity: bento.quantity - 1 }).eq('id', bento.id);
          const first = await isDailyFirst(client, coupleId, actor, 'feed');
          const patch: Partial<Pet> = {
            fullness: Math.min(100, pet.fullness + 25),
            mood: Math.min(100, pet.mood + 5),
            state: 'eating',
            last_fed_at: new Date().toISOString(),
            intimacy: first ? Math.min(100, pet.intimacy + 2) : pet.intimacy,
            ...expPatch(pet, 10),
          };
          const saved = await savePetFields(client, pet, patch);
          await logInteraction(client, coupleId, actor, 'feed');
          return ok(saved ?? { ...pet, ...patch });
        });
      },

      interact(coupleId, kind) {
        return run(async (client) => {
          const raw = await fetchPet(client, coupleId);
          if (!raw) return err<Pet>('宠物不存在');
          const pet = withDecay(raw);
          const actor = await currentUserId(client);
          if (!actor) return err<Pet>('请先登录');
          if (await didRecently(client, coupleId, actor, kind)) return err<Pet>('刚互动过，先歇会儿～', 'ANTI_SPAM');
          const first = await isDailyFirst(client, coupleId, actor, kind);
          const patch: Partial<Pet> = {
            mood: Math.min(100, pet.mood + (kind === 'play' ? 12 : 6)),
            intimacy: first ? Math.min(100, pet.intimacy + 2) : pet.intimacy,
            ...expPatch(pet, kind === 'play' ? 8 : 5),
          };
          const saved = await savePetFields(client, pet, patch);
          await logInteraction(client, coupleId, actor, kind);
          return ok(saved ?? { ...pet, ...patch });
        });
      },

      rename(coupleId, name) {
        return run(async (client) => {
          const { data, error } = await client
            .from('pets')
            .update({ name: name.trim().slice(0, 12) || '布丁', updated_at: new Date().toISOString() })
            .eq('couple_id', coupleId)
            .select('*')
            .single();
          if (error) return err<Pet>(friendly(error.message), 'RENAME_FAILED');
          return ok(data as Pet);
        });
      },

      subscribePet(coupleId, cb) {
        if (!supabase) return () => undefined;
        const channel = supabase
          .channel(`pet:${coupleId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'pets', filter: `couple_id=eq.${coupleId}` }, (payload) => cb(payload.new as Pet))
          .subscribe();
        return () => void supabase?.removeChannel(channel);
      },

      async getPetBundle(coupleId) {
        const petResult = await createRealServices().pet.getPet(coupleId);
        if (petResult.error || !petResult.data) return err<PetBundle>(petResult.error?.message ?? '读取宠物失败');
        return run(async (client) => {
          const [{ data: items }, { data: inventory }, { data: postcards }, { data: interactions }, { data: trips }] =
            await Promise.all([
              client.from('pet_items').select('*').order('sort_order'),
              client.from('pet_inventory').select('*').eq('couple_id', coupleId),
              client.from('pet_postcards').select('*').eq('couple_id', coupleId).order('obtained_at', { ascending: false }),
              client.from('pet_interactions').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false }).limit(50),
              client.from('pet_trips').select('*').eq('couple_id', coupleId).eq('status', 'traveling').order('started_at', { ascending: false }).limit(1),
            ]);
          // 幂等初始化首日库存
          let inv = (inventory ?? []) as PetInventory[];
          if (inv.length === 0 && (items ?? []).length > 0) {
            await Promise.all(['hat_straw', 'bed_wood', 'bento_normal'].map((key) => addInventory(client, coupleId, key, 1)));
            const { data: refreshed } = await client.from('pet_inventory').select('*').eq('couple_id', coupleId);
            inv = (refreshed ?? []) as PetInventory[];
          }
          return ok({
            pet: petResult.data!,
            items: (items ?? []) as PetItem[],
            inventory: inv,
            postcards: (postcards ?? []) as Postcard[],
            interactions: (interactions ?? []) as PetInteraction[],
            trip: ((trips ?? []) as PetTrip[])[0] ?? null,
          });
        });
      },

      async harvestClovers(coupleId) {
        const petResult = await createRealServices().pet.getPet(coupleId);
        if (petResult.error || !petResult.data) return err<Pet>(petResult.error?.message ?? '读取宠物失败');
        return run(async (client) => {
          const pet = petResult.data!;
          const count = grownClovers(pet.clover_count, pet.last_clover_at);
          if (count <= 0) return err<Pet>('三叶草还在长，等一会儿再来吧', 'NO_CLOVER');
          const saved = await savePetFields(client, pet, {
            clovers: Math.min(999, pet.clovers + count * 2),
            clover_count: 0,
            last_clover_at: new Date().toISOString(),
          });
          const actor = await currentUserId(client);
          if (actor) await logInteraction(client, coupleId, actor, 'harvest');
          return ok(saved ?? pet);
        });
      },

      buyItem(coupleId, itemKey, quantity = 1) {
        return run(async (client) => {
          const petResult = await createRealServices().pet.getPet(coupleId);
          if (petResult.error || !petResult.data) return err<{ pet: Pet; item: PetInventory }>(petResult.error?.message ?? '读取宠物失败');
          const pet = petResult.data!;
          const { data: itemData } = await client.from('pet_items').select('*').eq('key', itemKey).maybeSingle();
          const item = itemData as PetItem | null;
          if (!item) return err<{ pet: Pet; item: PetInventory }>('商品不存在', 'ITEM_NOT_FOUND');
          if (!isUnlocked(item, pet)) return err<{ pet: Pet; item: PetInventory }>('还没解锁，继续升级吧', 'LOCKED');
          const cost = item.price * quantity;
          if (pet.clovers < cost) return err<{ pet: Pet; item: PetInventory }>(`三叶草不足，还差 ${cost - pet.clovers} 株`, 'NO_CLOVER');
          await savePetFields(client, pet, { clovers: pet.clovers - cost });
          const entry = await addInventory(client, coupleId, itemKey, quantity);
          return ok({ pet: { ...pet, clovers: pet.clovers - cost }, item: entry });
        });
      },

      equipItem(coupleId, itemKey, equipped) {
        return run(async (client) => {
          const { data: itemData } = await client.from('pet_items').select('*').eq('key', itemKey).maybeSingle();
          const item = itemData as PetItem | null;
          if (!item?.slot) return err<PetInventory>('服饰不存在', 'ITEM_NOT_FOUND');
          const sameSlot = await client.from('pet_items').select('key').eq('slot', item.slot);
          const keys = (sameSlot.data ?? []).map((row) => row.key as string);
          const entry = await inventoryRow(client, coupleId, itemKey);
          if (!entry) return err<PetInventory>('服饰未拥有', 'ITEM_NOT_FOUND');
          if (equipped && keys.length > 0) {
            await client.from('pet_inventory').update({ equipped: false }).eq('couple_id', coupleId).in('item_key', keys);
          }
          const { data, error } = await client
            .from('pet_inventory')
            .update({ equipped })
            .eq('id', entry.id)
            .select('*')
            .single();
          if (error) return err<PetInventory>(friendly(error.message));
          return ok(data as PetInventory);
        });
      },

      placeFurniture(coupleId, itemKey, patch) {
        return run(async (client) => {
          const entry = await inventoryRow(client, coupleId, itemKey);
          if (!entry) return err<PetInventory>('家具未拥有', 'ITEM_NOT_FOUND');
          const { data, error } = await client
            .from('pet_inventory')
            .update(patch)
            .eq('id', entry.id)
            .select('*')
            .single();
          if (error) return err<PetInventory>(friendly(error.message));
          return ok(data as PetInventory);
        });
      },

      setBackground(coupleId, background: PetBackgroundKey) {
        return run(async (client) => {
          const petResult = await createRealServices().pet.getPet(coupleId);
          if (petResult.error || !petResult.data) return err<Pet>(petResult.error?.message ?? '读取宠物失败');
          const { data: itemData } = await client.from('pet_items').select('*').eq('key', `bg_${background}`).maybeSingle();
          const item = itemData as PetItem | null;
          const owned = await inventoryRow(client, coupleId, `bg_${background}`);
          if (!item || !owned || !isUnlocked(item, petResult.data!)) return err<Pet>('该背景尚未解锁或未拥有', 'LOCKED');
          const saved = await savePetFields(client, petResult.data!, { background });
          return ok(saved ?? { ...petResult.data!, background });
        });
      },

      startTravel(coupleId, input) {
        return run(async (client) => {
          const petResult = await createRealServices().pet.getPet(coupleId);
          if (petResult.error || !petResult.data) return err<PetTrip>(petResult.error?.message ?? '读取宠物失败');
          const pet = petResult.data!;
          if (pet.is_traveling) return err<PetTrip>('布丁正在旅行中', 'ALREADY_TRAVELING');
          const bento = await inventoryRow(client, coupleId, input.bentoKey);
          if (!bento || bento.quantity <= 0) return err<PetTrip>('请先准备便当', 'NO_BENTO');
          if (input.charmKey) {
            const charm = await inventoryRow(client, coupleId, input.charmKey);
            if (!charm || charm.quantity <= 0) return err<PetTrip>('护身符数量不足', 'NO_CHARM');
            await client.from('pet_inventory').update({ quantity: charm.quantity - 1 }).eq('id', charm.id);
          }
          await client.from('pet_inventory').update({ quantity: bento.quantity - 1 }).eq('id', bento.id);
          const now = Date.now();
          const { data, error } = await client
            .from('pet_trips')
            .insert({
              couple_id: coupleId,
              started_at: new Date(now).toISOString(),
              back_at: new Date(now + (2 + Math.random() * 6) * 3_600_000).toISOString(),
              bento_key: input.bentoKey,
              charm_key: input.charmKey ?? null,
            })
            .select('*')
            .single();
          if (error) return err<PetTrip>(friendly(error.message));
          const trip = data as PetTrip;
          await savePetFields(client, pet, { is_traveling: true, state: 'traveling', travel_back_at: trip.back_at });
          const actor = await currentUserId(client);
          if (actor) await logInteraction(client, coupleId, actor, 'travel');
          return ok(trip);
        });
      },

      async settleTravel(coupleId, _force = false) {
        return run(async (client) => {
          const { data: trips } = await client
            .from('pet_trips')
            .select('*')
            .eq('couple_id', coupleId)
            .eq('status', 'traveling')
            .order('started_at', { ascending: false })
            .limit(1);
          const trip = ((trips ?? []) as PetTrip[])[0];
          if (!trip) return err<TravelSettleResult>('没有进行中的旅行', 'NO_TRIP');
          if (new Date(trip.back_at).getTime() > Date.now()) return err<TravelSettleResult>('它还在路上，再等等吧', 'NOT_YET');
          const { data: locked } = await client
            .from('pet_trips')
            .update({ status: 'settled', settled_at: new Date().toISOString() })
            .eq('id', trip.id)
            .eq('status', 'traveling')
            .select('*');
          if (!locked || locked.length === 0) return err<TravelSettleResult>('旅行已结算', 'ALREADY_SETTLED');
          const rareChance = Math.min(0.85, (trip.bento_key === 'bento_deluxe' ? 0.4 : 0.15) + (trip.charm_key ? 0.25 : 0));
          const postcardKey = pickPostcard(rareChance);
          const souvenirKey = SOUVENIR_KEYS[Math.floor(Math.random() * SOUVENIR_KEYS.length)];
          const cloversGained = 5 + Math.floor(Math.random() * 11);
          const { data: cardData } = await client.from('pet_items').select('*').eq('key', postcardKey).maybeSingle();
          const { data: existingCard } = await client.from('pet_postcards').select('*').eq('couple_id', coupleId).eq('postcard_key', postcardKey).maybeSingle();
          let postcard: Postcard;
          if (existingCard) {
            const { data } = await client.from('pet_postcards').update({ count: (existingCard as Postcard).count + 1 }).eq('id', (existingCard as Postcard).id).select('*').single();
            postcard = data as Postcard;
          } else {
            const { data } = await client
              .from('pet_postcards')
              .insert({ couple_id: coupleId, postcard_key: postcardKey, rarity: (cardData as PetItem | null)?.rarity ?? 'normal', trip_id: trip.id })
              .select('*')
              .single();
            postcard = data as Postcard;
          }
          await client
            .from('pet_trips')
            .update({ postcard_key: postcardKey, souvenir_key: souvenirKey, clovers_gained: cloversGained, exp_gained: 30 })
            .eq('id', trip.id);
          await addInventory(client, coupleId, souvenirKey, 1);
          const petResult = await createRealServices().pet.getPet(coupleId);
          const pet = petResult.data!;
          const saved = await savePetFields(client, pet, {
            is_traveling: false,
            travel_back_at: null,
            state: 'idle',
            clovers: Math.min(999, pet.clovers + cloversGained),
            intimacy: Math.min(100, pet.intimacy + 10),
            ...expPatch(pet, 30),
          });
          return ok({ pet: saved ?? pet, trip: { ...trip, status: 'settled' as const, postcard_key: postcardKey, souvenir_key: souvenirKey, clovers_gained: cloversGained, exp_gained: 30 }, postcard, souvenirKey });
        });
      },

      listPostcards(coupleId) {
        return run(async (client) => {
          const { data, error } = await client.from('pet_postcards').select('*').eq('couple_id', coupleId).order('obtained_at', { ascending: false });
          if (error) return err<Postcard[]>(friendly(error.message));
          return ok((data ?? []) as Postcard[]);
        });
      },

      listInteractions(coupleId, limit = 50) {
        return run(async (client) => {
          const { data, error } = await client.from('pet_interactions').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false }).limit(limit);
          if (error) return err<PetInteraction[]>(friendly(error.message));
          return ok((data ?? []) as PetInteraction[]);
        });
      },

      listItems() {
        return run(async (client) => {
          const { data, error } = await client.from('pet_items').select('*').order('sort_order');
          if (error) return err<PetItem[]>(friendly(error.message));
          return ok((data ?? []) as PetItem[]);
        });
      },

      subscribePetData(coupleId, cb) {
        if (!supabase) return () => undefined;
        const tables = ['pets', 'pet_inventory', 'pet_trips', 'pet_postcards', 'pet_interactions'];
        const channel = supabase.channel(`petdata:${coupleId}`);
        tables.forEach((table) => {
          channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table, filter: table === 'pets' ? `couple_id=eq.${coupleId}` : undefined },
            () => {
              void createRealServices()
                .pet.getPetBundle(coupleId)
                .then((bundle) => {
                  if (!bundle.error && bundle.data) cb(bundle.data);
                });
            },
          );
        });
        void channel.subscribe();
        return () => void supabase?.removeChannel(channel);
      },
    },

    // ============================ Album ============================
    album: {
      listPhotos(coupleId) {
        return run(async (client) => {
          const { data, error } = await client
            .from('photos')
            .select('*')
            .eq('couple_id', coupleId)
            .order('created_at', { ascending: false });
          if (error) return err<Photo[]>(friendly(error.message), 'LIST_PHOTOS_FAILED');
          return ok((data ?? []) as Photo[]);
        });
      },

      async uploadPhoto(coupleId, file, caption) {
        const compressed = await compressImage(file);
        return run(async (client) => {
          const userId = await currentUserId(client);
          if (!userId) return err<Photo>('请先登录', 'NOT_AUTHENTICATED');
          const path = `${coupleId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
          const { error: uploadError } = await client.storage.from('photos').upload(path, compressed, {
            contentType: compressed.type,
            upsert: false,
          });
          if (uploadError) return err<Photo>(friendly(uploadError.message), 'UPLOAD_FAILED');
          const { data: publicData } = client.storage.from('photos').getPublicUrl(path);
          const { data, error } = await client
            .from('photos')
            .insert({ couple_id: coupleId, uploader_id: userId, url: publicData.publicUrl, caption: caption ?? null })
            .select('*')
            .single();
          if (error) return err<Photo>(friendly(error.message), 'CREATE_PHOTO_FAILED');
          return ok(data as Photo);
        });
      },

      deletePhoto(photoId) {
        return run(async (client) => {
          const { data: photo } = await client.from('photos').select('url').eq('id', photoId).maybeSingle();
          const { error } = await client.from('photos').delete().eq('id', photoId);
          if (error) return err<void>(friendly(error.message), 'DELETE_PHOTO_FAILED');
          const path = photo ? storagePathFromUrl((photo as { url: string }).url) : null;
          if (path) await client.storage.from('photos').remove([path]);
          return ok(undefined);
        });
      },

      subscribePhotos(coupleId, cb) {
        if (!supabase) return () => undefined;
        const channel = supabase
          .channel(`photos:${coupleId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'photos', filter: `couple_id=eq.${coupleId}` },
            (payload) => cb(payload.new as Photo),
          )
          .subscribe();
        return () => void supabase?.removeChannel(channel);
      },
    },

    // ============================ Anniversary ============================
    anniversary: {
      list(coupleId) {
        return run(async (client) => {
          const { data, error } = await client
            .from('anniversaries')
            .select('*')
            .eq('couple_id', coupleId)
            .order('date', { ascending: true });
          if (error) return err<Anniversary[]>(friendly(error.message), 'LIST_ANNIVERSARY_FAILED');
          return ok((data ?? []) as Anniversary[]);
        });
      },

      create(input) {
        return run(async (client) => {
          const { data, error } = await client.from('anniversaries').insert(input).select('*').single();
          if (error) return err<Anniversary>(friendly(error.message), 'CREATE_ANNIVERSARY_FAILED');
          return ok(data as Anniversary);
        });
      },

      update(id, patch) {
        return run(async (client) => {
          const { data, error } = await client.from('anniversaries').update(patch).eq('id', id).select('*').single();
          if (error) return err<Anniversary>(friendly(error.message), 'UPDATE_ANNIVERSARY_FAILED');
          return ok(data as Anniversary);
        });
      },

      delete(id) {
        return run(async (client) => {
          const { error } = await client.from('anniversaries').delete().eq('id', id);
          return error ? err<void>(friendly(error.message), 'DELETE_ANNIVERSARY_FAILED') : ok(undefined);
        });
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
        return run(async (client) => {
          const { data: wishes, error: wishError } = await client
            .from('wishes')
            .select('*')
            .eq('couple_id', coupleId)
            .order('created_at', { ascending: false });
          if (wishError) return err<{ wishes: Wish[]; checkins: WishCheckin[] }>(friendly(wishError.message));
          const list = (wishes ?? []) as Wish[];
          if (list.length === 0) return ok({ wishes: [], checkins: [] });
          const { data: checkins, error: checkinError } = await client
            .from('wish_checkins')
            .select('*')
            .in(
              'wish_id',
              list.map((wish) => wish.id),
            );
          if (checkinError) return err<{ wishes: Wish[]; checkins: WishCheckin[] }>(friendly(checkinError.message));
          return ok({ wishes: list, checkins: (checkins ?? []) as WishCheckin[] });
        });
      },

      create(coupleId, title) {
        return run(async (client) => {
          const userId = await currentUserId(client);
          if (!userId) return err<Wish>('请先登录', 'NOT_AUTHENTICATED');
          const { data, error } = await client
            .from('wishes')
            .insert({ couple_id: coupleId, title: title.trim(), created_by: userId })
            .select('*')
            .single();
          if (error) return err<Wish>(friendly(error.message), 'CREATE_WISH_FAILED');
          return ok(data as Wish);
        });
      },

      update(id, patch) {
        return run(async (client) => {
          const { data, error } = await client.from('wishes').update(patch).eq('id', id).select('*').single();
          if (error) return err<Wish>(friendly(error.message), 'UPDATE_WISH_FAILED');
          return ok(data as Wish);
        });
      },

      delete(id) {
        return run(async (client) => {
          const { error } = await client.from('wishes').delete().eq('id', id);
          return error ? err<void>(friendly(error.message), 'DELETE_WISH_FAILED') : ok(undefined);
        });
      },

      checkIn(wishId, userId) {
        return run(async (client) => {
          const today = format(new Date(), 'yyyy-MM-dd');
          const { data: existing } = await client
            .from('wish_checkins')
            .select('*')
            .eq('wish_id', wishId)
            .eq('user_id', userId)
            .eq('checkin_date', today)
            .maybeSingle();
          if (existing) return ok(existing as WishCheckin);
          const { data, error } = await client
            .from('wish_checkins')
            .insert({ wish_id: wishId, user_id: userId, checkin_date: today })
            .select('*')
            .single();
          if (error) return err<WishCheckin>(friendly(error.message), 'CHECKIN_FAILED');
          return ok(data as WishCheckin);
        });
      },

      getStreak(checkins, wishId) {
        return calculateStreak(checkins, wishId);
      },

      subscribe(coupleId, cb) {
        if (!supabase) return () => undefined;
        const channel = supabase
          .channel(`wishes:${coupleId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'wishes', filter: `couple_id=eq.${coupleId}` }, () => cb())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'wish_checkins' }, () => cb())
          .subscribe();
        return () => void supabase?.removeChannel(channel);
      },
    },

    // ============================ Whisper ============================
    whisper: {
      list(coupleId) {
        return run(async (client) => {
          const { data, error } = await client
            .from('whispers')
            .select('*')
            .eq('couple_id', coupleId)
            .order('created_at', { ascending: false });
          if (error) return err<Whisper[]>(friendly(error.message), 'LIST_WHISPER_FAILED');
          return ok((data ?? []) as Whisper[]);
        });
      },

      create(coupleId, authorId, content, mood: MoodTag) {
        return run(async (client) => {
          const { data, error } = await client
            .from('whispers')
            .insert({ couple_id: coupleId, author_id: authorId, content: content.trim(), mood })
            .select('*')
            .single();
          if (error) return err<Whisper>(friendly(error.message), 'CREATE_WHISPER_FAILED');
          return ok(data as Whisper);
        });
      },

      delete(id) {
        return run(async (client) => {
          const { error } = await client.from('whispers').delete().eq('id', id);
          return error ? err<void>(friendly(error.message), 'DELETE_WHISPER_FAILED') : ok(undefined);
        });
      },

      subscribe(coupleId, cb) {
        if (!supabase) return () => undefined;
        const channel = supabase
          .channel(`whispers:${coupleId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'whispers', filter: `couple_id=eq.${coupleId}` },
            (payload) => cb(payload.new as Whisper),
          )
          .subscribe();
        return () => void supabase?.removeChannel(channel);
      },
    },

    // ============================ Location ============================
    location: {
      get(coupleId) {
        return run(async (client) => {
          const { data, error } = await client.from('locations').select('*').eq('couple_id', coupleId).maybeSingle();
          if (error) return err<LocationShare | null>(friendly(error.message), 'GET_LOCATION_FAILED');
          return ok((data as LocationShare | null) ?? null);
        });
      },

      async update(coupleId, userId) {
        let position: { lat: number; lng: number; accuracy: number };
        try {
          position = await browserPosition();
        } catch (error) {
          return err<LocationShare>(error instanceof Error ? error.message : '定位失败');
        }
        // 城市级精度：约 0.01°，避免暴露精确门牌号。
        const lat = Math.round(position.lat * 100) / 100;
        const lng = Math.round(position.lng * 100) / 100;
        return run(async (client) => {
          const { data, error } = await client
            .from('locations')
            .upsert(
              {
                couple_id: coupleId,
                user_id: userId,
                lat,
                lng,
                accuracy: position.accuracy,
                sharing: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'couple_id' },
            )
            .select('*')
            .single();
          if (error) return err<LocationShare>(friendly(error.message), 'UPDATE_LOCATION_FAILED');
          return ok(data as LocationShare);
        });
      },

      setSharing(coupleId, sharing) {
        return run(async (client) => {
          const userId = await currentUserId(client);
          if (!userId) return err<LocationShare>('请先登录', 'NOT_AUTHENTICATED');
          const { data: existing } = await client.from('locations').select('*').eq('couple_id', coupleId).maybeSingle();
          if (!existing) {
            const { data, error } = await client
              .from('locations')
              .insert({ couple_id: coupleId, user_id: userId, lat: 0, lng: 0, accuracy: null, sharing, updated_at: new Date().toISOString() })
              .select('*')
              .single();
            if (error) return err<LocationShare>(friendly(error.message), 'SET_SHARING_FAILED');
            return ok(data as LocationShare);
          }
          const { data, error } = await client
            .from('locations')
            .update({ sharing, updated_at: new Date().toISOString() })
            .eq('couple_id', coupleId)
            .select('*')
            .single();
          if (error) return err<LocationShare>(friendly(error.message), 'SET_SHARING_FAILED');
          return ok(data as LocationShare);
        });
      },

      subscribe(coupleId, cb) {
        if (!supabase) return () => undefined;
        const channel = supabase
          .channel(`location:${coupleId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'locations', filter: `couple_id=eq.${coupleId}` },
            (payload) => cb(payload.new as LocationShare),
          )
          .subscribe();
        return () => void supabase?.removeChannel(channel);
      },
    },
  };
}

/** 兼容旧调用：直接导出工厂结果由 index.ts 统一管理，这里仅保留类型引用。 */
export type RealServices = ReturnType<typeof createRealServices>;
export type { ID };
