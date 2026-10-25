import * as Speech from "expo-speech";

// Một "trình phát" dùng chung cho Kid Mode: đọc đoạn mới thì dừng đoạn cũ (không chồng tiếng).
// Bản mock chưa có file MP3 giọng đọc của BE (audioUrl) → đọc chữ bằng giọng tiếng Việt của máy (expo-speech).
// Khi nối API thật, thay phần đọc chữ bằng phát audioUrl, giữ nguyên API speakSequence / stopSpeaking.
let gen = 0;

export function stopSpeaking() {
  gen += 1;
  Speech.stop();
}

const speakOne = (text: string, rate: number) =>
  new Promise<void>((resolve) => {
    Speech.speak(text, { language: "vi-VN", rate, pitch: 1.1, onDone: resolve, onStopped: resolve, onError: () => resolve() });
  });

export type SpeechItem = string | { text?: string | null; onStart?: () => void } | null | undefined;

/** Đọc lần lượt các đoạn. Trả true nếu đọc hết, false nếu bị đoạn khác / stopSpeaking cắt ngang. */
export async function speakSequence(items: SpeechItem[], rate = 0.95) {
  stopSpeaking();
  const mine = gen;
  for (const item of items) {
    const { text, onStart } = typeof item === "string" || item == null ? { text: item, onStart: undefined } : item;
    if (!text) continue;
    if (mine !== gen) return false;
    onStart?.();
    await speakOne(text, rate);
  }
  return mine === gen;
}

export const speak = (text?: string | null) => speakSequence([text]);
