import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/storyService";
import type { Generation, Story } from "@/types/models";
import { parentKeys, refreshCredit } from "./useParent";

export const studioKeys = {
  all: ["studio"] as const,
  list: ["studio", "list"] as const,
  story: (id?: string) => ["studio", "story", id] as const,
  generation: (id?: string) => ["studio", "generation", id] as const,
  characters: ["studio", "characters"] as const,
  shelf: (id?: string) => ["studio", "shelf", id] as const,
};

const ACTIVE = new Set(["queued", "processing"]);
const DRAWING = new Set(["queued", "generating"]);

export const isGenerating = (generation?: Generation | null) => !!generation && ACTIVE.has(generation.status);
/** Còn tranh cảnh đang chờ / đang vẽ. */
export const isDrawingScenes = (story?: Story) => !!story?.scenes?.some((s) => DRAWING.has(s.imageStatus));

export const useAiPricing = () => useQuery({ queryKey: ["stories", "ai-pricing"], queryFn: api.getAiPricing, staleTime: 5 * 60_000 });
export const useTopics = () => useQuery({ queryKey: ["topics"], queryFn: api.getTopics, staleTime: 10 * 60_000 });
export const useSubSkills = () => useQuery({ queryKey: ["sub-skills"], queryFn: api.getSubSkills, staleTime: 10 * 60_000 });

export const useStories = () => useQuery({ queryKey: studioKeys.list, queryFn: () => api.getStories() });

/** Đang tạo giọng đọc hoặc đang vẽ tranh thì tải lại mỗi 2 s để cập nhật tiến độ. */
export const useStory = (id?: string) =>
  useQuery({
    queryKey: studioKeys.story(id),
    queryFn: () => api.getStory(id!),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.narration?.pending || isDrawingScenes(query.state.data) ? 2000 : false),
  });

/** Tiến độ AI viết: hỏi lại mỗi 2 s khi job đang chạy; xong thì tải lại truyện và số credit. */
export const useGeneration = (id: string | undefined, { enabled = true } = {}) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: studioKeys.generation(id),
    queryFn: async () => {
      const generation = await api.getGeneration(id!);
      if (generation && !ACTIVE.has(generation.status)) {
        queryClient.invalidateQueries({ queryKey: studioKeys.story(id) });
        queryClient.invalidateQueries({ queryKey: studioKeys.list });
        refreshCredit(queryClient);
      }
      return generation;
    },
    enabled: !!id && enabled,
    refetchInterval: (query) => (isGenerating(query.state.data) ? 2000 : false),
  });
};

/** Có chân dung đang chờ / đang vẽ thì tải lại mỗi 2 s. */
export const useCharacters = () =>
  useQuery({
    queryKey: studioKeys.characters,
    queryFn: api.getCharacters,
    refetchInterval: (query) => (query.state.data?.some((c) => DRAWING.has(c.portraitStatus)) ? 2000 : false),
  });

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return (...keys: readonly unknown[][]) => keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

/** Thêm / sửa / xoá nhân vật gia đình. */
export const useCharacterMutations = () => {
  const invalidate = useInvalidate();
  const done = () => invalidate([...studioKeys.characters], [...parentKeys.subscription], ["children"]);
  return {
    create: useMutation({ mutationFn: api.createCharacter, onSuccess: done }),
    update: useMutation({ mutationFn: ({ id, ...body }: { id: string; name?: string; appearance?: string }) => api.updateCharacter(id, body), onSuccess: done }),
    remove: useMutation({ mutationFn: api.deleteCharacter, onSuccess: done }),
  };
};

/** Tạo / vẽ lại chân dung AI của nhân vật (giữ credit). */
export const useGeneratePortrait = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.generatePortrait,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioKeys.characters });
      queryClient.invalidateQueries({ queryKey: ["children"] });
      refreshCredit(queryClient);
    },
  });
};

/** Phân tích lời kể "Kể chuyện nhà mình" (10–30 giây, không trừ credit). */
export const useAnalyzeStory = () => useMutation({ mutationFn: api.analyzeStory });

export const useCreateStory = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: api.createStory, onSuccess: () => invalidate([...studioKeys.all]) });
};

export const useGenerateStory = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.generateStory(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioKeys.generation(id) });
      queryClient.invalidateQueries({ queryKey: studioKeys.story(id) });
      refreshCredit(queryClient);
    },
  });
};

/** Vẽ tranh cả truyện / vẽ lại một cảnh: tải lại truyện + credit. */
export const useStoryImages = (id?: string) => {
  const queryClient = useQueryClient();
  const done = () => {
    queryClient.invalidateQueries({ queryKey: studioKeys.story(id) });
    refreshCredit(queryClient);
  };
  return {
    drawAll: useMutation({ mutationFn: () => api.drawStoryImages(id!), onSuccess: done }),
    redraw: useMutation({ mutationFn: (sceneId: string) => api.redrawScene(id!, sceneId), onSuccess: done }),
  };
};

export const useShelfStatus = (storyId?: string, { enabled = true } = {}) =>
  useQuery({ queryKey: studioKeys.shelf(storyId), queryFn: () => api.getShelfStatus(storyId!), enabled: !!storyId && enabled });

/** Thêm / bỏ truyện trên giá sách của một bé. */
export const useToggleShelf = (storyId?: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ childId, add }: { childId: string; add: boolean }) => (add ? api.addToShelf(childId, storyId!) : api.removeFromShelf(childId, storyId!)),
    onSuccess: () => invalidate([...studioKeys.shelf(storyId)], ["children"]),
  });
};

export const useDeleteStory = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: api.deleteStory, onSuccess: () => invalidate([...studioKeys.list], [...parentKeys.drafts], ["children"]) });
};

/** Mọi lệnh editor trả lại toàn bộ truyện → ghi thẳng vào cache, không cần tải lại. */
const useEditorMutation = <A>(storyId: string | undefined, mutationFn: (args: A) => Promise<Story>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (story) => {
      queryClient.setQueryData(studioKeys.story(storyId), story);
      queryClient.invalidateQueries({ queryKey: studioKeys.list });
      queryClient.invalidateQueries({ queryKey: parentKeys.drafts });
    },
  });
};

/** Đổi ảnh bìa (sceneId = null → mặc định cảnh 1): bìa hiện ở studio, tủ sách, giá sách của bé → làm mới hết. */
export const useSetStoryCover = (storyId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sceneId: string | null) => api.setStoryCover(storyId!, sceneId),
    onSuccess: (story) => {
      queryClient.setQueryData(studioKeys.story(storyId), story);
      ["studio", "children", "kid", "parent"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
  });
};

export const useStoryEditor = (storyId?: string) => ({
  updatePage: useEditorMutation(storyId, ({ pageId, contentText }: { pageId: string; contentText: string }) => api.updatePage(storyId!, pageId, contentText)),
  createPage: useEditorMutation(storyId, () => api.createPage(storyId!)),
  deletePage: useEditorMutation(storyId, (pageId: string) => api.deletePage(storyId!, pageId)),
  updateCheckpoint: useEditorMutation(storyId, ({ checkpointId, body }: { checkpointId: string; body: Parameters<typeof api.updateCheckpoint>[2] }) =>
    api.updateCheckpoint(storyId!, checkpointId, body),
  ),
  createCheckpoint: useEditorMutation(storyId, (body: Parameters<typeof api.createCheckpoint>[1]) => api.createCheckpoint(storyId!, body)),
  deleteCheckpoint: useEditorMutation(storyId, (checkpointId: string) => api.deleteCheckpoint(storyId!, checkpointId)),
  review: useEditorMutation(storyId, () => api.reviewStory(storyId!)),
  retryNarration: useEditorMutation(storyId, () => api.retryNarration(storyId!)),
});
