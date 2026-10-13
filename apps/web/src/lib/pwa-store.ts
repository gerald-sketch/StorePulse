import { create } from "zustand";

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaState {
  online: boolean;
  installPrompt: InstallPromptEvent | null;
  pendingSales: number;
  salesNeedingAttention: number;
  syncingSaleId: string | null;
  setOnline: (online: boolean) => void;
  setInstallPrompt: (event: InstallPromptEvent | null) => void;
  setSalesStatus: (pending: number, needsAttention: number) => void;
  setSyncingSaleId: (saleId: string | null) => void;
}

export const usePwaStore = create<PwaState>((set) => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  installPrompt: null,
  pendingSales: 0,
  salesNeedingAttention: 0,
  syncingSaleId: null,
  setOnline: (online) => set({ online }),
  setInstallPrompt: (installPrompt) => set({ installPrompt }),
  setSalesStatus: (pendingSales, salesNeedingAttention) =>
    set({ pendingSales, salesNeedingAttention }),
  setSyncingSaleId: (syncingSaleId) => set({ syncingSaleId }),
}));
