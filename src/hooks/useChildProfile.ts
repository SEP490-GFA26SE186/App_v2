import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChild,
  deleteChild,
  getChildBookshelf,
  getChildEqJourney,
  getChildOverview,
  getChildren,
  getChildUsage,
  updateChild,
} from "@/services/childService";
import useAuthStore from "@/stores/authStore";
import { useParentStore } from "@/stores/sessionStores";
import type { ShelfStatus } from "@/types/models";

export const childKeys = {
  all: ["children"] as const,
  list: ["children", "list"] as const,
  overview: (childId?: string) => ["children", childId, "overview"] as const,
  eqJourney: (childId: string | undefined, weeks: number) => ["children", childId, "eq-journey", weeks] as const,
  bookshelf: (childId: string | undefined, params: object) => ["children", childId, "bookshelf", params] as const,
  usage: (childId?: string, date?: string) => ["children", childId, "usage", date ?? "today"] as const,
};

export const useChildren = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: childKeys.list,
    queryFn: getChildren,
    enabled: isAuthenticated,
    // Chân dung của bé đang vẽ → tải lại mỗi 4 s để thẻ nhân vật cập nhật
    refetchInterval: (query) => (query.state.data?.some((c) => ["queued", "generating"].includes(c.character?.portraitStatus ?? "")) ? 4000 : false),
  });
};

/** Bé đang được chọn trên header. Bé đã chọn không còn → lấy bé đầu tiên */
export const useSelectedChild = () => {
  const selectedChildId = useParentStore((s) => s.selectedChildId);
  const { data: children = [], isLoading } = useChildren();
  const child = children.find((c) => c.id === selectedChildId) ?? children[0] ?? null;
  return { child, children, isLoading, isEmpty: !isLoading && children.length === 0 };
};

export const useChildOverview = (childId?: string) =>
  useQuery({ queryKey: childKeys.overview(childId), queryFn: () => getChildOverview(childId!), enabled: !!childId });

export const useChildEqJourney = (childId: string | undefined, weeks = 8) =>
  useQuery({ queryKey: childKeys.eqJourney(childId, weeks), queryFn: () => getChildEqJourney(childId!, weeks), placeholderData: keepPreviousData, enabled: !!childId });

export const useChildBookshelf = (
  childId: string | undefined,
  params: { page?: number; limit?: number; search?: string; status?: ShelfStatus; competency?: string } = {},
) =>
  useQuery({
    queryKey: childKeys.bookshelf(childId, params),
    queryFn: () => getChildBookshelf(childId!, params),
    enabled: !!childId,
    placeholderData: keepPreviousData,
  });

/** date: "YYYY-MM-DD". Bỏ trống = hôm nay */
export const useChildUsage = (childId?: string, date?: string) =>
  useQuery({ queryKey: childKeys.usage(childId, date), queryFn: () => getChildUsage(childId!, date), enabled: !!childId });

// Hồ sơ bé thay đổi → danh sách, tổng quan, thời lượng đều có thể lệch → làm mới toàn bộ nhánh "children"
const useInvalidateChildren = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: childKeys.all });
    queryClient.invalidateQueries({ queryKey: ["studio", "characters"] });
  };
};

export const useCreateChild = () => {
  const invalidate = useInvalidateChildren();
  return useMutation({ mutationFn: createChild, onSuccess: invalidate });
};

export const useUpdateChild = (childId?: string) => {
  const invalidate = useInvalidateChildren();
  return useMutation({ mutationFn: (payload: Parameters<typeof updateChild>[1]) => updateChild(childId!, payload), onSuccess: invalidate });
};

export const useDeleteChild = () => {
  const invalidate = useInvalidateChildren();
  return useMutation({ mutationFn: deleteChild, onSuccess: invalidate });
};
