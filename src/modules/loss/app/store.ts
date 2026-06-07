import { create } from "zustand";

/**
 * Champ de saisie du Loss Analyzer, hissé dans un petit store pour pouvoir le
 * **pré-remplir depuis la visite guidée** (démo). Volontairement non persisté.
 */
interface LossInputState {
  input: string;
  setInput: (v: string) => void;
}

export const useLossInput = create<LossInputState>((set) => ({
  input: "",
  setInput: (input) => set({ input }),
}));
