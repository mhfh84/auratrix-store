import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, variant?: ToastVariant, duration?: number) => void;
  remove: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  add: (message, variant = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant, duration }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  success: (message) => useToastStore.getState().add(message, 'success'),
  error: (message) => useToastStore.getState().add(message, 'error'),
  warning: (message) => useToastStore.getState().add(message, 'warning'),
  info: (message) => useToastStore.getState().add(message, 'info'),
}));
