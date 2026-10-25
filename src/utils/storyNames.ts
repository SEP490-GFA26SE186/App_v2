import type { StoryCharacter } from "@/types/models";

// BE lưu chữ truyện dạng token {NV1}, {NV2}… (tên thật không gửi cho AI). Khi hiển thị / sửa, đổi token
// thành tên theo danh sách nhân vật của truyện; khi lưu, gửi lại chữ có tên — BE tự đổi tên thành token.

export function fillNames(text: string | null | undefined, characters: Pick<StoryCharacter, "token" | "name">[] = []) {
  if (text == null) return "";
  const byToken = new Map(characters.filter((c) => c.name).map((c) => [c.token, c.name as string]));
  return text.replace(/\{NV\d+\}/g, (token) => byToken.get(token) ?? token);
}

/** Ngược lại: chữ có tên → chữ token (mock thay cho tokenizeOrReject của BE). */
export function tokenizeNames(text: string, characters: Pick<StoryCharacter, "token" | "name">[] = []) {
  return characters.reduce((t, c) => (c.name ? t.split(c.name).join(c.token) : t), text);
}

/** Tên nhân vật ứng với token, dùng cho nhãn "hỏi về …". */
export const nameOfToken = (token: string, characters: Pick<StoryCharacter, "token" | "name">[] = []) =>
  characters.find((c) => c.token === token)?.name ?? token;
