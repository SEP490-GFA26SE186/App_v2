import { useEffect, useState } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { getMe, getSubscription } from "@/services/authService";
import { getPendingDrafts } from "@/services/storyService";
import useAuthStore from "@/stores/authStore";

export const parentKeys = {
  me: ["auth", "me"] as const,
  subscription: ["parent", "subscription"] as const,
  drafts: ["parent", "drafts"] as const,
};

/** Đồng bộ user từ GET /auth/me khi đã đăng nhập (credit, PIN, xác thực email có thể đổi). */
export const useCurrentUser = () => {
  const { isAuthenticated, setUser } = useAuthStore();
  const query = useQuery({ queryKey: parentKeys.me, queryFn: getMe, enabled: isAuthenticated, staleTime: 5 * 60_000 });
  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);
  return query;
};

/**
 * Credit trên topbar đọc từ user trong authStore → sau mỗi thao tác giữ / hoàn credit
 * gọi lại /auth/me và ghi thẳng vào store.
 */
export const refreshCredit = async (queryClient: QueryClient) => {
  try {
    const me = await getMe();
    useAuthStore.getState().setUser(me);
    queryClient.setQueryData(parentKeys.me, me);
  } catch {
    // Lỗi mạng thì giữ số cũ
  }
};

export const useSubscription = () => useQuery({ queryKey: parentKeys.subscription, queryFn: getSubscription });

export const usePendingDrafts = () => useQuery({ queryKey: parentKeys.drafts, queryFn: getPendingDrafts });

/** Thông tin phụ huynh hiển thị trên giao diện: tên & credit lấy từ /auth/me, gói lấy từ /subscriptions/me */
export const useParentProfile = () => {
  const user = useAuthStore((s) => s.user);
  const { data: subscription } = useSubscription();
  return {
    name: user?.fullName || user?.username || "Ba mẹ",
    email: user?.email,
    creditBalance: user?.wallet?.creditBalance ?? null,
    planName: subscription?.plan.name,
  };
};

export function useDebounce<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
