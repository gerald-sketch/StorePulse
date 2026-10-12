import { create } from "zustand";

interface BranchState {
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
}

function storedBranchId() {
  return typeof localStorage === "undefined"
    ? null
    : localStorage.getItem("sb-branch-id");
}

export const useBranchStore = create<BranchState>((set) => ({
  selectedBranchId: storedBranchId(),
  setSelectedBranchId: (id) => {
    if (typeof localStorage !== "undefined") {
      if (id) localStorage.setItem("sb-branch-id", id);
      else localStorage.removeItem("sb-branch-id");
    }
    set({ selectedBranchId: id });
  },
}));
