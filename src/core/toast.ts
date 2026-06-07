import { create } from "zustand";

export type ToastKind = "info" | "success" | "error";

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => number;
  dismiss: (id: number) => void;
}

let seq = 1;
const TTL_MS = 5000;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = seq++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    window.setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
      TTL_MS
    );
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** API impérative pratique : `toast.error("...")`. */
export const toast = {
  info: (title: string, description?: string) =>
    useToasts.getState().push({ kind: "info", title, description }),
  success: (title: string, description?: string) =>
    useToasts.getState().push({ kind: "success", title, description }),
  error: (title: string, description?: string) =>
    useToasts.getState().push({ kind: "error", title, description }),
};
