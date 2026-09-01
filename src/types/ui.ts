export type ThemeMode = 'light' | 'dark' | 'system';

export interface ModalState {
  isOpen: boolean;
  modalId: string | null;
  data?: unknown;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}
