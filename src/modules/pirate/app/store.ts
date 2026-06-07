import { create } from "zustand";

/**
 * Texte collé (chat Local) du Pirate's Big Helper, hissé dans un petit store
 * pour pouvoir le **pré-remplir depuis la visite guidée** (démo). Non persisté.
 */
interface PirateInputState {
  pasted: string;
  setPasted: (v: string) => void;
}

export const usePirateInput = create<PirateInputState>((set) => ({
  pasted: "",
  setPasted: (pasted) => set({ pasted }),
}));
