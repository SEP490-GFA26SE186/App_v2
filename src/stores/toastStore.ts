import { create } from "zustand";

export type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// Thông báo nhanh dùng chung toàn app: toast.success("..."), toast.error("..."), toast.info("...")
const useToastStore = create<{
  toasts: ToastItem[];
  push: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}>((set) => ({
  toasts: [],
  push: (message, type = "success") => {
    const id = `${Date.now()}_${Math.random()}`;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().push(msg, "success"),
  error: (msg: string) => useToastStore.getState().push(msg, "error"),
  info: (msg: string) => useToastStore.getState().push(msg, "info"),
};

export default useToastStore;
