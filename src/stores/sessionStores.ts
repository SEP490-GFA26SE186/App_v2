import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface KidChild {
  id: string;
  name: string;
  birthDate: string | null;
}

// Phiên Kid Mode (POST /auth/kid-mode/enter): token riêng của bé + bé đang dùng máy.
// Lưu lại để mở lại app vẫn ở Kid Mode; chỉ thoát được bằng PIN của ba mẹ.
export const useKidSessionStore = create<{
  token: string | null;
  child: KidChild | null;
  start: (token: string, child: KidChild) => void;
  end: () => void;
}>()(
  persist(
    (set) => ({
      token: null,
      child: null,
      start: (token, child) => set({ token, child }),
      end: () => set({ token: null, child: null }),
    }),
    { name: "sw_kid_session", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

// Tùy chọn trải nghiệm trong Chế độ Trẻ Em
export const useKidStore = create<{
  muted: boolean;
  parentGateOpen: boolean;
  toggleMuted: () => void;
  setParentGateOpen: (open: boolean) => void;
}>((set) => ({
  muted: false,
  parentGateOpen: false,
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  setParentGateOpen: (parentGateOpen) => set({ parentGateOpen }),
}));

// Hồ sơ bé đang được chọn trên header của Parent (nhớ qua lần mở sau).
// null / id không còn tồn tại → useSelectedChild tự lấy bé đầu tiên.
export const useParentStore = create<{ selectedChildId: string | null; setSelectedChildId: (id: string) => void }>()(
  persist(
    (set) => ({
      selectedChildId: null,
      setSelectedChildId: (selectedChildId) => set({ selectedChildId }),
    }),
    { name: "sw_selected_child", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
