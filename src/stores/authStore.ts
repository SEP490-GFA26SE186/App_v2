import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/types/models";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** Lưu phiên từ response BE: { user, tokens: { accessToken, refreshToken } } */
  login: (session: { user: User; tokens: Tokens }) => void;
  /** Sau khi refresh-tokens / thoát Kid Mode: BE xoay vòng cả 2 token */
  setTokens: (tokens: Tokens) => void;
  /** Đồng bộ thông tin user mới nhất từ GET /auth/me */
  setUser: (user: User) => void;
  logout: () => void;
}

// Điện thoại luôn "ghi nhớ" phiên (AsyncStorage) — web có tuỳ chọn localStorage / sessionStorage.
const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: ({ user, tokens }) => set({ user, ...tokens, isAuthenticated: true }),
      setTokens: (tokens) => set(tokens),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: "sw_auth", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export default useAuthStore;
