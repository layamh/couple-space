import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CandyRain } from '@/components/Common';
import PetAlbum from '@/pages/pet/PetAlbum';
import PetRoom from '@/pages/pet/PetRoom';
import PetScene from '@/pages/pet/PetScene';
import PetShop from '@/pages/pet/PetShop';
import PetTravel from '@/pages/pet/PetTravel';
import PetYard from '@/pages/pet/PetYard';
import { services } from '@/services';
import { useAppStore } from '@/store/useAppStore';
import type { PetBackgroundKey, TravelSettleResult } from '@/types';

/** 宠物页薄容器：常驻场景 + 庭院/旅行/小窝/图鉴四个 Tab。 */
export default function Pet() {
  const couple = useAppStore((state) => state.couple);
  const pet = useAppStore((state) => state.pet);
  const inventory = useAppStore((state) => state.inventory);
  const items = useAppStore((state) => state.items);
  const postcards = useAppStore((state) => state.postcards);
  const interactions = useAppStore((state) => state.interactions);
  const trip = useAppStore((state) => state.trip);
  const setPetBundle = useAppStore((state) => state.setPetBundle);
  const applyPetPatch = useAppStore((state) => state.applyPetPatch);
  const notify = useAppStore((state) => state.notify);

  const [tab, setTab] = useState(0);
  const [bouncing, setBouncing] = useState(false);
  const [candy, setCandy] = useState(0);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [shopOpen, setShopOpen] = useState(false);
  const [result, setResult] = useState<TravelSettleResult | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);

  useEffect(() => {
    if (!couple) return;
    let cancelled = false;
    void services.pet.getPetBundle(couple.id).then((bundle) => {
      if (!cancelled && !bundle.error && bundle.data) setPetBundle(bundle.data);
    });
    const unsubscribe = services.pet.subscribePetData(couple.id, (patch) => {
      if (!cancelled) applyPetPatch(patch);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [couple?.id, setPetBundle, applyPetPatch]);

  function celebrate(message: string): void {
    setBouncing(true);
    setCandy((value) => value + 1);
    window.setTimeout(() => setBouncing(false), 760);
    notify(message, 'success');
  }

  async function handleFeed(): Promise<void> {
    if (!couple) return;
    const response = await services.pet.feed(couple.id);
    if (response.error) { notify(response.error.message, 'error'); return; }
    applyPetPatch({ pet: response.data });
    celebrate('布丁吃得香香的，经验 +10 🎉');
  }

  async function handleInteract(kind: 'play' | 'pat'): Promise<void> {
    if (!couple) return;
    const response = await services.pet.interact(couple.id, kind);
    if (response.error) { notify(response.error.message, 'error'); return; }
    applyPetPatch({ pet: response.data });
    celebrate(kind === 'play' ? '陪布丁玩得好开心！' : '布丁舒服地眯起了眼睛～');
  }

  async function handleHarvest(): Promise<void> {
    if (!couple) return;
    const response = await services.pet.harvestClovers(couple.id);
    if (response.error) { notify(response.error.message, 'info'); return; }
    applyPetPatch({ pet: response.data });
    celebrate(`收割了三叶草，现在有 ${response.data.clovers} 株 🍀`);
  }

  async function handleRename(): Promise<void> {
    if (!couple || !newName.trim()) return;
    const response = await services.pet.rename(couple.id, newName);
    if (response.error) { notify(response.error.message, 'error'); return; }
    applyPetPatch({ pet: response.data });
    setRenameOpen(false);
    notify('改名成功，双方都会看到新名字', 'success');
  }

  async function handleBuy(key: string): Promise<void> {
    if (!couple) return;
    const response = await services.pet.buyItem(couple.id, key);
    if (response.error) { notify(response.error.message, 'error'); return; }
    applyPetPatch({ pet: response.data.pet, inventory: (await services.pet.getPetBundle(couple.id)).data?.inventory });
    notify('购买成功，已放进小窝库存', 'success');
  }

  async function handleEquip(key: string, equipped: boolean): Promise<void> {
    if (!couple) return;
    const response = await services.pet.equipItem(couple.id, key, equipped);
    if (response.error || !response.data) { notify(response.error?.message ?? '操作失败', 'error'); return; }
    const bundle = await services.pet.getPetBundle(couple.id);
    if (bundle.data) applyPetPatch({ inventory: bundle.data.inventory, pet: bundle.data.pet });
    notify(equipped ? '穿上啦，看看场景里的布丁 ✨' : '已经脱下这件服饰', 'success');
  }

  async function handlePlace(key: string, posX: number, posY: number): Promise<void> {
    if (!couple) return;
    const entry = inventory.find((item) => item.item_key === key);
    const response = await services.pet.placeFurniture(couple.id, key, {
      pos_x: posX, pos_y: posY, mirrored: entry?.mirrored ?? false, placed: true,
    });
    if (response.error) { notify(response.error.message, 'error'); return; }
    applyPetPatch({ inventory: inventory.map((item) => (item.item_key === key ? response.data : item)) });
  }

  async function handleBackground(background: PetBackgroundKey): Promise<void> {
    if (!couple) return;
    const response = await services.pet.setBackground(couple.id, background);
    if (response.error) { notify(response.error.message, 'error'); return; }
    applyPetPatch({ pet: response.data });
    notify('背景已切换，刷新后也会保持', 'success');
  }

  async function handleStart(bentoKey: string, charmKey?: string | null): Promise<void> {
    if (!couple) return;
    setResult(null);
    const response = await services.pet.startTravel(couple.id, { bentoKey, charmKey });
    if (response.error || !response.data) { notify(response.error?.message ?? '出发失败', 'error'); return; }
    applyPetPatch({ trip: response.data });
    const bundle = await services.pet.getPetBundle(couple.id);
    if (bundle.data) applyPetPatch({ pet: bundle.data.pet, inventory: bundle.data.inventory });
    notify('布丁出发啦，记得回来看它带的明信片 💌', 'success');
  }

  async function handleSettle(force = false): Promise<void> {
    if (!couple) return;
    const response = await services.pet.settleTravel(couple.id, force);
    if (response.error || !response.data) { notify(response.error?.message ?? '结算失败', 'error'); return; }
    setResult(response.data);
    applyPetPatch({ pet: response.data.pet, trip: null, postcards: (await services.pet.listPostcards(couple.id)).data ?? undefined });
    setCandy((value) => value + 1);
  }

  if (!pet) {
    return <Typography align="center" color="text.secondary" sx={{ mt: 8 }}>布丁正在赶来…</Typography>;
  }

  const bentoCount = inventory
    .filter((entry) => entry.item_key === 'bento_normal' || entry.item_key === 'bento_deluxe')
    .reduce((sum, entry) => sum + entry.quantity, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
      <CandyRain trigger={candy} count={14} />

      <PetScene
        pet={pet}
        inventory={inventory}
        items={items}
        bouncing={bouncing}
        editMode={editMode}
        selectedFurniture={selectedFurniture}
        onHarvest={() => void handleHarvest()}
        onRename={() => { setNewName(pet.name); setRenameOpen(true); }}
        onPlace={(key, x, y) => void handlePlace(key, x, y)}
      />

      <Tabs
        value={tab}
        onChange={(_event, value: number) => setTab(value)}
        variant="fullWidth"
        sx={{
          minHeight: 44,
          p: 0.5,
          borderRadius: '20px',
          background: 'linear-gradient(145deg,#FFFDFB,#FFF8F1)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), 0 4px 0 #EFB9CD, 0 10px 16px -6px rgba(120,80,100,.18)',
          '& .MuiTab-root': { minHeight: 40, fontSize: 13, fontWeight: 700, color: 'text.secondary' },
          '& .Mui-selected': { color: 'primary.main !important' },
          '& .MuiTabs-indicator': { height: 3, borderRadius: 3 },
        }}
      >
        <Tab label="庭院" />
        <Tab label="旅行" />
        <Tab label="小窝" />
        <Tab label="图鉴" />
      </Tabs>

      {tab === 0 && (
        <PetYard
          pet={pet}
          interactions={interactions}
          bentoCount={bentoCount}
          onFeed={() => void handleFeed()}
          onInteract={(kind) => void handleInteract(kind)}
          onOpenShop={() => setShopOpen(true)}
        />
      )}
      {tab === 1 && (
        <PetTravel
          pet={pet}
          trip={trip}
          inventory={inventory}
          items={items}
          result={result}
          onStart={(bento, charm) => void handleStart(bento, charm)}
          onSettle={() => void handleSettle()}
          onSkip={() => void handleSettle(true)}
        />
      )}
      {tab === 2 && (
        <PetRoom
          pet={pet}
          inventory={inventory}
          items={items}
          editMode={editMode}
          selectedFurniture={selectedFurniture}
          onToggleEdit={() => setEditMode(!editMode)}
          onSelectFurniture={setSelectedFurniture}
          onEquip={(key, equipped) => void handleEquip(key, equipped)}
          onPlace={(key, x, y) => void handlePlace(key, x, y)}
          onSetBackground={(key) => void handleBackground(key)}
          onOpenShop={() => setShopOpen(true)}
        />
      )}
      {tab === 3 && <PetAlbum postcards={postcards} inventory={inventory} items={items} />}

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>给猫咪改个名字</DialogTitle>
        <DialogContent>
          <TextField fullWidth autoFocus label="新名字" value={newName} onChange={(event) => setNewName(event.target.value)} inputProps={{ maxLength: 12 }} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRenameOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => void handleRename()}>保存</Button>
        </DialogActions>
      </Dialog>

      <PetShop open={shopOpen} onClose={() => setShopOpen(false)} pet={pet} items={items} onBuy={(key) => void handleBuy(key)} />
    </Box>
  );
}
