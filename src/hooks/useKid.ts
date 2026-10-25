import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { href, ROUTES } from "@/constants/routes";
import * as api from "@/services/kidService";
import useAuthStore from "@/stores/authStore";
import { useKidSessionStore } from "@/stores/sessionStores";
import { toast } from "@/stores/toastStore";
import { stopSpeaking } from "@/utils/speech";

export const kidKeys = {
  shelf: (childId?: string) => ["kid", "shelf", childId] as const,
  reading: (storyId?: string) => ["kid", "reading", storyId] as const,
};

export const useKidShelf = () => {
  const childId = useKidSessionStore((s) => s.child?.id);
  return useQuery({ queryKey: kidKeys.shelf(childId), queryFn: api.getKidShelf, enabled: !!childId });
};

/** Bắt đầu / tiếp tục lượt đọc — một lần mỗi lần mở truyện (không tự gọi lại). */
export const useReading = (storyId?: string) =>
  useQuery({ queryKey: kidKeys.reading(storyId), queryFn: () => api.startReading(storyId!), enabled: !!storyId, staleTime: Infinity, gcTime: 0, retry: false });

export const useSaveProgress = (sessionId: string) => useMutation({ mutationFn: (pageId: string) => api.saveProgress(sessionId, pageId) });
export const useAnswer = (sessionId: string) => useMutation({ mutationFn: (body: Parameters<typeof api.answerCheckpoint>[1]) => api.answerCheckpoint(sessionId, body) });
export const useCompleteReading = (sessionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: () => api.completeReading(sessionId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kid", "shelf"] }) });
};

/**
 * Mở Chế độ Trẻ Em cho bé (POST /auth/kid-mode/enter) rồi vào tủ sách hoặc thẳng một truyện.
 * Thoát ra phải nhập PIN của ba mẹ.
 */
export const useEnterKidMode = () => {
  const router = useRouter();
  const start = useKidSessionStore((s) => s.start);
  const hasPin = useAuthStore((s) => !!s.user?.hasKidPin);
  const mutation = useMutation({ mutationFn: api.enterKidMode });

  const enter = (childId: string, storyId?: string) => {
    if (!hasPin) {
      toast.error("Ba mẹ cần đặt mã PIN thoát Kid Mode trước (trang Bé nhà mình).");
      return;
    }
    mutation.mutate(childId, {
      onSuccess: ({ child, session }) => {
        start(session.kidSessionToken, child);
        router.replace(href(storyId ? ROUTES.KID.story(storyId) : ROUTES.KID.BOOKSHELF));
      },
      onError: () => toast.error("Chưa mở được Kid Mode, ba mẹ thử lại nhé."),
    });
  };
  return { enter, isPending: mutation.isPending };
};

/** Cổng Ba Mẹ: kiểm PIN, nhận token phụ huynh mới, đóng phiên bé, về trang Tổng quan. */
export const useExitKidMode = () => {
  const router = useRouter();
  const end = useKidSessionStore((s) => s.end);
  const setTokens = useAuthStore((s) => s.setTokens);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.exitKidMode,
    onSuccess: ({ tokens }) => {
      stopSpeaking();
      setTokens(tokens);
      end();
      queryClient.invalidateQueries({ queryKey: ["children"] });
      router.replace(href(ROUTES.PARENT.DASHBOARD));
    },
  });
};
