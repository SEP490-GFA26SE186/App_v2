# StoryWeaver — App mobile (Expo + TypeScript)

Bản mobile cho **Phụ huynh** và **Chế độ Trẻ Em (Kid Mode)**, dựng lại từ FE web `StoryWeaver/` theo cùng design token
(Warm Modern Guardian: cam `#ff7a00`, xanh ngọc `#00a896`, font Comfortaa + Nunito Sans).
Giai đoạn này **chỉ làm UI, dữ liệu mock** — không gọi BE.

## Chạy

```bash
npm install
npx expo start        # quét QR bằng Expo Go, hoặc bấm a / i / w
```

Tài khoản demo: `me.lanhuong@storyweaver.vn` / `123456` (màn đăng nhập có nút “bấm để điền”). PIN thoát Kid Mode: `1234`.

## Cấu trúc `src/`

```
app/                    Route của expo-router (mỗi file = 1 màn)
  _layout.tsx           Provider (react-query, safe-area, font) + chặn route theo phiên: login / phụ huynh / Kid Mode
  login.tsx, register.tsx
  (parent)/(tabs)/      5 tab: Tổng quan · Tủ sách · Sáng tác · Chợ truyện · Thêm
  (parent)/…            Trang con: Bé nhà mình, Nhân vật gia đình, Báo cáo EQ, Gói dịch vụ, Bán truyện,
                        Cài đặt, Trợ giúp, story/new, story/[storyId], listing/[listingId], selling/new
  kid/                  Tủ sách của bé, trình đọc truyện + câu hỏi, cổng PIN Ba Mẹ
components/ui/          Bộ UI dùng chung (Button, Card, Sheet, TextField, SelectField, Badge, ChipRow…)
components/parent|kid/  Component theo nghiệp vụ (port từ components/ của web)
constants/              Nhãn tiếng Việt, CASEL, mức EQ, route…
hooks/                  react-query hooks — cùng tên với web (useChildProfile, useStudio, useMarket, useKid…)
services/               Service MOCK — cùng tên hàm, cùng shape response với API BE
mocks/db.ts             "Cơ sở dữ liệu" trong bộ nhớ
stores/                 zustand (phiên đăng nhập, phiên Kid Mode, bé đang chọn, toast) — lưu bằng AsyncStorage
theme/                  Design token (màu, font, bo góc, bóng)
types/models.ts         Kiểu dữ liệu theo schema rev8
```

## Nối API thật sau này

UI chỉ gọi `hooks/` → `services/`. Thay phần thân từng hàm trong `services/*.ts` (đang dùng `respond(...)` đọc `mocks/db.ts`)
bằng lời gọi axios tới endpoint ghi trong comment của hàm; giữ nguyên tên hàm và shape dữ liệu thì không phải sửa màn hình.
Các việc nền của BE (AI viết ~7s, vẽ tranh, tạo giọng đọc) đang được giả lập bằng mốc thời gian trong `storyService.ts`.
Giọng đọc Kid Mode tạm dùng `expo-speech` (TTS của máy) thay cho file MP3 của BE — xem `utils/speech.ts`.

## Kiểm tra

```bash
npx tsc --noEmit
npx expo lint
```
