import { create } from 'zustand';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export interface AlertDialogOptions {
  title?: string;
  message: string;
  buttonText?: string;
  variant?: DialogVariant;
}

export interface PromptDialogOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  isOpen: boolean;
  type: 'confirm' | 'alert' | 'prompt';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  buttonText?: string;
  variant: DialogVariant;
  inputValue?: string;
  placeholder?: string;

  // Resolvers
  resolveConfirm?: (value: boolean) => void;
  resolveAlert?: () => void;
  resolvePrompt?: (value: string | null) => void;

  // Actions
  showConfirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  showAlert: (options: AlertDialogOptions | string) => Promise<void>;
  showPrompt: (options: PromptDialogOptions) => Promise<string | null>;
  close: () => void;
  setInputValue: (val: string) => void;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  isOpen: false,
  type: 'confirm',
  title: undefined,
  message: '',
  confirmText: undefined,
  cancelText: undefined,
  buttonText: undefined,
  variant: 'info',
  inputValue: '',
  placeholder: '',

  resolveConfirm: undefined,
  resolveAlert: undefined,
  resolvePrompt: undefined,

  showConfirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        type: 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        variant: options.variant || 'danger',
        resolveConfirm: resolve,
      });
    });
  },

  showAlert: (options) => {
    const opts: AlertDialogOptions =
      typeof options === 'string' ? { message: options } : options;

    return new Promise<void>((resolve) => {
      set({
        isOpen: true,
        type: 'alert',
        title: opts.title,
        message: opts.message,
        buttonText: opts.buttonText,
        variant: opts.variant || 'warning',
        resolveAlert: resolve,
      });
    });
  },

  showPrompt: (options) => {
    return new Promise<string | null>((resolve) => {
      set({
        isOpen: true,
        type: 'prompt',
        title: options.title,
        message: options.message,
        inputValue: options.defaultValue || '',
        placeholder: options.placeholder,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        variant: 'info',
        resolvePrompt: resolve,
      });
    });
  },

  setInputValue: (inputValue) => set({ inputValue }),

  close: () => {
    set({
      isOpen: false,
      resolveConfirm: undefined,
      resolveAlert: undefined,
      resolvePrompt: undefined,
    });
  },

  handleConfirm: () => {
    const { type, resolveConfirm, resolveAlert, resolvePrompt, inputValue } = get();
    if (type === 'confirm' && resolveConfirm) {
      resolveConfirm(true);
    } else if (type === 'alert' && resolveAlert) {
      resolveAlert();
    } else if (type === 'prompt' && resolvePrompt) {
      resolvePrompt(inputValue || '');
    }
    get().close();
  },

  handleCancel: () => {
    const { type, resolveConfirm, resolveAlert, resolvePrompt } = get();
    if (type === 'confirm' && resolveConfirm) {
      resolveConfirm(false);
    } else if (type === 'alert' && resolveAlert) {
      resolveAlert();
    } else if (type === 'prompt' && resolvePrompt) {
      resolvePrompt(null);
    }
    get().close();
  },
}));

/**
 * Convenient React hook to trigger designed alerts, confirms, and prompts
 */
export function useDialog() {
  const { showConfirm, showAlert, showPrompt } = useDialogStore();
  return {
    confirm: showConfirm,
    alert: showAlert,
    prompt: showPrompt,
  };
}
