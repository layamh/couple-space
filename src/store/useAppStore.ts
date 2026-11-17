import { create } from 'zustand';
import type {
  Couple,
  Profile,
  Pet,
  PetItem,
  PetInventory,
  PetTrip,
  Postcard,
  PetInteraction,
  PetBundle,
} from '@/types';

export type SnackSeverity = 'success' | 'error' | 'info' | 'warning';

/** 把任意输入归一化为数组，杜绝伪数组对象流入 store 后触发 .map/.filter 崩溃。 */
function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export interface SnackbarState {
  key: number;
  message: string;
  severity: SnackSeverity;
}

interface AppState {
  couple: Couple | null;
  partner: Profile | null;
  pet: Pet | null;
  /** Pet v2 聚合切片 */
  items: PetItem[];
  inventory: PetInventory[];
  postcards: Postcard[];
  interactions: PetInteraction[];
  trip: PetTrip | null;
  demoMode: boolean;
  ready: boolean;
  snackbar: SnackbarState | null;
  setCouple: (couple: Couple | null) => void;
  setPartner: (partner: Profile | null) => void;
  setPet: (pet: Pet | null) => void;
  setPetBundle: (bundle: PetBundle) => void;
  applyPetPatch: (patch: Partial<PetBundle>) => void;
  setTrip: (trip: PetTrip | null) => void;
  setDemoMode: (demoMode: boolean) => void;
  setReady: (ready: boolean) => void;
  notify: (message: string, severity?: SnackSeverity) => void;
  closeSnackbar: () => void;
}

/** 应用全局状态：情侣空间、宠物 v2 切片、演示标记与 Snackbar。 */
export const useAppStore = create<AppState>((set) => ({
  couple: null,
  partner: null,
  pet: null,
  items: [],
  inventory: [],
  postcards: [],
  interactions: [],
  trip: null,
  demoMode: false,
  ready: false,
  snackbar: null,

  setCouple: (couple) => set({ couple }),
  setPartner: (partner) => set({ partner }),
  setPet: (pet) => set({ pet }),
  setPetBundle: (bundle) =>
    set({
      pet: bundle.pet,
      items: asArray(bundle.items),
      inventory: asArray(bundle.inventory),
      postcards: asArray(bundle.postcards),
      interactions: asArray(bundle.interactions),
      trip: bundle.trip,
    }),
  applyPetPatch: (patch) =>
    set((state) => ({
      pet: patch.pet ?? state.pet,
      items: patch.items !== undefined ? asArray(patch.items) : state.items,
      inventory: patch.inventory !== undefined ? asArray(patch.inventory) : state.inventory,
      postcards: patch.postcards !== undefined ? asArray(patch.postcards) : state.postcards,
      interactions: patch.interactions !== undefined ? asArray(patch.interactions) : state.interactions,
      trip: patch.trip !== undefined ? patch.trip : state.trip,
    })),
  setTrip: (trip) => set({ trip }),
  setDemoMode: (demoMode) => set({ demoMode }),
  setReady: (ready) => set({ ready }),
  notify: (message, severity = 'info') =>
    set({ snackbar: { key: Date.now(), message, severity } }),
  closeSnackbar: () => set({ snackbar: null }),
}));
